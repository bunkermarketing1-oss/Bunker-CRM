"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useClientOptions } from "@/hooks/useClientOptions";
import Link from "next/link";
import {
  Activity,
  AlertCircle,
  CheckSquare,
  DollarSign,
  KanbanSquare,
  LineChart,
  Plug,
  Plus,
  Users,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import Panel, { PanelLink } from "@/components/ui/Panel";
import PipelineStageList from "@/components/reports/PipelineStageList";
import RecentLeadsList from "@/components/dashboard/RecentLeadsList";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import UpcomingTasks from "@/components/dashboard/UpcomingTasks";
import IntegrationStatusList from "@/components/dashboard/IntegrationStatusList";
import { useDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/lib/constants/routes";
import { formatCompactMoney, formatNumber, formatPercent } from "@/lib/format";

function DashboardPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const { dashboard, loading, error } = useDashboard(clientId);
  const clients = useClientOptions();
  const activeClient = clientId && clientId !== "all" ? clients.find((c) => c.id === clientId) : null;
  const [now] = useState(() => new Date());
  const isClient = Boolean(user?.isClientUser);
  const metrics = dashboard?.metrics;

  const today = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(now);
  const clientsHint =
    typeof metrics?.activeClients === "number"
      ? ` · ${formatNumber(metrics.activeClients)} clientes activos`
      : activeClient
      ? ` · Marca: ${activeClient.name}`
      : "";

  return (
    <div className="space-y-6">
      <PageHeader
        section={isClient ? "Portal" : "Inicio"}
        title={
          isClient
            ? `Resumen de ${user?.clientName ?? "tu empresa"}`
            : activeClient
            ? `Resumen de ${activeClient.name}`
            : "Dashboard General"
        }
        description={`${today.charAt(0).toUpperCase()}${today.slice(1)}${clientsHint}`}
        actions={
          <>
            <Link
              href={ROUTES.REPORTS}
              className="h-9 px-3.5 rounded-2xl bg-white border border-[#EAECF0] text-xs font-semibold text-[#101828] flex items-center gap-1.5 hover:bg-[#F8F9FA]"
            >
              <LineChart className="w-3.5 h-3.5 text-[#667085]" />
              Ver reportes
            </Link>
            <Link href={ROUTES.LEADS} className="btn-black-gold h-9 px-3.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              Registrar lead
            </Link>
          </>
        }
      />

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && !dashboard ? (
        <DashboardSkeleton />
      ) : dashboard && metrics ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              emphasis
              icon={DollarSign}
              label="Ingresos ganados"
              value={formatCompactMoney(metrics.wonRevenue)}
              hint={`${formatNumber(metrics.wonDealsCount)} negocios · ${formatPercent(metrics.winRate)} tasa de cierre`}
            />
            <StatCard
              icon={KanbanSquare}
              label="Pipeline abierto"
              value={formatCompactMoney(metrics.openPipelineValue)}
              hint={`${formatNumber(metrics.openDealsCount)} negocios en curso`}
            />
            <StatCard
              icon={Users}
              label="Leads"
              value={formatNumber(metrics.totalLeads)}
              hint={metrics.leadsThisWeek > 0 ? `+${formatNumber(metrics.leadsThisWeek)} en los últimos 7 días` : "Ninguno nuevo esta semana"}
            />
            <StatCard
              icon={CheckSquare}
              label="Tareas pendientes"
              value={formatNumber(metrics.pendingTasks)}
              hint={metrics.overdueTasks > 0 ? `${formatNumber(metrics.overdueTasks)} vencidas, revísalas primero` : "Nada vencido"}
            />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            <div className="xl:col-span-2 space-y-6">
              <Panel icon={Users} title="Leads recientes" action={<PanelLink href={ROUTES.LEADS}>Ver todos</PanelLink>}>
                {dashboard.recentLeads.length ? (
                  <RecentLeadsList leads={dashboard.recentLeads} />
                ) : (
                  <EmptyState
                    icon={Users}
                    title="Aún no hay leads"
                    description="Registra el primero o conecta una fuente de pauta para empezar a captar."
                  />
                )}
              </Panel>

              <Panel icon={KanbanSquare} title="Pipeline por etapa" action={<PanelLink href={ROUTES.PIPELINE}>Abrir pipeline</PanelLink>}>
                {dashboard.pipeline.some((stage) => stage.deals > 0) ? (
                  <PipelineStageList stages={dashboard.pipeline.filter((stage) => stage.deals > 0)} />
                ) : (
                  <EmptyState icon={KanbanSquare} title="Sin negocios abiertos" />
                )}
              </Panel>
            </div>

            <div className="space-y-6">
              <Panel icon={CheckSquare} title="Próximas tareas" action={<PanelLink href={ROUTES.TASKS}>Ver todas</PanelLink>}>
                {dashboard.upcomingTasks.length ? (
                  <UpcomingTasks tasks={dashboard.upcomingTasks} now={now} />
                ) : (
                  <EmptyState icon={CheckSquare} title="Todo al día" description="No hay tareas pendientes." />
                )}
              </Panel>

              <Panel icon={Activity} title="Actividad reciente" action={<PanelLink href={ROUTES.ACTIVITIES}>Historial</PanelLink>}>
                {dashboard.recentActivities.length ? (
                  <ActivityFeed activities={dashboard.recentActivities} />
                ) : (
                  <EmptyState icon={Activity} title="Sin actividad registrada" />
                )}
              </Panel>

              {!isClient && dashboard.integrations.length > 0 && (
                <Panel icon={Plug} title="Integraciones" action={<PanelLink href={ROUTES.INTEGRATIONS}>Gestionar</PanelLink>}>
                  <IntegrationStatusList integrations={dashboard.integrations} />
                </Panel>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando panel">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-36 rounded-3xl bg-white border border-[#EAECF0]" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 h-96 rounded-3xl bg-white border border-[#EAECF0]" />
        <div className="h-96 rounded-3xl bg-white border border-[#EAECF0]" />
      </div>
    </div>
  );
}
