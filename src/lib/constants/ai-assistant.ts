/**
 * Asistente de IA que contesta los SMS de los leads fuera del horario de atención.
 * Sin imports a propósito: los tests de lógica pura lo cargan directo con Node.
 */

type ValueOf<T> = T[keyof T];

/**
 * Modelo de OpenAI por defecto si no se define `AI_MODEL`. Rápido y barato, sin
 * razonamiento: con un modelo de razonamiento el límite de tokens también cubre el
 * razonamiento y la respuesta puede quedar vacía o pasar del timeout del webhook.
 */
export const DEFAULT_AI_MODEL = "gpt-4.1-mini";

/** Chat Completions de OpenAI: https://platform.openai.com/docs/api-reference/chat/create */
export const OPENAI_CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Tiempo máximo de la llamada a OpenAI. Twilio corta el webhook de SMS entrante a los 15 s;
 * con 8 s queda margen para guardar en la base y enviar el SMS por Twilio.
 */
export const AI_REPLY_TIMEOUT_MS = 8_000;

/**
 * Largo máximo de una respuesta de la IA: 320 caracteres son ~2 segmentos GSM-7, menos que
 * el SMS_MAX_LENGTH general (480), para que la respuesta sea corta y barata.
 */
export const AI_REPLY_MAX_LENGTH = 320;

/** Tokens de salida pedidos a OpenAI: holgados para 320 caracteres en español (~100 tokens). */
export const AI_REPLY_MAX_OUTPUT_TOKENS = 200;

/** Mensajes previos de la conversación que se mandan como contexto (incluye el recién recibido). */
export const AI_CONTEXT_MESSAGES = 10;

export const AI_KNOWLEDGE_BASE_MAX_LENGTH = 8_000;
export const AI_INSTRUCTIONS_MAX_LENGTH = 1_000;

/** Zona horaria por defecto: el piloto (Carrito Naranja) opera en Colombia. */
export const DEFAULT_AI_TIMEZONE = "America/Bogota";

/** Respuestas automáticas por conversación en una ventana móvil de 24 h. */
export const DEFAULT_AI_MAX_REPLIES_PER_DAY = 3;
export const AI_MAX_REPLIES_PER_DAY_LIMIT = 20;
export const AI_REPLY_CAP_WINDOW_MS = 24 * 60 * 60 * 1000;

export const DEFAULT_AI_HANDOFF_MESSAGE =
  "¡Gracias por escribirnos! En este momento estamos fuera de horario. Un asesor te responderá en cuanto abramos.";

/** Días de la semana, en el orden en que se muestran (lunes primero). */
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const WEEKDAY_LABEL: Record<(typeof WEEKDAYS)[number], string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};

/** Horario sugerido al crear la configuración: lunes a sábado; el domingo cerrado. */
export const DEFAULT_BUSINESS_HOURS = {
  mon: { start: "08:00", end: "18:00" },
  tue: { start: "08:00", end: "18:00" },
  wed: { start: "08:00", end: "18:00" },
  thu: { start: "08:00", end: "18:00" },
  fri: { start: "08:00", end: "18:00" },
  sat: { start: "09:00", end: "13:00" },
  sun: null,
};

/** Por qué el asistente no contestó un SMS entrante (se registra en el log del servidor). */
export const AI_REPLY_SKIP_REASON = {
  DUPLICATE: "duplicate",
  NO_LEAD: "no_lead",
  AMBIGUOUS: "ambiguous",
  KEYWORD: "keyword",
  OPTED_OUT: "opted_out",
  EMPTY_BODY: "empty_body",
  DISABLED: "disabled",
  BUSINESS_HOURS: "business_hours",
  DAILY_CAP: "daily_cap",
} as const;
export type AiReplySkipReason = ValueOf<typeof AI_REPLY_SKIP_REASON>;

/** Acciones de AuditLog del asistente. */
export const AI_ASSISTANT_AUDIT_ACTION = {
  UPDATED: "client_ai_assistant_updated",
} as const;
