/**
 * Valores de dominio de integraciones y campañas.
 * Se guardan como texto en la base (columnas String de Prisma), así que estos objetos son
 * la única fuente de verdad: nunca escribas "meta", "active", etc. a mano en el código.
 */

type ValueOf<T> = T[keyof T];

export const INTEGRATION_PROVIDER = {
  META: "meta",
  TIKTOK: "tiktok",
  GOOGLE_ADS: "google_ads",
  TWILIO: "twilio",
} as const;
export type IntegrationProvider = ValueOf<typeof INTEGRATION_PROVIDER>;

export const INTEGRATION_STATUS = {
  CONNECTED: "connected",
  DISCONNECTED: "disconnected",
  PENDING_CREDENTIALS: "pending_credentials",
  ERROR: "error",
} as const;
export type IntegrationStatus = ValueOf<typeof INTEGRATION_STATUS>;

export const ACCOUNT_TYPE = {
  META_AD_ACCOUNT: "meta_ad_account",
  FACEBOOK_PAGE: "facebook_page",
  INSTAGRAM_BUSINESS: "instagram_business",
  TIKTOK_ADVERTISER: "tiktok_advertiser",
} as const;
export type AccountType = ValueOf<typeof ACCOUNT_TYPE>;

/** Cuentas que tienen campañas pagadas (las que ve el módulo de Campañas). */
export const AD_ACCOUNT_TYPES: AccountType[] = [ACCOUNT_TYPE.META_AD_ACCOUNT, ACCOUNT_TYPE.TIKTOK_ADVERTISER];

export const ACCOUNT_STATUS = {
  ACTIVE: "active",
  EXPIRED: "expired",
  ERROR: "error",
  DISABLED: "disabled",
} as const;
export type AccountStatus = ValueOf<typeof ACCOUNT_STATUS>;

export const CAMPAIGN_PLATFORM = {
  META_ADS: "meta_ads",
  TIKTOK: "tiktok",
  GOOGLE_ADS: "google_ads",
} as const;
export type CampaignPlatform = ValueOf<typeof CAMPAIGN_PLATFORM>;

export const CAMPAIGN_STATUS = {
  ACTIVE: "active",
  PAUSED: "paused",
  COMPLETED: "completed",
} as const;
export type CampaignStatus = ValueOf<typeof CAMPAIGN_STATUS>;

export const META_LEAD_EVENT_STATUS = {
  RECEIVED: "received",
  PROCESSED: "processed",
  /** Error recuperable (token, red, Meta caído): el cron lo reintenta. */
  FAILED: "failed",
  /** La página no está conectada a ninguna organización: no se reintenta. */
  IGNORED: "ignored",
} as const;
export type MetaLeadEventStatus = ValueOf<typeof META_LEAD_EVENT_STATUS>;

/** Intentos máximos antes de dejar un evento `failed` para revisión manual. */
export const META_LEAD_MAX_ATTEMPTS = 5;
