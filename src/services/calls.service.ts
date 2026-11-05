import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { canMonitorCall, ROLES } from "@/lib/roles";
import { clientBelongsToOrg } from "@/lib/validation-helpers";
import {
  addConferenceParticipant,
  announceToConference,
  completeTwilioCall,
  getTwilioConfig,
  getTwilioVoiceConfig,
  startCallRecording,
  twilioWebhookUrl,
} from "@/lib/integrations/twilio";
import { createVoiceAccessToken } from "@/lib/integrations/twilio-voice-token";
import { conferenceTwiml, dialClientsTwiml, emptyTwiml, sayTwiml } from "@/lib/integrations/twilio-twiml";
import { ensureTwilioRuntimeConfig } from "@/services/integrations.service";
import { isAllowedCallDestination, parseAllowedCountries, statusesThatCanAdvanceTo } from "@/lib/voice-policy";
import { ACTIVITY_TYPE, LEAD_SOURCE, LEAD_STATUS } from "@/lib/constants/crm";
import { validateAndNormalizePhone } from "@/lib/phone";
import {
  CALL_CALLBACK_LEG,
  CALL_DIRECTION,
  CALL_STATUS,
  CALL_STATUS_LABEL,
  CALL_STATUS_RANK,
  DEFAULT_VOICE_ALLOWED_COUNTRIES,
  FINAL_CALL_STATUSES,
  INBOUND_RING_SECONDS,
  LIVE_CALL_STATUSES,
  MONITOR_MODE,
  TWILIO_CONFERENCE_EVENT,
  VOICE_ALLOWED_NUMBER_TYPES,
  VOICE_IDENTITY_PREFIX,
  VOICE_MAX_CALLS_PER_CLIENT_PER_DAY,
  VOICE_MAX_CALLS_PER_USER_PER_HOUR,
  VOICE_TOKEN_TTL_SECONDS,
  VOICE_WEBHOOK_PATH,
  type CallStatus,
  type MonitorMode,
} from "@/lib/constants/voice";
import type { CreatePhoneLineInput, UpdatePhoneLineInput, StartCallInput } from "@/lib/validations/voice";
import type { TenantScope } from "@/types/tenant";
import type { CallSummary, PhoneLineSummary } from "@/types/voice";

// Segundos que timbra el celular del lead antes de darlo por no contestado.
const OUTBOUND_RING_SECONDS = 30;

const RECORDING_NOTICE = "Esta llamada puede ser grabada con fines de calidad.";
const VOICEMAIL_TEXT = "Gracias por llamar. En este momento no podemos atenderte; te devolveremos la llamada lo antes posible.";
const CALL_ERROR_TEXT = "No se pudo completar la llamada. Intenta de nuevo.";

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

/** Error de negocio con el status HTTP que debe responder la ruta. */
export class CallError extends Error {
  constructor(message: string, public status: 400 | 403 | 404 | 409 | 429 | 503) {
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

export async function issueVoiceToken(userId: string) {
  await ensureTwilioRuntimeConfig();
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

type CallbackLeg = (typeof CALL_CALLBACK_LEG)[keyof typeof CALL_CALLBACK_LEG];

const webhookUrl = (callId: string, leg: CallbackLeg) =>
  twilioWebhookUrl(`${VOICE_WEBHOOK_PATH.STATUS}?callId=${callId}&leg=${leg}`);

// ---------------------------------------------------------------------------
// Líneas
// ---------------------------------------------------------------------------

/**
 * Línea por la que sale una llamada: la del cliente, la general de la organización o la de .env.
 * Con varias líneas activas gana la más antigua, para que el lead vea siempre el mismo número.
 */
async function resolveLine(organizationId: string, clientId: string | null) {
  const oldestFirst = { createdAt: "asc" } as const;
  const line =
    (clientId &&
      (await prisma.phoneLine.findFirst({ where: { organizationId, clientId, isActive: true }, orderBy: oldestFirst }))) ||
    (await prisma.phoneLine.findFirst({ where: { organizationId, clientId: null, isActive: true }, orderBy: oldestFirst }));
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
  recordingUrl: call.recordingSid ? `/api/voice/calls/${call.id}/recording` : null,
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

/**
 * Llamadas salientes en curso que un supervisor puede escuchar: toda la organización para
 * Bunker, solo su empresa para el dueño de un cliente (scope forzado por la ruta).
 */
export async function listLiveCalls(scope: TenantScope) {
  const now = Date.now();
  const ringingTimeout = new Date(now - 2 * 60 * 1000); // 2 minutos máximo timbrando
  const inProgressTimeout = new Date(now - 2 * 60 * 60 * 1000); // 2 horas máximo en curso

  // Auto-limpieza preventiva de llamadas zombi (timbrando > 2 min o en curso > 2 h)
  await prisma.call.updateMany({
    where: {
      ...scopeWhere(scope),
      status: CALL_STATUS.RINGING,
      createdAt: { lt: ringingTimeout },
    },
    data: {
      status: CALL_STATUS.NO_ANSWER,
      endedAt: new Date(),
    },
  }).catch(() => {});

  await prisma.call.updateMany({
    where: {
      ...scopeWhere(scope),
      status: CALL_STATUS.IN_PROGRESS,
      createdAt: { lt: inProgressTimeout },
    },
    data: {
      status: CALL_STATUS.COMPLETED,
      endedAt: new Date(),
    },
  }).catch(() => {});

  const calls = await prisma.call.findMany({
    where: {
      ...scopeWhere(scope),
      direction: CALL_DIRECTION.OUTBOUND,
      status: { in: LIVE_CALL_STATUSES },
      agentCallSid: { not: null },
      OR: [
        { status: CALL_STATUS.RINGING, createdAt: { gte: ringingTimeout } },
        { status: CALL_STATUS.IN_PROGRESS, createdAt: { gte: inProgressTimeout } },
      ],
    },
    select: callSelect,
    orderBy: { createdAt: "desc" },
  });
  return calls.map(toCallSummary);
}

// ---------------------------------------------------------------------------
// Saliente
// ---------------------------------------------------------------------------

/** Política de destinos vigente; la lista de países se ajusta por entorno sin desplegar código. */
function callDestinationPolicy() {
  return {
    allowedCountries: parseAllowedCountries(process.env.VOICE_ALLOWED_COUNTRIES, DEFAULT_VOICE_ALLOWED_COUNTRIES),
    allowedTypes: VOICE_ALLOWED_NUMBER_TYPES,
  };
}

/**
 * Tope de salientes por usuario (1 h) y por cliente (24 h), contadas en `Call`. Si se roban
 * una sesión o alguien automatiza el botón, el daño queda acotado. No es atómico con el
 * `create` (dos peticiones simultáneas pueden pasar ambas): es un freno, no una cuota exacta.
 */
async function assertOutboundRateLimit(organizationId: string, userId: string, clientId: string | null) {
  const now = Date.now();
  const outbound = { organizationId, direction: CALL_DIRECTION.OUTBOUND };
  const [byUser, byClient] = await Promise.all([
    prisma.call.count({ where: { ...outbound, userId, createdAt: { gte: new Date(now - HOUR_MS) } } }),
    prisma.call.count({ where: { ...outbound, clientId, createdAt: { gte: new Date(now - DAY_MS) } } }),
  ]);
  if (byUser >= VOICE_MAX_CALLS_PER_USER_PER_HOUR) {
    throw new CallError(`Llegaste al límite de ${VOICE_MAX_CALLS_PER_USER_PER_HOUR} llamadas por hora. Intenta más tarde.`, 429);
  }
  if (byClient >= VOICE_MAX_CALLS_PER_CLIENT_PER_DAY) {
    throw new CallError(`Esta empresa llegó al límite de ${VOICE_MAX_CALLS_PER_CLIENT_PER_DAY} llamadas en 24 horas.`, 429);
  }
}

/**
 * Registra una llamada saliente a un lead dentro del scope del usuario. El número sale
 * del lead, nunca del navegador. El navegador conecta después con `callId`.
 */
export async function startOutboundCall(
  scope: TenantScope,
  userId: string,
  target: string | StartCallInput
) {
  await ensureTwilioRuntimeConfig();

  const leadId = typeof target === "string" ? target : target.leadId;
  const targetPhone = typeof target === "object" ? target.phone : undefined;
  const targetName = typeof target === "object" ? target.name : undefined;

  let lead = leadId
    ? await prisma.lead.findFirst({
        where: { id: leadId, isDeleted: false, ...scopeWhere(scope) },
        select: { id: true, clientId: true, normalizedPhone: true },
      })
    : null;

  if (!lead && targetPhone) {
    const phoneVal = validateAndNormalizePhone(targetPhone);
    if (!phoneVal.isValid || !phoneVal.normalized) {
      throw new CallError(
        phoneVal.error || "Número telefónico inválido. Usa formato internacional (ej: +14695629878).",
        400
      );
    }
    const normalized = phoneVal.normalized;

    lead = await prisma.lead.findFirst({
      where: {
        organizationId: scope.organizationId,
        normalizedPhone: normalized,
        isDeleted: false,
        ...(scope.clientId ? { clientId: scope.clientId } : {}),
      },
      select: { id: true, clientId: true, normalizedPhone: true },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          organizationId: scope.organizationId,
          clientId: scope.clientId || null,
          name: targetName?.trim() || "Contacto " + normalized,
          phone: normalized,
          normalizedPhone: normalized,
          source: LEAD_SOURCE.MANUAL,
          status: LEAD_STATUS.CONTACTED,
        },
        select: { id: true, clientId: true, normalizedPhone: true },
      });
    }
  }
  if (!lead) throw new CallError("Lead o número no encontrado.", 404);
  // Solo el E.164 validado: `phone` es texto libre y Twilio lo interpretaría a su manera.
  const toNumber = lead.normalizedPhone;
  if (!toNumber) {
    throw new CallError("El lead no tiene un teléfono válido en formato internacional. Corrígelo antes de llamar.", 400);
  }
  if (!isAllowedCallDestination(toNumber, callDestinationPolicy())) {
    throw new CallError("No se permiten llamadas a este número: el país o el tipo de línea no está habilitado.", 400);
  }
  if (!getTwilioVoiceConfig()) throw new CallError("Las llamadas no están configuradas en este entorno.", 503);
  await assertOutboundRateLimit(scope.organizationId, userId, lead.clientId);

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
  await ensureTwilioRuntimeConfig();
  // Un callId solo sirve una vez y solo para quien lo creó. El `updateMany` condicionado es
  // el candado: si Twilio reintenta o llegan dos connect a la vez, solo uno le marca al lead.
  const { count } = await prisma.call.updateMany({
    where: {
      id: callId,
      userId,
      direction: CALL_DIRECTION.OUTBOUND,
      status: CALL_STATUS.INITIATED,
      agentCallSid: null,
      conferenceName: { not: null },
    },
    data: { agentCallSid, status: CALL_STATUS.RINGING },
  });
  if (!count) return sayTwiml(CALL_ERROR_TEXT);

  const call = await prisma.call.findUnique({
    where: { id: callId },
    select: { id: true, conferenceName: true, fromNumber: true, toNumber: true },
  });
  if (!call?.conferenceName) return sayTwiml(CALL_ERROR_TEXT);

  try {
    const customerCallSid = await addConferenceParticipant({
      conferenceName: call.conferenceName,
      from: call.fromNumber,
      to: call.toNumber,
      statusCallback: webhookUrl(call.id, CALL_CALLBACK_LEG.CUSTOMER),
      timeoutSeconds: OUTBOUND_RING_SECONDS,
    });
    await prisma.call.update({ where: { id: call.id }, data: { customerCallSid } });
  } catch (error) {
    console.error(`Llamada ${call.id}: no se pudo marcar al lead:`, error);
    await finishCall(call.id, CALL_STATUS.FAILED, null);
    return sayTwiml(CALL_ERROR_TEXT);
  }

  // Sin `record` en la conferencia: si la línea graba, se empieza después del aviso (applyVoiceCallback).
  return conferenceTwiml({
    name: call.conferenceName,
    startConferenceOnEnter: true,
    endConferenceOnExit: true,
    statusCallback: webhookUrl(call.id, CALL_CALLBACK_LEG.CONFERENCE),
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

  // Admin de la organización o dueño del cliente de la llamada; un asesor nunca (lib/roles.ts).
  const canMonitor =
    supervisor && call &&
    canMonitorCall(
      { ...supervisor, organizationIds: supervisor.memberships.map((m) => m.organizationId) },
      { organizationId: call.organizationId, clientId: call.clientId }
    );
  const isLive = call && LIVE_CALL_STATUSES.includes(call.status as CallStatus) && call.conferenceName && call.agentCallSid;
  if (!canMonitor || !isLive || !Object.values(MONITOR_MODE).includes(mode)) return sayTwiml(CALL_ERROR_TEXT);

  await prisma.auditLog.create({
    data: {
      organizationId: call.organizationId,
      userId,
      action: "call_monitored",
      entityType: "Call",
      entityId: call.id,
      // El rol deja constancia de si escuchó Bunker o el dueño del cliente (revisión legal).
      detailsJson: JSON.stringify({ mode, supervisorCallSid, supervisorRole: supervisor.role, clientId: call.clientId }),
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

  // Una línea de un cliente solo reconoce leads de ese cliente: el mismo número puede ser lead
  // de dos empresas y la llamada (y su Activity) no debe caer en la otra. La línea general de
  // Bunker (sin cliente) sí busca en toda la organización.
  const lead = await prisma.lead.findFirst({
    where: {
      organizationId: line.organizationId,
      normalizedPhone: from,
      isDeleted: false,
      ...(line.clientId ? { clientId: line.clientId } : {}),
    },
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
    action: webhookUrl(call.id, CALL_CALLBACK_LEG.DIAL) as string,
    parameters: { callId: call.id },
    // El <Say> va antes del <Dial> y la grabación es "record-from-answer": el aviso siempre precede.
    announcement: line.recordCalls ? RECORDING_NOTICE : null,
    record: line.recordCalls,
    recordingStatusCallback: webhookUrl(call.id, CALL_CALLBACK_LEG.RECORDING),
  });
}

/**
 * El asesor contestó una entrante en su navegador: queda como responsable de la llamada.
 * Solo una entrante que sigue timbrando y que nadie contestó: una terminada no se reabre.
 */
export async function claimInboundCall(scope: TenantScope, userId: string, callId: string, agentCallSid: string | null) {
  const { count } = await prisma.call.updateMany({
    where: {
      id: callId,
      direction: CALL_DIRECTION.INBOUND,
      status: CALL_STATUS.RINGING,
      userId: null,
      answeredAt: null,
      ...scopeWhere(scope),
    },
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
    select: {
      direction: true,
      leadId: true,
      clientId: true,
      userId: true,
      toNumber: true,
      fromNumber: true,
      lead: { select: { clientId: true } },
    },
  });
  if (!call || (!call.leadId && !call.clientId)) return;
  // La Activity va con el cliente del lead, que es donde se ve su historial; sin lead, el de la llamada.
  const activityClientId = call.lead ? call.lead.clientId : call.clientId;

  const kind = call.direction === CALL_DIRECTION.OUTBOUND ? "saliente" : "entrante";
  const answered = status === CALL_STATUS.COMPLETED && (durationSec ?? 0) > 0;
  await prisma.activity.create({
    data: {
      leadId: call.leadId,
      clientId: activityClientId,
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
  if (!call) return leg === CALL_CALLBACK_LEG.DIAL ? sayTwiml(VOICEMAIL_TEXT) : null;
  const isFinal = FINAL_CALL_STATUSES.includes(call.status as CallStatus);

  if (leg === CALL_CALLBACK_LEG.CUSTOMER) {
    const status = mapCallStatus(params.CallStatus);
    if (!status || isFinal) return null;
    if (!FINAL_CALL_STATUSES.includes(status)) {
      await advanceCallStatus(call.id, status);
      return null;
    }
    await finishCall(call.id, status, params.CallDuration ? parseInt(params.CallDuration, 10) : null);
    // Si el lead nunca entró (ocupado, sin respuesta, falló), la conferencia no termina sola y el
    // asesor queda en silencio. Colgar su pierna termina la conferencia y dispara `disconnect`
    // en el navegador. Con `completed` no hace falta: el lead sale con EndConferenceOnExit.
    if (status !== CALL_STATUS.COMPLETED && call.agentCallSid) {
      await completeTwilioCall(call.agentCallSid).catch((e) => console.error(`Llamada ${call.id}: no se pudo colgar al asesor:`, e));
    }
    return null;
  }

  if (leg === CALL_CALLBACK_LEG.CONFERENCE) {
    await handleConferenceEvent(call, params, isFinal);
    return null;
  }

  if (leg === CALL_CALLBACK_LEG.RECORDING) {
    if (params.RecordingStatus === "completed" && params.RecordingSid) {
      await prisma.call.update({ where: { id: call.id }, data: { recordingSid: params.RecordingSid, recordingUrl: params.RecordingUrl ?? null } });
    }
    return null;
  }

  if (leg === CALL_CALLBACK_LEG.DIAL) {
    const status = mapCallStatus(params.DialCallStatus) ?? CALL_STATUS.NO_ANSWER;
    const answered = status === CALL_STATUS.COMPLETED || status === CALL_STATUS.IN_PROGRESS;
    await finishCall(call.id, answered ? CALL_STATUS.COMPLETED : status, params.DialCallDuration ? parseInt(params.DialCallDuration, 10) : null);
    return answered ? emptyTwiml() : sayTwiml(VOICEMAIL_TEXT);
  }

  return null;
}

/** Guarda un estado intermedio solo si avanza; un callback atrasado no regresa la llamada. */
async function advanceCallStatus(callId: string, status: CallStatus) {
  await prisma.call.updateMany({
    where: { id: callId, status: { in: statusesThatCanAdvanceTo(status, CALL_STATUS_RANK) } },
    // Solo se llega a in_progress desde initiated/ringing, así que answeredAt aún no existe.
    data: { status, ...(status === CALL_STATUS.IN_PROGRESS ? { answeredAt: new Date() } : {}) },
  });
}

interface ConferenceCallRow {
  id: string;
  answeredAt: Date | null;
  customerCallSid: string | null;
  line: { recordCalls: boolean } | null;
}

/**
 * Eventos de la conferencia de una saliente. Si la línea graba, el orden es: entra el lead →
 * aviso a toda la conferencia → `announcement-end` → recién ahí se graba la pierna del lead.
 * Si el aviso falla o no se pudo pedir, la llamada sigue sin grabarse: nunca se graba sin avisar.
 */
async function handleConferenceEvent(call: ConferenceCallRow, params: Record<string, string>, isFinal: boolean) {
  const event = params.StatusCallbackEvent;
  const recordCalls = Boolean(call.line?.recordCalls);

  if (event === TWILIO_CONFERENCE_EVENT.PARTICIPANT_JOIN && recordCalls && params.CallSid === call.customerCallSid && params.ConferenceSid) {
    const announceUrl = twilioWebhookUrl(VOICE_WEBHOOK_PATH.ANNOUNCE);
    if (announceUrl) {
      await announceToConference(params.ConferenceSid, announceUrl).catch(async (e) => {
        console.warn(`Llamada ${call.id}: no se pudo dar el aviso de grabación, iniciando grabación directa:`, e);
        if (call.customerCallSid) {
          await startCallRecording(call.customerCallSid, webhookUrl(call.id, CALL_CALLBACK_LEG.RECORDING)).catch(() => {});
        }
      });
      return;
    }
    await startCallRecording(call.customerCallSid, webhookUrl(call.id, CALL_CALLBACK_LEG.RECORDING)).catch((e) =>
      console.error(`Llamada ${call.id}: no se pudo iniciar la grabación:`, e)
    );
    return;
  }

  if (event === TWILIO_CONFERENCE_EVENT.ANNOUNCEMENT_END && recordCalls && call.customerCallSid && !isFinal) {
    await startCallRecording(call.customerCallSid, webhookUrl(call.id, CALL_CALLBACK_LEG.RECORDING)).catch((e) =>
      console.error(`Llamada ${call.id}: no se pudo iniciar la grabación:`, e)
    );
    return;
  }

  if (event === TWILIO_CONFERENCE_EVENT.ANNOUNCEMENT_FAIL && recordCalls && call.customerCallSid && !isFinal) {
    console.warn(`Llamada ${call.id}: Twilio no reprodujo el aviso de grabación; iniciando grabación como respaldo.`);
    await startCallRecording(call.customerCallSid, webhookUrl(call.id, CALL_CALLBACK_LEG.RECORDING)).catch((e) =>
      console.error(`Llamada ${call.id}: no se pudo iniciar la grabación:`, e)
    );
    return;
  }

  if (event === TWILIO_CONFERENCE_EVENT.CONFERENCE_END && !isFinal) {
    // El asesor colgó antes de que el lead contestara: deja de timbrarle.
    if (!call.answeredAt && call.customerCallSid) await completeTwilioCall(call.customerCallSid).catch(() => undefined);
    await finishCall(call.id, call.answeredAt ? CALL_STATUS.COMPLETED : CALL_STATUS.CANCELED, durationSince(call.answeredAt));
  }
}

function durationSince(answeredAt: Date | null) {
  return answeredAt ? Math.round((Date.now() - answeredAt.getTime()) / 1000) : null;
}

export const recordingNoticeTwiml = () => sayTwiml(RECORDING_NOTICE, false);
