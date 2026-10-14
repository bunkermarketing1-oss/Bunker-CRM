/**
 * Valores de dominio del CRM que se guardan como texto en la base.
 * Las listas completas para validar entrada viven en `lib/validations/lead.ts`.
 */

type ValueOf<T> = T[keyof T];

export const LEAD_STATUS = {
  NEW: "new",
  CONTACTED: "contacted",
  QUALIFIED: "qualified",
  LOST: "lost",
  CONVERTED: "converted",
} as const;
export type LeadStatusValue = ValueOf<typeof LEAD_STATUS>;

export const OPPORTUNITY_STATUS = {
  OPEN: "open",
  WON: "won",
  LOST: "lost",
} as const;
export type OpportunityStatus = ValueOf<typeof OPPORTUNITY_STATUS>;

/** Etiquetas visibles de las fuentes de lead (`Lead.source`). */
export const LEAD_SOURCE_LABEL: Record<string, string> = {
  facebook_ads: "Facebook Ads",
  instagram_ads: "Instagram Ads",
  meta_ads: "Meta Ads",
  google_ads: "Google Ads",
  tiktok_ads: "TikTok Ads",
  whatsapp: "WhatsApp",
  website: "Sitio web",
  referral: "Referidos",
  sales_outreach: "Prospección comercial",
  import: "Importación",
  manual: "Registro manual",
  other: "Otro",
};

export function leadSourceLabel(source: string): string {
  return LEAD_SOURCE_LABEL[source] ?? source;
}
