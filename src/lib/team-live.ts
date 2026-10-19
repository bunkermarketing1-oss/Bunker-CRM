/**
 * Cálculos puros de la vista en vivo del equipo. Sin imports a propósito: se prueba directo con
 * Node (tests/team-live.test.mjs). Los valores (zona horaria, minutos de inactividad, estados)
 * los pasa el llamador desde `lib/constants/team.ts`.
 */

/** Desfase en ms de `timeZone` respecto de UTC en el instante `at` (negativo al oeste de UTC). */
function timeZoneOffsetMs(at: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/**
 * Medianoche de "hoy" en `timeZone`, como instante UTC. Los contadores del día se filtran con
 * `createdAt >= startOfDay`; con la medianoche del servidor (UTC) el día se cortaría a las 7 p. m.
 * en Bogotá. El desfase se toma en la medianoche misma por si ese día cambia el horario de verano.
 */
export function startOfDayInTimeZone(now: Date, timeZone: string): Date {
  const local = new Date(now.getTime() + timeZoneOffsetMs(now, timeZone));
  const midnightAsUtc = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const firstGuess = midnightAsUtc - timeZoneOffsetMs(new Date(midnightAsUtc), timeZone);
  return new Date(midnightAsUtc - timeZoneOffsetMs(new Date(firstGuess), timeZone));
}

export interface AdvisorStatusValues<S extends string> {
  onCall: S;
  available: S;
  idle: S;
}

/**
 * Estado de un asesor: en llamada si tiene una en curso; si no, disponible o inactivo según su
 * última actividad registrada (llamada, SMS, nota…) dentro de `idleMs`.
 */
export function resolveAdvisorStatus<S extends string>(
  input: { hasLiveCall: boolean; lastActivityAt: Date | null; now: Date; idleMs: number },
  statuses: AdvisorStatusValues<S>
): S {
  if (input.hasLiveCall) return statuses.onCall;
  if (!input.lastActivityAt) return statuses.idle;
  return input.now.getTime() - input.lastActivityAt.getTime() <= input.idleMs ? statuses.available : statuses.idle;
}

/** La fecha más reciente de las dadas (ignora null/undefined). */
export function latestDate(...dates: Array<Date | null | undefined>): Date | null {
  let latest: Date | null = null;
  for (const date of dates) {
    if (date && (!latest || date.getTime() > latest.getTime())) latest = date;
  }
  return latest;
}

/** Segundos transcurridos desde `since` (0 si es futuro o no hay fecha). */
export function elapsedSeconds(since: Date | null, now: Date): number {
  if (!since) return 0;
  return Math.max(0, Math.floor((now.getTime() - since.getTime()) / 1000));
}

/** Cuenta filas por usuario; sirve para los pares usuario-lead de un `groupBy` (leads contactados). */
export function countByUser(rows: ReadonlyArray<{ userId: string | null }>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.userId) counts.set(row.userId, (counts.get(row.userId) ?? 0) + 1);
  }
  return counts;
}

/** Duración "m:ss" o "h:mm:ss" para cronómetros y tiempo hablado. */
export function formatClock(totalSeconds: number): string {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = String(seconds % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}
