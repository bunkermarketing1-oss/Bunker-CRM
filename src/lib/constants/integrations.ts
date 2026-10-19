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
  /**
   * La página no está conectada (activa) o está conectada en varias organizaciones/clientes
   * y no se puede saber de quién es el lead. El cron no lo reintenta; se reprocesa si Meta
   * lo reenvía o si el respaldo lo vuelve a ver cuando la conexión ya es única.
   */
  IGNORED: "ignored",
} as const;
export type MetaLeadEventStatus = ValueOf<typeof META_LEAD_EVENT_STATUS>;

/** Intentos máximos antes de dejar un evento `failed` para revisión manual. */
export const META_LEAD_MAX_ATTEMPTS = 5;

/**
 * Minutos sin avance para dar por muerto un evento `received` (redeploy o caída a mitad del
 * proceso). Holgado frente a lo que tarda un evento (Graph + SMS, segundos) para que el cron
 * no lo procese a la vez que el webhook que lo recibió.
 */
export const META_LEAD_STALE_RECEIVED_MINUTES = 10;

/**
 * Antigüedad máxima (según `created_time` de Meta) para mandar el SMS automático. Cubre un
 * reintento tras caída (10 min de `received` + 15 min del cron) pero deja fuera los leads
 * viejos que trae el respaldo de 48 h al conectar una página: escribirle a alguien que llenó
 * el formulario hace dos días confunde y gasta saldo.
 */
export const META_LEAD_AUTOMATION_MAX_AGE_MINUTES = 30;

/** Título de la nota que explica por qué un lead recuperado no recibió SMS automático. */
export const META_LEAD_NO_SMS_ACTIVITY_TITLE = "Lead recuperado de Meta sin SMS automático";

/** Tope por petición a Graph API: más que esto es Meta caído, no una respuesta lenta. */
export const META_GRAPH_TIMEOUT_MS = 20_000;
