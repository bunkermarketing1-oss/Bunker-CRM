/**
 * Elección de la regla "lead nuevo → SMS" que aplica a un lead. Sin imports a propósito:
 * lógica pura que se prueba directo con Node.
 */

export interface LeadCreatedSmsRuleCandidate {
  id: string;
  clientId: string | null;
  /** Fuentes a las que aplica; vacío = todas. */
  sources: string[];
  template: string | null | undefined;
  createdAt: Date;
}

function byOldest(a: LeadCreatedSmsRuleCandidate, b: LeadCreatedSmsRuleCandidate) {
  const diff = a.createdAt.getTime() - b.createdAt.getTime();
  if (diff !== 0) return diff;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * Devuelve como máximo una regla: un lead recibe un solo SMS de bienvenida aunque apliquen
 * varias. La del cliente del lead gana a la general (`clientId: null`) porque es la que el
 * cliente personalizó; entre reglas del mismo nivel gana la más antigua, para que el texto
 * no cambie según el orden en que la base devuelva las filas.
 */
export function pickLeadCreatedSmsRule<T extends LeadCreatedSmsRuleCandidate>(
  rules: T[],
  lead: { clientId: string | null; source: string }
): T | null {
  const applicable = rules.filter(
    (rule) =>
      Boolean(rule.template?.trim()) &&
      (rule.sources.length === 0 || rule.sources.includes(lead.source)) &&
      (rule.clientId === null || rule.clientId === lead.clientId)
  );

  const clientRules = lead.clientId ? applicable.filter((rule) => rule.clientId === lead.clientId) : [];
  const pool = clientRules.length ? clientRules : applicable.filter((rule) => rule.clientId === null);
  return [...pool].sort(byOldest)[0] ?? null;
}
