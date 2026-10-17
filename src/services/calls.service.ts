import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { isBunkerRole, ROLES } from "@/lib/auth";
import { clientBelongsToOrg } from "@/lib/validation-helpers";
import {
  addConferenceParticipant,
  announceToConference,
  completeTwilioCall,
  getTwilioConfig,
  getTwilioVoiceConfig,
  twilioWebhookUrl,
} from "@/lib/integrations/twilio";
import { createVoiceAccessToken } from "@/lib/integrations/twilio-voice-token";
import { conferenceTwiml, dialClientsTwiml, emptyTwiml, sayTwiml } from "@/lib/integrations/twilio-twiml";
import { ACTIVITY_TYPE } from "@/lib/constants/crm";
import {
  CALL_DIRECTION,
  CALL_STATUS,
  CALL_STATUS_LABEL,
  FINAL_CALL_STATUSES,
  INBOUND_RING_SECONDS,
  LIVE_CALL_STATUSES,
  MONITOR_MODE,
  VOICE_IDENTITY_PREFIX,
  VOICE_TOKEN_TTL_SECONDS,
  VOICE_WEBHOOK_PATH,
  type CallStatus,
  type MonitorMode,
} from "@/lib/constants/voice";
import type { CreatePhoneLineInput, UpdatePhoneLineInput } from "@/lib/validations/voice";
import type { TenantScope } from "@/types/tenant";
import type { CallSummary, PhoneLineSummary } from "@/types/voice";

// Segundos que timbra el celular del lead antes de darlo por no contestado.
const OUTBOUND_RING_SECONDS = 30;

const RECORDING_NOTICE = "Esta llamada puede ser grabada con fines de calidad.";
const VOICEMAIL_TEXT = "Gracias por llamar. En este momento no podemos atenderte; te devolveremos la llamada lo antes posible.";
const CALL_ERROR_TEXT = "No se pudo completar la llamada. Intenta de nuevo.";

/** Error de negocio con el status HTTP que debe responder la ruta. */
export class CallError extends Error {
  constructor(message: string, public status: 400 | 403 | 404 | 409 | 503) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Identidad y token del navegador
// ---------------------------------------------------------------------------

export const identityFor = (userId: string) => `${VOICE_IDENTITY_PREFIX}${userId}`;

/** "client:u_<userId>" (parámetro `Caller`/`From` de Twilio) → userId. */
function userIdFromCaller(caller: string | undefined) {
  const identity = caller?.replace(/^client:/, "") ?? "";
  return identity.startsWith(VOICE_IDENTITY_PREFIX) ? identity.slice(VOICE_IDENTITY_PREFIX.length) : null;
}

export function issueVoiceToken(userId: string) {
  const cfg = getTwilioVoiceConfig();
  if (!cfg) {
    throw new CallError("Las llamadas no están configuradas (TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET, TWILIO_TWIML_APP_SID).", 503);
  }
  const identity = identityFor(userId);
  const token = createVoiceAccessToken({
    accountSid: cfg.accountSid,
    apiKeySid: cfg.apiKeySid,
    apiKeySecret: cfg.apiKeySecret,
    twimlAppSid: cfg.twimlAppSid,
    identity,
    ttlSeconds: VOICE_TOKEN_TTL_SECONDS,
  });
  return { token, identity, ttlSeconds: VOICE_TOKEN_TTL_SECONDS };
}

const webhookUrl = (callId: string, leg: string) => twilioWebhookUrl(`${VOICE_WEBHOOK_PATH.STATUS}?callId=${callId}&leg=${leg}`);

// ---------------------------------------------------------------------------
// Líneas
// ---------------------------------------------------------------------------

/** Línea por la que sale una llamada: la del cliente, la general de la organización o la de .env. */
async function resolveLine(organizationId: string, clientId: string | null) {
  const line =
    (clientId && (await prisma.phoneLine.findFirst({ where: { organizationId, clientId, isActive: true } }))) ||
    (await prisma.phoneLine.findFirst({ where: { organizationId, clientId: null, isActive: true } }));
  if (line) return { lineId: line.id, fromNumber: line.phoneNumber, recordCalls: line.recordCalls };

  const fallback = getTwilioConfig()?.fromPhone;
  if (!fallback) throw new CallError("No hay una línea activa para este cliente ni TWILIO_PHONE_NUMBER configurado.", 503);
  return { lineId: null, fromNumber: fallback, recordCalls: false };
}

const lineSelect = {
  id: true,
  phoneNumber: true,
  label: true,
  clientId: true,
  recordCalls: true,
  isActive: true,
  client: { select: { name: true } },
} as const;

type LineRow = {
  id: string;
  phoneNumber: string;
  label: string;
  clientId: string | null;
  recordCalls: boolean;
  isActive: boolean;
  client: { name: string } | null;
};

const toLineSummary = (line: LineRow): PhoneLineSummary => ({
  id: line.id,
  phoneNumber: line.phoneNumber,
  label: line.label,
  clientId: line.clientId,
  clientName: line.client?.name ?? null,
  recordCalls: line.recordCalls,
  isActive: line.isActive,
});

export async function listPhoneLines(organizationId: string) {
  const lines = await prisma.phoneLine.findMany({ where: { organizationId }, select: lineSelect, orderBy: { createdAt: "asc" } });
  return lines.map(toLineSummary);
}

export async function createPhoneLine(organizationId: string, userId: string, input: CreatePhoneLineInput) {
  if (input.clientId && !(await clientBelongsToOrg(organizationId, input.clientId))) {
    throw new CallError("El cliente seleccionado no existe en tu organización.", 400);
  }
  const existing = await prisma.phoneLine.findUnique({ where: { phoneNumber: input.phoneNumber }, select: { id: true } });
  if (existing) throw new CallError("Ese número ya está registrado como línea.", 409);

  const line = await prisma.phoneLine.create({
    data: {
      organizationId,
      phoneNumber: input.phoneNumber as string,
      label: input.label as string,
      clientId: input.clientId ?? null,
      recordCalls: input.recordCalls ?? false,
      isActive: input.isActive ?? true,
    },
    select: lineSelect,
  });
  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action: "phone_line_created",
      entityType: "PhoneLine",
      entityId: line.id,
      detailsJson: JSON.stringify({ phoneNumber: line.phoneNumber, clientId: line.clientId }),
    },
  });
  return toLineSummary(line);
}

export async function updatePhoneLine(organizationId: string, userId: string, lineId: string, input: UpdatePhoneLineInput) {
  const existing = await prisma.phoneLine.findFirst({ where: { id: lineId, organizationId }, select: { id: true } });
  if (!existing) throw new CallError("Línea no encontrada.", 404);
  if (input.clientId && !(await clientBelongsToOrg(organizationId, input.clientId))) {
    throw new CallError("El cliente seleccionado no existe en tu organización.", 400);
  }

  const line = await prisma.phoneLine.update({ where: { id: lineId }, data: input, select: lineSelect });
  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action: "phone_line_updated",
      entityType: "PhoneLine",
      entityId: line.id,
      detailsJson: JSON.stringify(input),
    },
  });
  return toLineSummary(line);
}

// ---------------------------------------------------------------------------
// Historial
// ---------------------------------------------------------------------------

const callSelect = {
  id: true,
  direction: true,
  status: true,
  fromNumber: true,
  toNumber: true,
  durationSec: true,
  recordingSid: true,
  createdAt: true,
  answeredAt: true,
  endedAt: true,
  leadId: true,
  clientId: true,
  userId: true,
  lead: { select: { name: true } },
  user: { select: { name: true } },
  line: { select: { label: true } },
} as const;

type CallRow = {
  id: string;
  direction: string;
  status: string;
  fromNumber: string;
  toNumber: string;
  durationSec: number | null;
  recordingSid: string | null;
  createdAt: Date;
  answeredAt: Date | null;
  endedAt: Date | null;
  leadId: string | null;
  clientId: string | null;
  userId: string | null;
  lead: { name: string } | null;
  user: { name: string } | null;
  line: { label: string } | null;
};

const toCallSummary = (call: CallRow): CallSummary => ({
  id: call.id,
  direction: call.direction as CallSummary["direction"],
  status: call.status as CallStatus,
  fromNumber: call.fromNumber,
  toNumber: call.toNumber,
  durationSec: call.durationSec,
  hasRecording: Boolean(call.recordingSid),
  leadId: call.leadId,
  leadName: call.lead?.name ?? null,
  userId: call.userId,
  userName: call.user?.name ?? null,
  lineLabel: call.line?.label ?? null,
  createdAt: call.createdAt.toISOString(),
  answeredAt: call.answeredAt?.toISOString() ?? null,
  endedAt: call.endedAt?.toISOString() ?? null,
});

const scopeWhere = (scope: TenantScope) => ({
  organizationId: scope.organizationId,
  ...(scope.clientId ? { clientId: scope.clientId } : {}),
});

export async function listCalls(scope: TenantScope) {
  const calls = await prisma.call.findMany({ where: scopeWhere(scope), select: callSelect, orderBy: { createdAt: "desc" }, take: 50 });
  return calls.map(toCallSummary);
}

/** Llamadas salientes en curso de la organización: las que un supervisor puede escuchar. */
export async function listLiveCalls(organizationId: string) {
  const calls = await prisma.call.findMany({
    where: {
      organizationId,
      direction: CALL_DIRECTION.OUTBOUND,
      status: { in: LIVE_CALL_STATUSES },
      agentCallSid: { not: null },
    },
    select: callSelect,
    orderBy: { createdAt: "desc" },
  });
  return calls.map(toCallSummary);
}

// ---------------------------------------------------------------------------
// Saliente
// ---------------------------------------------------------------------------

/**
 * Registra una llamada saliente a un lead dentro del scope del usuario. El número sale
 * del lead, nunca del navegador. El navegador conecta después con `callId`.
 */
export async function startOutboundCall(scope: TenantScope, userId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, isDeleted: false, ...scopeWhere(scope) },
    select: { id: true, clientId: true, normalizedPhone: true, phone: true },
  });
  if (!lead) throw new CallError("Lead no encontrado.", 404);
  const toNumber = lead.normalizedPhone || lead.phone;
  if (!toNumber) throw new CallError("El lead no tiene teléfono registrado.", 400);
  if (!getTwilioVoiceConfig()) throw new CallError("Las llamadas no están configuradas en este entorno.", 503);

  const line = await resolveLine(scope.organizationId, lead.clientId);
  const call = await prisma.call.create({
    data: {
      organizationId: scope.organizationId,
      clientId: lead.clientId,
      leadId: lead.id,
      userId,
      lineId: line.lineId,
      direction: CALL_DIRECTION.OUTBOUND,
      fromNumber: line.fromNumber,
      toNumber,
      status: CALL_STATUS.INITIATED,
      conferenceName: `call_${randomUUID()}`,
    },
    select: { id: true },
  });
  return { callId: call.id };
}

/**
 * TwiML App: el navegador del asesor conectó (`callId`) o un supervisor quiere entrar
 * (`monitorCallId` + `mode`). Siempre devuelve TwiML.
 */
export async function handleVoiceAppRequest(params: Record<string, string>) {
  const userId = userIdFromCaller(params.Caller || params.From);
  if (!userId) return sayTwiml(CALL_ERROR_TEXT);

  if (params.monitorCallId) {
    return joinAsSupervisor(userId, params.monitorCallId, params.mode as MonitorMode, params.CallSid);
  }
  if (params.callId) return connectAgent(userId, params.callId, params.CallSid);
  return sayTwiml(CALL_ERROR_TEXT);
}

async function connectAgent(userId: string, callId: string, agentCallSid: string) {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { line: { select: { recordCalls: true } } },
  });
  // Un callId solo sirve una vez y solo para quien lo creó.
  if (!call || call.userId !== userId || call.direction !== CALL_DIRECTION.OUTBOUND || call.agentCallSid || !call.conferenceName) {
    return sayTwiml(CALL_ERROR_TEXT);
  }

  await prisma.call.update({ where: { id: call.id }, data: { agentCallSid, status: CALL_STATUS.RINGING } });

  try {
    const customerCallSid = await addConferenceParticipant({
      conferenceName: call.conferenceName,
      from: call.fromNumber,
      to: call.toNumber,
      statusCallback: webhookUrl(call.id, "customer"),
      timeoutSeconds: OUTBOUND_RING_SECONDS,
    });
    await prisma.call.update({ where: { id: call.id }, data: { customerCallSid } });
  } catch (error) {
    console.error(`Llamada ${call.id}: no se pudo marcar al lead:`, error);
    await finishCall(call.id, CALL_STATUS.FAILED, null);
    return sayTwiml(CALL_ERROR_TEXT);
  }

  const record = Boolean(call.line?.recordCalls);
  return conferenceTwiml({
    name: call.conferenceName,
    startConferenceOnEnter: true,
    endConferenceOnExit: true,
    record,
    statusCallback: webhookUrl(call.id, "conference"),
    recordingStatusCallback: webhookUrl(call.id, "recording"),
  });
}

async function joinAsSupervisor(userId: string, callId: string, mode: MonitorMode, supervisorCallSid: string) {
  const [supervisor, call] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, clientId: true, isActive: true, memberships: { select: { organizationId: true } } },
    }),
    prisma.call.findUnique({ where: { id: callId } }),
  ]);

  const isBunkerAdmin =
    supervisor?.isActive && isBunkerRole(supervisor.role) && !supervisor.clientId &&
    supervisor.memberships.some((m) => m.organizationId === call?.organizationId);
  const isLive = call && LIVE_CALL_STATUSES.includes(call.status as CallStatus) && call.conferenceName && call.agentCallSid;
  if (!isBunkerAdmin || !isLive || !Object.values(MONITOR_MODE).includes(mode)) return sayTwiml(CALL_ERROR_TEXT);

  await prisma.auditLog.create({
    data: {
      organizationId: call.organizationId,
      userId,
      action: "call_monitored",
      entityType: "Call",
      entityId: call.id,
      detailsJson: JSON.stringify({ mode, supervisorCallSid }),
    },
  });

  return conferenceTwiml({
    name: call.conferenceName as string,
    startConferenceOnEnter: false,
    endConferenceOnExit: false,
    muted: mode === MONITOR_MODE.LISTEN,
    coach: mode === MONITOR_MODE.WHISPER ? call.agentCallSid : null,
  });
}

/** Cuelga una llamada en curso (asesor o admin dentro de su scope). */
export async function hangupCall(scope: TenantScope, callId: string) {
  const call = await prisma.call.findFirst({ where: { id: callId, ...scopeWhere(scope) } });
  if (!call) throw new CallError("Llamada no encontrada.", 404);
  if (FINAL_CALL_STATUSES.includes(call.status as CallStatus)) return;

  for (const sid of [call.customerCallSid, call.agentCallSid]) {
    if (sid) await completeTwilioCall(sid).catch((error) => console.error(`No se pudo colgar ${sid}:`, error));
  }
}

// ---------------------------------------------------------------------------
// Entrante
// ---------------------------------------------------------------------------

/** Asesores a los que timbra una entrante: los del cliente de la línea o, si no tiene, los de Bunker. */
async function inboundAgents(organizationId: string, clientId: string | null) {
  const users = await prisma.user.findMany({
    where: clientId
      ? { isActive: true, clientId }
      : { isActive: true, clientId: null, role: ROLES.ADMIN, memberships: { some: { organizationId } } },
    select: { id: true },
  });
  return users.map((u) => identityFor(u.id));
}

export async function handleInboundCall(params: Record<string, string>) {
  const from = params.From;
  const to = params.To;
  if (!from || !to || !params.CallSid) return sayTwiml(VOICEMAIL_TEXT);

  const line = await prisma.phoneLine.findFirst({ where: { phoneNumber: to, isActive: true } });
  if (!line) return sayTwiml(VOICEMAIL_TEXT);

  const lead = await prisma.lead.findFirst({
    where: { organizationId: line.organizationId, normalizedPhone: from, isDeleted: false },
    orderBy: { createdAt: "desc" },
    select: { id: true, clientId: true },
  });
  const identities = await inboundAgents(line.organizationId, line.clientId);

  const call = await prisma.call.create({
    data: {
      organizationId: line.organizationId,
      clientId: line.clientId ?? lead?.clientId ?? null,
      leadId: lead?.id ?? null,
      lineId: line.id,
      direction: CALL_DIRECTION.INBOUND,
      fromNumber: from,
      toNumber: to,
      status: CALL_STATUS.RINGING,
      customerCallSid: params.CallSid,
    },
    select: { id: true },
  });

  if (!identities.length) {
    await finishCall(call.id, CALL_STATUS.NO_ANSWER, null);
    return sayTwiml(VOICEMAIL_TEXT);
  }

  return dialClientsTwiml({
    identities,
    timeoutSeconds: INBOUND_RING_SECONDS,
    action: webhookUrl(call.id, "dial") as string,
    parameters: { callId: call.id },
    announcement: line.recordCalls ? RECORDING_NOTICE : null,
    record: line.recordCalls,
    recordingStatusCallback: webhookUrl(call.id, "recording"),
  });
}

/** El asesor contestó una entrante en su navegador: queda como responsable de la llamada. */
export async function claimInboundCall(scope: TenantScope, userId: string, callId: string, agentCallSid: string | null) {
  const { count } = await prisma.call.updateMany({
    where: { id: callId, direction: CALL_DIRECTION.INBOUND, userId: null, ...scopeWhere(scope) },
    data: { userId, agentCallSid, status: CALL_STATUS.IN_PROGRESS, answeredAt: new Date() },
  });
  if (!count) throw new CallError("La llamada ya no está disponible.", 409);
}

// ---------------------------------------------------------------------------
// Estados (callbacks de Twilio)
// ---------------------------------------------------------------------------

/** Estado de la pierna del lead (`CallStatus` / `DialCallStatus`) → estado del CRM. */
function mapCallStatus(twilioStatus: string | undefined): CallStatus | null {
  switch (twilioStatus) {
    case "ringing":
      return CALL_STATUS.RINGING;
    case "in-progress":
    case "answered":
      return CALL_STATUS.IN_PROGRESS;
    case "completed":
      return CALL_STATUS.COMPLETED;
    case "busy":
      return CALL_STATUS.BUSY;
    case "no-answer":
      return CALL_STATUS.NO_ANSWER;
    case "failed":
      return CALL_STATUS.FAILED;
    case "canceled":
      return CALL_STATUS.CANCELED;
    default:
      return null; // queued, initiated
  }
}

function formatDuration(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Cierra la llamada una sola vez y deja la Activity en el lead. */
async function finishCall(callId: string, status: CallStatus, durationSec: number | null) {
  const { count } = await prisma.call.updateMany({
    where: { id: callId, status: { notIn: FINAL_CALL_STATUSES } },
    data: { status, durationSec, endedAt: new Date() },
  });
  if (!count) return;

  const call = await prisma.call.findUnique({
    where: { id: callId },
    select: { direction: true, leadId: true, clientId: true, userId: true, toNumber: true, fromNumber: true },
  });
  if (!call || (!call.leadId && !call.clientId)) return;

  const kind = call.direction === CALL_DIRECTION.OUTBOUND ? "saliente" : "entrante";
  const answered = status === CALL_STATUS.COMPLETED && (durationSec ?? 0) > 0;
  await prisma.activity.create({
    data: {
      leadId: call.leadId,
      clientId: call.clientId,
      userId: call.userId,
      type: ACTIVITY_TYPE.CALL,
      title: `Llamada ${kind} · ${CALL_STATUS_LABEL[status]}${answered ? ` (${formatDuration(durationSec as number)})` : ""}`,
      description: call.direction === CALL_DIRECTION.OUTBOUND ? `A ${call.toNumber}` : `De ${call.fromNumber}`,
      outcome: answered ? "completed" : "missed",
    },
  });
}

/**
 * Callbacks de Twilio para una llamada (`leg` en la query):
 * - customer: estado de la pierna del lead (saliente).
 * - conference: eventos de la conferencia (aviso de grabación, fin).
 * - recording: grabación lista.
 * - dial: fin del <Dial> de una entrante; devuelve TwiML (buzón si nadie contestó).
 */
export async function applyVoiceCallback(callId: string, leg: string, params: Record<string, string>): Promise<string | null> {
  const call = await prisma.call.findUnique({
    where: { id: callId },
    include: { line: { select: { recordCalls: true } } },
  });
  if (!call) return leg === "dial" ? sayTwiml(VOICEMAIL_TEXT) : null;
  const isFinal = FINAL_CALL_STATUSES.includes(call.status as CallStatus);

  if (leg === "customer") {
    const status = mapCallStatus(params.CallStatus);
    if (!status || isFinal) return null;
    if (FINAL_CALL_STATUSES.includes(status)) {
      await finishCall(call.id, status, params.CallDuration ? parseInt(params.CallDuration, 10) : null);
    } else {
      await prisma.call.update({
        where: { id: call.id },
        data: { status, ...(status === CALL_STATUS.IN_PROGRESS && !call.answeredAt ? { answeredAt: new Date() } : {}) },
      });
    }
    return null;
  }

  if (leg === "conference") {
    const event = params.StatusCallbackEvent;
    // El aviso de grabación suena para todos en cuanto el lead entra a la conferencia.
    if (event === "participant-join" && params.CallSid === call.customerCallSid && call.line?.recordCalls && params.ConferenceSid) {
      const announceUrl = twilioWebhookUrl(VOICE_WEBHOOK_PATH.ANNOUNCE);
      if (announceUrl) await announceToConference(params.ConferenceSid, announceUrl).catch((e) => console.error("Aviso de grabación:", e));
    }
    if (event === "conference-end" && !isFinal) {
      // El asesor colgó antes de que el lead contestara: deja de timbrarle.
      if (!call.answeredAt && call.customerCallSid) await completeTwilioCall(call.customerCallSid).catch(() => undefined);
      await finishCall(call.id, call.answeredAt ? CALL_STATUS.COMPLETED : CALL_STATUS.CANCELED, durationSince(call.answeredAt));
    }
    return null;
  }

  if (leg === "recording") {
    if (params.RecordingStatus === "completed" && params.RecordingSid) {
      await prisma.call.update({ where: { id: call.id }, data: { recordingSid: params.RecordingSid, recordingUrl: params.RecordingUrl ?? null } });
    }
    return null;
  }

  if (leg === "dial") {
    const status = mapCallStatus(params.DialCallStatus) ?? CALL_STATUS.NO_ANSWER;
    const answered = status === CALL_STATUS.COMPLETED || status === CALL_STATUS.IN_PROGRESS;
    await finishCall(call.id, answered ? CALL_STATUS.COMPLETED : status, params.DialCallDuration ? parseInt(params.DialCallDuration, 10) : null);
    return answered ? emptyTwiml() : sayTwiml(VOICEMAIL_TEXT);
  }

  return null;
}

function durationSince(answeredAt: Date | null) {
  return answeredAt ? Math.round((Date.now() - answeredAt.getTime()) / 1000) : null;
}

export const recordingNoticeTwiml = () => sayTwiml(RECORDING_NOTICE, false);
