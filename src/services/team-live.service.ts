import { prisma } from "@/lib/prisma";
import { isClientOwnerRole } from "@/lib/roles";
import { ACTIVITY_TYPE, TASK_STATUS } from "@/lib/constants/crm";
import { CALL_DIRECTION, LIVE_CALL_STATUSES } from "@/lib/constants/voice";
import { ADVISOR_IDLE_MINUTES, ADVISOR_STATUS, DEFAULT_TEAM_TIME_ZONE } from "@/lib/constants/team";
import { countByUser, elapsedSeconds, latestDate, resolveAdvisorStatus, startOfDayInTimeZone } from "@/lib/team-live";
import { listLiveCalls } from "@/services/calls.service";
import type { TenantScope } from "@/types/tenant";
import type { AdvisorCurrentCall, AdvisorLiveRow, TeamLiveView } from "@/types/team";

const IDLE_MS = ADVISOR_IDLE_MINUTES * 60 * 1000;
const STATUS_VALUES = { onCall: ADVISOR_STATUS.ON_CALL, available: ADVISOR_STATUS.AVAILABLE, idle: ADVISOR_STATUS.IDLE };

// Actividades que cuentan como "contactar" a un lead; una nota interna no es contacto.
const CONTACT_ACTIVITY_TYPES = [ACTIVITY_TYPE.CALL, ACTIVITY_TYPE.SMS, ACTIVITY_TYPE.EMAIL, ACTIVITY_TYPE.MEETING];

/** Usuarios de portal (asesores y dueños) del scope: los de un cliente o, para Bunker, todos. */
function listAdvisors(scope: TenantScope) {
  return prisma.user.findMany({
    where: {
      isActive: true,
      clientId: scope.clientId ?? { not: null },
      memberships: { some: { organizationId: scope.organizationId } },
    },
    select: { id: true, name: true, email: true, role: true, clientId: true, client: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
}

const sumMap = <T extends { userId: string | null }>(rows: T[], value: (row: T) => number) =>
  new Map(rows.filter((r) => r.userId).map((r) => [r.userId as string, value(r)]));

const dateMap = <T extends { userId: string | null }>(rows: T[], value: (row: T) => Date | null) =>
  new Map(rows.filter((r) => r.userId).map((r) => [r.userId as string, value(r)]));

/**
 * Agregados de hoy por asesor. Una consulta `groupBy` por métrica (no una por asesor), todas
 * filtradas por los ids del scope: `Activity` y `Task` no tienen `organizationId`, así que el
 * aislamiento sale de que solo se consultan usuarios ya filtrados por organización y cliente.
 */
async function dayAggregates(organizationId: string, userIds: string[], dayStart: Date) {
  const byUser = { in: userIds };
  const todayCalls = { organizationId, userId: byUser, createdAt: { gte: dayStart } };
  const todayActivities = { userId: byUser, createdAt: { gte: dayStart } };

  const [made, answered, talk, lastCall, sms, contacted, lastActivity, tasks] = await Promise.all([
    prisma.call.groupBy({ by: ["userId"], where: { ...todayCalls, direction: CALL_DIRECTION.OUTBOUND }, _count: { _all: true } }),
    prisma.call.groupBy({
      by: ["userId"],
      where: { ...todayCalls, direction: CALL_DIRECTION.OUTBOUND, answeredAt: { not: null } },
      _count: { _all: true },
    }),
    prisma.call.groupBy({ by: ["userId"], where: todayCalls, _sum: { durationSec: true } }),
    prisma.call.groupBy({ by: ["userId"], where: todayCalls, _max: { updatedAt: true } }),
    prisma.activity.groupBy({ by: ["userId"], where: { ...todayActivities, type: ACTIVITY_TYPE.SMS }, _count: { _all: true } }),
    prisma.activity.groupBy({
      by: ["userId", "leadId"],
      where: { ...todayActivities, leadId: { not: null }, type: { in: CONTACT_ACTIVITY_TYPES } },
    }),
    prisma.activity.groupBy({ by: ["userId"], where: todayActivities, _max: { createdAt: true } }),
    prisma.task.groupBy({
      by: ["userId"],
      where: { userId: byUser, status: TASK_STATUS.COMPLETED, completedAt: { gte: dayStart } },
      _count: { _all: true },
    }),
  ]);

  return {
    made: sumMap(made, (r) => r._count._all),
    answered: sumMap(answered, (r) => r._count._all),
    talk: sumMap(talk, (r) => r._sum.durationSec ?? 0),
    sms: sumMap(sms, (r) => r._count._all),
    contacted: countByUser(contacted),
    tasks: sumMap(tasks, (r) => r._count._all),
    lastCall: dateMap(lastCall, (r) => r._max.updatedAt),
    lastActivity: dateMap(lastActivity, (r) => r._max.createdAt),
  };
}

/** Llamada en curso de cada asesor (entrante o saliente); si tiene dos, la más reciente. */
async function currentCalls(organizationId: string, userIds: string[], now: Date) {
  const calls = await prisma.call.findMany({
    where: { organizationId, userId: { in: userIds }, status: { in: LIVE_CALL_STATUSES } },
    select: {
      id: true,
      userId: true,
      direction: true,
      toNumber: true,
      fromNumber: true,
      answeredAt: true,
      createdAt: true,
      lead: { select: { name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const byUser = new Map<string, AdvisorCurrentCall>();
  for (const call of calls) {
    if (!call.userId) continue;
    byUser.set(call.userId, {
      callId: call.id,
      leadName: call.lead?.name ?? null,
      counterpart: call.direction === CALL_DIRECTION.OUTBOUND ? call.toNumber : call.fromNumber,
      durationSec: elapsedSeconds(call.answeredAt ?? call.createdAt, now),
      answered: Boolean(call.answeredAt),
    });
  }
  return byUser;
}

/**
 * Vista en vivo del equipo comercial: estado y contadores de hoy por asesor, más las llamadas
 * que se pueden escuchar. El scope llega resuelto por la ruta (dueño = su cliente forzado).
 */
export async function getTeamLiveView(scope: TenantScope, now: Date = new Date()): Promise<TeamLiveView> {
  const timeZone = DEFAULT_TEAM_TIME_ZONE;
  const dayStart = startOfDayInTimeZone(now, timeZone);
  const advisors = await listAdvisors(scope);
  const userIds = advisors.map((a) => a.id);
  const base = { timeZone, dayStart: dayStart.toISOString(), generatedAt: now.toISOString() };
  if (!userIds.length) return { advisors: [], liveCalls: await listLiveCalls(scope), ...base };

  const [stats, live, liveCalls] = await Promise.all([
    dayAggregates(scope.organizationId, userIds, dayStart),
    currentCalls(scope.organizationId, userIds, now),
    listLiveCalls(scope),
  ]);

  const rows: AdvisorLiveRow[] = advisors.map((advisor) => {
    const lastActivityAt = latestDate(stats.lastActivity.get(advisor.id), stats.lastCall.get(advisor.id));
    const currentCall = live.get(advisor.id) ?? null;
    return {
      userId: advisor.id,
      name: advisor.name,
      email: advisor.email,
      clientId: advisor.clientId as string,
      clientName: advisor.client?.name ?? null,
      isOwner: isClientOwnerRole(advisor.role),
      status: resolveAdvisorStatus({ hasLiveCall: Boolean(currentCall), lastActivityAt, now, idleMs: IDLE_MS }, STATUS_VALUES),
      currentCall,
      today: {
        callsMade: stats.made.get(advisor.id) ?? 0,
        callsAnswered: stats.answered.get(advisor.id) ?? 0,
        talkTimeSec: stats.talk.get(advisor.id) ?? 0,
        smsSent: stats.sms.get(advisor.id) ?? 0,
        leadsContacted: stats.contacted.get(advisor.id) ?? 0,
        tasksCompleted: stats.tasks.get(advisor.id) ?? 0,
      },
      lastActivityAt: lastActivityAt?.toISOString() ?? null,
    };
  });

  return { advisors: rows, liveCalls, ...base };
}
