import { prisma } from "@/lib/prisma";
import { ACTIVITY_TYPE, LEAD_STATUS } from "@/lib/constants/crm";
import { MESSAGE_CHANNEL, MESSAGE_DIRECTION, MESSAGE_STATUS } from "@/lib/constants/messaging";
import { DEFAULT_TEAM_TIME_ZONE } from "@/lib/constants/team";
import { startOfDayInTimeZone } from "@/lib/team-live";
import { validateAndNormalizePhone } from "@/lib/phone";
import { sendTwilioSms } from "@/lib/integrations/twilio";
import { isPhoneOptedOut } from "@/services/sms.service";

export interface RoundRobinResult {
  success: boolean;
  assignedAdvisorId?: string | null;
  assignedAdvisorName?: string | null;
  instantContactSent?: boolean;
  error?: string;
  alreadyAssigned?: boolean;
}

interface CandidateAdvisor {
  id: string;
  name: string;
  email: string;
}

/**
 * Obtiene la lista de asesores candidatos para atender prospectos.
 * Prioriza a los asesores que han hecho Check-in en su turno hoy y están en línea.
 */
async function resolveActiveCandidateAdvisors(
  organizationId: string,
  clientId: string | null
): Promise<CandidateAdvisor[]> {
  let candidates: CandidateAdvisor[] = [];

  if (clientId) {
    // 1. Usuarios del portal asignados a esta empresa
    const clientUsers = await prisma.user.findMany({
      where: {
        clientId,
        isActive: true,
      },
      select: { id: true, name: true, email: true },
    });

    candidates = clientUsers;

    // Si la empresa no tiene usuarios propios, buscar si el dueño de la empresa es un usuario activo
    if (candidates.length === 0) {
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
          owner: { select: { id: true, name: true, email: true } },
        },
      });
      if (client?.owner) {
        candidates = [client.owner];
      }
    }
  }

  // Si no hay clientId o no hubo asesores en el cliente, buscar miembros activos de la organización
  if (candidates.length === 0) {
    const orgMembers = await prisma.organizationMember.findMany({
      where: {
        organizationId,
        user: { isActive: true },
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });
    candidates = orgMembers.map((m) => m.user);
  }

  if (candidates.length <= 1) {
    return candidates;
  }

  // 2. Verificar asistencia activa (Turno en curso hoy)
  const now = new Date();
  const dayStart = startOfDayInTimeZone(now, DEFAULT_TEAM_TIME_ZONE);

  const todayAttendance = await prisma.activity.findMany({
    where: {
      userId: { in: candidates.map((c) => c.id) },
      type: { in: [ACTIVITY_TYPE.CHECK_IN, ACTIVITY_TYPE.CHECK_OUT] },
      performedAt: { gte: dayStart },
    },
    orderBy: { performedAt: "asc" },
    select: { userId: true, type: true, performedAt: true },
  });

  const onDutyUserIds = new Set<string>();
  for (const act of todayAttendance) {
    if (act.type === ACTIVITY_TYPE.CHECK_IN && act.userId) {
      onDutyUserIds.add(act.userId);
    } else if (act.type === ACTIVITY_TYPE.CHECK_OUT && act.userId) {
      onDutyUserIds.delete(act.userId);
    }
  }

  const clockedInCandidates = candidates.filter((c) => onDutyUserIds.has(c.id));

  // Si al menos un asesor está en turno activo, se reparte solo entre ellos
  if (clockedInCandidates.length > 0) {
    return clockedInCandidates;
  }

  // Si ninguno marcó check-in (ej. no usan reloj o fuera de horario), se rota entre todos los candidatos
  return candidates;
}

/**
 * Asigna automáticamente un prospecto a un asesor comercial mediante Round-Robin
 * y ejecuta el primer contacto inmediato (< 60s) vía SMS si el prospecto tiene teléfono válido.
 */
export async function assignLeadRoundRobin(
  leadId: string,
  options?: { forceReassign?: boolean; triggerInstantContact?: boolean }
): Promise<RoundRobinResult> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      client: { select: { id: true, name: true } },
      owner: { select: { id: true, name: true } },
    },
  });

  if (!lead) {
    return { success: false, error: "Prospecto no encontrado." };
  }

  // Si ya tiene asesor asignado y no se solicita reasignación forzada, salir
  if (lead.ownerId && !options?.forceReassign) {
    return {
      success: true,
      alreadyAssigned: true,
      assignedAdvisorId: lead.ownerId,
      assignedAdvisorName: lead.owner?.name ?? null,
    };
  }

  const candidates = await resolveActiveCandidateAdvisors(lead.organizationId, lead.clientId);
  if (candidates.length === 0) {
    return { success: false, error: "No se encontraron asesores disponibles para auto-asignación." };
  }

  // Determinar la carga de leads de cada asesor hoy para distribución justa y equitativa (Least Loaded Round-Robin)
  const now = new Date();
  const dayStart = startOfDayInTimeZone(now, DEFAULT_TEAM_TIME_ZONE);

  const candidateIds = candidates.map((c) => c.id);
  const todayLeadCounts = await prisma.lead.groupBy({
    by: ["ownerId"],
    where: {
      ownerId: { in: candidateIds },
      createdAt: { gte: dayStart },
      isDeleted: false,
    },
    _count: { id: true },
  });

  const countsMap = new Map<string, number>();
  for (const row of todayLeadCounts) {
    if (row.ownerId) countsMap.set(row.ownerId, row._count.id);
  }

  // Ordenar candidatos por menor cantidad de leads hoy
  const sortedCandidates = [...candidates].sort((a, b) => {
    const countA = countsMap.get(a.id) ?? 0;
    const countB = countsMap.get(b.id) ?? 0;
    return countA - countB;
  });

  const selectedAdvisor = sortedCandidates[0];

  // 1. Asignar el prospecto en base de datos
  await prisma.lead.update({
    where: { id: lead.id },
    data: { ownerId: selectedAdvisor.id },
  });

  // 2. Registrar actividad de auto-asignación
  await prisma.activity.create({
    data: {
      leadId: lead.id,
      clientId: lead.clientId,
      userId: selectedAdvisor.id,
      type: ACTIVITY_TYPE.NOTE,
      title: "Auto-Asignación Round-Robin",
      description: `Prospecto asignado automáticamente a ${selectedAdvisor.name} mediante algoritmo Round-Robin.`,
      outcome: "completed",
    },
  });

  // 3. Primer Contacto Inmediato (SLA < 60s)
  let instantContactSent = false;
  const shouldContact = options?.triggerInstantContact !== false && lead.smsConsent !== false;

  if (shouldContact) {
    const rawPhone = lead.normalizedPhone || lead.phone;
    if (rawPhone) {
      const phoneValidation = validateAndNormalizePhone(rawPhone);
      const targetPhone = phoneValidation.normalized;

      if (targetPhone && !(await isPhoneOptedOut(targetPhone))) {
        // Evitar duplicar si ya se envió un mensaje saliente a este prospecto en los últimos 30 min
        const recentMsg = await prisma.message.findFirst({
          where: {
            leadId: lead.id,
            direction: MESSAGE_DIRECTION.OUTBOUND,
            createdAt: { gte: new Date(Date.now() - 30 * 60 * 1000) },
          },
          select: { id: true },
        });

        if (!recentMsg) {
          const clientName = lead.client?.name || "nuestra empresa";
          const advisorFirstName = selectedAdvisor.name.split(" ")[0];
          const leadFirstName = lead.name.split(" ")[0] || "Hola";

          const welcomeMessage = `Hola ${leadFirstName}, gracias por comunicarte con ${clientName}. Mi nombre es ${advisorFirstName}, tu asesor asignado. ¿En qué podemos ayudarte el día de hoy? (Para no recibir más mensajes responde BAJA)`;

          try {
            const sendResult = await sendTwilioSms(targetPhone, welcomeMessage);

            await prisma.message.create({
              data: {
                organizationId: lead.organizationId,
                clientId: lead.clientId,
                leadId: lead.id,
                channel: MESSAGE_CHANNEL.SMS,
                direction: MESSAGE_DIRECTION.OUTBOUND,
                recipient: targetPhone,
                body: welcomeMessage,
                status: sendResult.status,
                providerMsgId: sendResult.providerMsgId,
                errorMessage: sendResult.errorMessage,
                isDemo: sendResult.isDemo,
              },
            });

            // Actualizar status del prospecto a contactado si era nuevo
            if (lead.status === LEAD_STATUS.NEW) {
              await prisma.lead.update({
                where: { id: lead.id },
                data: { status: LEAD_STATUS.CONTACTED },
              });
            }

            // Registrar actividad de primer contacto con éxito
            await prisma.activity.create({
              data: {
                leadId: lead.id,
                clientId: lead.clientId,
                userId: selectedAdvisor.id,
                type: ACTIVITY_TYPE.SMS,
                title: "Primer Contacto Automático (SLA < 60s)",
                description: `SMS de bienvenida enviado inmediatamente por ${selectedAdvisor.name}:\n"${welcomeMessage}"`,
                outcome: sendResult.status === MESSAGE_STATUS.SENT ? "completed" : "pending",
              },
            });

            instantContactSent = true;
          } catch (smsError) {
            console.error(`Error en primer contacto para lead ${lead.id}:`, smsError);
          }
        }
      }
    }
  }

  return {
    success: true,
    assignedAdvisorId: selectedAdvisor.id,
    assignedAdvisorName: selectedAdvisor.name,
    instantContactSent,
  };
}

/**
 * Procesa en lote todos los prospectos sin asesor asignado en las últimas 24 horas.
 */
export async function assignUnassignedLeads(
  organizationId: string,
  clientId?: string | null
): Promise<{ processed: number; assigned: number }> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const unassignedLeads = await prisma.lead.findMany({
    where: {
      organizationId,
      ownerId: null,
      isDeleted: false,
      createdAt: { gte: since },
      ...(clientId ? { clientId } : {}),
    },
    select: { id: true },
    take: 50,
  });

  let assignedCount = 0;
  for (const l of unassignedLeads) {
    const res = await assignLeadRoundRobin(l.id);
    if (res.success && res.assignedAdvisorId) {
      assignedCount++;
    }
  }

  return { processed: unassignedLeads.length, assigned: assignedCount };
}
