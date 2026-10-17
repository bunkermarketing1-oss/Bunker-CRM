/**
 * Cliente mínimo de Twilio Messaging (REST, sin SDK).
 * Docs: https://www.twilio.com/docs/messaging/api/message-resource
 */

import { MESSAGE_STATUS, type MessageStatus } from "@/lib/constants/messaging";

export const TWILIO_SMS_WEBHOOK_PATH = "/api/integrations/twilio/sms";
export const TWILIO_STATUS_WEBHOOK_PATH = "/api/integrations/twilio/status";

export interface TwilioSendResult {
  status: typeof MESSAGE_STATUS.SENT | typeof MESSAGE_STATUS.FAILED;
  providerMsgId: string | null;
  errorMessage: string | null;
  /** Sin credenciales no se envía nada: el mensaje queda marcado como demo. */
  isDemo: boolean;
}

export function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromPhone) return null;
  return { accountSid, authToken, fromPhone };
}

/**
 * URL pública de un webhook de Twilio. Es la misma con la que Twilio firma la petición,
 * así que se arma desde NEXT_PUBLIC_APP_URL y no desde el request (detrás del proxy de
 * Dokploy el host y el protocolo internos son otros).
 */
export function twilioWebhookUrl(path: string) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  return appUrl ? `${appUrl.replace(/\/$/, "")}${path}` : null;
}

/** Estado de Twilio (`MessageStatus`) → estado del CRM. null = estado intermedio, no se guarda. */
export function mapTwilioStatus(twilioStatus: string): MessageStatus | null {
  switch (twilioStatus) {
    case "sent":
      return MESSAGE_STATUS.SENT;
    case "delivered":
    case "read":
      return MESSAGE_STATUS.DELIVERED;
    case "undelivered":
    case "failed":
    case "canceled":
      return MESSAGE_STATUS.FAILED;
    default:
      return null; // queued, accepted, scheduled, sending
  }
}

/** Envía un SMS. Nunca lanza: los errores vuelven en `errorMessage` para guardarlos en `Message`. */
export async function sendTwilioSms(to: string, body: string): Promise<TwilioSendResult> {
  const cfg = getTwilioConfig();
  if (!cfg) {
    return {
      status: MESSAGE_STATUS.FAILED,
      providerMsgId: null,
      errorMessage: "Faltan credenciales del proveedor (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN en variables de entorno).",
      isDemo: true,
    };
  }

  try {
    const params = new URLSearchParams({ To: to, From: cfg.fromPhone, Body: body });
    // Twilio solo puede avisar la entrega a una URL pública; en local (http) se omite.
    const statusCallback = twilioWebhookUrl(TWILIO_STATUS_WEBHOOK_PATH);
    if (statusCallback?.startsWith("https://")) params.set("StatusCallback", statusCallback);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data: { sid?: string; message?: string } = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        status: MESSAGE_STATUS.FAILED,
        providerMsgId: null,
        errorMessage: data.message || "Error devuelto por proveedor Twilio",
        isDemo: false,
      };
    }
    return { status: MESSAGE_STATUS.SENT, providerMsgId: data.sid ?? null, errorMessage: null, isDemo: false };
  } catch (error) {
    return {
      status: MESSAGE_STATUS.FAILED,
      providerMsgId: null,
      errorMessage: error instanceof Error ? error.message : "Fallo de conexión al enviar SMS",
      isDemo: false,
    };
  }
}

// ---------------------------------------------------------------------------
// Voz (REST)
// ---------------------------------------------------------------------------

export class TwilioApiError extends Error {
  constructor(message: string, public code?: number) {
    super(message);
  }
}

async function twilioPost<T>(path: string, params: Record<string, string | undefined>): Promise<T> {
  const cfg = getTwilioConfig();
  if (!cfg) throw new TwilioApiError("Twilio no está configurado (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER).");

  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined) body.append(key, value);

  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}${path}`, {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new TwilioApiError(data.message || `Twilio respondió ${res.status}`, data.code);
  return data as T;
}

export function getTwilioVoiceConfig() {
  const cfg = getTwilioConfig();
  const apiKeySid = process.env.TWILIO_API_KEY_SID;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const twimlAppSid = process.env.TWILIO_TWIML_APP_SID;
  if (!cfg || !apiKeySid || !apiKeySecret || !twimlAppSid) return null;
  return { ...cfg, apiKeySid, apiKeySecret, twimlAppSid };
}

export interface AddParticipantInput {
  conferenceName: string;
  from: string;
  to: string;
  statusCallback: string | null;
  timeoutSeconds: number;
}

/**
 * Le marca al lead y lo mete a la conferencia (la crea si aún no existe). Si el lead
 * cuelga, la conferencia termina para todos.
 * Docs: https://www.twilio.com/docs/voice/api/conference-participant-resource
 */
export async function addConferenceParticipant(input: AddParticipantInput) {
  const data = await twilioPost<{ call_sid: string }>(`/Conferences/${encodeURIComponent(input.conferenceName)}/Participants.json`, {
    From: input.from,
    To: input.to,
    EarlyMedia: "true",
    Beep: "false",
    EndConferenceOnExit: "true",
    Timeout: String(input.timeoutSeconds),
    StatusCallback: input.statusCallback ?? undefined,
    StatusCallbackEvent: input.statusCallback ? "initiated ringing answered completed" : undefined,
  });
  return data.call_sid;
}

/** Cuelga una pierna de la llamada. */
export async function completeTwilioCall(callSid: string) {
  await twilioPost(`/Calls/${callSid}.json`, { Status: "completed" });
}

/** Reproduce un TwiML (p. ej. el aviso de grabación) a toda la conferencia. */
export async function announceToConference(conferenceSid: string, announceUrl: string) {
  await twilioPost(`/Conferences/${conferenceSid}.json`, { AnnounceUrl: announceUrl, AnnounceMethod: "POST" });
}
