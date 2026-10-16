export const REPORT_RANGE_DAYS = [30, 90, 180, 365] as const;
export type ReportRangeDays = (typeof REPORT_RANGE_DAYS)[number];
export const DEFAULT_REPORT_RANGE_DAYS: ReportRangeDays = 90;

/** Hasta este rango la tendencia se agrupa por semana; por encima, por mes. */
export const WEEKLY_TREND_MAX_DAYS = 90;

/** Fuentes de lead que vienen de pauta pagada: entran en el costo por lead. */
export const PAID_LEAD_SOURCES: readonly string[] = [
  "facebook_ads",
  "instagram_ads",
  "meta_ads",
  "google_ads",
  "tiktok_ads",
];

export function parseReportRange(raw: string | null): ReportRangeDays {
  const days = Number(raw);
  return (REPORT_RANGE_DAYS as readonly number[]).includes(days) ? (days as ReportRangeDays) : DEFAULT_REPORT_RANGE_DAYS;
}
