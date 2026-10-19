/**
 * Cuándo el asistente contesta un SMS entrante. Lógica pura: los motivos llegan como
 * argumento desde `AI_REPLY_SKIP_REASON` (`lib/constants/ai-assistant.ts`) para probarla
 * directo con Node, igual que `lib/messaging/sms-rules.ts`.
 */

import type { AI_REPLY_SKIP_REASON, AiReplySkipReason } from "@/lib/constants/ai-assistant";

export interface AiReplyContext {
  /** Twilio reintentó un SMS ya guardado: ya se contestó (o se decidió no hacerlo). */
  duplicate: boolean;
  /** La conversación tiene lead y cliente (no es un número desconocido ni un contacto suelto). */
  hasLead: boolean;
  /** `resolveReplyTarget` no pudo decidir de qué cliente es: nadie le contesta en nombre de otro. */
  ambiguous: boolean;
  /** BAJA/STOP/ALTA/START…: la confirmación la da la ruta (o Twilio), no la IA. */
  isKeyword: boolean;
  optedOut: boolean;
  body: string;
  /** El cliente tiene el asistente activado. */
  enabled: boolean;
  withinBusinessHours: boolean;
  repliesInWindow: number;
  maxRepliesPerDay: number;
}

/**
 * Motivo para NO contestar, o null si hay que contestar. El orden importa: primero lo que
 * nunca se contesta (reintentos, conversaciones sin dueño claro, bajas) y al final lo que
 * depende de la configuración del cliente.
 */
export function aiReplySkipReason(ctx: AiReplyContext, reasons: typeof AI_REPLY_SKIP_REASON): AiReplySkipReason | null {
  if (ctx.duplicate) return reasons.DUPLICATE;
  if (ctx.ambiguous) return reasons.AMBIGUOUS;
  if (!ctx.hasLead) return reasons.NO_LEAD;
  if (ctx.isKeyword) return reasons.KEYWORD;
  if (ctx.optedOut) return reasons.OPTED_OUT;
  if (!ctx.body.trim()) return reasons.EMPTY_BODY;
  if (!ctx.enabled) return reasons.DISABLED;
  if (ctx.withinBusinessHours) return reasons.BUSINESS_HOURS;
  if (ctx.repliesInWindow >= ctx.maxRepliesPerDay) return reasons.DAILY_CAP;
  return null;
}
