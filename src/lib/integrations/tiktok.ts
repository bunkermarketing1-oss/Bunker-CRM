/**
 * Cliente oficial de TikTok for Business Marketing API v1.3.
 * Docs: https://business-api.tiktok.com/portal/docs
 */

import { resolveAppBaseUrl } from "@/lib/url";

export const TIKTOK_API_BASE_URL = "https://business-api.tiktok.com/open_api/v1.3";
export const TIKTOK_AUTH_URL = "https://business-api.tiktok.com/portal/auth";
const DEFAULT_TIMEOUT_MS = 15000;

export class TikTokApiError extends Error {
  code?: number;
  constructor(message: string, code?: number) {
    super(message);
    this.name = "TikTokApiError";
    this.code = code;
  }
}

export interface TikTokConfig {
  appId: string;
  appSecret: string;
  redirectUri: string;
}

export function getTikTokConfig(req?: Request | null): TikTokConfig | null {
  const appId = process.env.TIKTOK_APP_ID;
  const appSecret = process.env.TIKTOK_APP_SECRET;
  if (!appId || !appSecret) {
    return null;
  }
  const baseUrl = resolveAppBaseUrl(req);
  return {
    appId,
    appSecret,
    redirectUri: `${baseUrl}/api/integrations/tiktok/callback`,
  };
}

export function buildTikTokAuthUrl(appId: string, state: string, redirectUri: string): string {
  const url = new URL(TIKTOK_AUTH_URL);
  url.searchParams.set("app_id", appId);
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", redirectUri);
  return url.toString();
}

interface TikTokApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

async function tiktokFetch<T>(
  endpoint: string,
  accessToken: string,
  options: {
    method?: "GET" | "POST";
    params?: Record<string, string | number | undefined>;
    body?: unknown;
  } = {}
): Promise<T> {
  const { method = "GET", params, body } = options;
  const url = new URL(`${TIKTOK_API_BASE_URL}${endpoint}`);

  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined) {
        url.searchParams.set(k, String(v));
      }
    }
  }

  const headers: Record<string, string> = {
    "Access-Token": accessToken,
    "Content-Type": "application/json",
  };

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
  };

  if (body) {
    init.body = JSON.stringify(body);
  }

  const res = await fetch(url.toString(), init);
  const json: TikTokApiResponse<T> = await res.json().catch(() => ({
    code: -1,
    message: "Respuesta no es JSON válido.",
    data: {} as T,
  }));

  if (!res.ok || json.code !== 0) {
    const errorMsg = json.message || `Error HTTP ${res.status} en TikTok API`;
    throw new TikTokApiError(errorMsg, json.code);
  }

  return json.data;
}

export interface TikTokCampaign {
  campaign_id: string;
  campaign_name: string;
  objective_type?: string;
  operation_status: string; // ENABLE, DISABLE, FROZEN
  secondary_status?: string;
  budget?: number;
  budget_mode?: string; // BUDGET_MODE_DAY, BUDGET_MODE_TOTAL
  create_time?: string;
}

export async function listTikTokCampaigns(
  advertiserId: string,
  accessToken: string
): Promise<TikTokCampaign[]> {
  try {
    const data = await tiktokFetch<{ list: TikTokCampaign[] }>("/campaign/get/", accessToken, {
      method: "GET",
      params: {
        advertiser_id: advertiserId,
        page_size: 100,
      },
    });
    return data.list || [];
  } catch (error) {
    console.error("[TIKTOK_API] Error al listar campañas de TikTok:", error);
    throw error;
  }
}

export interface TikTokCampaignInsight {
  campaign_id: string;
  stat_time_day: string; // YYYY-MM-DD
  spend: string;
  impressions: string;
  clicks: string;
  conversion: string;
}

interface RawReportItem {
  dimensions: {
    campaign_id: string;
    stat_time_day: string;
  };
  metrics: {
    spend?: string;
    impressions?: string;
    clicks?: string;
    conversion?: string;
  };
}

export async function listTikTokCampaignInsights(
  advertiserId: string,
  accessToken: string,
  since: string,
  until: string
): Promise<TikTokCampaignInsight[]> {
  try {
    const data = await tiktokFetch<{ list: RawReportItem[] }>("/report/integrated/get/", accessToken, {
      method: "GET",
      params: {
        advertiser_id: advertiserId,
        report_type: "BASIC",
        data_level: "AUCTION_CAMPAIGN",
        dimensions: JSON.stringify(["campaign_id", "stat_time_day"]),
        metrics: JSON.stringify(["spend", "impressions", "clicks", "conversion"]),
        start_date: since,
        end_date: until,
        page_size: 100,
      },
    });

    return (data.list || []).map((item) => ({
      campaign_id: item.dimensions.campaign_id,
      stat_time_day: item.dimensions.stat_time_day.slice(0, 10),
      spend: item.metrics.spend || "0",
      impressions: item.metrics.impressions || "0",
      clicks: item.metrics.clicks || "0",
      conversion: item.metrics.conversion || "0",
    }));
  } catch (error) {
    console.warn("[TIKTOK_API] No se pudieron obtener insights de TikTok:", error);
    return [];
  }
}

export interface TikTokLeadField {
  key: string;
  value: string;
}

export interface TikTokLead {
  lead_id: string;
  advertiser_id: string;
  form_id?: string;
  ad_id?: string;
  adgroup_id?: string;
  campaign_id?: string;
  campaign_name?: string;
  create_time?: string;
  fields: TikTokLeadField[];
}

/**
 * Normaliza las preguntas y respuestas enviadas por TikTok Lead Generation.
 */
export function mapTikTokLeadFields(fields: TikTokLeadField[]) {
  let name: string | null = null;
  let email: string | null = null;
  let phone: string | null = null;
  let companyName: string | null = null;
  const extraNotes: string[] = [];

  for (const f of fields) {
    const k = f.key.toLowerCase();
    const v = (f.value || "").trim();
    if (!v) continue;

    if (!name && (k.includes("name") || k.includes("nombre") || k === "full_name")) {
      name = v;
    } else if (!email && (k.includes("email") || k.includes("correo") || k.includes("mail"))) {
      email = v;
    } else if (!phone && (k.includes("phone") || k.includes("tel") || k.includes("cel") || k.includes("whatsapp"))) {
      phone = v;
    } else if (!companyName && (k.includes("company") || k.includes("empresa") || k.includes("negocio"))) {
      companyName = v;
    } else {
      extraNotes.push(`${f.key}: ${v}`);
    }
  }

  return {
    name: name || "Prospecto TikTok",
    email,
    phone,
    companyName,
    notes: extraNotes.length > 0 ? extraNotes.join("\n") : null,
  };
}
