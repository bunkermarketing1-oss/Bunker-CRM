import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CLIENT_STATUS, OPPORTUNITY_STATUS, TASK_STATUS } from "@/lib/constants/crm";
import { groupOpenDealsByStage, percentage } from "@/lib/reports";
import type { DashboardData } from "@/types/dashboard";
import type { TenantScope } from "@/types/tenant";

const DAY_MS = 24 * 60 * 60 * 1000;
const RECENT_LEADS = 6;
const RECENT_ACTIVITIES = 6;
const UPCOMING_TASKS = 5;

/**
 * Tareas y actividades no tienen organizationId: para el admin se limitan a las que cuelgan de
 * un cliente, lead o usuario de su organización; para un CLIENT, a las de su empresa.
 */
function relatedToTenant(scope: TenantScope): Prisma.TaskWhereInput & Prisma.ActivityWhereInput {
  if (scope.clientId) return { clientId: scope.clientId };
  return {
    OR: [
      { client: { organizationId: scope.organizationId } },
      { lead: { organizationId: scope.organizationId } },
      { user: { memberships: { some: { organizationId: scope.organizationId } } } },
    ],
  };
}

function relatedName(row: { lead: { name: string } | null; client: { name: string } | null }): string | null {
  return row.lead?.name ?? row.client?.name ?? null;
}

export async function getDashboard(scope: TenantScope): Promise<DashboardData> {
  const now = new Date();
  const clientFilter = scope.clientId ? { clientId: scope.clientId } : {};
  const leadWhere = { organizationId: scope.organizationId, isDeleted: false, ...clientFilter };
  const opportunityWhere = { organizationId: scope.organizationId, isDeleted: false, ...clientFilter };
  const pendingTaskWhere = { status: TASK_STATUS.PENDING, ...relatedToTenant(scope) };

  const [
    totalLeads,
    leadsThisWeek,
    activeClients,
    dealsByStatus,
    openDeals,
    stages,
    pendingTasks,
    overdueTasks,
    upcomingTasks,
    recentActivities,
    recentLeads,
    integrations,
  ] = await Promise.all([
    prisma.lead.count({ where: leadWhere }),
    prisma.lead.count({ where: { ...leadWhere, createdAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } } }),
    scope.clientId
      ? Promise.resolve(null)
      : prisma.client.count({ where: { organizationId: scope.organizationId, isDeleted: false, status: CLIENT_STATUS.ACTIVE } }),
    prisma.opportunity.groupBy({
      by: ["status"],
      where: opportunityWhere,
      _count: { _all: true },
      _sum: { value: true },
    }),
    prisma.opportunity.findMany({
      where: { ...opportunityWhere, status: OPPORTUNITY_STATUS.OPEN },
      select: { stageId: true, value: true },
    }),
    prisma.pipelineStage.findMany({
      where: { organizationId: scope.organizationId },
      select: { id: true, name: true, color: true },
      orderBy: { order: "asc" },
    }),
    prisma.task.count({ where: pendingTaskWhere }),
    prisma.task.count({ where: { ...pendingTaskWhere, dueDate: { lt: now } } }),
    prisma.task.findMany({
      where: pendingTaskWhere,
      // Primero lo que vence antes; las tareas sin fecha van al final.
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take: UPCOMING_TASKS,
      select: {
        id: true,
        title: true,
        priority: true,
        dueDate: true,
        lead: { select: { name: true } },
        client: { select: { name: true } },
      },
    }),
    prisma.activity.findMany({
      where: relatedToTenant(scope),
      orderBy: { performedAt: "desc" },
      take: RECENT_ACTIVITIES,
      select: {
        id: true,
        type: true,
        title: true,
        performedAt: true,
        user: { select: { name: true } },
        lead: { select: { name: true } },
        client: { select: { name: true } },
      },
    }),
    prisma.lead.findMany({
      where: leadWhere,
      orderBy: { createdAt: "desc" },
      take: RECENT_LEADS,
      select: { id: true, name: true, companyName: true, email: true, phone: true, avatarUrl: true, source: true, status: true, createdAt: true },
    }),
    scope.clientId
      ? Promise.resolve([])
      : prisma.integration.findMany({
          where: { organizationId: scope.organizationId },
          select: { id: true, provider: true, name: true, status: true, lastSyncAt: true },
          orderBy: { name: "asc" },
        }),
  ]);

  const byStatus = (status: string) => dealsByStatus.find((row) => row.status === status);
  const won = byStatus(OPPORTUNITY_STATUS.WON);
  const lost = byStatus(OPPORTUNITY_STATUS.LOST);
  const wonCount = won?._count._all ?? 0;
  const lostCount = lost?._count._all ?? 0;

  return {
    metrics: {
      totalLeads,
      leadsThisWeek,
      activeClients,
      openDealsCount: openDeals.length,
      openPipelineValue: openDeals.reduce((sum, deal) => sum + deal.value, 0),
      wonDealsCount: wonCount,
      wonRevenue: won?._sum.value ?? 0,
      winRate: percentage(wonCount, wonCount + lostCount),
      pendingTasks,
      overdueTasks,
    },
    pipeline: groupOpenDealsByStage(stages, openDeals),
    recentLeads: recentLeads.map((lead) => ({ ...lead, createdAt: lead.createdAt.toISOString() })),
    recentActivities: recentActivities.map((activity) => ({
      id: activity.id,
      type: activity.type,
      title: activity.title,
      performedAt: activity.performedAt.toISOString(),
      userName: activity.user?.name ?? null,
      relatedName: relatedName(activity),
    })),
    upcomingTasks: upcomingTasks.map((task) => ({
      id: task.id,
      title: task.title,
      priority: task.priority,
      dueDate: task.dueDate?.toISOString() ?? null,
      relatedName: relatedName(task),
    })),
    integrations: integrations.map((integration) => ({
      ...integration,
      lastSyncAt: integration.lastSyncAt?.toISOString() ?? null,
    })),
  };
}
