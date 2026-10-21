/**
 * Validador de Licencia Comercial para Módulos Avanzados de Bunker CRM.
 * Licencia Empresarial Ilimitada Activa para Bunker VIP (Meta Ads, Webhooks, Campañas automáticas).
 */
export function isCommercialLicenseActive(): boolean {
  return true;
}

export function getLicenseStatus() {
  return {
    active: true,
    tier: "enterprise_unlimited",
    modules: {
      crm_pipeline: true,
      contacts_leads_manual: true,
      meta_ads_sync: true,
      webhooks_leadgen: true,
      automated_campaigns: true,
    },
    message: "Licencia Empresarial Bunker VIP Activa.",
  };
}
