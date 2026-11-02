"use client";

import React from "react";
import {
  Activity,
  CheckSquare,
  DollarSign,
  KanbanSquare,
  Plug,
  Users,
} from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import Panel, { PanelLink } from "@/components/ui/Panel";
import EmptyState from "@/components/ui/EmptyState";
import RecentLeadsList from "@/components/dashboard/RecentLeadsList";
import PipelineStageList from "@/components/reports/PipelineStageList";
import UpcomingTasks from "@/components/dashboard/UpcomingTasks";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import IntegrationStatusList from "@/components/dashboard/IntegrationStatusList";
import { ROUTES } from "@/lib/constants/routes";
import { formatCompactMoney, formatNumber, formatPercent } from "@/lib/format";
import type { DashboardData, DashboardMetrics } from "@/types/dashboard";

interface IndividualBrandDashboardProps {
  metrics: DashboardMetrics;
  dashboard: DashboardData;
  activeClientId?: string;
  isClient: boolean;
  now: Date;
}

export default function IndividualBrandDashboard({
  metrics,
  dashboard,
  activeClientId,
  isClient,
  now,
}: IndividualBrandDashboardProps) {
  const leadsLink = activeClientId ? `${ROUTES.LEADS}?clientId=${activeClientId}` : ROUTES.LEADS;
  const pipelineLink = activeClientId ? `${ROUTES.PIPELINE}?clientId=${activeClientId}` : ROUTES.PIPELINE;
  const tasksLink = activeClientId ? `${ROUTES.TASKS}?clientId=${activeClientId}` : ROUTES.TASKS;
  const activitiesLink = activeClientId ? `${ROUTES.ACTIVITIES}?clientId=${activeClientId}` : ROUTES.ACTIVITIES;

  return (
    <div className="space-y-6">
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
          hint={
            metrics.leadsThisWeek > 0
              ? `+${formatNumber(metrics.leadsThisWeek)} en los últimos 7 días`
              : "Ninguno nuevo esta semana"
          }
        />
        <StatCard
          icon={CheckSquare}
          label="Tareas pendientes"
          value={formatNumber(metrics.pendingTasks)}
          hint={
            metrics.overdueTasks > 0
              ? `${formatNumber(metrics.overdueTasks)} vencidas, revísalas primero`
              : "Nada vencido"
          }
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        <div className="xl:col-span-2 space-y-6">
          <Panel
            icon={Users}
            title="Leads recientes"
            action={<PanelLink href={leadsLink}>Ver todos</PanelLink>}
          >
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

          <Panel
            icon={KanbanSquare}
            title="Pipeline por etapa"
            action={<PanelLink href={pipelineLink}>Abrir pipeline</PanelLink>}
          >
            {dashboard.pipeline.some((stage) => stage.deals > 0) ? (
              <PipelineStageList stages={dashboard.pipeline.filter((stage) => stage.deals > 0)} />
            ) : (
              <EmptyState icon={KanbanSquare} title="Sin negocios abiertos" />
            )}
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel
            icon={CheckSquare}
            title="Próximas tareas"
            action={<PanelLink href={tasksLink}>Ver todas</PanelLink>}
          >
            {dashboard.upcomingTasks.length ? (
              <UpcomingTasks tasks={dashboard.upcomingTasks} now={now} />
            ) : (
              <EmptyState icon={CheckSquare} title="Todo al día" description="No hay tareas pendientes." />
            )}
          </Panel>

          <Panel
            icon={Activity}
            title="Actividad reciente"
            action={<PanelLink href={activitiesLink}>Historial</PanelLink>}
          >
            {dashboard.recentActivities.length ? (
              <ActivityFeed activities={dashboard.recentActivities} />
            ) : (
              <EmptyState icon={Activity} title="Sin actividad registrada" />
            )}
          </Panel>

          {dashboard.integrations.length > 0 && (
            <Panel
              icon={Plug}
              title={activeClientId || isClient ? "Cuentas y Activos Conectados" : "Integraciones Oficiales"}
              action={!isClient ? <PanelLink href={ROUTES.INTEGRATIONS}>Gestionar</PanelLink> : undefined}
            >
              <IntegrationStatusList integrations={dashboard.integrations} />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

