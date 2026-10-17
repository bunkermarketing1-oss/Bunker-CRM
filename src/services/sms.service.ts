import { prisma } from "@/lib/prisma";
import { mapTwilioStatus, sendTwilioSms } from "@/lib/integrations/twilio";
import { isOptOutMessage } from "@/lib/integrations/twilio-webhook";
import { firstNameOf, renderSmsTemplate } from "@/lib/automations/sms-template";
import { ACTIVITY_TYPE } from "@/lib/constants/crm";
import { BULK_SMS_MAX_RECIPIENTS, MESSAGE_CHANNEL, MESSAGE_DIRECTION, MESSAGE_STATUS } from "@/lib/constants/messaging";
import type { BulkSmsFilter } from "@/lib/validations/sms";
import type { TenantScope } from "@/types/tenant";
import type { BulkSmsPreview, BulkSmsResult } from "@/types/sms";

// ---------------------------------------------------------------------------
// Historial
// ---------------------------------------------------------------------------

/** Historial de SMS. Para un usuario CLIENT el scope ya trae su clientId forzado. */
export async function listSmsMessages(scope: TenantScope, filters: { clientId?: string | null; leadId?: string | null }) {
  return prisma.message.findMany({
    where: {
      organizationId: scope.organizationId,
      channel: MESSAGE_CHANNEL.SMS,
      ...(scope.clientId ? { clientId: scope.clientId } : filters.clientId ? { clientId: filters.clientId } : {}),
      ...(filters.leadId ? { leadId: filters.leadId } : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      client: { select: { id: true, name: true, phone: true } },
      lead: { select: { id: true, name: true, phone: true } },
      contact: { select: { id: true, firstName: true, phone: true } },
    },
    take: 100,
  });
}

// ---------------------------------------------------------------------------
// Bajas
// ---------------------------------------------------------------------------

/**
 * La baja es del número, no del registro: si la persona vuelve a llenar un formulario se
 * crea otro lead con el mismo teléfono y tampoco se le debe escribir.
 */
export async function isPhoneOptedOut(organizationId: string, normalizedPhone: string) {
  const optedOut = await prisma.lead.findFirst({
    where: { organizationId, normalizedPhone, smsOptOutAt: { not: null } },
    select: { id: true },
  });
  return Boolean(optedOut);
}

// ---------------------------------------------------------------------------
// Webhooks de Twilio
// ---------------------------------------------------------------------------

export interface InboundSms {
  from: string; // E.164 del lead
  body: string;
  messageSid: string;
}

/**
 * A qué conversación pertenece un SMS entrante: el último SMS que le enviamos a ese
 * número o, si nunca le escribimos, el lead más reciente con ese teléfono.
 */
async function findConversation(from: string) {
  const lastOutbound = await prisma.message.findFirst({
    where: { recipient: from, direction: MESSAGE_DIRECTION.OUTBOUND, channel: MESSAGE_CHANNEL.SMS },
    orderBy: { createdAt: "desc" },
    select: { organizationId: true, leadId: true, clientId: true, contactId: true },
  });
  if (lastOutbound) return lastOutbound;

  const lead = await prisma.lead.findFirst({
    where: { normalizedPhone: from, isDeleted: false },
    orderBy: { createdAt: "desc" },
    select: { id: true, organizationId: true, clientId: true },
  });
  return lead ? { organizationId: lead.organizationId, leadId: lead.id, clientId: lead.clientId, contactId: null } : null;
}

/**
 * Guarda la respuesta del lead en su historial y, si pidió la baja, la registra.
 * `matched: false` = número desconocido: no se guarda porque no hay organización a la cual
 * asignarlo (el número de Twilio es compartido).
 */
export async function recordInboundSms(sms: InboundSms) {
  // Twilio reintenta si no respondimos a tiempo: el MessageSid evita duplicados.
  const duplicate = await prisma.message.findFirst({ where: { providerMsgId: sms.messageSid }, select: { id: true } });
  if (duplicate) return { matched: true, optedOut: false };

  const conversation = await findConversation(sms.from);
  if (!conversation) return { matched: false, optedOut: false };

  await prisma.message.create({
    data: {
      organizationId: conversation.organizationId,
      clientId: conversation.clientId,
      leadId: conversation.leadId,
      contactId: conversation.contactId,
      channel: MESSAGE_CHANNEL.SMS,
      direction: MESSAGE_DIRECTION.INBOUND,
      // En los entrantes `recipient` guarda el número del lead (la contraparte), igual que
      // en los salientes: así toda la conversación con un número comparte el mismo valor.
      recipient: sms.from,
      body: sms.body,
      status: MESSAGE_STATUS.DELIVERED,
      providerMsgId: sms.messageSid,
      deliveredAt: new Date(),
    },
  });

  if (conversation.leadId || conversation.clientId) {
    await prisma.activity.create({
      data: {
        clientId: conversation.clientId,
        leadId: conversation.leadId,
        contactId: conversation.contactId,
        type: ACTIVITY_TYPE.SMS,
        title: `SMS recibido de ${sms.from}`,
        description: sms.body,
        outcome: "completed",
      },
    });
  }

  const optedOut = isOptOutMessage(sms.body);
  if (optedOut) {
    const { count } = await prisma.lead.updateMany({
      where: { organizationId: conversation.organizationId, normalizedPhone: sms.from, smsOptOutAt: null },
      data: { smsOptOutAt: new Date() },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: conversation.organizationId,
        action: "lead_sms_opt_out",
        entityType: "Lead",
        entityId: conversation.leadId,
        detailsJson: JSON.stringify({ phone: sms.from, leads: count, body: sms.body }),
      },
    });
  }

  return { matched: true, optedOut };
}

// Los callbacks pueden llegar desordenados ("sent" después de "delivered"): un estado
// nunca retrocede.
const STATUS_RANK: Record<string, number> = {
  [MESSAGE_STATUS.PENDING]: 0,
  [MESSAGE_STATUS.UNKNOWN]: 0,
  [MESSAGE_STATUS.SENT]: 1,
  [MESSAGE_STATUS.DELIVERED]: 2,
  [MESSAGE_STATUS.FAILED]: 2,
};

/** Aplica el callback de estado de Twilio al mensaje enviado. */
export async function applyTwilioStatus(messageSid: string, twilioStatus: string, errorCode?: string | null) {
  const status = mapTwilioStatus(twilioStatus);
  if (!status) return false;

  const message = await prisma.message.findFirst({
    where: { providerMsgId: messageSid, direction: MESSAGE_DIRECTION.OUTBOUND },
    select: { id: true, status: true },
  });
  if (!message || (STATUS_RANK[message.status] ?? 0) > STATUS_RANK[status]) return false;

  await prisma.message.update({
    where: { id: message.id },
    data: {
      status,
      deliveredAt: status === MESSAGE_STATUS.DELIVERED ? new Date() : undefined,
      // Códigos: https://www.twilio.com/docs/api/errors (p. ej. 30003 = teléfono apagado).
      errorMessage: status === MESSAGE_STATUS.FAILED ? `Twilio reportó "${twilioStatus}"${errorCode ? ` (código ${errorCode})` : ""}.` : undefined,
    },
  });
  return true;
}

// ---------------------------------------------------------------------------
// Envío masivo
// ---------------------------------------------------------------------------

function bulkLeadWhere(organizationId: string, filter: BulkSmsFilter) {
  return {
    organizationId,
    isDeleted: false,
    ...(filter.clientId ? { clientId: filter.clientId } : {}),
    ...(filter.statuses.length ? { status: { in: filter.statuses } } : {}),
    ...(filter.sources.length ? { source: { in: filter.sources } } : {}),
  };
}

async function optedOutPhones(organizationId: string) {
  const rows = await prisma.lead.findMany({
    where: { organizationId, smsOptOutAt: { not: null }, normalizedPhone: { not: null } },
    select: { normalizedPhone: true },
  });
  return new Set(rows.map((r) => r.normalizedPhone as string));
}

/**
 * Destinatarios del envío masivo: un SMS por número (dos leads con el mismo teléfono
 * reciben uno solo), sin teléfono válido ni números dados de baja.
 */
async function resolveBulkRecipients(organizationId: string, filter: BulkSmsFilter) {
  const leads = await prisma.lead.findMany({
    where: bulkLeadWhere(organizationId, filter),
    select: { id: true, name: true, normalizedPhone: true, clientId: true, campaign: true, client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const blocked = await optedOutPhones(organizationId);

  const seen = new Set<string>();
  const recipients: typeof leads = [];
  let withoutPhone = 0;
  let optedOut = 0;
  let duplicates = 0;
  for (const lead of leads) {
    if (!lead.normalizedPhone) withoutPhone++;
    else if (blocked.has(lead.normalizedPhone)) optedOut++;
    else if (seen.has(lead.normalizedPhone)) duplicates++;
    else {
      seen.add(lead.normalizedPhone);
      recipients.push(lead);
    }
  }
  return { recipients, matched: leads.length, withoutPhone, optedOut, duplicates };
}

export async function previewBulkSms(organizationId: string, filter: BulkSmsFilter): Promise<BulkSmsPreview> {
  const { recipients, matched, withoutPhone, optedOut, duplicates } = await resolveBulkRecipients(organizationId, filter);
  return {
    matched,
    eligible: recipients.length,
    skipped: { withoutPhone, optedOut, duplicates },
    maxRecipients: BULK_SMS_MAX_RECIPIENTS,
  };
}

/** El envío supera el tope por lote (la ruta responde 400). */
export class BulkSmsLimitError extends Error {
  constructor(eligible: number) {
    super(`El envío tiene ${eligible} destinatarios y el máximo por lote es ${BULK_SMS_MAX_RECIPIENTS}. Ajusta los filtros.`);
  }
}

export async function sendBulkSms(
  organizationId: string,
  userId: string,
  filter: BulkSmsFilter,
  template: string
): Promise<BulkSmsResult> {
  const { recipients, matched, withoutPhone, optedOut, duplicates } = await resolveBulkRecipients(organizationId, filter);
  if (recipients.length > BULK_SMS_MAX_RECIPIENTS) throw new BulkSmsLimitError(recipients.length);

  let sent = 0;
  let failed = 0;
  // Secuencial a propósito: Twilio encola por número remitente y un lote en paralelo solo
  // provoca errores 429. Con el tope por lote el envío cabe en el maxDuration de la ruta.
  for (const lead of recipients) {
    const phone = lead.normalizedPhone as string;
    const body = renderSmsTemplate(template, {
      nombre: firstNameOf(lead.name),
      nombre_completo: lead.name,
      cliente: lead.client?.name,
      campana: lead.campaign,
    });
    const result = await sendTwilioSms(phone, body);
    if (result.status === MESSAGE_STATUS.SENT) sent++;
    else failed++;

    await prisma.message.create({
      data: {
        organizationId,
        clientId: lead.clientId,
        leadId: lead.id,
        channel: MESSAGE_CHANNEL.SMS,
        direction: MESSAGE_DIRECTION.OUTBOUND,
        recipient: phone,
        body,
        status: result.status,
        providerMsgId: result.providerMsgId,
        errorMessage: result.errorMessage,
        isDemo: result.isDemo,
      },
    });
    await prisma.activity.create({
      data: {
        clientId: lead.clientId,
        leadId: lead.id,
        userId,
        type: ACTIVITY_TYPE.SMS,
        title: "SMS masivo",
        description: body,
        outcome: result.status === MESSAGE_STATUS.SENT ? "completed" : "pending",
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action: "bulk_sms_sent",
      entityType: "Message",
      detailsJson: JSON.stringify({ filter, template, matched, sent, failed, skipped: { withoutPhone, optedOut, duplicates } }),
    },
  });

  return { matched, sent, failed, skipped: { withoutPhone, optedOut, duplicates } };
}
