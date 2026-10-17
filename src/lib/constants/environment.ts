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
  { name: "DATABASE_URL", description: "Conexión con la base de datos principal", group: "core", required: true },
  { name: "NEXT_PUBLIC_SUPABASE_URL", description: "Servidor central de autenticación y datos", group: "core", required: true },
  { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", description: "Clave de conexión pública para el navegador", group: "core", required: true },
  { name: "SUPABASE_SERVICE_ROLE_KEY", description: "Control seguro de altas y accesos de usuarios", group: "core", required: true },
  { name: "NEXT_PUBLIC_APP_URL", description: "Enlace web oficial del CRM (para autorizaciones)", group: "core", required: true },
  { name: "INTEGRATIONS_ENCRYPTION_KEY", description: "Llave de cifrado de alta seguridad para credenciales", group: "core", required: true },
  { name: "CRON_SECRET", description: "Protección de sincronizaciones automáticas en segundo plano", group: "core", required: true },
  { name: "META_APP_ID", description: "Identificador oficial de App en Meta for Business", group: "integrations", required: false },
  { name: "META_APP_SECRET", description: "Clave secreta de integración con Meta", group: "integrations", required: false },
  { name: "META_GRAPH_VERSION", description: "Versión del protocolo de Meta Ads", group: "integrations", required: false },
  { name: "TIKTOK_APP_ID", description: "Identificador de App en TikTok for Business", group: "integrations", required: false },
  { name: "TIKTOK_APP_SECRET", description: "Clave secreta de integración con TikTok", group: "integrations", required: false },
  { name: "GOOGLE_ADS_CLIENT_ID", description: "Identificador de acceso a Google Ads", group: "integrations", required: false },
  { name: "GOOGLE_ADS_DEVELOPER_TOKEN", description: "Credencial de desarrollador para Google Ads", group: "integrations", required: false },
  { name: "TWILIO_ACCOUNT_SID", description: "Código de cuenta telefónica de Twilio para SMS", group: "messaging", required: false },
  { name: "TWILIO_AUTH_TOKEN", description: "Clave de seguridad de Twilio para envíos", group: "messaging", required: false },
  { name: "TWILIO_PHONE_NUMBER", description: "Número de teléfono asignado para enviar los SMS", group: "messaging", required: false },
];

export const ENV_GROUP_LABEL: Record<EnvGroup, string> = {
  core: "Servicios del Sistema & Base de Datos",
  integrations: "Canales de Pauta Publicitaria",
  messaging: "Telefonía & Mensajería SMS",
};
