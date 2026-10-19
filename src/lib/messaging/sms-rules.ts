/**
 * Reglas de SMS que no necesitan base ni Twilio. Sin imports a propósito: lógica pura que
 * se prueba directo con Node (`tests/sms-rules.test.mjs`). Los valores de dominio
 * (rangos de estado, etc.) llegan como argumento desde `lib/constants/messaging.ts`.
 */

// ---------------------------------------------------------------------------
// Estados de entrega
// ---------------------------------------------------------------------------

/**
 * Un callback de estado solo se aplica si avanza: "sent" tardío no pisa "delivered", y un
 * estado final (delivered o failed, mismo rango) no se reemplaza por el otro final.
 */
export function shouldApplyStatus(rank: Record<string, number>, current: string, next: string) {
  const nextRank = rank[next];
  if (nextRank === undefined) return false;
  return nextRank > (rank[current] ?? 0);
}

// ---------------------------------------------------------------------------
// Respuestas entrantes
// ---------------------------------------------------------------------------

export interface ReplyCandidate {
  organizationId: string;
  clientId: string | null;
  leadId: string | null;
  contactId: string | null;
}

export interface ReplyTarget extends ReplyCandidate {
  /** Hubo candidatos de más de un cliente u organización: no se asocia a ningún lead. */
  ambiguous: boolean;
}

/**
 * A quién pertenece una respuesta, dados los candidatos ordenados del más reciente al más
 * antiguo (SMS que le enviamos o leads con ese teléfono). El número de Twilio es compartido:
 * si la misma persona está en dos clientes u organizaciones no sabemos a cuál le contesta,
 * y adjuntarla al equivocado mostraría su respuesta en el portal de otro cliente. En ese
 * caso se guarda en la organización del más reciente pero sin cliente, lead ni contacto
 * (solo la ve un admin de esa organización).
 */
export function resolveReplyTarget(candidates: ReplyCandidate[]): ReplyTarget | null {
  const [latest] = candidates;
  if (!latest) return null;

  const sameOwner = candidates.every((c) => c.organizationId === latest.organizationId && c.clientId === latest.clientId);
  if (sameOwner) return { ...latest, ambiguous: false };

  return { organizationId: latest.organizationId, clientId: null, leadId: null, contactId: null, ambiguous: true };
}

// ---------------------------------------------------------------------------
// Envío masivo
// ---------------------------------------------------------------------------

/** Clave para comparar "mismo texto al mismo número". */
export function smsDedupKey(phone: string, body: string) {
  return `${phone}\n${body.trim()}`;
}

export interface BulkCandidate {
  normalizedPhone: string | null;
}

export interface BulkPlan<T extends BulkCandidate> {
  recipients: Array<{ lead: T; phone: string; body: string }>;
  withoutPhone: number;
  optedOut: number;
  duplicates: number;
  recentlySent: number;
}

/**
 * Quién recibe el masivo: un SMS por número (dos leads con el mismo teléfono reciben uno
 * solo), sin los que no tienen teléfono, los dados de baja ni los que ya recibieron el
 * mismo texto hace poco (`recentKeys`, de `smsDedupKey`).
 */
export function planBulkRecipients<T extends BulkCandidate>(
  leads: T[],
  optedOutPhones: Set<string>,
  recentKeys: Set<string>,
  render: (lead: T) => string
): BulkPlan<T> {
  const plan: BulkPlan<T> = { recipients: [], withoutPhone: 0, optedOut: 0, duplicates: 0, recentlySent: 0 };
  const seen = new Set<string>();
  for (const lead of leads) {
    const phone = lead.normalizedPhone;
    if (!phone) {
      plan.withoutPhone++;
      continue;
    }
    if (optedOutPhones.has(phone)) {
      plan.optedOut++;
      continue;
    }
    if (seen.has(phone)) {
      plan.duplicates++;
      continue;
    }
    seen.add(phone);
    const body = render(lead);
    if (recentKeys.has(smsDedupKey(phone, body))) {
      plan.recentlySent++;
      continue;
    }
    plan.recipients.push({ lead, phone, body });
  }
  return plan;
}
