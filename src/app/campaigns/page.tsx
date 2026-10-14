"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { BarChart3, RefreshCw, Plug, AlertTriangle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ACCOUNT_STATUS } from "@/lib/constants/integrations";

type Metric = "spend" | "clicks" | "conversions" | "impressions";

const METRICS: { key: Metric; label: string }[] = [
  { key: "spend", label: "Gasto" },
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
  completed: { label: "Finalizada", cls: "bg-[#F4F3EE] text-[#6B6966] border-[#E8E6DF]" },
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

export default function CampaignsPage() {
  const { user } = useAuth();
  const isClient = Boolean(user?.isClientUser || user?.role === "CLIENT");

  const [days, setDays] = useState(30);
  const [clientId, setClientId] = useState("all");
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [metric, setMetric] = useState<Metric>("spend");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || isClient) return;
    fetch("/api/clients")
      .then((r) => r.json())
      .then((json) => json.success && setClients(json.clients.map((c: any) => ({ id: c.id, name: c.name }))))
      .catch(console.error);
  }, [user, isClient]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ days: String(days) });
      if (!isClient && clientId !== "all") params.set("clientId", clientId);
      const res = await fetch(`/api/campaigns?${params}`);
      const json = await res.json();
      if (json.success) setData(json);
      else setError(json.error);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, days, clientId]);

  const currency: string | null = data?.currency || null;
  const totals = data?.totals;
  const hasAccounts = data?.accounts?.length > 0;

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2 border-b border-[#E8E6DF]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#82807C] mb-1">
            <span>Marketing</span>
            <span>/</span>
            <span className="text-[#1F1E1D] font-medium">Campañas</span>
          </div>
          <h1 className="text-2xl font-serif font-normal text-[#1F1E1D] tracking-tight">
            {isClient ? "Rendimiento de tus Campañas" : "Campañas & Métricas por Cliente"}
          </h1>
          <p className="text-xs text-[#6B6966] mt-0.5">
            Inversión, alcance y resultados de las campañas pagadas en Meta (Facebook e Instagram) y TikTok.
          </p>
        </div>

        {/* Filters: one row above the chart */}
        <div className="flex flex-wrap items-center gap-2">
          {!isClient && (
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="bg-white border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
            >
              <option value="all">Todos los clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <div className="flex rounded-xl border border-[#E8E6DF] bg-white p-0.5">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDays(d)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  days === d ? "bg-[#1F1E1D] text-white" : "text-[#6B6966] hover:text-[#1F1E1D]"
                }`}
              >
                {d} días
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            aria-label="Actualizar"
            className="p-2 rounded-xl bg-white border border-[#E8E6DF] text-[#4D4C48] hover:text-[#1F1E1D]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl border bg-[#FDF2F2] border-[#F8D7DA] text-red-800 text-xs font-medium">{error}</div>
      )}

      {data && !hasAccounts && (
        <div className="p-8 rounded-2xl bg-white border border-[#E8E6DF] text-center space-y-3">
          <Plug className="w-6 h-6 text-[#D97757] mx-auto" />
          <p className="text-sm text-[#1F1E1D] font-medium">
            {isClient ? "Aún no hay redes sociales vinculadas a tu cuenta" : "No hay cuentas publicitarias para este filtro"}
          </p>
          <p className="text-xs text-[#6B6966]">
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
          {/* Linked accounts */}
          <div className="flex flex-wrap gap-2 text-[11px]">
            {data.accounts.map((a: any) => (
              <span key={a.id} className="px-2.5 py-1 rounded-full bg-white border border-[#E8E6DF] text-[#4D4C48] flex items-center gap-1.5">
                {a.status !== ACCOUNT_STATUS.ACTIVE && <AlertTriangle className="w-3 h-3 text-amber-600" />}
                <span>{a.accountName}</span>
                {!isClient && a.client && <span className="text-[#82807C]">· {a.client.name}</span>}
                <span className="text-[#82807C]">
                  · {a.lastSyncAt ? `act. ${new Date(a.lastSyncAt).toLocaleDateString("es-CO")}` : "sin sincronizar"}
                </span>
              </span>
            ))}
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {kpis.map((k) => (
              <div key={k.label} className="p-4 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm">
                <div className="text-[11px] text-[#6B6966]">{k.label}</div>
                <div className="text-xl font-serif text-[#1F1E1D] mt-1 tabular-nums">{k.value}</div>
                {k.sub && <div className="text-[11px] text-[#82807C] mt-0.5">{k.sub}</div>}
              </div>
            ))}
          </div>

          {/* Daily chart */}
          <div className="p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-serif text-[#1F1E1D] flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#D97757]" />
                {METRICS.find((m) => m.key === metric)?.label} por día
              </h2>
              <div className="flex rounded-xl border border-[#E8E6DF] bg-[#FAF9F5] p-0.5">
                {METRICS.map((m) => (
                  <button
                    key={m.key}
                    onClick={() => setMetric(m.key)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      metric === m.key ? "bg-white text-[#1F1E1D] shadow-sm" : "text-[#6B6966] hover:text-[#1F1E1D]"
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
          <div className="rounded-2xl bg-white border border-[#E8E6DF] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-[#FAF9F5] text-[#6B6966] border-b border-[#E8E6DF]">
                  <tr>
                    <th className="text-left font-medium px-4 py-2.5">Campaña</th>
                    {!isClient && <th className="text-left font-medium px-4 py-2.5">Cliente</th>}
                    <th className="text-left font-medium px-4 py-2.5">Estado</th>
                    <th className="text-right font-medium px-4 py-2.5">Presupuesto</th>
                    <th className="text-right font-medium px-4 py-2.5">Gasto</th>
                    <th className="text-right font-medium px-4 py-2.5">Impresiones</th>
                    <th className="text-right font-medium px-4 py-2.5">Clics</th>
                    <th className="text-right font-medium px-4 py-2.5">CTR</th>
                    <th className="text-right font-medium px-4 py-2.5">Conv.</th>
                    <th className="text-right font-medium px-4 py-2.5">Costo/conv.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EFEA]">
                  {data.campaigns.length === 0 && (
                    <tr>
                      <td colSpan={isClient ? 9 : 10} className="px-4 py-6 text-center text-[#82807C]">
                        No hay campañas sincronizadas todavía.
                      </td>
                    </tr>
                  )}
                  {data.campaigns.map((c: any) => {
                    const st = STATUS_STYLES[c.status] || STATUS_STYLES.completed;
                    return (
                      <tr key={c.id} className="hover:bg-[#FAF9F5]">
                        <td className="px-4 py-2.5">
                          <div className="text-[#1F1E1D] font-medium">{c.name}</div>
                          <div className="text-[11px] text-[#82807C]">
                            {PLATFORM_LABELS[c.platform] || c.platform} · {c.accountName}
                          </div>
                        </td>
                        {!isClient && <td className="px-4 py-2.5 text-[#4D4C48]">{c.client?.name || "—"}</td>}
                        <td className="px-4 py-2.5">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#4D4C48]">
                          {c.budget ? `${fmtMoney(c.budget, c.currency)}${c.budgetType === "daily" ? "/día" : ""}` : "—"}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#1F1E1D]">{fmtMoney(c.spend, c.currency)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#4D4C48]">{fmtNumber(c.impressions)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#4D4C48]">{fmtNumber(c.clicks)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#4D4C48]">{c.ctr.toFixed(2)}%</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#4D4C48]">{fmtNumber(c.conversions)}</td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-[#4D4C48]">
                          {c.conversions ? fmtMoney(c.costPerConversion, c.currency) : "—"}
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
    </div>
  );
}

/** Barras diarias de una sola métrica, con tooltip al pasar el mouse. */
function DailyBars({ daily, metric, currency }: { daily: any[]; metric: Metric; currency: string | null }) {
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
    return <div className="h-[220px] flex items-center justify-center text-xs text-[#82807C]">Sin datos en este rango.</div>;
  }

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-[200px]" preserveAspectRatio="none" role="img"
        aria-label={`${metric} diario`} onMouseLeave={() => setHover(null)}>
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
          return (
            <g key={d.date} onMouseEnter={() => setHover(i)}>
              {/* Área de hover más grande que la barra */}
              <rect x={PAD.left + i * slot} y={PAD.top} width={slot} height={plotH} fill="transparent" />
              {bh > 0 && (
                <path
                  d={`M${x},${PAD.top + plotH} V${y + r} Q${x},${y} ${x + r},${y} H${x + barW - r} Q${x + barW},${y} ${x + barW},${y + r} V${PAD.top + plotH} Z`}
                  fill="#D97757"
                  opacity={hover === null || hover === i ? 1 : 0.45}
                />
              )}
            </g>
          );
        })}
      </svg>
      {/* Etiquetas de fecha en HTML para que no se deformen con el escalado del SVG */}
      <div className="relative h-4 text-[10px] text-[#82807C]">
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
          className="pointer-events-none absolute top-0 -translate-x-1/2 px-2.5 py-1.5 rounded-lg bg-[#1F1E1D] text-white text-[11px] shadow-lg whitespace-nowrap"
          style={{ left: `${((PAD.left + hover * slot + slot / 2) / W) * 100}%` }}
        >
          <div className="text-white/70">
            {new Date(`${h.date}T00:00:00Z`).toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" })}
          </div>
          <div className="font-medium tabular-nums">{fmtMetric(metric, h[metric], currency)}</div>
        </div>
      )}
    </div>
  );
}
