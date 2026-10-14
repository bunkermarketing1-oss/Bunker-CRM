import { WEEKLY_TREND_MAX_DAYS } from "@/lib/constants/reports";
import type { TrendPoint } from "@/types/reports";

const MS_PER_HOUR = 60 * 60 * 1000;
const MONTH_LABELS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export function percentage(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function hoursBetween(from: Date, to: Date): number {
  return Math.max(0, (to.getTime() - from.getTime()) / MS_PER_HOUR);
}

/** Si todas las monedas coinciden la devuelve; si hay varias, sumar no tiene sentido y da null. */
export function singleCurrency(currencies: (string | null)[]): string | null {
  const unique = new Set(currencies.filter((c): c is string => Boolean(c)));
  return unique.size === 1 ? Array.from(unique)[0] : null;
}

function startOfWeekUtc(date: Date): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = (d.getUTCDay() + 6) % 7; // lunes = 0
  d.setUTCDate(d.getUTCDate() - weekday);
  return d;
}

function startOfMonthUtc(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function periodLabel(start: Date, weekly: boolean): string {
  const month = MONTH_LABELS[start.getUTCMonth()];
  return weekly ? `${start.getUTCDate()} ${month}` : `${month} ${String(start.getUTCFullYear()).slice(2)}`;
}

/**
 * Agrupa leads por semana (rangos cortos) o por mes, incluyendo los períodos vacíos
 * para que la gráfica no salte huecos.
 */
export function buildTrend(
  leads: { createdAt: Date; converted: boolean }[],
  since: Date,
  until: Date,
  days: number
): TrendPoint[] {
  const weekly = days <= WEEKLY_TREND_MAX_DAYS;
  const bucketStart = weekly ? startOfWeekUtc : startOfMonthUtc;
  const buckets = new Map<string, TrendPoint>();

  for (let cursor = bucketStart(since); cursor <= until; ) {
    const key = cursor.toISOString().slice(0, 10);
    buckets.set(key, { periodStart: key, label: periodLabel(cursor, weekly), leads: 0, converted: 0 });
    cursor = weekly
      ? new Date(cursor.getTime() + 7 * 24 * MS_PER_HOUR)
      : new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
  }

  for (const lead of leads) {
    const bucket = buckets.get(bucketStart(lead.createdAt).toISOString().slice(0, 10));
    if (!bucket) continue;
    bucket.leads += 1;
    if (lead.converted) bucket.converted += 1;
  }

  return Array.from(buckets.values());
}
