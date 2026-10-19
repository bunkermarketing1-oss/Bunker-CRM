/**
 * Decisiones de la captura de leads de Meta que no necesitan base ni red.
 * Sin imports a propósito: lógica pura que se prueba directo con Node (los umbrales llegan
 * por parámetro desde `src/lib/constants/integrations.ts`).
 */

const MS_PER_MINUTE = 60 * 1000;

/**
 * ¿El lead es lo bastante reciente para mandarle el SMS automático? Se mide con el
 * `created_time` de Meta, no con la hora de proceso, para que el respaldo de 48 h no le
 * escriba a leads viejos. Sin fecha válida se responde `false`: es preferible no escribirle a
 * un lead nuevo (queda la nota para el asesor) que mandar SMS a cientos de leads viejos.
 */
export function isRecentMetaLead(createdTime: string | null | undefined, now: Date, maxAgeMinutes: number) {
  if (!createdTime) return false;
  const created = new Date(createdTime).getTime();
  if (Number.isNaN(created)) return false;
  // Un reloj de Meta adelantado unos segundos da edad negativa: sigue siendo reciente.
  return now.getTime() - created <= maxAgeMinutes * MS_PER_MINUTE;
}

export interface PageConnectionCandidate {
  id: string;
  organizationId: string;
  clientId: string | null;
}

export type PageConnectionResolution<T extends PageConnectionCandidate> =
  | { kind: "none" }
  | { kind: "ambiguous"; owners: { organizationId: string; clientId: string | null }[] }
  | { kind: "single"; page: T };

/**
 * Decide a qué conexión pertenece un lead cuando la misma página de Facebook aparece en
 * varias cuentas conectadas. Si hay más de un dueño (organización + cliente) distinto no se
 * adivina: mandar el lead al tenant equivocado es una fuga de datos. Varias filas del mismo
 * dueño (p. ej. reconectó con otra integración) son equivalentes y se elige la de menor `id`
 * para que el resultado no dependa del orden de la consulta.
 */
export function resolvePageConnection<T extends PageConnectionCandidate>(matches: T[]): PageConnectionResolution<T> {
  if (matches.length === 0) return { kind: "none" };

  const owners = new Map<string, { organizationId: string; clientId: string | null }>();
  for (const match of matches) {
    owners.set(`${match.organizationId}:${match.clientId ?? ""}`, {
      organizationId: match.organizationId,
      clientId: match.clientId,
    });
  }
  if (owners.size > 1) return { kind: "ambiguous", owners: Array.from(owners.values()) };

  const [page] = [...matches].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return { kind: "single", page };
}
