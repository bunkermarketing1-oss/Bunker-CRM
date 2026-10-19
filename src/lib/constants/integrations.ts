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

/** Proveedores de pauta cuyas cuentas se pueden registrar a mano (Twilio no tiene cuentas vinculables). */
export const AD_PROVIDERS = [INTEGRATION_PROVIDER.META, INTEGRATION_PROVIDER.TIKTOK, INTEGRATION_PROVIDER.GOOGLE_ADS] as const;
export type AdProvider = (typeof AD_PROVIDERS)[number];

/**
 * Tipos de cuenta válidos por proveedor: evita guardar, por ejemplo, una página de Facebook bajo
 * la integración de TikTok. Google Ads aún no tiene tipo de cuenta, así que no admite registro manual.
 */
export const ACCOUNT_TYPES_BY_PROVIDER: Record<AdProvider, readonly AccountType[]> = {
  [INTEGRATION_PROVIDER.META]: [ACCOUNT_TYPE.META_AD_ACCOUNT, ACCOUNT_TYPE.FACEBOOK_PAGE, ACCOUNT_TYPE.INSTAGRAM_BUSINESS],
  [INTEGRATION_PROVIDER.TIKTOK]: [ACCOUNT_TYPE.TIKTOK_ADVERTISER],
  [INTEGRATION_PROVIDER.GOOGLE_ADS]: [],
};

/** Nombre con el que se crea la integración la primera vez que se registra una cuenta de ese proveedor. */
export const INTEGRATION_PROVIDER_NAME: Record<IntegrationProvider, string> = {
  [INTEGRATION_PROVIDER.META]: "Meta for Business (Facebook & Instagram)",
  [INTEGRATION_PROVIDER.TIKTOK]: "TikTok for Business",
  [INTEGRATION_PROVIDER.GOOGLE_ADS]: "Google Ads",
  [INTEGRATION_PROVIDER.TWILIO]: "Twilio",
};

/** Acciones de AuditLog sobre cuentas conectadas (se consultan en el historial de auditoría). */
export const CONNECTED_ACCOUNT_AUDIT_ACTION = {
  LINKED: "connected_account_linked",
  ASSIGNED: "connected_account_assigned",
} as const;
