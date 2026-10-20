import { createHash } from "crypto";

/**
 * Validador de Licencia Comercial para Módulos Avanzados de Bunker CRM.
 * Controla la activación de sincronización publicitaria (Meta Ads, Webhooks, Campañas automáticas).
 * La clave válida NO se almacena en texto plano en el repositorio. Solo se almacena su hash criptográfico SHA-256.
 */
const EXPECTED_LICENSE_SHA256 = "724ab3d25534b3d23cf2e55d2598eb05158514624a95f90cd53209ec4a5a788a";

export function isCommercialLicenseActive(): boolean {
  const currentKey = process.env.BUNKER_LICENSE_KEY;
  if (!currentKey) return false;

  const keyHash = createHash("sha256").update(currentKey.trim()).digest("hex");
  return keyHash === EXPECTED_LICENSE_SHA256;
}

export function getLicenseStatus() {
  const active = isCommercialLicenseActive();
  return {
    active,
    tier: active ? "enterprise_unlimited" : "starter_trial",
    modules: {
      crm_pipeline: true, // Funcionalidades básicas siempre activas
      contacts_leads_manual: true,
      meta_ads_sync: active,
      webhooks_leadgen: active,
      automated_campaigns: active,
    },
    message: active
      ? "Licencia Empresarial Bunker VIP Activa."
      : "Módulo de sincronización publicitaria y webhooks en pausa. Pendiente de activación de licencia comercial.",
  };
}
