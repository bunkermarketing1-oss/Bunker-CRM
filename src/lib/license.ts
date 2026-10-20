/**
 * Validador de Licencia Comercial para Módulos Avanzados de Bunker CRM.
 * Controla la activación de sincronización publicitaria (Meta Ads, Webhooks, Campañas automáticas).
 */

const ACTIVE_LICENSE_SECRET = "BUNKER-VIP-ENTERPRISE-PAID-2026";

export function isCommercialLicenseActive(): boolean {
  const currentKey = process.env.BUNKER_LICENSE_KEY;
  if (!currentKey) return false;
  return currentKey.trim() === ACTIVE_LICENSE_SECRET;
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
