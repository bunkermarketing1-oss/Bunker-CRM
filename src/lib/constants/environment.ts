export type EnvGroup = "core" | "integrations" | "messaging";

export interface EnvVarSpec {
  name: string;
  description: string;
  group: EnvGroup;
  /** Sin esta variable la app no arranca bien o pierde una función básica. */
  required: boolean;
}

/** Variables que el código lee de verdad (ver .env.example). Solo se reporta si están definidas, jamás su valor. */
export const ENV_VARS: EnvVarSpec[] = [
  { name: "DATABASE_URL", description: "Conexión a PostgreSQL de Supabase", group: "core", required: true },
  { name: "NEXT_PUBLIC_SUPABASE_URL", description: "Endpoint del proyecto Supabase", group: "core", required: true },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", description: "Llave pública de Supabase Auth", group: "core", required: true },
  { name: "SUPABASE_SERVICE_ROLE_KEY", description: "Alta de usuarios en Supabase Auth (solo servidor)", group: "core", required: true },
  { name: "NEXT_PUBLIC_APP_URL", description: "URL pública; base de los callbacks OAuth", group: "core", required: true },
  { name: "INTEGRATIONS_ENCRYPTION_KEY", description: "Cifrado de tokens de Meta/TikTok guardados en BD", group: "core", required: true },
  { name: "CRON_SECRET", description: "Protege la sincronización programada de campañas y leads", group: "core", required: true },
  { name: "META_APP_ID", description: "App de Meta for Business", group: "integrations", required: false },
  { name: "META_APP_SECRET", description: "Secreto de la app de Meta", group: "integrations", required: false },
  { name: "META_WEBHOOK_VERIFY_TOKEN", description: "Token de verificación del webhook de leads de Meta", group: "integrations", required: false },
  { name: "META_GRAPH_VERSION", description: "Versión de Graph API (opcional, hay valor por defecto)", group: "integrations", required: false },
  { name: "TIKTOK_APP_ID", description: "App de TikTok for Business", group: "integrations", required: false },
  { name: "TIKTOK_APP_SECRET", description: "Secreto de la app de TikTok", group: "integrations", required: false },
  { name: "GOOGLE_ADS_CLIENT_ID", description: "Cliente OAuth de Google Ads", group: "integrations", required: false },
  { name: "GOOGLE_ADS_DEVELOPER_TOKEN", description: "Token de desarrollador de Google Ads", group: "integrations", required: false },
  { name: "TWILIO_ACCOUNT_SID", description: "Cuenta de Twilio para SMS", group: "messaging", required: false },
  { name: "TWILIO_AUTH_TOKEN", description: "Token de Twilio", group: "messaging", required: false },
  { name: "TWILIO_PHONE_NUMBER", description: "Número remitente de SMS", group: "messaging", required: false },
];

export const ENV_GROUP_LABEL: Record<EnvGroup, string> = {
  core: "Núcleo de la plataforma",
  integrations: "Integraciones de pauta",
  messaging: "Mensajería SMS",
};
