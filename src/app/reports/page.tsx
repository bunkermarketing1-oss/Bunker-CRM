"use client";

import React, { useState, Suspense } from "react";
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
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const clients = useClientOptions();
  const activeClient = clientId && clientId !== "all" ? clients.find((c) => c.id === clientId) : null;

  const [days, setDays] = useState<ReportRangeDays>(DEFAULT_REPORT_RANGE_DAYS);
  const [showTrendTable, setShowTrendTable] = useState(false);
  const { report, loading, error, refresh } = useReports(days, clientId);
  const kpis = report?.kpis;

  const scopeLabel = user?.isClientUser
    ? user.clientName ?? "tu empresa"
    : activeClient
    ? activeClient.name
    : "toda la agencia";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAECF0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Analítica & Retorno
            </span>
            {activeClient ? (
              <span className="text-[11px] font-semibold text-[#101828] bg-[#F8F9FA] px-2.5 py-0.5 rounded-md border border-[#EAECF0] flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-amber-600" />
                Marca: <strong>{activeClient.name}</strong>
              </span>
            ) : !user?.isClientUser ? (
              <span className="text-[11px] text-[#667085] bg-[#F8F9FA] px-2 py-0.5 rounded-md border border-[#EAECF0]">
                Vista Global Agencia
              </span>
            ) : null}
          </div>
          <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">Reportes & ROI</h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Captación, conversión, velocidad de respuesta y retorno de la pauta de {scopeLabel}, calculados con los registros reales del CRM.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <RangeSelector value={days} onChange={setDays} />
          <button
            type="button"
            onClick={refresh}
            aria-label="Actualizar reporte"
            className="w-9 h-9 rounded-2xl bg-white border border-[#ECEAE3] flex items-center justify-center text-[#6B6861] hover:text-[#141414] shadow-2xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {!report && loading ? (
        <ReportSkeleton />
      ) : report && kpis ? (
        <div className={`space-y-6 transition-opacity ${loading ? "opacity-60" : ""}`}>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              emphasis
              icon={DollarSign}
              label="Ingresos ganados"
              value={formatCompactMoney(kpis.wonRevenue)}
              hint={`${formatNumber(kpis.wonDeals)} negocios · ticket promedio ${formatMoney(kpis.averageTicket)}`}
            />
            <StatCard
              icon={Users}
              label="Leads nuevos"
              value={formatNumber(kpis.newLeads)}
              hint={`${formatPercent(kpis.conversionRate)} ya convertidos`}
            />
            <StatCard
              icon={Clock}
              label="Primera respuesta"
              value={kpis.medianFirstResponseHours === null ? "—" : formatHours(kpis.medianFirstResponseHours)}
              hint={`Mediana · ${formatPercent(kpis.contactedRate)} de los leads tiene actividad`}
            />
            <StatCard
              icon={Target}
              label="Costo por lead"
              value={kpis.costPerLead === null ? "—" : formatMoney(kpis.costPerLead, kpis.adSpendCurrency ?? undefined)}
              hint={
                kpis.adSpend > 0
                  ? `Inversión ${kpis.adSpendCurrency ? formatCompactMoney(kpis.adSpend, kpis.adSpendCurrency) : formatNumber(Math.round(kpis.adSpend)) + " (monedas mixtas)"} / leads de pauta`
                  : "Sin inversión sincronizada en el período"
              }
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
                  className="text-[11px] font-semibold text-[#6B6861] hover:text-[#141414] underline-offset-4 hover:underline"
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

            <Panel icon={KanbanSquare} title="Pipeline abierto">
              <div className="flex items-baseline justify-between mb-5">
                <div>
                  <div className="text-2xl text-[#141414]">{formatCompactMoney(kpis.openPipelineValue)}</div>
                  <div className="text-[11px] text-[#6B6861]">valor total abierto</div>
                </div>
                <div className="text-right">
                  <div className="text-base text-[#9A7320] dark:text-[#E5C158]">{formatCompactMoney(kpis.weightedPipelineValue)}</div>
                  <div className="text-[11px] text-[#6B6861]">ponderado por probabilidad</div>
                </div>
              </div>
              {report.stages.some((stage) => stage.deals > 0) ? (
                <PipelineStageList stages={report.stages.filter((stage) => stage.deals > 0)} />
              ) : (
                <EmptyState icon={KanbanSquare} title="Sin negocios abiertos" />
              )}
            </Panel>
          </div>

          <Panel icon={Megaphone} title="Rendimiento por fuente de captación">
            {report.sources.length === 0 ? (
              <EmptyState icon={Megaphone} title="Sin leads en este período" />
            ) : (
              <SourceBreakdownTable rows={report.sources} />
            )}
          </Panel>

          <p className="text-[11px] text-[#9C988F] leading-relaxed">
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
          <div key={i} className="h-36 rounded-3xl bg-white border border-[#ECEAE3]" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 h-72 rounded-3xl bg-white border border-[#ECEAE3]" />
        <div className="h-72 rounded-3xl bg-white border border-[#ECEAE3]" />
      </div>
    </div>
  );
}
