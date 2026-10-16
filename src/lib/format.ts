/** Los montos del CRM (oportunidades, ingresos) están en USD; la pauta usa la moneda de la cuenta. */
export const CRM_CURRENCY = "USD";

export function formatMoney(amount: number, currency: string = CRM_CURRENCY): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
    maximumFractionDigits: Math.abs(amount) < 100 ? 2 : 0,
  }).format(amount);
}

/** Montos grandes en formato corto (12,5 mil · 1,2 M) para tarjetas y ejes. */
export function formatCompactMoney(amount: number, currency: string = CRM_CURRENCY): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency,
    currencyDisplay: "symbol",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
}

export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(value)}%`;
}

/** Duraciones de respuesta: minutos si es menos de una hora, días si pasa de 48 h. */
export function formatHours(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(hours)} h`;
  return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(hours / 24)} días`;
}

const relativeTime = new Intl.RelativeTimeFormat("es", { numeric: "auto" });
const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60],
  ["month", 30 * 24 * 60 * 60],
  ["week", 7 * 24 * 60 * 60],
  ["day", 24 * 60 * 60],
  ["hour", 60 * 60],
  ["minute", 60],
];

/** "hace 3 horas", "mañana", "hace 2 semanas". `now` se inyecta para poder probarlo. */
export function formatRelativeTime(date: Date | string, now: Date = new Date()): string {
  const seconds = (new Date(date).getTime() - now.getTime()) / 1000;
  for (const [unit, unitSeconds] of RELATIVE_UNITS) {
    if (Math.abs(seconds) >= unitSeconds) return relativeTime.format(Math.round(seconds / unitSeconds), unit);
  }
  return "justo ahora";
}

export function formatShortDate(date: Date | string): string {
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short" }).format(new Date(date));
}
