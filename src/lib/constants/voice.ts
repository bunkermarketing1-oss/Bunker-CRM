/** Valores de dominio de llamadas (`Call`, `PhoneLine`), guardados como texto en la base. */

type ValueOf<T> = T[keyof T];

export const CALL_DIRECTION = {
  OUTBOUND: "outbound",
  INBOUND: "inbound",
} as const;
export type CallDirection = ValueOf<typeof CALL_DIRECTION>;

export const CALL_STATUS = {
  INITIATED: "initiated",
  RINGING: "ringing",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  BUSY: "busy",
  NO_ANSWER: "no_answer",
  FAILED: "failed",
  CANCELED: "canceled",
} as const;
export type CallStatus = ValueOf<typeof CALL_STATUS>;

/** Estados en los que la llamada ya terminó y no cambia más. */
export const FINAL_CALL_STATUSES: CallStatus[] = [
  CALL_STATUS.COMPLETED,
  CALL_STATUS.BUSY,
  CALL_STATUS.NO_ANSWER,
  CALL_STATUS.FAILED,
  CALL_STATUS.CANCELED,
];

/** Estados que cuentan como llamada "en curso" (para la escucha en vivo). */
export const LIVE_CALL_STATUSES: CallStatus[] = [CALL_STATUS.RINGING, CALL_STATUS.IN_PROGRESS];

export const CALL_STATUS_LABEL: Record<CallStatus, string> = {
  initiated: "Iniciando",
  ringing: "Timbrando",
  in_progress: "En curso",
  completed: "Completada",
  busy: "Ocupado",
  no_answer: "Sin respuesta",
  failed: "Fallida",
  canceled: "Cancelada",
};

/** Cómo entra un supervisor a una llamada en curso. */
export const MONITOR_MODE = {
  /** Escucha sin que nadie lo oiga. */
  LISTEN: "listen",
  /** Le habla solo al asesor ("coach"); el lead no lo oye. */
  WHISPER: "whisper",
} as const;
export type MonitorMode = ValueOf<typeof MONITOR_MODE>;

/** Formato de un CallSid de Twilio ("CA" + 32 hex). Lo que manda el navegador se valida contra esto. */
export const TWILIO_CALL_SID_PATTERN = /^CA[0-9a-f]{32}$/;

/** Prefijo de la identidad del navegador en Twilio: `u_<userId>`. */
export const VOICE_IDENTITY_PREFIX = "u_";

/** Vida del Access Token del navegador; el SDK lo renueva antes de que expire. */
export const VOICE_TOKEN_TTL_SECONDS = 60 * 60;

/** Segundos que timbra una entrante en los navegadores antes de ir al mensaje de cortesía. */
export const INBOUND_RING_SECONDS = 25;

/** Pierna de la llamada a la que corresponde un callback (`?leg=` en VOICE_WEBHOOK_PATH.STATUS). */
export const CALL_CALLBACK_LEG = {
  /** Estado de la pierna del lead (saliente). */
  CUSTOMER: "customer",
  /** Eventos de la conferencia (entrada del lead, aviso, fin). */
  CONFERENCE: "conference",
  RECORDING: "recording",
  /** Fin del <Dial> de una entrante. */
  DIAL: "dial",
} as const;

/** `StatusCallbackEvent` de una conferencia de Twilio que el CRM atiende. */
export const TWILIO_CONFERENCE_EVENT = {
  PARTICIPANT_JOIN: "participant-join",
  CONFERENCE_END: "conference-end",
  ANNOUNCEMENT_END: "announcement-end",
  ANNOUNCEMENT_FAIL: "announcement-fail",
} as const;

export const VOICE_WEBHOOK_PATH = {
  /** Voice URL del TwiML App (llamadas que salen del navegador). */
  APP: "/api/integrations/twilio/voice",
  /** "A call comes in" de cada número. */
  INBOUND: "/api/integrations/twilio/voice/inbound",
  STATUS: "/api/integrations/twilio/voice/status",
  ANNOUNCE: "/api/integrations/twilio/voice/announce",
} as const;

/**
 * Orden de avance de una llamada. Los callbacks de Twilio pueden llegar desordenados
 * (p. ej. `ringing` después de `in-progress`); un estado solo se guarda si avanza.
 */
export const CALL_STATUS_RANK: Record<CallStatus, number> = {
  initiated: 0,
  ringing: 1,
  in_progress: 2,
  completed: 3,
  busy: 3,
  no_answer: 3,
  failed: 3,
  canceled: 3,
};

// ---------------------------------------------------------------------------
// Antifraude de salientes (toll fraud)
// ---------------------------------------------------------------------------

/**
 * Países (ISO 3166-1 alfa-2) a los que se puede llamar si `VOICE_ALLOWED_COUNTRIES` no
 * está definida. El destino sale del lead y un usuario CLIENT puede crear leads con
 * cualquier número: sin esta lista, un lead con un número premium del extranjero
 * convertiría el CRM en un marcador a cuenta de Bunker.
 */
export const DEFAULT_VOICE_ALLOWED_COUNTRIES = ["MX", "CO", "US"] as const;

/**
 * Tipos de número (libphonenumber `getType()`) a los que se permite llamar. Conservador
 * a propósito: deja fuera tarifa premium, costo compartido, UAN, VoIP, satelitales,
 * números personales, buscapersonas y también los gratuitos (un lead real no deja un 800).
 */
export const VOICE_ALLOWED_NUMBER_TYPES = ["MOBILE", "FIXED_LINE", "FIXED_LINE_OR_MOBILE"] as const;

/** Salientes que un usuario puede iniciar por hora; un asesor real no pasa de una cada 2 min. */
export const VOICE_MAX_CALLS_PER_USER_PER_HOUR = 30;

/** Salientes por cliente (o por la organización, si el lead no tiene cliente) en 24 h. */
export const VOICE_MAX_CALLS_PER_CLIENT_PER_DAY = 300;
