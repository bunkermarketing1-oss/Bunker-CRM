/**
 * Cliente mínimo de Twilio Messaging y Voice (REST, sin SDK).
 * Docs: https://www.twilio.com/docs/messaging/api/message-resource
 */

import { MESSAGE_STATUS, type MessageStatus } from "@/lib/constants/messaging";
import type { TwilioConnectionTestResult, TwilioWebhookUrls } from "@/types/integrations";

export const TWILIO_SMS_WEBHOOK_PATH = "/api/integrations/twilio/sms";
export const TWILIO_STATUS_WEBHOOK_PATH = "/api/integrations/twilio/status";

export interface TwilioSendResult {
  status: typeof MESSAGE_STATUS.SENT | typeof MESSAGE_STATUS.FAILED;
  providerMsgId: string | null;
  errorMessage: string | null;
  /** Sin credenciales no se envía nada: el mensaje queda marcado como demo. */
  isDemo: boolean;
}

export interface ProvisionedTwilioVoiceConfig {
  fromPhone: string | null;
  apiKeySid: string;
  apiKeySecret: string;
  twimlAppSid: string;
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

/** Devuelve las URLs absolutas listas para configurar en la consola de Twilio. */
export function getTwilioWebhookUrls(fallbackHost?: string): TwilioWebhookUrls {
  const base = process.env.NEXT_PUBLIC_APP_URL || (fallbackHost ? `https://${fallbackHost}` : "http://localhost:3000");
  const cleanBase = base.replace(/\/$/, "");
  return {
    smsInboundUrl: `${cleanBase}${TWILIO_SMS_WEBHOOK_PATH}`,
    smsStatusUrl: `${cleanBase}${TWILIO_STATUS_WEBHOOK_PATH}`,
    voiceAppUrl: `${cleanBase}/api/integrations/twilio/voice`,
    voiceInboundUrl: `${cleanBase}/api/integrations/twilio/voice/inbound`,
    voiceStatusUrl: `${cleanBase}/api/integrations/twilio/voice/status`,
  };
}

/**
 * Descubre o aprovisiona automáticamente en Twilio REST API la TwiML App y una API Key
 * para WebRTC Voice usando únicamente Account SID y Auth Token.
 */
export async function provisionTwilioVoiceCredentials(
  accountSid: string,
  authToken: string,
  existingFromPhone?: string | null
): Promise<ProvisionedTwilioVoiceConfig | null> {
  const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const webhooks = getTwilioWebhookUrls();

  try {
    let fromPhone = existingFromPhone || process.env.TWILIO_PHONE_NUMBER || null;
    if (!fromPhone) {
      const numRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PageSize=1`,
        {
          method: "GET",
          headers: { Authorization: authHeader, Accept: "application/json" },
          signal: AbortSignal.timeout(TWILIO_REQUEST_TIMEOUT_MS),
        }
      );
      if (numRes.ok) {
        const numData: { incoming_phone_numbers?: Array<{ phone_number?: string }> } =
          await numRes.json().catch(() => ({}));
        fromPhone = numData.incoming_phone_numbers?.[0]?.phone_number ?? null;
      }
    }

    // 1. Buscar o crear TwiML App para Voz WebRTC
    let twimlAppSid = process.env.TWILIO_TWIML_APP_SID || null;
    if (!twimlAppSid) {
      const appsRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Applications.json?PageSize=50`,
        {
          method: "GET",
          headers: { Authorization: authHeader, Accept: "application/json" },
          signal: AbortSignal.timeout(TWILIO_REQUEST_TIMEOUT_MS),
        }
      );
      if (appsRes.ok) {
        const appsData: {
          applications?: Array<{ sid?: string; friendly_name?: string; voice_url?: string }>;
        } = await appsRes.json().catch(() => ({}));
        const existingApp = (appsData.applications || []).find(
          (app) =>
            app.friendly_name === "Bunker CRM Voice App" ||
            Boolean(app.voice_url && app.voice_url.includes("/api/integrations/twilio/voice"))
        );
        if (existingApp?.sid) {
          twimlAppSid = existingApp.sid;
        }
      }
    }

    if (!twimlAppSid) {
      const createAppBody = new URLSearchParams({
        FriendlyName: "Bunker CRM Voice App",
        VoiceUrl: webhooks.voiceAppUrl,
        VoiceMethod: "POST",
      });
      const createAppRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Applications.json`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
          },
          body: createAppBody.toString(),
          signal: AbortSignal.timeout(TWILIO_REQUEST_TIMEOUT_MS),
        }
      );
      if (!createAppRes.ok) return null;
      const createdApp: { sid?: string } = await createAppRes.json().catch(() => ({}));
      if (!createdApp.sid) return null;
      twimlAppSid = createdApp.sid;
    }

    // 2. Crear API Key estándar para firmar Access Tokens de WebRTC
    const createKeyBody = new URLSearchParams({
      FriendlyName: "Bunker CRM WebRTC Voice Key",
    });
    const createKeyRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Keys.json`,
      {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
        },
        body: createKeyBody.toString(),
        signal: AbortSignal.timeout(TWILIO_REQUEST_TIMEOUT_MS),
      }
    );
    if (!createKeyRes.ok) return null;
    const createdKey: { sid?: string; secret?: string } = await createKeyRes.json().catch(() => ({}));
    if (!createdKey.sid || !createdKey.secret) return null;

    return {
      fromPhone,
      apiKeySid: createdKey.sid,
      apiKeySecret: createdKey.secret,
      twimlAppSid,
    };
  } catch (error) {
    console.warn("Error al auto-aprovisionar credenciales de voz de Twilio:", error);
    return null;
  }
}

/**
 * Verifica las credenciales de Twilio llamando a la API REST oficial de Twilio
 * (GET /2010-04-01/Accounts/{AccountSid}.json).
 */
export async function testTwilioConnection(
  override?: { accountSid?: string; authToken?: string; fromPhone?: string }
): Promise<TwilioConnectionTestResult> {
  const accountSid = override?.accountSid || process.env.TWILIO_ACCOUNT_SID;
  const authToken = override?.authToken || process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = override?.fromPhone || process.env.TWILIO_PHONE_NUMBER;
  const webhooks = getTwilioWebhookUrls();

  const voiceReady = Boolean(
    accountSid &&
    authToken &&
    fromPhone &&
    process.env.TWILIO_API_KEY_SID &&
    process.env.TWILIO_API_KEY_SECRET &&
    process.env.TWILIO_TWIML_APP_SID
  );

  if (!accountSid || !authToken) {
    return {
      connected: false,
      accountSid: accountSid || null,
      accountName: null,
      accountStatus: null,
      accountType: null,
      phoneNumber: fromPhone || null,
      phoneFound: false,
      phoneCapabilities: null,
      smsReady: false,
      voiceReady: false,
      webhooks,
      error: "Faltan credenciales de Twilio (TWILIO_ACCOUNT_SID o TWILIO_AUTH_TOKEN).",
    };
  }

  try {
    const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      method: "GET",
      headers: {
        Authorization: authHeader,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(TWILIO_REQUEST_TIMEOUT_MS),
    });

    const data: {
      sid?: string;
      friendly_name?: string;
      status?: string;
      type?: string;
      code?: number;
      message?: string;
    } = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        connected: false,
        accountSid,
        accountName: null,
        accountStatus: null,
        accountType: null,
        phoneNumber: fromPhone || null,
        phoneFound: false,
        phoneCapabilities: null,
        smsReady: false,
        voiceReady: false,
        webhooks,
        error: humanizeTwilioError(data.code, data.message),
      };
    }

    let phoneFound = false;
    let phoneCapabilities: { sms: boolean; voice: boolean; mms: boolean } | null = null;

    if (fromPhone) {
      try {
        const phoneRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(fromPhone)}`,
          {
            method: "GET",
            headers: {
              Authorization: authHeader,
              Accept: "application/json",
            },
            signal: AbortSignal.timeout(TWILIO_REQUEST_TIMEOUT_MS),
          }
        );
        if (phoneRes.ok) {
          const phoneData: {
            incoming_phone_numbers?: Array<{
              capabilities?: { sms?: boolean; voice?: boolean; mms?: boolean };
            }>;
          } = await phoneRes.json().catch(() => ({}));
          const numbers = phoneData.incoming_phone_numbers || [];
          if (numbers.length > 0) {
            phoneFound = true;
            const caps = numbers[0]?.capabilities;
            phoneCapabilities = {
              sms: Boolean(caps?.sms),
              voice: Boolean(caps?.voice),
              mms: Boolean(caps?.mms),
            };
          }
        }
      } catch {
        // Fallback no bloqueante si falla la consulta del teléfono
      }
    }

    const isAccountActive = data.status === "active";
    const smsReady = Boolean(isAccountActive && fromPhone);

    return {
      connected: true,
      accountSid: data.sid || accountSid,
      accountName: data.friendly_name || "Cuenta de Twilio",
      accountStatus: data.status || "active",
      accountType: data.type || "Full",
      phoneNumber: fromPhone || null,
      phoneFound,
      phoneCapabilities,
      smsReady,
      voiceReady: smsReady && voiceReady,
      webhooks,
      error: null,
    };
  } catch (err) {
    return {
      connected: false,
      accountSid,
      accountName: null,
      accountStatus: null,
      accountType: null,
      phoneNumber: fromPhone || null,
      phoneFound: false,
      phoneCapabilities: null,
      smsReady: false,
      voiceReady: false,
      webhooks,
      error: err instanceof Error ? err.message : "Error de conexión con la API de Twilio.",
    };
  }
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

/** Un webhook de Meta espera la respuesta; un Twilio lento no debe dejarlo colgado. */
const TWILIO_REQUEST_TIMEOUT_MS = 10_000;

// Códigos de error de la API de Twilio: https://www.twilio.com/docs/api/errors
const TWILIO_ERROR_MESSAGE: Record<number, string> = {
  20003: "Las credenciales de Twilio (Account SID o Auth Token) no son válidas o expiraron.",
  21211: "El número del destinatario no es válido o le falta el prefijo de país (ej: +57 o +52).",
  21408: "Twilio tiene bloqueados los envíos a este país: habilítalo en Geo-Permissions de la consola de Twilio.",
  21606: "El número remitente de Twilio no tiene habilitado el envío de SMS.",
  21608: "La cuenta de prueba de Twilio solo envía SMS a números verificados en la consola.",
  21610: "El destinatario se dio de baja de los SMS de este número (respondió STOP).",
  21614: "El número del destinatario no puede recibir SMS.",
  572002: "Tu cuenta de Twilio está en modo Prueba (Trial) y requiere que el número destino esté verificado en Twilio Console, o que hagas 'Upgrade' en tu cuenta de Twilio agregando saldo ($20 USD) para enviar a cualquier número.",
};

/** Mensaje en español para el asesor; si el código no es conocido, conserva el texto de Twilio. */
export function humanizeTwilioError(code: number | undefined, rawMessage: string | undefined): string {
  if (code && TWILIO_ERROR_MESSAGE[code]) return TWILIO_ERROR_MESSAGE[code];
  if (
    rawMessage &&
    (rawMessage.toLowerCase().includes("trial") ||
      rawMessage.toLowerCase().includes("verified recipient"))
  ) {
    return "Tu cuenta de Twilio está en modo Prueba (Trial) y no permite enviar a números libres. Para enviar a cualquier número (+52, +57, etc.), debes hacer 'Upgrade' en la consola de Twilio agregando saldo ($20 USD), o registrar este número en 'Verified Caller IDs'.";
  }
  return `Twilio no pudo procesar el envío: ${rawMessage || "error desconocido"}`;
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
      signal: AbortSignal.timeout(TWILIO_REQUEST_TIMEOUT_MS),
    });
    const data: { sid?: string; message?: string; code?: number } = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        status: MESSAGE_STATUS.FAILED,
        providerMsgId: null,
        errorMessage: humanizeTwilioError(data.code, data.message),
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
  code?: number;

  constructor(message: string, code?: number) {
    super(message);
    this.code = code;
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
  await twilioPost(`/Calls/${encodeURIComponent(callSid)}.json`, { Status: "completed" });
}

/**
 * Reproduce un TwiML (p. ej. el aviso de grabación) a toda la conferencia. Al terminar,
 * Twilio manda `announcement-end` (o `announcement-fail`) al statusCallback de la conferencia.
 */
export async function announceToConference(conferenceSid: string, announceUrl: string) {
  await twilioPost(`/Conferences/${encodeURIComponent(conferenceSid)}.json`, { AnnounceUrl: announceUrl, AnnounceMethod: "POST" });
}

/**
 * Empieza a grabar una pierna en curso. Se usa con la del lead después del aviso de
 * grabación: en dos canales queda lo que dice el lead y lo que oye (asesor incluido).
 * Docs: https://www.twilio.com/docs/voice/api/recording#create-a-recording-resource
 */
export async function startCallRecording(callSid: string, recordingStatusCallback: string | null) {
  await twilioPost(`/Calls/${encodeURIComponent(callSid)}/Recordings.json`, {
    RecordingChannels: "dual",
    RecordingStatusCallback: recordingStatusCallback ?? undefined,
    RecordingStatusCallbackEvent: recordingStatusCallback ? "completed" : undefined,
  });
}
