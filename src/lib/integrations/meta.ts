/**
 * Cliente mínimo de Meta Graph API / Marketing API.
 * Docs: https://developers.facebook.com/docs/marketing-apis
 */

export const META_GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";
const GRAPH_URL = `https://graph.facebook.com/${META_GRAPH_VERSION}`;

// Se solicitan todos los permisos de las fases planeadas (métricas, gestión de
// campañas, estadísticas orgánicas y publicación) para no forzar una reconexión.
export const META_SCOPES = [
  "ads_read",
  "ads_management",
  "business_management",
  "read_insights",
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_manage_insights",
  "instagram_content_publish",
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
  const res = await fetch(url, { ...init, cache: "no-store" });
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
