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

/** Prefijo de la identidad del navegador en Twilio: `u_<userId>`. */
export const VOICE_IDENTITY_PREFIX = "u_";

/** Vida del Access Token del navegador; el SDK lo renueva antes de que expire. */
export const VOICE_TOKEN_TTL_SECONDS = 60 * 60;

/** Segundos que timbra una entrante en los navegadores antes de ir al mensaje de cortesía. */
export const INBOUND_RING_SECONDS = 25;

export const VOICE_WEBHOOK_PATH = {
  /** Voice URL del TwiML App (llamadas que salen del navegador). */
  APP: "/api/integrations/twilio/voice",
  /** "A call comes in" de cada número. */
  INBOUND: "/api/integrations/twilio/voice/inbound",
  STATUS: "/api/integrations/twilio/voice/status",
  ANNOUNCE: "/api/integrations/twilio/voice/announce",
} as const;
