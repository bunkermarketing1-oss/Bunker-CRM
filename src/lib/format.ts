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
