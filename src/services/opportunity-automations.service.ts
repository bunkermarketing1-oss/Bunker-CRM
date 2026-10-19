import { prisma } from "@/lib/prisma";
import {
  AUTOMATION_ACTION,
  AUTOMATION_AUDIT_ACTION,
  AUTOMATION_TRIGGER,
  ONBOARDING_TASK_PREFIX,
  STALE_LEADS_BATCH_SIZE,
  STALE_LEAD_TASK_PREFIX,
  TASK_AUTOMATION_DEFAULTS,
} from "@/lib/constants/automations";
import { LEAD_STATUS, TASK_PRIORITY, TASK_STATUS } from "@/lib/constants/crm";
import {
  addDays,
  addHours,
  daysSince,
  lastTouchAt,
  parseRuleJson,
  pickRulesForClient,
  readOnboardingConfig,
  readStageFollowupConfig,
  readStaleReactivationConfig,
  stageMatches,
  staleCutoff,
  staleTaskDescription,
} from "@/lib/automations/task-rules";
import type {
  OpportunityAutomationEvent,
  OpportunityAutomationInput,
  OpportunityAutomationResult,
  StaleLeadsCheckResult,
  StaleLeadsCronSummary,
} from "@/types/opportunity-automations";

const ruleSelect = { id: true, name: true, clientId: true, conditionJson: true, actionPayload: true } as const;

/** Reglas activas de crear tareas del trigger, de la organización. */
function findActiveTaskRules(organizationId: string, triggerEvent: string, clientId?: string | null) {
  return prisma.automationRule.findMany({
    where: {
      organizationId,
      triggerEvent,
      actionType: AUTOMATION_ACTION.CREATE_TASKS,
      isActive: true,
      ...(clientId !== undefined ? { OR: [{ clientId: null }, ...(clientId ? [{ clientId }] : [])] } : {}),
    },
    select: ruleSelect,
    orderBy: { createdAt: "asc" },
  });
}

/** Tareas que crea una regla para la oportunidad, o [] si la regla no aplica a este evento. */
function tasksForRule(
  event: OpportunityAutomationEvent,
  rule: { conditionJson: string | null; actionPayload: string | null },
  opportunity: OpportunityAutomationInput,
  now: Date
) {
  const condition = parseRuleJson(rule.conditionJson);
  const payload = parseRuleJson(rule.actionPayload);

  if (event === "deal_won") {
    const config = readOnboardingConfig(payload, TASK_AUTOMATION_DEFAULTS);
    return config.tasks.map((title) => ({
      title: `${ONBOARDING_TASK_PREFIX} ${title} (${opportunity.title})`,
      dueDate: addDays(now, config.dueInDays),
      priority: TASK_PRIORITY.HIGH,
    }));
  }

  const config = readStageFollowupConfig(condition, payload, TASK_AUTOMATION_DEFAULTS);
  if (!stageMatches(opportunity.stageName, config.stageNameMatch)) return [];
  return [
    {
      title: `${config.taskTitle}: ${opportunity.title}`,
      dueDate: addHours(now, config.hoursDue),
      priority: TASK_PRIORITY.MEDIUM,
    },
  ];
}

/**
 * Onboarding al cerrar ganado (crea el checklist de tareas) y seguimiento al cambiar de etapa
 * (una tarea). Solo corre con reglas creadas explícitamente: no hay reglas por defecto. Si el
 * cliente tiene reglas propias reemplazan a las generales (`pickRulesForClient`).
 */
export async function runOpportunityAutomations(params: {
  organizationId: string;
  userId: string | null;
  event: OpportunityAutomationEvent;
  opportunity: OpportunityAutomationInput;
}): Promise<OpportunityAutomationResult[]> {
  const { organizationId, userId, event, opportunity } = params;
  const trigger = event === "deal_won" ? AUTOMATION_TRIGGER.DEAL_WON : AUTOMATION_TRIGGER.STAGE_CHANGED;
  const now = new Date();

  const candidates = (await findActiveTaskRules(organizationId, trigger, opportunity.clientId))
    .map((rule) => ({ ...rule, tasks: tasksForRule(event, rule, opportunity, now) }))
    .filter((rule) => rule.tasks.length > 0);
  const rules = pickRulesForClient(candidates, opportunity.clientId);
  const results: OpportunityAutomationResult[] = [];

  for (const rule of rules) {
    await prisma.$transaction([
      prisma.task.createMany({
        data: rule.tasks.map((task) => ({
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
        data: { executionCount: { increment: 1 }, lastRunAt: now },
      }),
      prisma.auditLog.create({
        data: {
          organizationId,
          userId,
          action: AUTOMATION_AUDIT_ACTION.TASKS_CREATED,
          entityType: "Opportunity",
          entityId: opportunity.id,
          detailsJson: JSON.stringify({ ruleId: rule.id, event, tasksCount: rule.tasks.length }),
        },
      }),
    ]);

    results.push({ ruleId: rule.id, ruleName: rule.name, tasksCreated: rule.tasks.length });
  }

  return results;
}

const OPEN_LEAD_STATUSES = [LEAD_STATUS.NEW, LEAD_STATUS.CONTACTED, LEAD_STATUS.QUALIFIED];

/**
 * Filtro de leads de una regla: la de un cliente solo mira sus leads; la general mira el resto,
 * sin los clientes que tienen su propia regla (si no, sus leads tendrían dos umbrales). El
 * `OR` con `clientId: null` es necesario porque `NOT IN` en SQL deja fuera los nulos.
 */
function leadClientFilter(ruleClientId: string | null, clientsWithOwnRule: string[]) {
  if (ruleClientId) return { clientId: ruleClientId };
  if (clientsWithOwnRule.length === 0) return {};
  return { OR: [{ clientId: null }, { clientId: { notIn: clientsWithOwnRule } }] };
}

/**
 * Un lead está estancado si en N días no tuvo Activity, Message ni Call, y además su fila no
 * cambió (`updatedAt`): editar el estado o las notas también cuenta como trabajo del asesor.
 * Todo va en una sola consulta con filtros de relación `none`; el `take: 1` de cada relación
 * solo sirve para calcular hace cuántos días fue el último contacto.
 */
function findStaleLeads(organizationId: string, cutoff: Date, clientFilter: object) {
  return prisma.lead.findMany({
    where: {
      organizationId,
      isDeleted: false,
      status: { in: OPEN_LEAD_STATUSES },
      updatedAt: { lte: cutoff },
      ...clientFilter,
      tasks: { none: { status: TASK_STATUS.PENDING, title: { startsWith: STALE_LEAD_TASK_PREFIX } } },
      // performedAt o createdAt: una actividad registrada hoy con fecha pasada también es trabajo reciente.
      activities: { none: { OR: [{ performedAt: { gt: cutoff } }, { createdAt: { gt: cutoff } }] } },
      messages: { none: { createdAt: { gt: cutoff } } },
      calls: { none: { createdAt: { gt: cutoff } } },
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
      clientId: true,
      updatedAt: true,
      activities: { select: { performedAt: true }, orderBy: { performedAt: "desc" }, take: 1 },
      messages: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
      calls: { select: { createdAt: true }, orderBy: { createdAt: "desc" }, take: 1 },
    },
    orderBy: { updatedAt: "asc" },
    take: STALE_LEADS_BATCH_SIZE,
  });
}

/**
 * Crea una tarea de reactivación por cada lead abierto sin actividad en N días, con el mensaje
 * sugerido de la regla en la descripción. No envía SMS: ver
 * docs/plan-automations-reactivation-onboarding.md (consentimiento y spam).
 * Recorre primero los más antiguos y salta los que ya tienen una tarea pendiente, para que en
 * cada barrido avance la cola en lugar de revisar siempre los mismos leads.
 */
export async function runStaleLeadsCheck(organizationId: string, userId: string | null): Promise<StaleLeadsCheckResult> {
  const rules = await findActiveTaskRules(organizationId, AUTOMATION_TRIGGER.STALE_LEADS_CHECK);
  const clientsWithOwnRule = Array.from(new Set(rules.map((r) => r.clientId).filter((id): id is string => id !== null)));
  const result: StaleLeadsCheckResult = { rulesEvaluated: rules.length, leadsAnalyzed: 0, tasksCreated: 0, details: [] };
  const now = new Date();

  for (const rule of rules) {
    const config = readStaleReactivationConfig(
      parseRuleJson(rule.conditionJson),
      parseRuleJson(rule.actionPayload),
      TASK_AUTOMATION_DEFAULTS
    );
    const leads = await findStaleLeads(
      organizationId,
      staleCutoff(now, config.inactiveDays),
      leadClientFilter(rule.clientId, clientsWithOwnRule)
    );
    result.leadsAnalyzed += leads.length;

    for (const lead of leads) {
      const lastTouch =
        lastTouchAt([lead.updatedAt, lead.activities[0]?.performedAt, lead.messages[0]?.createdAt, lead.calls[0]?.createdAt]) ??
        lead.updatedAt;
      const daysInactive = daysSince(lastTouch, now);
      const task = await prisma.task.create({
        data: {
          title: `${STALE_LEAD_TASK_PREFIX}: ${lead.name}`,
          description: staleTaskDescription({ daysInactive, ruleName: rule.name, suggestedMessage: config.suggestedMessage }),
          dueDate: addDays(now, 1),
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
        data: { executionCount: { increment: leads.length }, lastRunAt: now },
      });
    }
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action: AUTOMATION_AUDIT_ACTION.STALE_CHECK_EXECUTED,
      entityType: "AutomationRule",
      detailsJson: JSON.stringify({
        rules: rules.length,
        leadsAnalyzed: result.leadsAnalyzed,
        tasksCreated: result.tasksCreated,
        trigger: userId ? "manual" : "cron",
      }),
    },
  });

  return result;
}

/**
 * Barrido programado: corre `runStaleLeadsCheck` en cada organización con alguna regla de
 * estancados activa. Una organización que falla no detiene a las demás.
 */
export async function runStaleLeadsCheckForAllOrganizations(): Promise<StaleLeadsCronSummary> {
  const orgs = await prisma.automationRule.findMany({
    where: {
      triggerEvent: AUTOMATION_TRIGGER.STALE_LEADS_CHECK,
      actionType: AUTOMATION_ACTION.CREATE_TASKS,
      isActive: true,
    },
    select: { organizationId: true },
    distinct: ["organizationId"],
  });

  const summary: StaleLeadsCronSummary = { organizations: orgs.length, tasksCreated: 0, errors: [] };
  for (const { organizationId } of orgs) {
    try {
      const result = await runStaleLeadsCheck(organizationId, null);
      summary.tasksCreated += result.tasksCreated;
    } catch (error) {
      console.error(`Barrido de estancados falló (${organizationId}):`, error);
      // El detalle queda en el log del servidor; la respuesta no expone errores de Prisma.
      summary.errors.push({ organizationId, error: "No se pudo completar el barrido de esta organización." });
    }
  }
  return summary;
}
