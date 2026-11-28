"use client";

import React, { useState, Suspense } from "react";
import { useActiveClientId } from "@/hooks/useActiveClientId";
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

export default function ReportsPage() {
  return (
    <Suspense fallback={<ReportSkeleton />}>
      <ReportsContent />
    </Suspense>
  );
}

function ReportsContent() {
  const { user } = useAuth();
  const clientId = useActiveClientId();
  const clients = useClientOptions();
  const activeClient = clientId ? clients.find((c) => c.id === clientId) : null;

  const [days, setDays] = useState<ReportRangeDays>(DEFAULT_REPORT_RANGE_DAYS);
  const [showTrendTable, setShowTrendTable] = useState(false);
  const { report, loading, error, refresh } = useReports(days, clientId);


  const kpis = report?.kpis;

  const scopeLabel = user?.isClientUser
    ? user.clientName ?? "tu empresa"
    : activeClient
    ? activeClient.name
    : clientId
    ? "tu marca"
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
            {activeClient ? (
              <span className="text-[11px] font-semibold text-[#121417] dark:text-white bg-white dark:bg-[#121417] px-3 py-1 rounded-full border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
                Marca: <strong>{activeClient.name}</strong>
              </span>
            ) : !user?.isClientUser && !clientId ? (
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

      {error && (
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
          </div>
        </div>
      )}

      {!report && loading ? (
        <ReportSkeleton />
      ) : report && kpis ? (
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
                <LeadsTrendChart points={report.trend} showTable={showTrendTable} />
              )}
            </Panel>

            <Panel icon={KanbanSquare} title="Pipeline por etapa">
              {report.stages.some((stage) => stage.deals > 0) ? (
                <PipelineStageList stages={report.stages} />
              ) : (
                <EmptyState icon={KanbanSquare} title="Sin negocios abiertos" />
              )}
            </Panel>
          </div>

          <Panel icon={Megaphone} title="Desglose por canal de adquisición">
            {report.sources.length === 0 ? (
              <EmptyState icon={Megaphone} title="Sin leads en este período" />
            ) : (
              <SourceBreakdownTable rows={report.sources} />
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
