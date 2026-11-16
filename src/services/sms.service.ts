import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { clientBelongsToOrg } from "@/lib/validation-helpers";
import { validateAndNormalizePhone } from "@/lib/phone";
import { humanizeTwilioError, mapTwilioStatus, sendTwilioSms } from "@/lib/integrations/twilio";
import { isOptInMessage, isOptOutMessage, normalizeSmsKeyword } from "@/lib/integrations/twilio-webhook";
import { firstNameOf, renderSmsTemplate } from "@/lib/automations/sms-template";
import { replyOutOfHoursWithAi, type AiReplyOutcome } from "@/services/ai-reply.service";
import { planBulkRecipients, resolveReplyTarget, shouldApplyStatus, smsDedupKey, type ReplyTarget } from "@/lib/messaging/sms-rules";
import { ACTIVITY_OUTCOME, ACTIVITY_TYPE } from "@/lib/constants/crm";
import {
  BULK_SMS_MAX_RECIPIENTS,
  BULK_SMS_RESEND_WINDOW_HOURS,
  MANUAL_SMS_DUPLICATE_WINDOW_MS,
  MESSAGE_CHANNEL,
  MESSAGE_DIRECTION,
  MESSAGE_STATUS,
  MESSAGE_STATUS_RANK,
  SMS_AUDIT_ACTION,
  SMS_REPLY_WINDOW_DAYS,
} from "@/lib/constants/messaging";
import type { BulkSmsFilter, ManualSmsInput } from "@/lib/validations/sms";
import type { TenantScope } from "@/types/tenant";
import type { BulkSmsPreview, BulkSmsResult } from "@/types/sms";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

// Código de Prisma para una violación de índice único: https://www.prisma.io/docs/orm/reference/error-reference#p2002
const PRISMA_UNIQUE_VIOLATION = "P2002";

function isUniqueViolation(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_UNIQUE_VIOLATION;
}

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
//
// La baja es del número y es global: el número de Twilio lo comparten todas las
// organizaciones, así que quien respondió BAJA no debe recibir SMS de ningún cliente, sea
// lead, contacto o un número escrito a mano. Por eso estas consultas no filtran por
// organización (es la única excepción a la regla multi-tenant de los services, a propósito).
// `SmsOptOut` es la fuente de verdad; `Lead.smsOptOutAt` se mantiene sincronizado solo para
// mostrar la baja en la ficha del lead, y también se consulta como respaldo por si alguna
// baja quedó solo en el lead (anterior a la tabla o marcada a mano).

/** El número (E.164) pidió no recibir SMS. Lo usan el SMS manual, el masivo y las automatizaciones. */
export async function isPhoneOptedOut(phone: string) {
  const [optOut, lead] = await Promise.all([
    prisma.smsOptOut.findUnique({ where: { phone }, select: { id: true } }),
    prisma.lead.findFirst({ where: { normalizedPhone: phone, smsOptOutAt: { not: null } }, select: { id: true } }),
  ]);
  return Boolean(optOut || lead);
}

/** De una lista de números, los que están dados de baja. */
async function optedOutPhonesAmong(phones: string[]) {
  if (!phones.length) return new Set<string>();
  const [optOuts, leads] = await Promise.all([
    prisma.smsOptOut.findMany({ where: { phone: { in: phones } }, select: { phone: true } }),
    prisma.lead.findMany({
      where: { normalizedPhone: { in: phones }, smsOptOutAt: { not: null } },
      select: { normalizedPhone: true },
    }),
  ]);
  return new Set([...optOuts.map((o) => o.phone), ...leads.map((l) => l.normalizedPhone as string)]);
}

interface KeywordContext {
  phone: string;
  keyword: string;
  /** Organización de la conversación, si el número es conocido. */
  organizationId: string | null;
  leadId: string | null;
}

async function recordOptOut(ctx: KeywordContext) {
  // `update: {}` conserva la fecha y la palabra de la primera baja.
  await prisma.smsOptOut.upsert({
    where: { phone: ctx.phone },
    create: { phone: ctx.phone, keyword: ctx.keyword, organizationId: ctx.organizationId },
    update: {},
  });
  const { count } = await prisma.lead.updateMany({
    where: { normalizedPhone: ctx.phone, smsOptOutAt: null },
    data: { smsOptOutAt: new Date() },
  });
  // AuditLog exige organización: un número desconocido queda registrado solo en SmsOptOut.
  if (ctx.organizationId) {
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        action: SMS_AUDIT_ACTION.OPT_OUT,
        entityType: "SmsOptOut",
        entityId: ctx.leadId,
        detailsJson: JSON.stringify({ phone: ctx.phone, keyword: ctx.keyword, leads: count }),
      },
    });
  }
}

/** Quita la baja del número. Devuelve false si no estaba dado de baja (no hay nada que confirmar). */
async function recordOptIn(ctx: KeywordContext) {
  const previous = await prisma.smsOptOut.findUnique({ where: { phone: ctx.phone }, select: { organizationId: true } });
  const removed = await prisma.smsOptOut.deleteMany({ where: { phone: ctx.phone } });
  const { count } = await prisma.lead.updateMany({
    where: { normalizedPhone: ctx.phone, smsOptOutAt: { not: null } },
    data: { smsOptOutAt: null },
  });
  if (!removed.count && !count) return false;

  const auditOrganizationId = ctx.organizationId ?? previous?.organizationId ?? null;
  if (auditOrganizationId) {
    await prisma.auditLog.create({
      data: {
        organizationId: auditOrganizationId,
        action: SMS_AUDIT_ACTION.OPT_IN,
        entityType: "SmsOptOut",
        entityId: ctx.leadId,
        detailsJson: JSON.stringify({ phone: ctx.phone, keyword: ctx.keyword, leads: count }),
      },
    });
  }
  return true;
}

// ---------------------------------------------------------------------------
// Webhooks de Twilio
// ---------------------------------------------------------------------------

export interface InboundSms {
  from: string; // E.164 del lead
  body: string;
  messageSid: string;
}

export interface InboundSmsOutcome {
  matched: boolean;
  /** Twilio reintentó un SMS que ya estaba guardado: no se guarda ni se contesta otra vez. */
  duplicate: boolean;
  optedOut: boolean;
  /** Se quitó una baja vigente (START/ALTA). */
  optedIn: boolean;
  /** null = no se evaluó (número desconocido) o el asistente falló. */
  aiReply: AiReplyOutcome | null;
}

/**
 * A qué conversación pertenece un SMS entrante: los SMS que le enviamos a ese número en
 * los últimos SMS_REPLY_WINDOW_DAYS días o, si no hay, los leads con ese teléfono. Si los
 * candidatos son de varios clientes u organizaciones, `resolveReplyTarget` no lo asocia a
 * ningún lead (ver la regla allí).
 */
async function findConversation(from: string): Promise<ReplyTarget | null> {
  const outbound = await prisma.message.findMany({
    where: {
      recipient: from,
      direction: MESSAGE_DIRECTION.OUTBOUND,
      channel: MESSAGE_CHANNEL.SMS,
      createdAt: { gte: new Date(Date.now() - SMS_REPLY_WINDOW_DAYS * DAY_MS) },
    },
    orderBy: { createdAt: "desc" },
    select: { organizationId: true, leadId: true, clientId: true, contactId: true },
    take: 50,
  });
  if (outbound.length) return resolveReplyTarget(outbound);

  const leads = await prisma.lead.findMany({
    where: { normalizedPhone: from, isDeleted: false },
    orderBy: { createdAt: "desc" },
    select: { id: true, organizationId: true, clientId: true },
    take: 50,
  });
  return resolveReplyTarget(leads.map((l) => ({ organizationId: l.organizationId, clientId: l.clientId, leadId: l.id, contactId: null })));
}

/** Guarda la respuesta en el historial. false = Twilio la reintentó y ya estaba guardada. */
async function saveInboundMessage(sms: InboundSms, target: ReplyTarget) {
  try {
    await prisma.message.create({
      data: {
        organizationId: target.organizationId,
        clientId: target.clientId,
        leadId: target.leadId,
        contactId: target.contactId,
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
  } catch (error) {
    // Twilio reintenta si no respondimos a tiempo; el índice único de providerMsgId lo frena
    // aunque los dos intentos lleguen a la vez.
    if (isUniqueViolation(error)) return false;
    throw error;
  }

  if (target.ambiguous) {
    await prisma.auditLog.create({
      data: {
        organizationId: target.organizationId,
        action: SMS_AUDIT_ACTION.INBOUND_AMBIGUOUS,
        entityType: "Message",
        detailsJson: JSON.stringify({ phone: sms.from, messageSid: sms.messageSid }),
      },
    });
  } else if (target.leadId || target.clientId) {
    await prisma.activity.create({
      data: {
        clientId: target.clientId,
        leadId: target.leadId,
        contactId: target.contactId,
        type: ACTIVITY_TYPE.SMS,
        title: `SMS recibido de ${sms.from}`,
        description: sms.body,
        outcome: ACTIVITY_OUTCOME.COMPLETED,
      },
    });
  }
  return true;
}

/**
 * Guarda la respuesta del lead en su historial y aplica BAJA/ALTA. Un número desconocido no
 * se guarda en el historial (no hay organización a la cual asignarlo), pero su baja sí se
 * registra: la baja es global y debe valer aunque el número aparezca después.
 */
export async function recordInboundSms(sms: InboundSms): Promise<InboundSmsOutcome> {
  const target = await findConversation(sms.from);
  // Aun si es un reintento se aplica la palabra clave (es idempotente): si el primer intento
  // guardó el mensaje y falló antes de registrar la baja, el reintento la completa.
  const duplicate = target ? !(await saveInboundMessage(sms, target)) : false;

  const ctx: KeywordContext = {
    phone: sms.from,
    keyword: normalizeSmsKeyword(sms.body),
    organizationId: target?.organizationId ?? null,
    leadId: target?.leadId ?? null,
  };
  const optedOut = isOptOutMessage(sms.body);
  if (optedOut) await recordOptOut(ctx);
  const isOptIn = !optedOut && isOptInMessage(sms.body);
  const optedIn = isOptIn ? await recordOptIn(ctx) : false;

  const aiReply = target ? await tryAiReply(sms, target, duplicate, optedOut || isOptIn) : null;
  return { matched: Boolean(target), duplicate, optedOut, optedIn, aiReply };
}

/**
 * Respuesta de IA fuera de horario. Nunca lanza: el SMS entrante ya quedó guardado y un
 * 5xx haría que Twilio reintente (el reintento llega como duplicado y no se contesta).
 */
async function tryAiReply(sms: InboundSms, target: ReplyTarget, duplicate: boolean, isKeyword: boolean) {
  try {
    // La baja se consulta solo si hay algo que contestar: ahorra una consulta por SMS.
    const mayReply = !duplicate && !isKeyword && !target.ambiguous && Boolean(target.leadId && target.clientId);
    const optedOut = mayReply ? await isPhoneOptedOut(sms.from) : false;
    return await replyOutOfHoursWithAi({ from: sms.from, body: sms.body, target, duplicate, isKeyword, optedOut });
  } catch (error) {
    console.error("Asistente IA: no se pudo procesar la respuesta automática.", error instanceof Error ? error.message : error);
    return null;
  }
}

/**
 * Aplica el callback de estado de Twilio al mensaje enviado. Si el callback llega antes de
 * que el SID quede guardado, se pierde (Twilio no reintenta los status callbacks); el envío
 * crea el Message antes de llamar a Twilio para que esa ventana sea mínima.
 */
export async function applyTwilioStatus(messageSid: string, twilioStatus: string, errorCode?: string | null) {
  const status = mapTwilioStatus(twilioStatus);
  if (!status) return false;

  const message = await prisma.message.findFirst({
    where: { providerMsgId: messageSid, direction: MESSAGE_DIRECTION.OUTBOUND },
    select: { id: true, status: true },
  });
  if (!message || !shouldApplyStatus(MESSAGE_STATUS_RANK, message.status, status)) return false;

  // Condicionado al estado leído: dos callbacks simultáneos no se pisan.
  const { count } = await prisma.message.updateMany({
    where: { id: message.id, status: message.status },
    data: {
      status,
      deliveredAt: status === MESSAGE_STATUS.DELIVERED ? new Date() : undefined,
      // Códigos: https://www.twilio.com/docs/api/errors (p. ej. 30003 = teléfono apagado).
      errorMessage:
        status === MESSAGE_STATUS.FAILED
          ? humanizeTwilioError(
              errorCode ? parseInt(errorCode, 10) : undefined,
              `Twilio reportó "${twilioStatus}"${errorCode ? ` (código ${errorCode})` : ""}`
            )
          : undefined,
    },
  });
  return count > 0;
}

// ---------------------------------------------------------------------------
// Envío masivo
// ---------------------------------------------------------------------------

function bulkLeadWhere(organizationId: string, filter: BulkSmsFilter) {
  return {
    organizationId,
    isDeleted: false,
    smsConsent: { not: false },
    ...(filter.clientId ? { clientId: filter.clientId } : {}),
    ...(filter.statuses.length ? { status: { in: filter.statuses } } : {}),
    ...(filter.sources.length ? { source: { in: filter.sources } } : {}),
  };
}

/** Claves (número + texto) de los SMS que la organización mandó en la ventana de reenvío. */
async function recentSmsKeys(organizationId: string, phones: string[]) {
  if (!phones.length) return new Set<string>();
  const rows = await prisma.message.findMany({
    where: {
      organizationId,
      channel: MESSAGE_CHANNEL.SMS,
      direction: MESSAGE_DIRECTION.OUTBOUND,
      recipient: { in: phones },
      // Los demo (sin credenciales) no llegaron a nadie: no bloquean el reenvío.
      isDemo: false,
      createdAt: { gte: new Date(Date.now() - BULK_SMS_RESEND_WINDOW_HOURS * HOUR_MS) },
    },
    select: { recipient: true, body: true },
  });
  return new Set(rows.map((r) => smsDedupKey(r.recipient, r.body)));
}

async function resolveBulkRecipients(organizationId: string, filter: BulkSmsFilter, template: string) {
  const leads = await prisma.lead.findMany({
    where: bulkLeadWhere(organizationId, filter),
    select: { id: true, name: true, normalizedPhone: true, clientId: true, campaign: true, client: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  const phones = Array.from(new Set(leads.map((l) => l.normalizedPhone).filter((p): p is string => Boolean(p))));
  const [blocked, recent] = await Promise.all([optedOutPhonesAmong(phones), recentSmsKeys(organizationId, phones)]);

  const plan = planBulkRecipients(leads, blocked, recent, (lead) =>
    renderSmsTemplate(template, {
      nombre: firstNameOf(lead.name),
      nombre_completo: lead.name,
      cliente: lead.client?.name,
      campana: lead.campaign,
    })
  );
  const skipped = {
    withoutPhone: plan.withoutPhone,
    optedOut: plan.optedOut,
    duplicates: plan.duplicates,
    recentlySent: plan.recentlySent,
  };
  return { recipients: plan.recipients, matched: leads.length, skipped };
}

export async function previewBulkSms(organizationId: string, filter: BulkSmsFilter, template: string): Promise<BulkSmsPreview> {
  const { recipients, matched, skipped } = await resolveBulkRecipients(organizationId, filter, template);
  return { matched, eligible: recipients.length, skipped, maxRecipients: BULK_SMS_MAX_RECIPIENTS };
}

/** El envío supera el tope por lote (la ruta responde 400). */
export class BulkSmsLimitError extends Error {
  constructor(eligible: number) {
    super(`El envío tiene ${eligible} destinatarios y el máximo por lote es ${BULK_SMS_MAX_RECIPIENTS}. Ajusta los filtros.`);
  }
}

/** La clave del lote ya se usó: el envío se hizo o sigue en curso (la ruta responde 409). */
export class BulkSmsBatchReusedError extends Error {
  constructor() {
    super("Este envío ya se procesó o sigue en curso. Revisa el historial antes de enviar otra vez.");
  }
}

interface BulkRecipientInput {
  organizationId: string;
  userId: string;
  batchId: string;
  leadId: string;
  clientId: string | null;
  phone: string;
  body: string;
}

type BulkRecipientOutcome = "sent" | "failed" | "claimed";

/**
 * Un destinatario del masivo. El Message se crea ANTES de llamar a Twilio: el índice único
 * (organización, lote, número) hace que dos ejecuciones del mismo lote no le manden dos SMS,
 * y el historial refleja cada envío aunque el lote se corte a la mitad. Nunca lanza: un
 * destinatario con error no detiene a los demás.
 */
async function sendBulkRecipient(input: BulkRecipientInput): Promise<BulkRecipientOutcome> {
  let messageId: string;
  try {
    const claim = await prisma.message.create({
      data: {
        organizationId: input.organizationId,
        clientId: input.clientId,
        leadId: input.leadId,
        channel: MESSAGE_CHANNEL.SMS,
        direction: MESSAGE_DIRECTION.OUTBOUND,
        recipient: input.phone,
        body: input.body,
        status: MESSAGE_STATUS.PENDING,
        bulkBatchId: input.batchId,
      },
      select: { id: true },
    });
    messageId = claim.id;
  } catch (error) {
    if (isUniqueViolation(error)) return "claimed";
    // Sin registro no se envía: un SMS que no queda en el historial podría repetirse.
    console.error("sendBulkSms: no se pudo registrar el destinatario", error);
    return "failed";
  }

  const result = await sendTwilioSms(input.phone, input.body);
  try {
    await prisma.message.update({
      where: { id: messageId },
      data: {
        status: result.status,
        providerMsgId: result.providerMsgId,
        errorMessage: result.errorMessage,
        isDemo: result.isDemo,
      },
    });
    await prisma.activity.create({
      data: {
        clientId: input.clientId,
        leadId: input.leadId,
        userId: input.userId,
        type: ACTIVITY_TYPE.SMS,
        title: "SMS masivo",
        description: input.body,
        outcome: result.status === MESSAGE_STATUS.SENT ? ACTIVITY_OUTCOME.COMPLETED : ACTIVITY_OUTCOME.PENDING,
      },
    });
  } catch (error) {
    // El SMS ya salió (o falló en Twilio): se cuenta según Twilio aunque el registro quede pendiente.
    console.error("sendBulkSms: no se pudo actualizar el mensaje", error);
  }
  return result.status === MESSAGE_STATUS.SENT ? "sent" : "failed";
}

export async function sendBulkSms(
  organizationId: string,
  userId: string,
  filter: BulkSmsFilter,
  template: string,
  batchId: string
): Promise<BulkSmsResult> {
  const reused = await prisma.message.findFirst({ where: { organizationId, bulkBatchId: batchId }, select: { id: true } });
  if (reused) throw new BulkSmsBatchReusedError();

  const { recipients, matched, skipped } = await resolveBulkRecipients(organizationId, filter, template);
  if (recipients.length > BULK_SMS_MAX_RECIPIENTS) throw new BulkSmsLimitError(recipients.length);

  const counts: Record<BulkRecipientOutcome, number> = { sent: 0, failed: 0, claimed: 0 };
  try {
    // Secuencial a propósito: Twilio encola por número remitente y un lote en paralelo solo
    // provoca errores 429. Con el tope por lote el envío cabe en el maxDuration de la ruta.
    for (const { lead, phone, body } of recipients) {
      const outcome = await sendBulkRecipient({ organizationId, userId, batchId, leadId: lead.id, clientId: lead.clientId, phone, body });
      counts[outcome]++;
    }
  } finally {
    // También si el lote se corta: el AuditLog dice cuántos alcanzaron a salir.
    await prisma.auditLog
      .create({
        data: {
          organizationId,
          userId,
          action: SMS_AUDIT_ACTION.BULK_SENT,
          entityType: "Message",
          entityId: batchId,
          detailsJson: JSON.stringify({
            batchId,
            filter,
            template,
            matched,
            planned: recipients.length,
            sent: counts.sent,
            failed: counts.failed,
            alreadyClaimed: counts.claimed,
            skipped,
          }),
        },
      })
      .catch((error) => console.error("sendBulkSms: no se pudo guardar el AuditLog", error));
  }

  return { batchId, matched, sent: counts.sent, failed: counts.failed, alreadyClaimed: counts.claimed, skipped };
}

// ---------------------------------------------------------------------------
// SMS manual
// ---------------------------------------------------------------------------

/** El SMS manual no se puede enviar (la ruta responde con `status`). */
export class SmsTargetError extends Error {
  constructor(message: string, public status: 400 | 403 | 404 | 409 | 429) {
    super(message);
  }
}

export interface ManualSmsTargetInput {
  recipient?: string | null;
  leadId?: string | null;
  clientId?: string | null;
  contactId?: string | null;
}

/**
 * A quién y bajo qué cliente se registra un SMS manual. Todo ID del body debe ser de la
 * organización. Un usuario CLIENT solo escribe a leads o contactos de su empresa, y al
 * número que tienen guardado: el navegador no puede elegir un número arbitrario.
 */
export async function resolveManualSmsTarget(scope: TenantScope, input: ManualSmsTargetInput) {
  const { organizationId } = scope;
  const lead = input.leadId
    ? await prisma.lead.findFirst({
        where: { id: input.leadId, organizationId, isDeleted: false },
        select: { id: true, clientId: true, phone: true, normalizedPhone: true },
      })
    : null;
  if (input.leadId && !lead) throw new SmsTargetError("Lead no encontrado.", 404);

  const contact = input.contactId
    ? await prisma.contact.findFirst({
        where: { id: input.contactId, organizationId, isDeleted: false },
        select: { id: true, clientId: true, phone: true },
      })
    : null;
  if (input.contactId && !contact) throw new SmsTargetError("Contacto no encontrado.", 404);

  if (scope.clientId) {
    if (!lead && !contact) throw new SmsTargetError("Selecciona un lead o contacto de tu empresa.", 400);
    const owned = [lead, contact].filter(Boolean).every((r) => r!.clientId === scope.clientId);
    if (!owned) throw new SmsTargetError("Solo puedes enviar SMS a leads y contactos de tu empresa.", 403);
    const phone = lead?.normalizedPhone || lead?.phone || contact?.phone;
    if (!phone) throw new SmsTargetError("El lead no tiene teléfono registrado.", 400);
    return { recipient: phone, clientId: scope.clientId, leadId: lead?.id ?? null, contactId: contact?.id ?? null };
  }

  if (input.clientId && !(await clientBelongsToOrg(organizationId, input.clientId))) {
    throw new SmsTargetError("Cliente no encontrado.", 404);
  }
  return {
    recipient: input.recipient || lead?.normalizedPhone || lead?.phone || contact?.phone || null,
    // Sin clientId explícito se hereda del lead: así el SMS aparece en el portal del cliente.
    clientId: input.clientId || lead?.clientId || contact?.clientId || null,
    leadId: lead?.id ?? null,
    contactId: contact?.id ?? null,
  };
}

/** Lo que la API devuelve de un SMS: sin filas completas de cliente ni lead. */
const SENT_MESSAGE_SELECT = {
  id: true,
  channel: true,
  direction: true,
  recipient: true,
  body: true,
  status: true,
  errorMessage: true,
  isDemo: true,
  deliveredAt: true,
  createdAt: true,
  clientId: true,
  leadId: true,
  contactId: true,
  client: { select: { id: true, name: true } },
  lead: { select: { id: true, name: true } },
} satisfies Prisma.MessageSelect;

/**
 * Envía un SMS manual. El número siempre sale y se guarda en E.164: así coincide con
 * `Lead.normalizedPhone`, con la baja (SmsOptOut) y con el `From` de la respuesta entrante.
 */
export async function sendManualSms(scope: TenantScope, userId: string, input: ManualSmsInput) {
  const target = await resolveManualSmsTarget(scope, input);
  if (!target.recipient?.trim()) throw new SmsTargetError("El número telefónico destinatario es obligatorio.", 400);

  const phone = validateAndNormalizePhone(target.recipient).normalized;
  if (!phone) throw new SmsTargetError("El formato del número telefónico no es válido (ej. +525549123011).", 400);

  const mediaUrl = input.mediaUrl || null;
  const body = input.message && mediaUrl ? `${input.message}\n${mediaUrl}` : (mediaUrl || input.message);
  const duplicate = await prisma.message.findFirst({
    where: {
      organizationId: scope.organizationId,
      channel: MESSAGE_CHANNEL.SMS,
      direction: MESSAGE_DIRECTION.OUTBOUND,
      recipient: phone,
      body,
      createdAt: { gte: new Date(Date.now() - MANUAL_SMS_DUPLICATE_WINDOW_MS) },
    },
    select: { id: true },
  });
  if (duplicate) {
    throw new SmsTargetError(
      "Prevención de duplicados: un mensaje con el mismo contenido fue enviado a este número hace menos de 2 minutos.",
      429
    );
  }

  if (await isPhoneOptedOut(phone)) {
    throw new SmsTargetError("Este número pidió no recibir más SMS (respondió BAJA o STOP).", 409);
  }

  if (target.leadId) {
    const leadConsent = await prisma.lead.findUnique({
      where: { id: target.leadId },
      select: { smsConsent: true },
    });
    if (leadConsent && leadConsent.smsConsent === false) {
      throw new SmsTargetError(
        "El prospecto no ha otorgado consentimiento explícito para SMS (A2P 10DLC). Actualiza el consentimiento en su ficha.",
        403
      );
    }
  }

  // Se registra antes de enviar: el SID queda guardado justo al volver de Twilio y el
  // callback de estado casi nunca llega antes que él.
  const pending = await prisma.message.create({
    data: {
      organizationId: scope.organizationId,
      clientId: target.clientId,
      leadId: target.leadId,
      contactId: target.contactId,
      channel: MESSAGE_CHANNEL.SMS,
      direction: MESSAGE_DIRECTION.OUTBOUND,
      recipient: phone,
      body,
      status: MESSAGE_STATUS.PENDING,
    },
    select: { id: true },
  });
  const result = await sendTwilioSms(phone, input.message, mediaUrl);
  const message = await prisma.message.update({
    where: { id: pending.id },
    data: { status: result.status, providerMsgId: result.providerMsgId, errorMessage: result.errorMessage, isDemo: result.isDemo },
    select: SENT_MESSAGE_SELECT,
  });

  if (target.clientId || target.leadId) {
    await prisma.activity.create({
      data: {
        clientId: target.clientId,
        leadId: target.leadId,
        contactId: target.contactId,
        userId,
        type: ACTIVITY_TYPE.SMS,
        title: `SMS enviado a ${phone}`,
        description: body,
        outcome: result.status === MESSAGE_STATUS.SENT ? ACTIVITY_OUTCOME.COMPLETED : ACTIVITY_OUTCOME.PENDING,
      },
    });
  }

  return { sent: result.status === MESSAGE_STATUS.SENT, errorMessage: result.errorMessage, message };
}
