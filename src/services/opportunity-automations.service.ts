import { prisma } from "@/lib/prisma";
import {
  AUTOMATION_TRIGGER,
  DEFAULT_STALE_DAYS_THRESHOLD,
  STALE_LEADS_BATCH_SIZE,
  STALE_LEAD_TASK_PREFIX,
} from "@/lib/constants/automations";
import { LEAD_STATUS, TASK_PRIORITY, TASK_STATUS } from "@/lib/constants/crm";
import type {
  OpportunityAutomationEvent,
  OpportunityAutomationInput,
  OpportunityAutomationResult,
  StaleLeadsCheckResult,
} from "@/types/opportunity-automations";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_ONBOARDING_TASKS = [
  "Reunión de kickoff estratégico con el cliente",
  "Configuración de accesos y portafolio Meta Ads",
  "Checklist de pauta inicial y metas de conversión",
];
const DEFAULT_FOLLOWUP_HOURS = 48;

function parseJson(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function onboardingTasksFrom(payload: Record<string, unknown>): string[] {
  const tasks = payload.tasks;
  if (!Array.isArray(tasks)) return DEFAULT_ONBOARDING_TASKS;
  const titles = tasks.filter((t): t is string => typeof t === "string" && t.trim() !== "");
  return titles.length > 0 ? titles : DEFAULT_ONBOARDING_TASKS;
}

/** Reglas activas del evento que aplican al cliente de la oportunidad (o a todos). */
function findActiveRules(organizationId: string, triggerEvent: string, clientId: string | null) {
  return prisma.automationRule.findMany({
    where: {
      organizationId,
      triggerEvent,
      isActive: true,
      OR: [{ clientId: null }, ...(clientId ? [{ clientId }] : [])],
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Onboarding al cerrar ganado (crea el checklist de tareas) y seguimiento al cambiar de etapa
 * (una tarea de llamada). Solo corre con reglas creadas explícitamente: no hay reglas por defecto.
 */
export async function runOpportunityAutomations(params: {
  organizationId: string;
  userId: string | null;
  event: OpportunityAutomationEvent;
  opportunity: OpportunityAutomationInput;
}): Promise<OpportunityAutomationResult[]> {
  const { organizationId, userId, event, opportunity } = params;
  const trigger = event === "deal_won" ? AUTOMATION_TRIGGER.DEAL_WON : AUTOMATION_TRIGGER.STAGE_CHANGED;
  const rules = await findActiveRules(organizationId, trigger, opportunity.clientId);
  const results: OpportunityAutomationResult[] = [];

  for (const rule of rules) {
    const condition = parseJson(rule.conditionJson);
    const payload = parseJson(rule.actionPayload);

    if (event === "stage_changed" && typeof condition.stageNameMatch === "string") {
      const stageName = (opportunity.stageName ?? "").toLowerCase();
      if (!stageName.includes(condition.stageNameMatch.toLowerCase())) continue;
    }

    const tasks =
      event === "deal_won"
        ? onboardingTasksFrom(payload).map((title) => ({
            title: `[Onboarding] ${title} (${opportunity.title})`,
            dueDate: new Date(Date.now() + DAY_MS),
            priority: TASK_PRIORITY.HIGH,
          }))
        : [
            {
              title: `Llamada de seguimiento: ${opportunity.title}`,
              dueDate: new Date(
                Date.now() +
                  (typeof payload.hoursDue === "number" ? payload.hoursDue : DEFAULT_FOLLOWUP_HOURS) * 60 * 60 * 1000
              ),
              priority: TASK_PRIORITY.MEDIUM,
            },
          ];

    await prisma.$transaction([
      prisma.task.createMany({
        data: tasks.map((task) => ({
          ...task,
          description: `Generada por la automatización "${rule.name}".`,
          status: TASK_STATUS.PENDING,
          clientId: opportunity.clientId,
          leadId: opportunity.leadId,
          opportunityId: opportunity.id,
          userId: opportunity.ownerId ?? userId,
        })),
      }),
      prisma.automationRule.update({
        where: { id: rule.id },
        data: { executionCount: { increment: 1 }, lastRunAt: new Date() },
      }),
      prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: "automation_tasks_created",
          entityType: "Opportunity",
          entityId: opportunity.id,
          detailsJson: JSON.stringify({ ruleId: rule.id, event, tasksCount: tasks.length }),
        },
      }),
    ]);

    results.push({ ruleId: rule.id, ruleName: rule.name, tasksCreated: tasks.length });
  }

  return results;
}

/**
 * Crea una tarea de reactivación por cada lead abierto sin actividad en N días.
 * Recorre primero los más antiguos y salta los que ya tienen una tarea pendiente, para que en
 * cada barrido avance la cola en lugar de revisar siempre los mismos leads.
 */
export async function runStaleLeadsCheck(organizationId: string, userId: string | null): Promise<StaleLeadsCheckResult> {
  const rules = await prisma.automationRule.findMany({
    where: { organizationId, triggerEvent: AUTOMATION_TRIGGER.STALE_LEADS_CHECK, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  const result: StaleLeadsCheckResult = { leadsAnalyzed: 0, tasksCreated: 0, details: [] };

  for (const rule of rules) {
    const condition = parseJson(rule.conditionJson);
    const thresholdDays =
      typeof condition.inactiveDays === "number" && condition.inactiveDays > 0
        ? condition.inactiveDays
        : DEFAULT_STALE_DAYS_THRESHOLD;
    const cutoff = new Date(Date.now() - thresholdDays * DAY_MS);

    const leads = await prisma.lead.findMany({
      where: {
        organizationId,
        isDeleted: false,
        status: { in: [LEAD_STATUS.NEW, LEAD_STATUS.CONTACTED, LEAD_STATUS.QUALIFIED] },
        updatedAt: { lte: cutoff },
        ...(rule.clientId ? { clientId: rule.clientId } : {}),
        tasks: { none: { status: TASK_STATUS.PENDING, title: { startsWith: STALE_LEAD_TASK_PREFIX } } },
      },
      select: { id: true, name: true, ownerId: true, clientId: true, updatedAt: true },
      orderBy: { updatedAt: "asc" },
      take: STALE_LEADS_BATCH_SIZE,
    });
    result.leadsAnalyzed += leads.length;

    for (const lead of leads) {
      const daysInactive = Math.floor((Date.now() - lead.updatedAt.getTime()) / DAY_MS);
      const task = await prisma.task.create({
        data: {
          title: `${STALE_LEAD_TASK_PREFIX}: ${lead.name}`,
          description: `Sin actividad comercial desde hace ${daysInactive} días. Regla: "${rule.name}".`,
          dueDate: new Date(Date.now() + DAY_MS),
          priority: TASK_PRIORITY.HIGH,
          status: TASK_STATUS.PENDING,
          leadId: lead.id,
          clientId: lead.clientId,
          userId: lead.ownerId ?? userId,
        },
        select: { id: true },
      });
      result.tasksCreated++;
      result.details.push({ leadId: lead.id, leadName: lead.name, daysInactive, taskId: task.id });
    }

    if (leads.length > 0) {
      await prisma.automationRule.update({
        where: { id: rule.id },
        data: { executionCount: { increment: leads.length }, lastRunAt: new Date() },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action: "automation_stale_leads_check_executed",
      entityType: "AutomationRule",
      detailsJson: JSON.stringify({ rules: rules.length, leadsAnalyzed: result.leadsAnalyzed, tasksCreated: result.tasksCreated }),
    },
  });

  return result;
}
