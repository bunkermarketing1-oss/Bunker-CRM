"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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

export default function CampaignsPage() {
  const { user } = useAuth();
  const isClient = Boolean(user?.isClientUser || user?.role === "CLIENT");

  const [days, setDays] = useState(30);
  const [clientId, setClientId] = useState("all");
  const [selectedAccountId, setSelectedAccountId] = useState("all");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [metric, setMetric] = useState<Metric>("spend");
  const [data, setData] = useState<CampaignsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCampaignForAds, setSelectedCampaignForAds] = useState<CampaignItem | null>(null);

  useEffect(() => {
    if (!user || isClient) return;
    fetch("/api/clients")
      .then((r) => r.json())
      .then((json) => json.success && setClients(json.clients.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name }))))
      .catch(console.error);
  }, [user, isClient]);

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

  const currency: string | null = data?.currency || null;
  const totals = data?.totals;
  const hasAccounts = Boolean(data?.accounts && data.accounts.length > 0);
  const selectedAccount = data?.accounts.find((a) => a.id === selectedAccountId);

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#EAECF0]">
        <div>
          <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">
            {isClient ? "Rendimiento de tus Campañas" : "Campañas & Métricas por Cliente"}
          </h1>
          <p className="text-xs text-[#475467] mt-0.5">
            Inversión, alcance y resultados de las campañas pagadas en Meta (Facebook e Instagram) y TikTok.
          </p>
        </div>

        {/* Filters: one row above the chart */}
        <div className="flex flex-wrap items-center gap-2">
          {!isClient && (
            <select
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value);
                setSelectedAccountId("all");
              }}
              className="bg-white border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-400/50"
            >
              <option value="all">Todos los clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <div className="flex rounded-xl border border-[#EAECF0] bg-white p-0.5">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  days === d ? "bg-[#101828] text-amber-400 shadow-sm" : "text-[#475467] hover:text-[#101828]"
                }`}
              >
                {d} días
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            aria-label="Actualizar"
            className="p-2 rounded-xl bg-white border border-[#EAECF0] text-[#475467] hover:text-[#101828] hover:border-amber-400/60 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

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
                  {data.accounts.length}
                </span>
              </button>

              {data.accounts.map((a) => {
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
                <span className="text-amber-700 font-mono text-[11px]">· {data.campaigns.length} campaña(s)</span>
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
            <DailyBars daily={data.daily} metric={metric} currency={currency} />
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
                  {data.campaigns.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-4 py-8 text-center text-[#667085]">
                        No hay campañas sincronizadas todavía.
                      </td>
                    </tr>
                  )}
                  {data.campaigns.map((c) => {
                    const st = STATUS_STYLES[c.status] || STATUS_STYLES.completed;
                    const visual = getCampaignVisualInfo(c.name, c.objective);
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
                                <SocialNetworkIcon provider={c.platform} size="xs" />
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
                                <span>· {PLATFORM_LABELS[c.platform] || c.platform}</span>
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
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white border border-[#EAECF0] text-[#101828] hover:bg-[#101828] hover:text-amber-400 hover:border-amber-500/60 text-[11px] font-semibold transition-all shadow-xs group whitespace-nowrap shrink-0"
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
          platform={selectedCampaignForAds.platform}
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
