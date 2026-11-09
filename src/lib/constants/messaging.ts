/** Valores de dominio de mensajería (`Message`), guardados como texto en la base. */

type ValueOf<T> = T[keyof T];

export const MESSAGE_CHANNEL = {
  SMS: "sms",
  WHATSAPP: "whatsapp",
  EMAIL: "email",
  MESSENGER: "messenger",
  INSTAGRAM: "instagram",
  FACEBOOK_COMMENT: "facebook_comment",
  INSTAGRAM_COMMENT: "instagram_comment",
} as const;
export type MessageChannel = ValueOf<typeof MESSAGE_CHANNEL>;

export const MESSAGE_DIRECTION = {
  OUTBOUND: "outbound",
  INBOUND: "inbound",
} as const;
export type MessageDirection = ValueOf<typeof MESSAGE_DIRECTION>;

export const MESSAGE_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
  FAILED: "failed",
  UNKNOWN: "unknown",
} as const;
export type MessageStatus = ValueOf<typeof MESSAGE_STATUS>;

/** Twilio parte un SMS largo en segmentos; 480 caracteres son ~3 segmentos GSM-7. */
export const SMS_MAX_LENGTH = 480;

/**
 * Tope de destinatarios por envío masivo. Los SMS salen uno por uno (~0.5 s cada uno), y
 * con 200 el lote termina dentro del maxDuration de 300 s de la ruta.
 */
export const BULK_SMS_MAX_RECIPIENTS = 200;

/**
 * Orden de los estados de un SMS saliente para aplicar los callbacks de Twilio, que pueden
 * llegar desordenados. `delivered` y `failed` comparten rango porque ambos son finales en
 * Twilio (delivered / undelivered / failed): un estado final nunca se sobrescribe, ni
 * siquiera por el otro final. https://www.twilio.com/docs/messaging/api/message-resource#message-status-values
 */
export const MESSAGE_STATUS_RANK: Record<string, number> = {
  [MESSAGE_STATUS.PENDING]: 0,
  [MESSAGE_STATUS.UNKNOWN]: 0,
  [MESSAGE_STATUS.SENT]: 1,
  [MESSAGE_STATUS.DELIVERED]: 2,
  [MESSAGE_STATUS.READ]: 3,
  [MESSAGE_STATUS.FAILED]: 2,
};

/**
 * El masivo omite a quien ya recibió exactamente el mismo texto en estas horas: si el
 * navegador reenvía tras un timeout (con otra clave de lote), nadie recibe el SMS dos veces.
 */
export const BULK_SMS_RESEND_WINDOW_HOURS = 24;

/** Ventana del SMS manual que bloquea el mismo texto al mismo número (doble clic, reintento). */
export const MANUAL_SMS_DUPLICATE_WINDOW_MS = 2 * 60 * 1000;

/**
 * Una respuesta entrante se asocia a los SMS que le enviamos a ese número en estos días.
 * Pasado ese plazo ya no se toma como respuesta a un envío nuestro y se busca por lead.
 */
export const SMS_REPLY_WINDOW_DAYS = 7;

/** Acciones de AuditLog de SMS. */
export const SMS_AUDIT_ACTION = {
  OPT_OUT: "lead_sms_opt_out",
  OPT_IN: "lead_sms_opt_in",
  BULK_SENT: "bulk_sms_sent",
  INBOUND_AMBIGUOUS: "sms_inbound_ambiguous",
} as const;

/**
 * Quién redactó un SMS saliente (`Message.generatedBy`). null = un asesor o una
 * automatización con plantilla. El historial muestra la etiqueta "IA" con estos valores.
 */
export const MESSAGE_GENERATED_BY = {
  /** Respuesta redactada por el asistente de IA fuera de horario. */
  AI: "ai",
  /** Mensaje de traspaso fijo del asistente: la IA falló, tardó o no está configurada. */
  AI_HANDOFF: "ai_handoff",
} as const;
export type MessageGeneratedBy = ValueOf<typeof MESSAGE_GENERATED_BY>;
