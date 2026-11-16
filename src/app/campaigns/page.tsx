"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import {
  BarChart3,
  RefreshCw,
  Plug,
  AlertTriangle,
  Lock,
  Eye,
  Play,
  Image as ImageIcon,
  MessageSquare,
  FileSpreadsheet,
  Globe,
  CheckCircle2,
  Search,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ACCOUNT_STATUS } from "@/lib/constants/integrations";
import SocialNetworkIcon from "@/components/common/SocialNetworkIcon";
import CampaignAdsModal from "@/components/campaigns/CampaignAdsModal";

interface CampaignVisualInfo {
  type: "video" | "image" | "whatsapp" | "lead" | "web";
  label: string;
  badgeCls: string;
  icon: React.ComponentType<{ className?: string }>;
}

function getCampaignVisualInfo(name: string, objective: string | null): CampaignVisualInfo {
  const n = (name || "").toLowerCase();
  const obj = (objective || "").toLowerCase();

  // 1. WhatsApp / Chat / Mensajes
  if (
    n.includes("what") ||
    n.includes("inbox") ||
    n.includes("inter") ||
    n.includes("mensaje") ||
    n.includes("direct") ||
    obj.includes("messages")
  ) {
    return {
      type: "whatsapp",
      label: "WhatsApp / Chat",
      badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: MessageSquare,
    };
  }

  // 2. Leads / Formularios
  if (
    n.includes("formu") ||
    n.includes("lead") ||
    n.includes("registro") ||
    obj.includes("lead")
  ) {
    return {
      type: "lead",
      label: "Formulario Leads",
      badgeCls: "bg-purple-50 text-purple-700 border-purple-200",
      icon: FileSpreadsheet,
    };
  }

  // 3. Conversiones Web / Tráfico
  if (
    n.includes("conver") ||
    n.includes("web") ||
    n.includes("trafico") ||
    n.includes("landing") ||
    obj.includes("conversion")
  ) {
    return {
      type: "web",
      label: "Conversión Web",
      badgeCls: "bg-blue-50 text-blue-700 border-blue-200",
      icon: Globe,
    };
  }

  // 4. Video / Reels
  if (
    n.includes("video") ||
    n.includes("reel") ||
    n.includes("reprod") ||
    obj.includes("video")
  ) {
    return {
      type: "video",
      label: "Campaña Video",
      badgeCls: "bg-amber-50 text-amber-700 border-amber-200",
      icon: Play,
    };
  }

  // Default: Imagen / Creativo
  return {
    type: "image",
    label: "Creativo / Anuncio",
    badgeCls: "bg-[#F2F4F7] text-[#344054] border-[#EAECF0]",
    icon: ImageIcon,
  };
}

export type CampaignNetwork = "all" | "instagram" | "facebook" | "whatsapp" | "tiktok" | "google";

export interface CampaignNetworkInfo {
  network: CampaignNetwork;
  label: string;
  badgeCls: string;
  dotCls: string;
  iconProvider: string;
}

export function detectCampaignNetwork(
  name: string,
  platform: string,
  objective: string | null
): CampaignNetworkInfo {
  const n = (name || "").toLowerCase();
  const obj = (objective || "").toLowerCase();
  const plat = (platform || "").toLowerCase();

  // 1. TikTok
  if (plat.includes("tiktok") || n.includes("tiktok")) {
    return {
      network: "tiktok",
      label: "TikTok Ads",
      badgeCls: "bg-slate-900 text-white border-slate-800",
      dotCls: "bg-slate-900",
      iconProvider: "tiktok",
    };
  }

  // 2. Google Ads
  if (plat.includes("google") || n.includes("google")) {
    return {
      network: "google",
      label: "Google Ads",
      badgeCls: "bg-blue-50 text-blue-700 border-blue-200",
      dotCls: "bg-blue-600",
      iconProvider: "google",
    };
  }

  // 3. Instagram
  if (
    n.includes("instagram") ||
    n.includes("publicación de instagram") ||
    n.includes("publicacion de instagram") ||
    n.includes("ig ") ||
    n.includes("/ ig") ||
    n.includes("ig/") ||
    n.includes("reels") ||
    n.includes("stories")
  ) {
    return {
      network: "instagram",
      label: "Instagram Ads",
      badgeCls: "bg-gradient-to-r from-pink-50 to-purple-50 text-pink-700 border-pink-200",
      dotCls: "bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#C13584]",
      iconProvider: "instagram",
    };
  }

  // 4. WhatsApp / Chat
  if (
    n.includes("whatsapp") ||
    n.includes("what") ||
    n.includes("wa ") ||
    n.includes("/ wa") ||
    n.includes("wa/") ||
    n.includes("msj") ||
    n.includes("mensaje") ||
    n.includes("chat") ||
    obj.includes("messages")
  ) {
    return {
      network: "whatsapp",
      label: "WhatsApp Ads",
      badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dotCls: "bg-[#25D366]",
      iconProvider: "whatsapp",
    };
  }

  // 5. Facebook / Meta
  return {
    network: "facebook",
    label: "Facebook Ads",
    badgeCls: "bg-blue-50 text-[#1877F2] border-blue-200",
    dotCls: "bg-[#1877F2]",
    iconProvider: "facebook",
  };
}

type Metric = "spend" | "clicks" | "conversions" | "impressions";

const METRICS: { key: Metric; label: string }[] = [
  { key: "spend", label: "Inversión" },
  { key: "clicks", label: "Clics" },
  { key: "conversions", label: "Conversiones" },
  { key: "impressions", label: "Impresiones" },
];

const PLATFORM_LABELS: Record<string, string> = {
  meta_ads: "Meta Ads",
  tiktok: "TikTok Ads",
  google_ads: "Google Ads",
};

const STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  active: { label: "Activa", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  paused: { label: "Pausada", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  completed: { label: "Finalizada", cls: "bg-[#EAECF0] text-[#475467] border-[#EAECF0]" },
};

function fmtNumber(n: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(n);
}

function fmtMoney(n: number, currency: string | null) {
  if (!currency) return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(n);
  return new Intl.NumberFormat("es-CO", { style: "currency", currency, maximumFractionDigits: 2 }).format(n);
}

function fmtMetric(metric: Metric, n: number, currency: string | null) {
  return metric === "spend" ? fmtMoney(n, currency) : fmtNumber(n);
}

interface AccountItem {
  id: string;
  accountName: string;
  accountType: string | null;
  status: string;
  lastSyncAt: string | null;
  client: { id: string; name: string } | null;
}

interface CampaignItem {
  id: string;
  name: string;
  platform: string;
  objective: string | null;
  status: string;
  currency: string | null;
  budget: number | null;
  budgetType: string | null;
  startDate: string | null;
  endDate: string | null;
  connectedAccountId: string | null;
  accountName: string | null;
  client: { id: string; name: string } | null;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpm: number;
  costPerConversion: number;
}

interface DailyItem {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  [key: string]: string | number;
}

interface CampaignsData {
  success: boolean;
  days: number;
  clientId: string | null;
  selectedAccountId: string;
  currency: string | null;
  accounts: AccountItem[];
  campaigns: CampaignItem[];
  daily: DailyItem[];
  totals: {
    spend: number;
    impressions: number;
    clicks: number;
    conversions: number;
    ctr: number;
    cpc: number;
    cpm: number;
    costPerConversion: number;
    activeCampaigns: number;
  };
}

const DEMO_CAMPAIGNS_DATA: CampaignsData = {
  success: true,
  days: 30,
  clientId: null,
  selectedAccountId: "all",
  currency: "USD",
  accounts: [
    {
      id: "demo-acc-1",
      accountName: "Meta Ads Agency · Bunker VIP",
      accountType: "meta_ads",
      status: "active",
      lastSyncAt: new Date().toISOString(),
      client: { id: "c1", name: "Grupo Alianza Constructora" },
    },
  ],
  campaigns: [
    {
      id: "demo-camp-1",
      name: "Meta Ads · Captación WhatsApp Leads Inmobiliaria Preventa",
      platform: "meta_ads",
      objective: "MESSAGES",
      status: "active",
      currency: "USD",
      budget: 150,
      budgetType: "daily",
      startDate: new Date(Date.now() - 25 * 86400000).toISOString(),
      endDate: null,
      connectedAccountId: "demo-acc-1",
      accountName: "Meta Ads Agency",
      client: { id: "c1", name: "Grupo Alianza Constructora" },
      spend: 4250,
      impressions: 185000,
      clicks: 4820,
      conversions: 380,
      ctr: 2.61,
      cpc: 0.88,
      cpm: 22.97,
      costPerConversion: 11.18,
    },
    {
      id: "demo-camp-2",
      name: "Instagram Reels · Retargeting Carrito Abandonado E-Commerce",
      platform: "meta_ads",
      objective: "CONVERSIONS",
      status: "active",
      currency: "USD",
      budget: 100,
      budgetType: "daily",
      startDate: new Date(Date.now() - 20 * 86400000).toISOString(),
      endDate: null,
      connectedAccountId: "demo-acc-1",
      accountName: "Meta Ads Agency",
      client: { id: "c2", name: "Kroma Brands Latam" },
      spend: 2890,
      impressions: 142000,
      clicks: 3910,
      conversions: 290,
      ctr: 2.75,
      cpc: 0.74,
      cpm: 20.35,
      costPerConversion: 9.96,
    },
    {
      id: "demo-camp-3",
      name: "Meta Feed · Formulario Instantáneo LeadGen B2B Software",
      platform: "meta_ads",
      objective: "LEAD_GENERATION",
      status: "active",
      currency: "USD",
      budget: 120,
      budgetType: "daily",
      startDate: new Date(Date.now() - 18 * 86400000).toISOString(),
      endDate: null,
      connectedAccountId: "demo-acc-1",
      accountName: "Meta Ads Agency",
      client: { id: "c3", name: "Nova Cloud Tech" },
      spend: 3120,
      impressions: 98000,
      clicks: 2450,
      conversions: 195,
      ctr: 2.5,
      cpc: 1.27,
      cpm: 31.84,
      costPerConversion: 16.0,
    },
    {
      id: "demo-camp-4",
      name: "WhatsApp Direct · Campaña Flash Descuentos Especiales",
      platform: "meta_ads",
      objective: "MESSAGES",
      status: "active",
      currency: "USD",
      budget: 80,
      budgetType: "daily",
      startDate: new Date(Date.now() - 10 * 86400000).toISOString(),
      endDate: null,
      connectedAccountId: "demo-acc-1",
      accountName: "Meta Ads Agency",
      client: { id: "c4", name: "MacroAlimentos Corp" },
      spend: 1840,
      impressions: 82000,
      clicks: 2100,
      conversions: 210,
      ctr: 2.56,
      cpc: 0.88,
      cpm: 22.44,
      costPerConversion: 8.76,
    },
  ],
  daily: Array.from({ length: 30 }, (_, i) => {
    const d = new Date(Date.now() - (29 - i) * 86400000);
    return {
      date: d.toISOString().slice(0, 10),
      spend: Math.round(350 + Math.sin(i) * 80 + i * 5),
      impressions: Math.round(15000 + Math.sin(i) * 3000 + i * 200),
      clicks: Math.round(400 + Math.sin(i) * 80 + i * 6),
      conversions: Math.round(32 + Math.sin(i) * 8 + i * 0.5),
    };
  }),
  totals: {
    spend: 12100,
    impressions: 507000,
    clicks: 13280,
    conversions: 1075,
    ctr: 2.62,
    cpc: 0.91,
    cpm: 23.86,
    costPerConversion: 11.25,
    activeCampaigns: 4,
  },
};

export default function CampaignsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[#667085]">Cargando campañas...</div>}>
      <CampaignsPageContent />
    </Suspense>
  );
}

function CampaignsPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isClient = Boolean(user?.isClientUser || user?.role === "CLIENT");

  const [days, setDays] = useState(30);
  const [clientId, setClientId] = useState(searchParams.get("clientId") ?? "all");
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [activeNetwork, setActiveNetwork] = useState<CampaignNetwork>("all");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [metric, setMetric] = useState<Metric>("spend");
  const [data, setData] = useState<CampaignsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaignForAds, setSelectedCampaignForAds] = useState<CampaignItem | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const handleSyncCampaigns = async () => {
    setSyncing(true);
    setSyncFeedback(null);
    try {
      const res = await fetch("/api/campaigns/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientId !== "all" ? clientId : undefined }),
      });
      const json = await res.json();
      if (json.success) {
        setSyncFeedback({
          type: "success",
          text: json.message || "Campañas y métricas de pauta sincronizadas con éxito.",
        });
        fetchData();
        setTimeout(() => setSyncFeedback(null), 5000);
      } else {
        setSyncFeedback({ type: "error", text: json.error || "No se pudo sincronizar las campañas." });
      }
    } catch (err) {
      setSyncFeedback({ type: "error", text: err instanceof Error ? err.message : "Error de red al sincronizar" });
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const param = searchParams.get("clientId") ?? "all";
    setClientId(param);
  }, [searchParams]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (!isClient && clientId !== "all") params.set("clientId", clientId);
      if (selectedAccountId !== "all") params.set("accountId", selectedAccountId);
      const res = await fetch(`/api/campaigns?${params}`);
      const json = await res.json();
      if (json.success) setData(json);
      else setError(json.error);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Error al cargar campañas";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  

  useEffect(() => {
    if (user) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, days, clientId, selectedAccountId]);

  const displayData = useMemo(() => {
    if (isDemoMode) return DEMO_CAMPAIGNS_DATA;
    if (data && data.campaigns && data.campaigns.length > 0) return data;
    if (!loading && (!data || !data.campaigns || data.campaigns.length === 0)) {
      return DEMO_CAMPAIGNS_DATA;
    }
    return data;
  }, [data, isDemoMode, loading]);

  const isShowingDemo = displayData === DEMO_CAMPAIGNS_DATA;

  const currency: string | null = displayData?.currency || null;
  const totals = displayData?.totals;
  const hasAccounts = Boolean(displayData?.accounts && displayData.accounts.length > 0);
  const selectedAccount = displayData?.accounts.find((a) => a.id === selectedAccountId);

  const networkCounts = useMemo(() => {
    const counts = { all: 0, instagram: 0, facebook: 0, whatsapp: 0, tiktok: 0, google: 0 };
    if (!displayData?.campaigns) return counts;
    counts.all = displayData.campaigns.length;
    for (const c of displayData.campaigns) {
      const net = detectCampaignNetwork(c.name, c.platform, c.objective).network;
      if (counts[net] !== undefined) counts[net]++;
    }
    return counts;
  }, [displayData?.campaigns]);

  const filteredCampaigns = useMemo(() => {
    if (!displayData?.campaigns) return [];
    let list = displayData.campaigns;

    if (activeNetwork !== "all") {
      list = list.filter(
        (c) => detectCampaignNetwork(c.name, c.platform, c.objective).network === activeNetwork
      );
    }

    if (campaignSearch.trim()) {
      const q = campaignSearch.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.accountName && c.accountName.toLowerCase().includes(q))
      );
    }

    return list;
  }, [displayData?.campaigns, activeNetwork, campaignSearch]);

  const kpis = totals
    ? [
        { label: "Inversión", value: fmtMoney(totals.spend, currency) },
        { label: "Impresiones", value: fmtNumber(totals.impressions) },
        { label: "Clics", value: fmtNumber(totals.clicks), sub: `CTR ${totals.ctr.toFixed(2)}%` },
        { label: "Costo por clic", value: fmtMoney(totals.cpc, currency) },
        { label: "Conversiones", value: fmtNumber(totals.conversions) },
        { label: "Costo por conversión", value: totals.conversions ? fmtMoney(totals.costPerConversion, currency) : "—" },
      ]
    : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-[#E2E5EB] dark:border-[#1F242D]">
        <div>
          {isShowingDemo && (
            <div className="mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 border border-amber-400/40 text-amber-600 dark:text-amber-400">
                ✦ Modo Presentación Activo
              </span>
            </div>
          )}
          <h1 className="text-2xl sm:text-3xl font-black text-[#121417] dark:text-white tracking-tight">
            {isClient ? "Rendimiento de tus Campañas" : "Campañas & Métricas por Empresa"}
          </h1>
          <p className="text-xs text-[#8C929D] font-medium mt-0.5">
            Inversión, alcance y resultados de las campañas pagadas en Meta (Facebook e Instagram) y TikTok.
          </p>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Selector de Días */}
          <div className="flex rounded-full border border-[#E2E5EB] dark:border-[#242A35] bg-white dark:bg-[#121417] p-1 shadow-2xs">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  days === d
                    ? "bg-[#121417] text-amber-400 dark:bg-amber-400 dark:text-[#121417] shadow-xs"
                    : "text-[#667085] hover:text-[#121417] dark:hover:text-white"
                }`}
              >
                {d} días
              </button>
            ))}
          </div>

          {/* Toggle Demostración para Clientes */}
          <button
            type="button"
            onClick={() => setIsDemoMode(!isDemoMode)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              isShowingDemo
                ? "bg-[#121417] text-white border-[#121417] dark:bg-amber-400 dark:text-[#121417] dark:border-amber-400"
                : "bg-[#F8F9FA] dark:bg-[#1A1D24] text-[#667085] border-[#E2E5EB] dark:border-[#242A35] hover:text-[#121417]"
            }`}
            title="Alternar datos demo para presentación a clientes"
          >
            <Zap className={`w-3.5 h-3.5 ${isShowingDemo ? "text-amber-400 dark:text-[#121417]" : "text-[#8C929D]"}`} />
            <span>{isShowingDemo ? "Demo Activa" : "Modo Demo"}</span>
          </button>

          <button
            type="button"
            onClick={handleSyncCampaigns}
            disabled={syncing}
            className="btn-black-gold rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
            title="Sincronizar campañas y métricas recientes de Meta Ads"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${syncing ? "animate-spin" : ""}`} />
            <span>{syncing ? "Sincronizando..." : "Sincronizar Meta"}</span>
          </button>

          <button
            onClick={fetchData}
            aria-label="Actualizar datos locales"
            className="p-2 rounded-xl bg-white border border-[#EAECF0] text-[#475467] hover:text-[#101828] hover:border-amber-400/60 transition-colors"
            title="Actualizar vista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Sync Feedback Banner */}
      {syncFeedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
            syncFeedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {syncFeedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{syncFeedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncFeedback(null)}
            className="text-xs font-semibold hover:opacity-75"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-2xl border bg-amber-50 border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2.5 shadow-sm">
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {data && !hasAccounts && (
        <div className="p-8 rounded-2xl bg-white border border-[#EAECF0] text-center space-y-3">
          <Plug className="w-6 h-6 text-amber-500 mx-auto" />
          <p className="text-sm text-[#101828] font-medium">
            {isClient ? "Aún no hay redes sociales vinculadas a tu cuenta" : "No hay cuentas publicitarias para este filtro"}
          </p>
          <p className="text-xs text-[#475467]">
            {isClient
              ? "El equipo de Bunker Agency vinculará tus cuentas de Meta y TikTok. Cuando lo haga, verás aquí tus campañas."
              : "Conecta Meta o TikTok y asigna cada cuenta publicitaria al cliente correspondiente."}
          </p>
          {!isClient && (
            <Link href="/marketing/integrations" className="inline-block px-4 py-2 rounded-xl btn-black-gold text-xs font-semibold">
              Ir a Integraciones
            </Link>
          )}
        </div>
      )}

      {data && hasAccounts && (
        <>
          {/* Linked accounts filter chips */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-[#667085]">
              <span className="font-medium text-[#475467]">Filtrar por cuenta publicitaria:</span>
              {selectedAccountId !== "all" && (
                <button
                  type="button"
                  onClick={() => setSelectedAccountId("all")}
                  className="text-xs text-amber-600 hover:text-amber-700 hover:underline font-semibold"
                >
                  Restablecer filtro (ver todas)
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setSelectedAccountId("all")}
                className={`px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 font-medium ${
                  selectedAccountId === "all"
                    ? "bg-[#0F172A] text-white border-slate-800 shadow-xs"
                    : "bg-white text-[#475467] border-[#EAECF0] hover:bg-[#F8F9FA] hover:text-[#101828]"
                }`}
              >
                <span>Todas las cuentas</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    selectedAccountId === "all" ? "bg-white/20 text-white" : "bg-[#F2F4F7] text-[#475467]"
                  }`}
                >
                  {displayData?.accounts?.length || 0}
                </span>
              </button>

              {(displayData?.accounts || []).map((a) => {
                const isSelected = selectedAccountId === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setSelectedAccountId(isSelected ? "all" : a.id)}
                    className={`px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1.5 text-left text-xs font-medium ${
                      isSelected
                        ? "bg-[#0F172A] text-white border-slate-800 shadow-xs"
                        : "bg-white text-[#475467] border-[#EAECF0] hover:bg-[#F8F9FA] hover:text-[#101828]"
                    }`}
                  >
                    {a.status !== ACCOUNT_STATUS.ACTIVE && (
                      <AlertTriangle className={`w-3 h-3 ${isSelected ? "text-amber-400" : "text-amber-600"}`} />
                    )}
                    <span>{a.accountName}</span>
                    {!isClient && a.client && (
                      <span className={isSelected ? "text-slate-300 text-[11px]" : "text-[#667085] text-[11px]"}>
                        · {a.client.name}
                      </span>
                    )}
                    <span className={isSelected ? "text-slate-400 text-[10px] font-mono" : "text-[#667085] text-[10px] font-mono"}>
                      · {a.lastSyncAt ? `act. ${new Date(a.lastSyncAt).toLocaleDateString("es-CO")}` : "sin sinc."}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedAccount && (
              <div className="flex items-center gap-2 p-2 px-3 rounded-lg bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900">
                <span className="font-medium">Filtro activo:</span>
                <span>
                  Viendo datos de <strong>{selectedAccount.accountName}</strong>
                </span>
                {!isClient && selectedAccount.client && (
                  <span className="text-amber-800/80">({selectedAccount.client.name})</span>
                )}
                <span className="text-amber-700 font-mono text-[11px]">· {displayData?.campaigns?.length || 0} campaña(s)</span>
                <button
                  type="button"
                  onClick={() => setSelectedAccountId("all")}
                  className="ml-auto text-[11px] underline font-medium text-amber-950 hover:text-black"
                >
                  ✕ Quitar filtro
                </button>
              </div>
            )}
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="p-3.5 rounded-xl bg-white border border-[#EAECF0] shadow-xs">
                <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">{k.label}</div>
                <div className="text-xl font-semibold text-slate-900 mt-1 tabular-nums">{k.value}</div>
                {k.sub && <div className="text-[11px] text-slate-500 mt-0.5">{k.sub}</div>}
              </div>
            ))}
          </div>

          {/* Daily chart */}
          <div className="p-4 rounded-xl bg-white border border-[#EAECF0] shadow-xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-amber-500" />
                <span>{METRICS.find((m) => m.key === metric)?.label} por día</span>
              </h2>
              <div className="flex rounded-lg border border-[#EAECF0] bg-[#F8F9FA] p-0.5">
                {METRICS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMetric(m.key)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                      metric === m.key
                        ? "bg-[#0F172A] text-white shadow-xs"
                        : "text-[#475467] hover:text-[#101828]"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <DailyBars daily={displayData?.daily || []} metric={metric} currency={currency} />
          </div>

          {/* Pestañas de Clasificación de Red (Instagram, Facebook, WhatsApp, etc.) & Buscador */}
          <div className="p-2 bg-white rounded-2xl border border-[#EAECF0] flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs">
            {/* Tabs de Red / Plataforma */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              <button
                type="button"
                onClick={() => setActiveNetwork("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeNetwork === "all"
                    ? "bg-[#0F172A] text-white shadow-xs"
                    : "text-[#475467] hover:text-[#101828] hover:bg-[#F8F9FA]"
                }`}
              >
                <span>Todas</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    activeNetwork === "all" ? "bg-white/20 text-white font-medium" : "bg-[#F2F4F7] text-[#475467]"
                  }`}
                >
                  {networkCounts.all}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNetwork("instagram")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeNetwork === "instagram"
                    ? "bg-gradient-to-r from-[#FD1D1D] via-[#E1306C] to-[#C13584] text-white shadow-xs"
                    : "text-[#475467] hover:text-[#101828] hover:bg-[#F8F9FA]"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${activeNetwork === "instagram" ? "bg-white" : "bg-gradient-to-tr from-amber-400 via-pink-500 to-purple-600"}`} />
                <span>Instagram</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    activeNetwork === "instagram" ? "bg-white/20 text-white font-medium" : "bg-[#F2F4F7] text-[#475467]"
                  }`}
                >
                  {networkCounts.instagram}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNetwork("facebook")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeNetwork === "facebook"
                    ? "bg-[#1877F2] text-white shadow-xs"
                    : "text-[#475467] hover:text-[#101828] hover:bg-[#F8F9FA]"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${activeNetwork === "facebook" ? "bg-white" : "bg-[#1877F2]"}`} />
                <span>Facebook</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    activeNetwork === "facebook" ? "bg-white/20 text-white font-medium" : "bg-[#F2F4F7] text-[#475467]"
                  }`}
                >
                  {networkCounts.facebook}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveNetwork("whatsapp")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeNetwork === "whatsapp"
                    ? "bg-[#25D366] text-white shadow-xs"
                    : "text-[#475467] hover:text-[#101828] hover:bg-[#F8F9FA]"
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${activeNetwork === "whatsapp" ? "bg-white" : "bg-[#25D366]"}`} />
                <span>WhatsApp</span>
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    activeNetwork === "whatsapp" ? "bg-white/20 text-white font-medium" : "bg-[#F2F4F7] text-[#475467]"
                  }`}
                >
                  {networkCounts.whatsapp}
                </span>
              </button>

              {networkCounts.tiktok > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveNetwork("tiktok")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                    activeNetwork === "tiktok"
                      ? "bg-black text-white shadow-xs"
                      : "text-[#475467] hover:text-[#101828] hover:bg-[#F8F9FA]"
                  }`}
                >
                  <div className="w-2 h-2 rounded-full bg-black" />
                  <span>TikTok Ads</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      activeNetwork === "tiktok" ? "bg-white/20 text-white font-medium" : "bg-[#F2F4F7] text-[#475467]"
                    }`}
                  >
                    {networkCounts.tiktok}
                  </span>
                </button>
              )}
            </div>

            {/* Buscador de campañas */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-[#9C9890] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={campaignSearch}
                onChange={(e) => setCampaignSearch(e.target.value)}
                placeholder="Buscar campaña..."
                className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-lg pl-8 pr-7 py-1.5 text-xs text-[#101828] placeholder-[#9C9890] focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
              />
              {campaignSearch && (
                <button
                  type="button"
                  onClick={() => setCampaignSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#9C9890] hover:text-[#101828] cursor-pointer"
                  title="Limpiar búsqueda"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Campaigns table */}
          <div className="rounded-xl bg-white border border-[#EAECF0] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#F8F9FA] text-slate-500 border-b border-[#EAECF0]">
                  <tr>
                    <th className="text-left font-semibold text-[11px] uppercase tracking-wider px-4 py-3 whitespace-nowrap">Campaña</th>
                    <th className="text-left font-semibold text-[11px] uppercase tracking-wider px-4 py-3 whitespace-nowrap">Estado</th>
                    <th className="text-right font-semibold text-[11px] uppercase tracking-wider px-4 py-3 whitespace-nowrap">Presupuesto</th>
                    <th className="text-right font-semibold text-[11px] uppercase tracking-wider px-4 py-3 whitespace-nowrap">Inversión</th>
                    <th className="text-right font-semibold text-[11px] uppercase tracking-wider px-4 py-3 whitespace-nowrap">Impresiones</th>
                    <th className="text-right font-semibold text-[11px] uppercase tracking-wider px-4 py-3 whitespace-nowrap">Clics</th>
                    <th className="text-right font-semibold text-[11px] uppercase tracking-wider px-4 py-3 whitespace-nowrap">CTR</th>
                    <th className="text-right font-semibold text-[11px] uppercase tracking-wider px-4 py-3 whitespace-nowrap">Leads / Conv.</th>
                    <th className="text-right font-semibold text-[11px] uppercase tracking-wider px-4 py-3 whitespace-nowrap">Costo / Lead</th>
                    <th className="text-center font-semibold text-[11px] uppercase tracking-wider px-4 py-3 whitespace-nowrap">Creativos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EFEA]">
                  {filteredCampaigns.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-10 text-center text-[#667085]">
                        <div className="max-w-md mx-auto space-y-3">
                          {!displayData?.campaigns || displayData.campaigns.length === 0 ? (
                            <>
                              <p className="text-xs">No hay campañas sincronizadas todavía para las cuentas seleccionadas.</p>
                              <button
                                type="button"
                                onClick={handleSyncCampaigns}
                                disabled={syncing}
                                className="px-4 py-2 rounded-full bg-[#121417] text-white hover:bg-[#1E2229] text-xs font-bold inline-flex items-center gap-2 shadow-2xs cursor-pointer"
                              >
                                <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${syncing ? "animate-spin" : ""}`} />
                                <span>{syncing ? "Sincronizando de Meta Ads..." : "Sincronizar Campañas Ahora"}</span>
                              </button>
                            </>
                          ) : (
                            <>
                              <p className="text-xs font-medium text-[#101828]">
                                No se encontraron campañas en la pestaña &quot;{activeNetwork === "instagram" ? "Instagram" : activeNetwork === "facebook" ? "Facebook" : activeNetwork === "whatsapp" ? "WhatsApp" : activeNetwork}&quot;{campaignSearch ? ` con el filtro "${campaignSearch}"` : ""}.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveNetwork("all");
                                  setCampaignSearch("");
                                }}
                                className="px-4 py-1.5 rounded-full bg-[#121417] text-white text-xs font-bold hover:bg-[#1E2229] transition-colors cursor-pointer"
                              >
                                Ver todas las campañas ({displayData?.campaigns?.length || 0})
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                  {filteredCampaigns.map((c) => {
                    const st = STATUS_STYLES[c.status] || STATUS_STYLES.completed;
                    const visual = getCampaignVisualInfo(c.name, c.objective);
                    const netInfo = detectCampaignNetwork(c.name, c.platform, c.objective);
                    const VisualIcon = visual.icon;

                    return (
                      <tr key={c.id} className="hover:bg-[#F8F9FA]/80 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {/* Previsualización Creativa / Thumbnail interactivo */}
                            <button
                              type="button"
                              onClick={() => setSelectedCampaignForAds(c)}
                              className="group/thumb relative w-11 h-11 rounded-xl bg-gradient-to-br from-[#101828] via-[#1E293B] to-[#0F172A] border border-[#334155]/40 flex items-center justify-center shrink-0 shadow-xs hover:border-amber-400/80 hover:shadow-md hover:shadow-amber-500/10 transition-all cursor-pointer"
                              title={`Ver anuncios y creativos de "${c.name}"`}
                            >
                              <VisualIcon className="w-5 h-5 text-amber-400 group-hover/thumb:scale-110 transition-transform" />
                              <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] opacity-0 group-hover/thumb:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                                <Eye className="w-3.5 h-3.5 text-amber-300" />
                              </div>
                              <div className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white shadow-xs ring-1 ring-black/10">
                                <SocialNetworkIcon provider={netInfo.iconProvider} size="xs" />
                              </div>
                            </button>

                            <div className="min-w-0">
                              <button
                                type="button"
                                onClick={() => setSelectedCampaignForAds(c)}
                                className="text-left text-[#101828] font-medium hover:text-amber-600 transition-colors truncate block leading-tight max-w-[280px] lg:max-w-[360px]"
                                title={c.name}
                              >
                                {c.name}
                              </button>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-[#667085]">
                                <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border ${visual.badgeCls}`}>
                                  {visual.label}
                                </span>
                                <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded border ${netInfo.badgeCls}`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${netInfo.dotCls}`} />
                                  {netInfo.label}
                                </span>
                                {c.accountName && <span className="truncate max-w-[160px]">· {c.accountName}</span>}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[#475467] whitespace-nowrap">
                          {c.budget ? `${fmtMoney(c.budget, c.currency)}${c.budgetType === "daily" ? "/día" : ""}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[#101828] font-semibold whitespace-nowrap">
                          {fmtMoney(c.spend, c.currency)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums text-[#475467] whitespace-nowrap">{fmtNumber(c.impressions)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-[#475467] whitespace-nowrap">{fmtNumber(c.clicks)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-[#475467] whitespace-nowrap">{c.ctr.toFixed(2)}%</td>
                        <td className="px-4 py-3 text-right tabular-nums text-amber-700 font-bold whitespace-nowrap">{fmtNumber(c.conversions)}</td>
                        <td className="px-4 py-3 text-right tabular-nums text-[#475467] whitespace-nowrap">
                          {c.conversions ? fmtMoney(c.costPerConversion, c.currency) : "—"}
                        </td>

                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedCampaignForAds(c)}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#EAECF0] text-[#101828] hover:bg-[#101828] hover:text-amber-400 hover:border-amber-500/60 text-[11px] font-semibold transition-all shadow-xs group whitespace-nowrap shrink-0 cursor-pointer"
                            title="Ver imágenes, videos, textos y creativos"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-500 group-hover:text-amber-400 transition-colors shrink-0" />
                            <span className="whitespace-nowrap">Ver Anuncios</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {selectedCampaignForAds && (
        <CampaignAdsModal
          campaignId={selectedCampaignForAds.id}
          campaignName={selectedCampaignForAds.name}
          platform={detectCampaignNetwork(selectedCampaignForAds.name, selectedCampaignForAds.platform, selectedCampaignForAds.objective).iconProvider}
          accountName={selectedCampaignForAds.accountName}
          onClose={() => setSelectedCampaignForAds(null)}
        />
      )}
    </div>
  );
}

/** Barras diarias de una sola métrica, con gradiente oro animado y tooltip de lujo al pasar el mouse. */
function DailyBars({ daily, metric, currency }: { daily: DailyItem[]; metric: Metric; currency: string | null }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 800;
  const H = 220;
  const PAD = { top: 12, right: 8, bottom: 4, left: 8 };
  const max = Math.max(...daily.map((d) => d[metric]), 0);
  const slot = (W - PAD.left - PAD.right) / Math.max(daily.length, 1);
  const barW = Math.max(Math.min(slot - 2, 24), 2); // 2px de separación entre barras
  const plotH = H - PAD.top - PAD.bottom;
  const labelEvery = Math.ceil(daily.length / 8);
  const h = hover !== null ? daily[hover] : null;

  if (max === 0) {
    return <div className="h-[220px] flex items-center justify-center text-xs text-[#667085]">Sin datos en este rango.</div>;
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[200px]" preserveAspectRatio="none" role="img"
        aria-label={`${metric} diario`} onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id="goldBarGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FBBF24" />
            <stop offset="60%" stopColor="#F59E0B" />
            <stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <linearGradient id="goldBarGradHover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FEF08A" />
            <stop offset="50%" stopColor="#FBBF24" />
            <stop offset="100%" stopColor="#F59E0B" />
          </linearGradient>
          <filter id="goldBarGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#F59E0B" floodOpacity="0.4" />
          </filter>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line key={f} x1={PAD.left} x2={W - PAD.right} y1={PAD.top + plotH * (1 - f)} y2={PAD.top + plotH * (1 - f)}
            stroke="#F0EFEA" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        <line x1={PAD.left} x2={W - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} stroke="#D1CFCA" strokeWidth={1}
          vectorEffect="non-scaling-stroke" />
        {daily.map((d, i) => {
          const bh = (d[metric] / max) * plotH;
          const x = PAD.left + i * slot + (slot - barW) / 2;
          const y = PAD.top + plotH - bh;
          const r = Math.min(4, barW / 2, bh);
          const isHovered = hover === i;
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)}>
              {/* Área de hover más grande que la barra */}
              <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={plotH} fill="transparent" />
              {bh > 0 && (
                <path
                  d={`M${x},${PAD.top + plotH} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${PAD.top + plotH} Z`}
                  fill={isHovered ? "url(#goldBarGradHover)" : "url(#goldBarGrad)"}
                  filter={isHovered ? "url(#goldBarGlow)" : undefined}
                  className="transition-all duration-200"
                  opacity={hover === null || isHovered ? 1 : 0.45}
                />
              )}
            </g>
          );
        })}
      </svg>
      {/* Etiquetas de fecha en HTML para que no se deformen con el escalado del SVG */}
      <div className="relative h-4 text-[10px] text-[#667085]">
        {daily.map((d, i) =>
          i % labelEvery === 0 ? (
            <span key={d.date} className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${((PAD.left + i * slot + slot / 2) / W) * 100}%` }}>
              {new Date(`${d.date}T00:00:00Z`).toLocaleDateString("es-CO", { day: "numeric", month: "short", timeZone: "UTC" })}
            </span>
          ) : null
        )}
      </div>
      {h && hover !== null && (
        <div
          className="pointer-events-none absolute top-0 -translate-x-1/2 px-3 py-2 rounded-xl bg-[#0B0F19] border border-amber-500/40 text-white text-[11px] shadow-xl whitespace-nowrap z-10 backdrop-blur-md"
          style={{ left: `${((PAD.left + hover * slot + slot / 2) / W) * 100}%` }}
        >
          <div className="text-amber-300/80 text-[10px] font-medium uppercase tracking-wider">
            {new Date(`${h.date}T00:00:00Z`).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}
          </div>
          <div className="font-bold text-amber-400 tabular-nums text-xs mt-0.5">{fmtMetric(metric, h[metric], currency)}</div>
        </div>
      )}
    </div>
  );
}
