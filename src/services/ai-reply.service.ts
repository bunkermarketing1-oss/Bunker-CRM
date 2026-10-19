import { prisma } from "@/lib/prisma";
import { sendTwilioSms } from "@/lib/integrations/twilio";
import { createChatCompletion, getAiConfig } from "@/lib/integrations/openai";
import { buildAiReplyMessages, sanitizeAiReply } from "@/lib/ai-assistant/prompt";
import { isWithinBusinessHours } from "@/lib/ai-assistant/business-hours";
import { aiReplySkipReason } from "@/lib/ai-assistant/reply-guards";
import { firstNameOf } from "@/lib/automations/sms-template";
import { parseBusinessHours } from "@/services/ai-assistant.service";
import {
  AI_CONTEXT_MESSAGES,
  AI_REPLY_CAP_WINDOW_MS,
  AI_REPLY_MAX_LENGTH,
  AI_REPLY_MAX_OUTPUT_TOKENS,
  AI_REPLY_SKIP_REASON,
  AI_REPLY_TIMEOUT_MS,
  type AiReplySkipReason,
} from "@/lib/constants/ai-assistant";
import { ACTIVITY_OUTCOME, ACTIVITY_TYPE } from "@/lib/constants/crm";
import {
  MESSAGE_CHANNEL,
  MESSAGE_DIRECTION,
  MESSAGE_GENERATED_BY,
  MESSAGE_STATUS,
  type MessageGeneratedBy,
} from "@/lib/constants/messaging";
import type { ReplyTarget } from "@/lib/messaging/sms-rules";

export interface AiReplyRequest {
  /** E.164 del lead. */
  from: string;
  body: string;
  target: ReplyTarget;
  duplicate: boolean;
  isKeyword: boolean;
  optedOut: boolean;
  now?: Date;
}

export type AiReplyOutcome =
  | { replied: true; generatedBy: MessageGeneratedBy; sent: boolean }
  | { replied: false; reason: AiReplySkipReason };

const AI_GENERATED_VALUES = [MESSAGE_GENERATED_BY.AI, MESSAGE_GENERATED_BY.AI_HANDOFF];

async function loadContext(target: ReplyTarget) {
  if (target.ambiguous || !target.clientId || !target.leadId) return null;
  const [assistant, lead] = await Promise.all([
    prisma.clientAiAssistant.findFirst({
      where: { organizationId: target.organizationId, clientId: target.clientId, client: { isDeleted: false } },
      select: {
        isEnabled: true,
        timezone: true,
        businessHoursJson: true,
        knowledgeBase: true,
        instructions: true,
        handoffMessage: true,
        maxRepliesPerDay: true,
        client: { select: { name: true } },
      },
    }),
    prisma.lead.findFirst({
      where: { id: target.leadId, organizationId: target.organizationId, isDeleted: false },
      select: { id: true, name: true },
    }),
  ]);
  return { assistant, lead };
}

/** Respuestas automáticas (IA o traspaso) que ya recibió esta conversación en la ventana. */
function countRecentAiReplies(target: ReplyTarget, phone: string, now: Date) {
  return prisma.message.count({
    where: {
      organizationId: target.organizationId,
      clientId: target.clientId,
      recipient: phone,
      channel: MESSAGE_CHANNEL.SMS,
      direction: MESSAGE_DIRECTION.OUTBOUND,
      generatedBy: { in: AI_GENERATED_VALUES },
      createdAt: { gte: new Date(now.getTime() - AI_REPLY_CAP_WINDOW_MS) },
    },
  });
}

/** Últimos mensajes con ese número y cliente, del más antiguo al más reciente. */
async function loadConversation(target: ReplyTarget, phone: string) {
  const rows = await prisma.message.findMany({
    where: {
      organizationId: target.organizationId,
      clientId: target.clientId,
      recipient: phone,
      channel: MESSAGE_CHANNEL.SMS,
      // Un saliente fallido nunca le llegó al lead: no es parte de la conversación.
      NOT: { direction: MESSAGE_DIRECTION.OUTBOUND, status: MESSAGE_STATUS.FAILED },
    },
    orderBy: { createdAt: "desc" },
    select: { direction: true, body: true },
    take: AI_CONTEXT_MESSAGES,
  });
  return rows.reverse().map((row) => ({ fromLead: row.direction === MESSAGE_DIRECTION.INBOUND, body: row.body }));
}

interface ReplyDraft {
  body: string;
  generatedBy: MessageGeneratedBy;
}

/**
 * Texto a enviar: la respuesta de la IA o, si no hay clave, OpenAI falla, tarda más de
 * AI_REPLY_TIMEOUT_MS o devuelve algo vacío, el mensaje de traspaso fijo del cliente. Así
 * el lead siempre sabe que lo leímos y que un asesor le escribirá, y nunca recibe un texto
 * que no pasó por las reglas del prompt.
 */
async function draftReply(input: {
  clientName: string;
  knowledgeBase: string;
  instructions: string;
  handoffMessage: string;
  leadName: string;
  conversation: Awaited<ReturnType<typeof loadConversation>>;
}): Promise<ReplyDraft> {
  const handoff: ReplyDraft = { body: input.handoffMessage, generatedBy: MESSAGE_GENERATED_BY.AI_HANDOFF };
  const { apiKey, model } = getAiConfig();
  if (!apiKey) return handoff;

  const result = await createChatCompletion({
    apiKey,
    model,
    messages: buildAiReplyMessages({
      clientName: input.clientName,
      knowledgeBase: input.knowledgeBase,
      instructions: input.instructions,
      leadFirstName: firstNameOf(input.leadName),
      conversation: input.conversation,
      maxLength: AI_REPLY_MAX_LENGTH,
    }),
    maxOutputTokens: AI_REPLY_MAX_OUTPUT_TOKENS,
    timeoutMs: AI_REPLY_TIMEOUT_MS,
  });
  if (result.error) {
    console.error("Asistente IA: se envía el mensaje de traspaso.", result.error);
    return handoff;
  }
  const body = sanitizeAiReply(result.text, AI_REPLY_MAX_LENGTH);
  return body ? { body, generatedBy: MESSAGE_GENERATED_BY.AI } : handoff;
}

/** Envía y registra la respuesta: Message (marcado como IA) antes de Twilio, y Activity en el lead. */
async function sendReply(target: ReplyTarget, leadId: string, phone: string, draft: ReplyDraft) {
  const pending = await prisma.message.create({
    data: {
      organizationId: target.organizationId,
      clientId: target.clientId,
      leadId,
      contactId: target.contactId,
      channel: MESSAGE_CHANNEL.SMS,
      direction: MESSAGE_DIRECTION.OUTBOUND,
      recipient: phone,
      body: draft.body,
      status: MESSAGE_STATUS.PENDING,
      generatedBy: draft.generatedBy,
    },
    select: { id: true },
  });
  const result = await sendTwilioSms(phone, draft.body);
  await prisma.message.update({
    where: { id: pending.id },
    data: { status: result.status, providerMsgId: result.providerMsgId, errorMessage: result.errorMessage, isDemo: result.isDemo },
  });

  const sent = result.status === MESSAGE_STATUS.SENT;
  await prisma.activity.create({
    data: {
      clientId: target.clientId,
      leadId,
      contactId: target.contactId,
      type: ACTIVITY_TYPE.SMS,
      title:
        draft.generatedBy === MESSAGE_GENERATED_BY.AI
          ? "Respuesta automática de IA (fuera de horario)"
          : "Mensaje automático de traspaso a asesor (fuera de horario)",
      description: draft.body,
      outcome: sent ? ACTIVITY_OUTCOME.COMPLETED : ACTIVITY_OUTCOME.PENDING,
    },
  });
  return sent;
}

/**
 * Contesta con IA un SMS entrante de un lead si su cliente tiene el asistente activo y el
 * mensaje llegó fuera del horario de atención (en la zona horaria del cliente). Dentro del
 * horario contestan los asesores. Las reglas de cuándo NO contestar están en
 * `lib/ai-assistant/reply-guards.ts`.
 *
 * Dos SMS del mismo lead que llegan a la vez pueden pasar el tope juntos: el tope es una
 * protección de costo y de "conversación con un bot", no un límite exacto.
 */
export async function replyOutOfHoursWithAi(request: AiReplyRequest): Promise<AiReplyOutcome> {
  const now = request.now ?? new Date();
  const context = await loadContext(request.target);
  const assistant = context?.assistant ?? null;
  const lead = context?.lead ?? null;
  const hours = assistant ? parseBusinessHours(assistant.businessHoursJson) : null;
  // Un horario corrupto cuenta como desactivado: sin horario no sabemos si es "fuera de horario".
  const enabled = Boolean(assistant?.isEnabled && hours && assistant.knowledgeBase.trim());

  const baseContext = {
    duplicate: request.duplicate,
    hasLead: Boolean(lead),
    ambiguous: request.target.ambiguous,
    isKeyword: request.isKeyword,
    optedOut: request.optedOut,
    body: request.body,
    enabled,
    withinBusinessHours: enabled && hours ? isWithinBusinessHours(now, assistant!.timezone, hours) : false,
    maxRepliesPerDay: assistant?.maxRepliesPerDay ?? 0,
  };
  // El conteo es una consulta: solo se hace si todo lo demás permite contestar.
  const early = aiReplySkipReason({ ...baseContext, repliesInWindow: 0 }, AI_REPLY_SKIP_REASON);
  if (early) return { replied: false, reason: early };
  const repliesInWindow = await countRecentAiReplies(request.target, request.from, now);
  const reason = aiReplySkipReason({ ...baseContext, repliesInWindow }, AI_REPLY_SKIP_REASON);
  if (reason) return { replied: false, reason };

  const draft = await draftReply({
    clientName: assistant!.client.name,
    knowledgeBase: assistant!.knowledgeBase,
    instructions: assistant!.instructions ?? "",
    handoffMessage: assistant!.handoffMessage,
    leadName: lead!.name,
    conversation: await loadConversation(request.target, request.from),
  });
  const sent = await sendReply(request.target, lead!.id, request.from, draft);
  return { replied: true, generatedBy: draft.generatedBy, sent };
}
