import { prisma } from "@/lib/prisma";
import type { Prisma, Appointment } from "@prisma/client";
import {
  APPOINTMENT_SLOT_MINUTES,
  APPOINTMENT_STATUS,
  type AppointmentStatus,
  type AppointmentLocation,
} from "@/lib/constants/appointments";
import { isSlotTaken } from "@/lib/appointment-slots";
import type {
  AppointmentDto,
  CreateAppointmentInput,
  UpdateAppointmentInput,
  PublicBookingInput,
  PublicBookingClientInfo,
} from "@/types/appointments";
import { validateAndNormalizePhone } from "@/lib/phone";
import { sendTwilioSms } from "@/lib/integrations/twilio";
import { LEAD_STATUS } from "@/lib/constants/crm";
import { assignLeadRoundRobin } from "@/services/round-robin.service";

// Una cita larga que empezó antes todavía puede cubrir el bloque pedido: se busca hacia atrás hasta 3 horas.
const MAX_APPOINTMENT_LOOKBEHIND_MS = 3 * 60 * 60 * 1000;

export interface AppointmentScope {
  organizationId: string;
  clientId: string | null;
  isClientUser: boolean;
  userId?: string;
}

export interface AppointmentFilterParams {
  clientId?: string | null;
  userId?: string | null;
  leadId?: string | null;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  search?: string | null;
}

type AppointmentRecord = Appointment & {
  client?: { id: string; name: string; companyName: string | null } | null;
  lead?: { id: string; name: string; phone: string | null } | null;
  user?: { id: string; name: string; email: string } | null;
};

/** Formatea una fila de Prisma a DTO seguro */
function toAppointmentDto(apt: AppointmentRecord): AppointmentDto {
  return {
    id: apt.id,
    organizationId: apt.organizationId,
    clientId: apt.clientId,
    clientName: apt.client?.name || apt.client?.companyName || null,
    leadId: apt.leadId,
    leadName: apt.lead?.name || apt.customerName || null,
    leadPhone: apt.lead?.phone || apt.customerPhone || null,
    userId: apt.userId,
    userName: apt.user?.name || null,
    title: apt.title,
    description: apt.description,
    scheduledAt: apt.scheduledAt.toISOString(),
    durationMinutes: apt.durationMinutes,
    status: apt.status as AppointmentStatus,
    locationType: apt.locationType as AppointmentLocation,
    locationAddress: apt.locationAddress,
    customerName: apt.customerName,
    customerPhone: apt.customerPhone,
    customerEmail: apt.customerEmail,
    customerNotes: apt.customerNotes,
    internalNotes: apt.internalNotes,
    reminder24hSent: apt.reminder24hSent,
    reminder2hSent: apt.reminder2hSent,
    createdAt: apt.createdAt.toISOString(),
    updatedAt: apt.updatedAt.toISOString(),
  };
}

/** Lista citas filtradas con cumplimiento multi-tenant estricto */
export async function listAppointments(scope: AppointmentScope, filters: AppointmentFilterParams = {}) {
  const where: Prisma.AppointmentWhereInput = {
    organizationId: scope.organizationId,
  };

  // Restricción Multi-Tenant obligatoria
  if (scope.isClientUser && scope.clientId) {
    where.clientId = scope.clientId;
  } else if (filters.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters.userId) {
    where.userId = filters.userId;
  }

  if (filters.leadId) {
    where.leadId = filters.leadId;
  }

  if (filters.status && filters.status !== "all") {
    where.status = filters.status;
  }

  if (filters.startDate || filters.endDate) {
    where.scheduledAt = {};
    if (filters.startDate) {
      where.scheduledAt.gte = new Date(filters.startDate);
    }
    if (filters.endDate) {
      where.scheduledAt.lte = new Date(filters.endDate);
    }
  }

  if (filters.search) {
    const q = filters.search.trim().toLowerCase();
    where.OR = [
      { title: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q, mode: "insensitive" } },
      { lead: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const [rows, allStatusCounts] = await Promise.all([
    prisma.appointment.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, companyName: true } },
        lead: { select: { id: true, name: true, phone: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    prisma.appointment.groupBy({
      by: ["status"],
      where: {
        organizationId: scope.organizationId,
        ...(scope.isClientUser && scope.clientId ? { clientId: scope.clientId } : {}),
      },
      _count: true,
    }),
  ]);

  const countsMap = allStatusCounts.reduce((acc: Record<string, number>, curr) => {
    acc[curr.status] = curr._count;
    return acc;
  }, {});

  const now = new Date();
  const upcomingCount = rows.filter(
    (r) => new Date(r.scheduledAt) >= now && r.status !== APPOINTMENT_STATUS.CANCELLED
  ).length;

  return {
    appointments: rows.map(toAppointmentDto),
    stats: {
      total: rows.length,
      upcoming: upcomingCount,
      completed: countsMap[APPOINTMENT_STATUS.COMPLETED] || 0,
      cancelled: countsMap[APPOINTMENT_STATUS.CANCELLED] || 0,
      noShow: countsMap[APPOINTMENT_STATUS.NO_SHOW] || 0,
    },
  };
}

/** Obtiene una cita por ID */
export async function getAppointmentById(scope: AppointmentScope, appointmentId: string) {
  const apt = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId: scope.organizationId,
      ...(scope.isClientUser && scope.clientId ? { clientId: scope.clientId } : {}),
    },
    include: {
      client: { select: { id: true, name: true, companyName: true } },
      lead: { select: { id: true, name: true, phone: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return apt ? toAppointmentDto(apt) : null;
}

/** Crea una nueva cita comercial */
export async function createAppointment(scope: AppointmentScope, input: CreateAppointmentInput) {
  const targetClientId = scope.isClientUser ? scope.clientId : input.clientId || null;

  // Si viene leadId, extraer datos del lead si no fueron provistos
  let customerName = input.customerName || null;
  let customerPhone = input.customerPhone || null;
  let customerEmail = input.customerEmail || null;

  if (input.leadId) {
    const lead = await prisma.lead.findFirst({
      where: { id: input.leadId, organizationId: scope.organizationId },
      select: { name: true, phone: true, email: true },
    });
    if (lead) {
      customerName = customerName || lead.name;
      customerPhone = customerPhone || lead.phone;
      customerEmail = customerEmail || lead.email;
    }
  }

  const scheduledDate = new Date(input.scheduledAt);

  const created = await prisma.appointment.create({
    data: {
      organizationId: scope.organizationId,
      clientId: targetClientId,
      leadId: input.leadId || null,
      userId: input.userId || scope.userId || null,
      title: input.title,
      description: input.description || null,
      scheduledAt: scheduledDate,
      durationMinutes: input.durationMinutes || APPOINTMENT_SLOT_MINUTES,
      status: APPOINTMENT_STATUS.SCHEDULED,
      locationType: input.locationType || "in_store",
      locationAddress: input.locationAddress || null,
      customerName,
      customerPhone,
      customerEmail,
      customerNotes: input.customerNotes || null,
      internalNotes: input.internalNotes || null,
    },
    include: {
      client: { select: { id: true, name: true, companyName: true } },
      lead: { select: { id: true, name: true, phone: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  // Opcional: Enviar confirmación inmediata por SMS si hay teléfono válido
  if (input.sendConfirmationSms && customerPhone) {
    const check = validateAndNormalizePhone(customerPhone);
    if (check.isValid && check.normalized) {
      const clientName = created.client?.name || "Bunker Agency";
      const formattedDate = scheduledDate.toLocaleDateString("es-US", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit",
      });
      const smsText = `Hola ${customerName || ""}, tu cita con ${clientName} ha sido programada con éxito para el ${formattedDate}. Si necesitas reprogramar, responde a este mensaje. Responde STOP para cancelar.`;
      
      await sendTwilioSms(check.normalized, smsText).catch((err) =>
        console.error("Error enviando SMS de confirmación de cita:", err)
      );
    }
  }

  // Auditoría
  await prisma.auditLog.create({
    data: {
      organizationId: scope.organizationId,
      userId: scope.userId || null,
      action: "appointment_created",
      entityType: "Appointment",
      entityId: created.id,
      detailsJson: JSON.stringify({
        title: created.title,
        scheduledAt: created.scheduledAt,
        clientId: targetClientId,
        leadId: input.leadId,
      }),
    },
  }).catch(() => {});

  return toAppointmentDto(created);
}

/** Actualiza una cita */
export async function updateAppointment(
  scope: AppointmentScope,
  appointmentId: string,
  input: UpdateAppointmentInput
) {
  const existing = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId: scope.organizationId,
      ...(scope.isClientUser && scope.clientId ? { clientId: scope.clientId } : {}),
    },
  });

  if (!existing) {
    throw new Error("Cita no encontrada o sin permisos de edición.");
  }

  const updated = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.scheduledAt ? { scheduledAt: new Date(input.scheduledAt) } : {}),
      ...(input.durationMinutes ? { durationMinutes: input.durationMinutes } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.locationType ? { locationType: input.locationType } : {}),
      ...(input.locationAddress !== undefined ? { locationAddress: input.locationAddress } : {}),
      ...(input.userId !== undefined ? { userId: input.userId } : {}),
      ...(input.internalNotes !== undefined ? { internalNotes: input.internalNotes } : {}),
    },
    include: {
      client: { select: { id: true, name: true, companyName: true } },
      lead: { select: { id: true, name: true, phone: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return toAppointmentDto(updated);
}

/** Cancela o elimina una cita */
export async function deleteAppointment(scope: AppointmentScope, appointmentId: string) {
  const existing = await prisma.appointment.findFirst({
    where: {
      id: appointmentId,
      organizationId: scope.organizationId,
      ...(scope.isClientUser && scope.clientId ? { clientId: scope.clientId } : {}),
    },
  });

  if (!existing) {
    throw new Error("Cita no encontrada o no autorizada.");
  }

  await prisma.appointment.delete({ where: { id: appointmentId } });
  return { success: true };
}

/** Obtiene la información pública de un cliente para su página de reservas */
export async function getPublicBookingClientInfo(slug: string): Promise<PublicBookingClientInfo | null> {
  const cleanSlug = slug.trim().toLowerCase();

  const client = await prisma.client.findFirst({
    where: {
      OR: [
        { bookingSlug: cleanSlug },
        { id: cleanSlug },
        { name: { equals: cleanSlug, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      companyName: true,
      logoUrl: true,
      bookingSlug: true,
      bookingTitle: true,
      bookingNotice: true,
      bookingDurationMin: true,
      phone: true,
    },
  });

  if (!client) return null;

  // Citas existentes en los próximos 14 días para bloquear horarios ocupados
  const now = new Date();
  const nextTwoWeeks = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  const existingBookings = await prisma.appointment.findMany({
    where: {
      clientId: client.id,
      scheduledAt: { gte: now, lte: nextTwoWeeks },
      status: { notIn: [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW] },
    },
    select: {
      scheduledAt: true,
      durationMinutes: true,
    },
  });

  return {
    id: client.id,
    name: client.name,
    companyName: client.companyName,
    logoUrl: client.logoUrl,
    bookingSlug: client.bookingSlug || client.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    bookingTitle: client.bookingTitle || `Reserva tu Cita con ${client.name}`,
    bookingNotice: client.bookingNotice || "Selecciona la fecha y horario que mejor se adapte a tu disponibilidad.",
    bookingDurationMin: APPOINTMENT_SLOT_MINUTES,
    phone: client.phone,
    existingBookings: existingBookings.map((b) => ({
      scheduledAt: b.scheduledAt.toISOString(),
      durationMinutes: b.durationMinutes,
    })),
  };
}

/** Crea una cita desde la página pública de reservas */
export async function createPublicBooking(slug: string, input: PublicBookingInput) {
  const cleanSlug = slug.trim().toLowerCase();

  const client = await prisma.client.findFirst({
    where: {
      OR: [
        { bookingSlug: cleanSlug },
        { id: cleanSlug },
        { name: { equals: cleanSlug, mode: "insensitive" } },
      ],
    },
    include: {
      organization: { select: { id: true } },
    },
  });

  if (!client) {
    throw new Error("Empresa no encontrada.");
  }

  const phoneCheck = validateAndNormalizePhone(input.customerPhone);
  if (!phoneCheck.isValid || !phoneCheck.normalized) {
    throw new Error("Por favor proporciona un número telefónico válido con código de país.");
  }

  const normalizedPhone = phoneCheck.normalized;
  const now = new Date();
  const scheduledDate = new Date(input.scheduledAt);

  if (Number.isNaN(scheduledDate.getTime()) || scheduledDate.getTime() <= now.getTime()) {
    throw new Error("Elige un horario que todavía no haya pasado.");
  }

  // La página muestra los bloques libres, pero otra persona pudo reservar el mismo mientras tanto:
  // se vuelve a comprobar aquí para no dar dos citas al mismo horario.
  const nearbyBookings = await prisma.appointment.findMany({
    where: {
      clientId: client.id,
      status: { notIn: [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW] },
      scheduledAt: {
        gte: new Date(scheduledDate.getTime() - MAX_APPOINTMENT_LOOKBEHIND_MS),
        lt: new Date(scheduledDate.getTime() + APPOINTMENT_SLOT_MINUTES * 60_000),
      },
    },
    select: { scheduledAt: true, durationMinutes: true },
  });
  const slotTaken = isSlotTaken(
    scheduledDate,
    APPOINTMENT_SLOT_MINUTES,
    nearbyBookings.map((b) => ({ scheduledAt: b.scheduledAt.toISOString(), durationMinutes: b.durationMinutes }))
  );
  if (slotTaken) {
    throw new Error("Ese horario ya fue reservado. Elige otro, por favor.");
  }

  // 1. Buscar o registrar el Lead en el CRM
  let lead = await prisma.lead.findFirst({
    where: {
      organizationId: client.organizationId,
      normalizedPhone,
    },
  });

  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        organizationId: client.organizationId,
        clientId: client.id,
        name: input.customerName,
        phone: phoneCheck.formatted || input.customerPhone,
        normalizedPhone,
        email: input.customerEmail || null,
        source: "booking_page",
        status: LEAD_STATUS.QUALIFIED,
        smsConsent: true,
        smsConsentAt: now,
        smsConsentSource: "booking_page",
        notes: `[${now.toISOString()}] Cita agendada desde enlace público`,
      },
    });
  } else {
    // Si ya existía, asociar al cliente si no tenía
    if (!lead.clientId) {
      await prisma.lead.update({
        where: { id: lead.id },
        data: { clientId: client.id },
      });
    }
  }

  // 2. Asignar un asesor disponible del cliente vía Round-Robin
  let assignedAdvisorId: string | null = null;
  const rrResult = await assignLeadRoundRobin(lead.id, { triggerInstantContact: false }).catch(() => null);
  if (rrResult?.success && rrResult.assignedAdvisorId) {
    assignedAdvisorId = rrResult.assignedAdvisorId;
  } else {
    const fallbackAdvisor = await prisma.user.findFirst({
      where: {
        clientId: client.id,
        isActive: true,
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, name: true },
    });
    assignedAdvisorId = fallbackAdvisor?.id || null;
  }

  // 3. Crear la Cita
  const appointment = await prisma.appointment.create({
    data: {
      organizationId: client.organizationId,
      clientId: client.id,
      leadId: lead.id,
      userId: assignedAdvisorId,
      title: `Cita con ${input.customerName} - ${client.name}`,
      description: input.customerNotes || null,
      scheduledAt: scheduledDate,
      durationMinutes: APPOINTMENT_SLOT_MINUTES,
      status: APPOINTMENT_STATUS.CONFIRMED,
      locationType: input.locationType || "in_store",
      locationAddress: "Showroom / Local Principal",
      customerName: input.customerName,
      customerPhone: normalizedPhone,
      customerEmail: input.customerEmail || null,
      customerNotes: input.customerNotes || null,
    },
  });

  // 4. Enviar SMS de confirmación instantáneo
  const formattedTime = scheduledDate.toLocaleDateString("es-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
  const smsBody = `Hola ${input.customerName}, tu cita con ${client.name} ha quedado confirmada para el ${formattedTime}. Te esperamos en nuestro local. Responde STOP para cancelar.`;

  await sendTwilioSms(normalizedPhone, smsBody).catch((err) =>
    console.error("Error enviando SMS de confirmación pública de cita:", err)
  );

  return toAppointmentDto(appointment);
}

/** Procesa y envía los recordatorios automáticos de 24h y 2h */
export async function processAppointmentReminders() {
  const now = new Date();
  const in24HoursMin = new Date(now.getTime() + 23 * 60 * 60 * 1000);
  const in24HoursMax = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const in2HoursMin = new Date(now.getTime() + 90 * 60 * 1000);
  const in2HoursMax = new Date(now.getTime() + 150 * 60 * 1000);

  // 1. Recordatorios de 24 Horas
  const appointments24h = await prisma.appointment.findMany({
    where: {
      status: { in: [APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.CONFIRMED] },
      scheduledAt: { gte: in24HoursMin, lte: in24HoursMax },
      reminder24hSent: false,
    },
    include: {
      client: { select: { name: true } },
    },
  });

  let sent24h = 0;
  for (const apt of appointments24h) {
    if (apt.customerPhone) {
      const timeStr = apt.scheduledAt.toLocaleTimeString("es-US", { hour: "numeric", minute: "2-digit" });
      const clientName = apt.client?.name || "Bunker";
      const msg = `Recordatorio: Mañana tienes tu cita con ${clientName} a las ${timeStr}. Te esperamos en ${apt.locationAddress || "nuestro local"}. Responde STOP para cancelar.`;
      
      await sendTwilioSms(apt.customerPhone, msg).catch(() => {});
      await prisma.appointment.update({
        where: { id: apt.id },
        data: { reminder24hSent: true },
      });
      sent24h++;
    }
  }

  // 2. Recordatorios de 2 Horas
  const appointments2h = await prisma.appointment.findMany({
    where: {
      status: { in: [APPOINTMENT_STATUS.SCHEDULED, APPOINTMENT_STATUS.CONFIRMED] },
      scheduledAt: { gte: in2HoursMin, lte: in2HoursMax },
      reminder2hSent: false,
    },
    include: {
      client: { select: { name: true } },
    },
  });

  let sent2h = 0;
  for (const apt of appointments2h) {
    if (apt.customerPhone) {
      const timeStr = apt.scheduledAt.toLocaleTimeString("es-US", { hour: "numeric", minute: "2-digit" });
      const clientName = apt.client?.name || "Bunker";
      const msg = `Tu cita con ${clientName} es hoy en 2 horas (${timeStr}). ¡Estamos listos para atenderte!`;

      await sendTwilioSms(apt.customerPhone, msg).catch(() => {});
      await prisma.appointment.update({
        where: { id: apt.id },
        data: { reminder2hSent: true },
      });
      sent2h++;
    }
  }

  return { sent24h, sent2h };
}
