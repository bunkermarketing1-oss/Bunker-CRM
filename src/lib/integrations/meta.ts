/**
 * Cliente mínimo de Meta Graph API / Marketing API.
 * Docs: https://developers.facebook.com/docs/marketing-apis
 */

import { META_GRAPH_TIMEOUT_MS } from "@/lib/constants/integrations";

// Se reexporta para que la ruta del webhook siga importando todo lo de Meta desde aquí.
export { verifyMetaSignature } from "./meta-webhook";

export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";
const GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

// El CRM es comercial: métricas, gestión de campañas y captura de leads. No se piden
// permisos de publicación para que la revisión de la app en Meta sea más sencilla.
// leads_retrieval + pages_manage_ads + pages_manage_metadata son los que exige Meta para
// suscribir una página al webhook `leadgen` y leer los leads de sus formularios.
export const META_SCOPES = [
  "ads_read",
  "ads_management",
  "business_management",
  "read_insights",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_ads",
  "pages_manage_metadata",
  "leads_retrieval",
  "instagram_basic",
  "instagram_manage_insights",
];

export class MetaApiError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.code = code;
  }
}

export function getMetaConfig() {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appId || !appSecret || !appUrl) {
    return null;
  }
  return {
    appId,
    appSecret,
    redirectUri: `${appUrl.replace(/\/$/, "")}/api/integrations/meta/callback`,
  };
}

async function graphFetch<T = any>(url: string, init?: RequestInit): Promise<T> {
  // Sin timeout un Graph colgado retiene el webhook (Meta reintenta) o agota el maxDuration
  // del cron; al abortar, el error deja el evento en `failed` y el cron lo reintenta.
  const res = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(META_GRAPH_TIMEOUT_MS) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.error) {
    // Código 190 = token inválido o expirado
    throw new MetaApiError(json.error?.message || `Meta API respondió ${res.status}`, json.error?.code);
  }
  return json as T;
}

function graphUrl(path: string, params: Record<string, string>) {
  const url = new URL(`${GRAPH_URL}/${path.replace(/^\//, "")}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return url.toString();
}

/** Recorre la paginación cursor-based de Graph API. */
async function graphFetchAll<T = any>(path: string, params: Record<string, string>): Promise<T[]> {
  const items: T[] = [];
  let next: string | undefined = graphUrl(path, { limit: "200", ...params });
  while (next) {
    const page: { data?: T[]; paging?: { next?: string } } = await graphFetch(next);
    items.push(...(page.data || []));
    next = page.paging?.next;
  }
  return items;
}

export function buildMetaAuthUrl(state: string) {
  const cfg = getMetaConfig();
  if (!cfg) throw new Error("Meta no está configurado (META_APP_ID, META_APP_SECRET, NEXT_PUBLIC_APP_URL).");
  const url = new URL(`https://www.facebook.com/${META_GRAPH_VERSION}/dialog/oauth`);
  url.searchParams.set("client_id", cfg.appId);
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", META_SCOPES.join(","));
  return url.toString();
}

/** Intercambia el código OAuth por un token de usuario de larga duración (~60 días). */
export async function exchangeMetaCode(code: string) {
  const cfg = getMetaConfig();
  if (!cfg) throw new Error("Meta no está configurado.");

  const short = await graphFetch<{ access_token: string }>(
    graphUrl("oauth/access_token", {
      client_id: cfg.appId,
      client_secret: cfg.appSecret,
      redirect_uri: cfg.redirectUri,
      code,
    })
  );

  const long = await graphFetch<{ access_token: string; expires_in?: number }>(
    graphUrl("oauth/access_token", {
      grant_type: "fb_exchange_token",
      client_id: cfg.appId,
      client_secret: cfg.appSecret,
      fb_exchange_token: short.access_token,
    })
  );

  const perms = await graphFetch<{ data: { permission: string; status: string }[] }>(
    graphUrl("me/permissions", { access_token: long.access_token })
  );

  return {
    accessToken: long.access_token,
    expiresAt: long.expires_in ? new Date(Date.now() + long.expires_in * 1000) : null,
    grantedScopes: perms.data.filter((p) => p.status === "granted").map((p) => p.permission),
  };
}

export interface MetaAdAccount {
  id: string; // "act_123"
  name: string;
  account_status: number;
  currency: string;
}

export async function listMetaAdAccounts(token: string) {
  return graphFetchAll<MetaAdAccount>("me/adaccounts", {
    access_token: token,
    fields: "id,name,account_status,currency",
  });
}

export interface MetaPage {
  id: string;
  name: string;
  access_token: string; // token de página (no expira si deriva de un token de usuario de larga duración)
  instagram_business_account?: { id: string; username?: string };
}

export async function listMetaPages(token: string) {
  return graphFetchAll<MetaPage>("me/accounts", {
    access_token: token,
    fields: "id,name,access_token,instagram_business_account{id,username}",
  });
}

export interface MetaCampaign {
  id: string;
  name: string;
  objective?: string;
  status: string; // ACTIVE, PAUSED, DELETED, ARCHIVED
  effective_status?: string;
  daily_budget?: string; // en centavos de la moneda de la cuenta
  lifetime_budget?: string;
  start_time?: string;
  stop_time?: string;
}

export async function listMetaCampaigns(adAccountId: string, token: string) {
  return graphFetchAll<MetaCampaign>(`${adAccountId}/campaigns`, {
    access_token: token,
    fields: "id,name,objective,status,effective_status,daily_budget,lifetime_budget,start_time,stop_time",
  });
}

export interface MetaCampaignInsight {
  campaign_id: string;
  date_start: string; // YYYY-MM-DD
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  actions?: { action_type: string; value: string }[];
}

/** Insights diarios por campaña para el rango indicado (máx. recomendado: 90 días). */
export async function listMetaCampaignInsights(adAccountId: string, token: string, since: string, until: string) {
  return graphFetchAll<MetaCampaignInsight>(`${adAccountId}/insights`, {
    access_token: token,
    level: "campaign",
    time_increment: "1",
    time_range: JSON.stringify({ since, until }),
    fields: "campaign_id,spend,impressions,reach,clicks,actions",
  });
}

// Acciones que el CRM considera "conversión". Solo tipos agregados: "lead" y
// "purchase" ya incluyen sus variantes de píxel/onsite, sumarlas duplicaría.
const CONVERSION_ACTIONS = new Set([
  "lead",
  "purchase",
  "complete_registration",
  "onsite_conversion.messaging_conversation_started_7d",
]);

export function countMetaConversions(actions?: { action_type: string; value: string }[]) {
  if (!actions) return 0;
  return actions
    .filter((a) => CONVERSION_ACTIONS.has(a.action_type))
    .reduce((sum, a) => sum + (parseInt(a.value, 10) || 0), 0);
}

// ---------------------------------------------------------------------------
// Lead Ads (webhook `leadgen`)
// Docs: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
// ---------------------------------------------------------------------------

/** Valor de un cambio `leadgen` dentro del payload del webhook (objeto `page`). */
export interface MetaLeadgenChange {
  leadgen_id: string;
  page_id: string;
  form_id?: string;
  ad_id?: string;
  adgroup_id?: string;
  created_time?: number; // unix
}

export interface MetaWebhookPayload {
  object?: string; // "page"
  entry?: {
    id: string;
    time: number;
    changes?: { field: string; value: MetaLeadgenChange }[];
  }[];
}

/** Suscribe la app al campo `leadgen` de una página (requiere token de página). */
export async function subscribePageToLeadgen(pageId: string, pageToken: string) {
  return graphFetch<{ success: boolean }>(
    graphUrl(`${pageId}/subscribed_apps`, { subscribed_fields: "leadgen", access_token: pageToken }),
    { method: "POST" }
  );
}

export interface MetaLeadField {
  name: string;
  values: string[];
}

export interface MetaLead {
  id: string;
  created_time: string; // ISO 8601
  field_data: MetaLeadField[];
  form_id?: string;
  ad_id?: string;
  ad_name?: string;
  adset_id?: string;
  campaign_id?: string;
  campaign_name?: string;
  platform?: string; // "fb" | "ig"
  is_organic?: boolean;
}

const META_LEAD_FIELDS =
  "id,created_time,field_data,form_id,ad_id,ad_name,adset_id,campaign_id,campaign_name,platform,is_organic";

export async function getMetaLead(leadgenId: string, pageToken: string) {
  return graphFetch<MetaLead>(graphUrl(leadgenId, { access_token: pageToken, fields: META_LEAD_FIELDS }));
}

export interface MetaLeadForm {
  id: string;
  name: string;
  status: string; // ACTIVE, ARCHIVED, ...
}

export async function listPageLeadForms(pageId: string, pageToken: string) {
  return graphFetchAll<MetaLeadForm>(`${pageId}/leadgen_forms`, {
    access_token: pageToken,
    fields: "id,name,status",
  });
}

/** Leads de un formulario creados después de `sinceUnix` (segundos). */
export async function listFormLeads(formId: string, pageToken: string, sinceUnix: number) {
  return graphFetchAll<MetaLead>(`${formId}/leads`, {
    access_token: pageToken,
    fields: META_LEAD_FIELDS,
    filtering: JSON.stringify([{ field: "time_created", operator: "GREATER_THAN", value: sinceUnix }]),
  });
}
