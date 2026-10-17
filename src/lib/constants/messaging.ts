/** Valores de dominio de mensajería (`Message`), guardados como texto en la base. */

type ValueOf<T> = T[keyof T];

export const MESSAGE_CHANNEL = {
  SMS: "sms",
  WHATSAPP: "whatsapp",
  EMAIL: "email",
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
