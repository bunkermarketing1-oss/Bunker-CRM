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
  { name: "TWILIO_PHONE_NUMBER", description: "Número remitente de SMS y línea por defecto de llamadas", group: "messaging", required: false },
  { name: "TWILIO_API_KEY_SID", description: "API Key de Twilio para los tokens de llamadas del navegador", group: "messaging", required: false },
  { name: "TWILIO_API_KEY_SECRET", description: "Secreto de la API Key de Twilio", group: "messaging", required: false },
  { name: "TWILIO_TWIML_APP_SID", description: "TwiML App de voz (Voice URL → /api/integrations/twilio/voice)", group: "messaging", required: false },
  {
    name: "VOICE_ALLOWED_COUNTRIES",
    description: "Países a los que se puede llamar, separados por coma (opcional, por defecto MX,CO,US). Antifraude: complementa los Geo Permissions de Twilio",
    group: "messaging",
    required: false,
  },
];

/** Sin estas variables `sendTwilioSms` no puede enviar: Twilio se configura en el servidor, no desde la UI. */
export const TWILIO_SMS_ENV_VARS = ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"] as const;

/** Necesarias además de las de SMS para generar tokens de llamadas desde el navegador. */
export const TWILIO_VOICE_ENV_VARS = ["TWILIO_API_KEY_SID", "TWILIO_API_KEY_SECRET", "TWILIO_TWIML_APP_SID"] as const;

export const ENV_GROUP_LABEL: Record<EnvGroup, string> = {
  core: "Núcleo de la plataforma",
  integrations: "Integraciones de pauta",
  messaging: "Mensajería SMS y llamadas",
};
