"use client";

import React, { useState, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  BarChart3,
  Clock,
  DollarSign,
  KanbanSquare,
  Megaphone,
  RefreshCw,
  Target,
  Users,
  Building2,
  Sparkles,
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import Panel from "@/components/ui/Panel";
import RangeSelector from "@/components/reports/RangeSelector";
import LeadsTrendChart from "@/components/reports/LeadsTrendChart";
import SourceBreakdownTable from "@/components/reports/SourceBreakdownTable";
import PipelineStageList from "@/components/reports/PipelineStageList";
import { useReports } from "@/hooks/useReports";
import { useAuth } from "@/context/AuthContext";
import { useClientOptions } from "@/hooks/useClientOptions";
import { DEFAULT_REPORT_RANGE_DAYS, type ReportRangeDays } from "@/lib/constants/reports";
import { formatCompactMoney, formatHours, formatMoney, formatNumber, formatPercent } from "@/lib/format";
import type { ReportsData } from "@/types/reports";

function getDemoReport(days: ReportRangeDays): ReportsData {
  const factor = days === 30 ? 0.35 : days === 90 ? 1 : days === 180 ? 1.9 : 3.6;
  const newLeads = Math.round(1240 * factor);
  const wonDeals = Math.round(48 * factor);
  const wonRevenue = Math.round(342800 * factor);
  const adSpend = Math.round(28450 * factor);

  return {
    days,
    generatedAt: new Date().toISOString(),
    kpis: {
      newLeads,
      conversionRate: 18.4,
      wonRevenue,
      wonDeals,
      averageTicket: Math.round(wonRevenue / (wonDeals || 1)),
      openPipelineValue: Math.round(580000 * factor),
      weightedPipelineValue: Math.round(245600 * factor),
      medianFirstResponseHours: 0.08,
      contactedRate: 96.8,
      adSpend,
      adSpendCurrency: "USD",
      costPerLead: Math.round((adSpend / (newLeads * 0.85)) * 10) / 10,
    },
    sources: [
      {
        source: "meta_ads",
        label: "Meta Ads (Instagram & FB)",
        leads: Math.round(640 * factor),
        converted: Math.round(128 * factor),
        conversionRate: 20.0,
        estimatedValue: Math.round(184000 * factor),
        isPaid: true,
      },
      {
        source: "google_ads",
        label: "Google Ads (Search & PMax)",
        leads: Math.round(380 * factor),
        converted: Math.round(72 * factor),
        conversionRate: 18.9,
        estimatedValue: Math.round(124000 * factor),
        isPaid: true,
      },
      {
        source: "tiktok_ads",
        label: "TikTok Ads",
        leads: Math.round(120 * factor),
        converted: Math.round(16 * factor),
        conversionRate: 13.3,
        estimatedValue: Math.round(34800 * factor),
        isPaid: true,
      },
      {
        source: "whatsapp",
        label: "WhatsApp Directo",
        leads: Math.round(80 * factor),
        converted: Math.round(22 * factor),
        conversionRate: 27.5,
        estimatedValue: Math.round(42000 * factor),
        isPaid: false,
      },
      {
        source: "referral",
        label: "Referidos / Orgánico",
        leads: Math.round(20 * factor),
        converted: Math.round(8 * factor),
        conversionRate: 40.0,
        estimatedValue: Math.round(18000 * factor),
        isPaid: false,
      },
    ],
    trend: [
      { periodStart: "2026-09-01", label: "01 Sep", leads: Math.round(85 * factor), converted: Math.round(14 * factor) },
      { periodStart: "2026-09-15", label: "15 Sep", leads: Math.round(110 * factor), converted: Math.round(19 * factor) },
      { periodStart: "2026-10-01", label: "01 Oct", leads: Math.round(140 * factor), converted: Math.round(26 * factor) },
      { periodStart: "2026-10-15", label: "15 Oct", leads: Math.round(175 * factor), converted: Math.round(32 * factor) },
      { periodStart: "2026-11-01", label: "01 Nov", leads: Math.round(210 * factor), converted: Math.round(41 * factor) },
    ],
    stages: [
      { stageId: "s-1", name: "Contacto Inicial", color: "#F59E0B", deals: Math.round(34 * factor), value: Math.round(120000 * factor) },
      { stageId: "s-2", name: "Diagnóstico / Calificación", color: "#3B82F6", deals: Math.round(22 * factor), value: Math.round(155000 * factor) },
      { stageId: "s-3", name: "Propuesta Presentada", color: "#8B5CF6", deals: Math.round(14 * factor), value: Math.round(195000 * factor) },
      { stageId: "s-4", name: "Negociación & Cierre", color: "#10B981", deals: Math.round(8 * factor), value: Math.round(110000 * factor) },
    ],
  };
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportsContent />
    </Suspense>
  );
}

function ReportsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const clients = useClientOptions();
  const activeClient = clientId && clientId !== "all" ? clients.find((c) => c.id === clientId) : null;

  const [days, setDays] = useState<ReportRangeDays>(DEFAULT_REPORT_RANGE_DAYS);
  const [showTrendTable, setShowTrendTable] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const { report, loading, error, refresh } = useReports(days, clientId);

  const activeReport = useMemo(() => {
    if (isDemoMode) return getDemoReport(days);
    return report;
  }, [isDemoMode, days, report]);

  const kpis = activeReport?.kpis;

  const scopeLabel = isDemoMode
    ? "Demo Corporativa (Global)"
    : user?.isClientUser
    ? user.clientName ?? "tu empresa"
    : activeClient
    ? activeClient.name
    : "toda la agencia";

  return (
    <div className="space-y-6">
      {/* Cabecera Estilo Cápsula Orvion con Paleta Dorado y Negro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="orvion-badge-gold text-[10px]">
              Analítica & Retorno
            </span>
            {isDemoMode ? (
              <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-700/50 flex items-center gap-1.5 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-current" />
                Modo Demostrativo Activo
              </span>
            ) : activeClient ? (
              <span className="text-[11px] font-semibold text-[#121417] dark:text-white bg-white dark:bg-[#121417] px-3 py-1 rounded-full border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
                Marca: <strong>{activeClient.name}</strong>
              </span>
            ) : !user?.isClientUser ? (
              <span className="text-[11px] font-medium text-[#8C929D] bg-white dark:bg-[#121417] px-3 py-1 rounded-full border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
                Vista Global Agencia
              </span>
            ) : null}
          </div>

          <h1 className="text-3xl font-extrabold text-[#121417] dark:text-white tracking-tight leading-tight">
            Reportes & ROI
          </h1>
          <p className="text-xs text-[#8C929D] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs animate-pulse" />
            <span>
              Captación, conversión, velocidad de respuesta y retorno de la pauta de {scopeLabel}, calculados con los registros reales del CRM.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Switch Modo Demo Interactivo */}
          <button
            type="button"
            onClick={() => setIsDemoMode((prev) => !prev)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-orvion cursor-pointer border ${
              isDemoMode
                ? "bg-amber-400 text-[#121417] border-amber-500 shadow-amber-400/20"
                : "bg-white dark:bg-[#121417] text-[#8C929D] border-[#E2E5EB] dark:border-[#1F242D] hover:text-[#121417] dark:hover:text-white"
            }`}
            title="Ver métricas completas de demostración"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isDemoMode ? "text-[#121417] fill-current" : "text-amber-500"}`} />
            <span>{isDemoMode ? "⚡ Modo Demo Activo" : "Modo Demo"}</span>
          </button>

          <RangeSelector value={days} onChange={setDays} />

          <button
            type="button"
            onClick={refresh}
            aria-label="Actualizar reporte"
            className="w-10 h-10 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] flex items-center justify-center text-[#121417] dark:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] shadow-orvion transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      {error && !isDemoMode && (
        <div className="p-4 rounded-[28px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs font-semibold text-red-700 dark:text-red-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-orvion">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={refresh}
              className="px-3 py-1 rounded-full bg-white dark:bg-[#1E2229] border border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300 font-bold hover:bg-red-50 transition-all cursor-pointer shadow-2xs"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={() => setIsDemoMode(true)}
              className="px-3.5 py-1 rounded-full bg-amber-400 text-[#121417] font-bold hover:bg-amber-300 transition-all cursor-pointer shadow-orvion flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5 fill-current" />
              <span>Ver Métricas Demo</span>
            </button>
          </div>
        </div>
      )}

      {!activeReport && loading ? (
        <ReportSkeleton />
      ) : activeReport && kpis ? (
        <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
          {/* Tarjetas de Métricas en Cápsula Orvion */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              emphasis
              icon={DollarSign}
              label="Ingresos ganados"
              subPeriod="Cierre comercial"
              value={formatCompactMoney(kpis.wonRevenue)}
              hint={`${formatNumber(kpis.wonDeals)} negocios · ticket promedio ${formatMoney(kpis.averageTicket)}`}
              badgeText="Ingresos"
              badgeVariant="gold"
            />
            <StatCard
              icon={Users}
              label="Leads nuevos"
              subPeriod="Conversión"
              value={formatNumber(kpis.newLeads)}
              hint={`${formatPercent(kpis.conversionRate)} ya convertidos`}
              badgeText={formatPercent(kpis.conversionRate)}
              badgeVariant="gold"
            />
            <StatCard
              icon={Clock}
              label="Primera respuesta"
              subPeriod="Velocidad SLA"
              value={kpis.medianFirstResponseHours === null ? "—" : formatHours(kpis.medianFirstResponseHours)}
              hint={`Mediana · ${formatPercent(kpis.contactedRate)} de los leads tiene actividad`}
              badgeText="SLA"
              badgeVariant="dark"
            />
            <StatCard
              icon={Target}
              label="Costo por lead"
              subPeriod="Pauta unitaria"
              value={kpis.costPerLead === null ? "—" : formatMoney(kpis.costPerLead, kpis.adSpendCurrency ?? undefined)}
              hint={
                kpis.adSpend > 0
                  ? `Inversión ${kpis.adSpendCurrency ? formatCompactMoney(kpis.adSpend, kpis.adSpendCurrency) : formatNumber(Math.round(kpis.adSpend)) + " (monedas mixtas)"} / leads de pauta`
                  : "Sin inversión sincronizada en el período"
              }
              badgeText="Pauta"
              badgeVariant="gold"
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <Panel
              className="xl:col-span-2"
              icon={BarChart3}
              title="Leads nuevos por período"
              action={
                <button
                  type="button"
                  onClick={() => setShowTrendTable((v) => !v)}
                  className="px-3 py-1 rounded-full text-[11px] font-semibold bg-[#F3F4F7] dark:bg-[#1E2229] text-[#121417] dark:text-white hover:bg-[#E2E5EB] dark:hover:bg-[#2A2E37] transition-all cursor-pointer"
                >
                  {showTrendTable ? "Ver gráfica" : "Ver tabla"}
                </button>
              }
            >
              {kpis.newLeads === 0 ? (
                <EmptyState icon={Users} title="Sin leads en este período" description="Prueba con un rango más amplio." />
              ) : (
                <LeadsTrendChart points={activeReport.trend} showTable={showTrendTable} />
              )}
            </Panel>

            <Panel icon={KanbanSquare} title="Pipeline por etapa">
              {activeReport.stages.some((stage) => stage.deals > 0) ? (
                <PipelineStageList stages={activeReport.stages} />
              ) : (
                <EmptyState icon={KanbanSquare} title="Sin negocios abiertos" />
              )}
            </Panel>
          </div>

          <Panel icon={Megaphone} title="Desglose por canal de adquisición">
            {activeReport.sources.length === 0 ? (
              <EmptyState icon={Megaphone} title="Sin leads en este período" />
            ) : (
              <SourceBreakdownTable rows={activeReport.sources} />
            )}
          </Panel>

          <p className="text-[11px] text-[#8C929D] leading-relaxed font-medium">
            Ingresos: oportunidades marcadas como ganadas en el período (por fecha de última actualización). Primera respuesta: tiempo
            entre el alta del lead y su primera actividad registrada. Costo por lead: gasto de campañas sincronizadas dividido entre
            leads de fuentes pagadas.
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ReportSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando reporte">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-[28px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 h-80 rounded-[28px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion" />
        <div className="h-80 rounded-[28px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion" />
      </div>
    </div>
  );
}
