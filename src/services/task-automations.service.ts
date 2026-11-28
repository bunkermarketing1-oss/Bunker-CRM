import { prisma } from "@/lib/prisma";
import { clientBelongsToOrg } from "@/lib/validation-helpers";
import {
  AUTOMATION_ACTION,
  AUTOMATION_AUDIT_ACTION,
  AUTOMATION_TRIGGER,
  TASK_AUTOMATION_DEFAULTS,
  TASK_AUTOMATION_KIND,
  TASK_AUTOMATION_TRIGGER,
  type TaskAutomationKind,
} from "@/lib/constants/automations";
import {
  parseRuleJson,
  readOnboardingConfig,
  readStageFollowupConfig,
  readStaleReactivationConfig,
  serializeOnboardingConfig,
  serializeStageFollowupConfig,
  serializeStaleReactivationConfig,
} from "@/lib/automations/task-rules";
import { AutomationClientNotFoundError } from "@/services/automations.service";
import type { CreateTaskAutomationInput, UpdateTaskAutomationInput } from "@/lib/validations/task-automation";
import type { PipelineStageOption, TaskAutomationSummary } from "@/types/task-automations";

const TASK_TRIGGERS = Object.values(TASK_AUTOMATION_TRIGGER);

const ruleSelect = {
  id: true,
  name: true,
  clientId: true,
  triggerEvent: true,
  conditionJson: true,
  actionPayload: true,
  isActive: true,
  executionCount: true,
  lastRunAt: true,
  createdAt: true,
  client: { select: { name: true } },
} as const;

interface RuleRow {
  id: string;
  name: string;
  clientId: string | null;
  triggerEvent: string;
  conditionJson: string | null;
  actionPayload: string | null;
  isActive: boolean;
  executionCount: number;
  lastRunAt: Date | null;
  createdAt: Date;
  client: { name: string } | null;
}

const taskRuleWhere = (organizationId: string) => ({
  organizationId,
  actionType: AUTOMATION_ACTION.CREATE_TASKS,
  triggerEvent: { in: TASK_TRIGGERS },
});

function kindOf(triggerEvent: string): TaskAutomationKind | null {
  if (triggerEvent === AUTOMATION_TRIGGER.DEAL_WON) return TASK_AUTOMATION_KIND.ONBOARDING;
  if (triggerEvent === AUTOMATION_TRIGGER.STAGE_CHANGED) return TASK_AUTOMATION_KIND.STAGE_FOLLOWUP;
  if (triggerEvent === AUTOMATION_TRIGGER.STALE_LEADS_CHECK) return TASK_AUTOMATION_KIND.STALE_REACTIVATION;
  return null;
}

function toSummary(rule: RuleRow): TaskAutomationSummary | null {
  const base = {
    id: rule.id,
    name: rule.name,
    clientId: rule.clientId,
    clientName: rule.client?.name ?? null,
    isActive: rule.isActive,
    executionCount: rule.executionCount,
    lastRunAt: rule.lastRunAt?.toISOString() ?? null,
    createdAt: rule.createdAt.toISOString(),
  };
  const condition = parseRuleJson(rule.conditionJson);
  const payload = parseRuleJson(rule.actionPayload);

  switch (kindOf(rule.triggerEvent)) {
    case TASK_AUTOMATION_KIND.ONBOARDING:
      return { ...base, kind: TASK_AUTOMATION_KIND.ONBOARDING, config: readOnboardingConfig(payload, TASK_AUTOMATION_DEFAULTS) };
    case TASK_AUTOMATION_KIND.STAGE_FOLLOWUP:
      return {
        ...base,
        kind: TASK_AUTOMATION_KIND.STAGE_FOLLOWUP,
        config: readStageFollowupConfig(condition, payload, TASK_AUTOMATION_DEFAULTS),
      };
    case TASK_AUTOMATION_KIND.STALE_REACTIVATION:
      return {
        ...base,
        kind: TASK_AUTOMATION_KIND.STALE_REACTIVATION,
        config: readStaleReactivationConfig(condition, payload, TASK_AUTOMATION_DEFAULTS),
      };
    default:
      return null;
  }
}

/** Configuración final de la regla (lo guardado + los cambios), lista para guardar. */
function serializeConfig(current: TaskAutomationSummary | null, input: CreateTaskAutomationInput | UpdateTaskAutomationInput) {
  switch (input.kind) {
    case TASK_AUTOMATION_KIND.ONBOARDING: {
      const prev = current?.kind === input.kind ? current.config : null;
      return serializeOnboardingConfig({
        tasks: input.tasks ?? prev?.tasks ?? [...TASK_AUTOMATION_DEFAULTS.onboardingTasks],
        dueInDays: input.dueInDays ?? prev?.dueInDays ?? TASK_AUTOMATION_DEFAULTS.onboardingDueInDays,
      });
    }
    case TASK_AUTOMATION_KIND.STAGE_FOLLOWUP: {
      const prev = current?.kind === input.kind ? current.config : null;
      return serializeStageFollowupConfig({
        stageNameMatch: input.stageNameMatch ?? prev?.stageNameMatch ?? null,
        taskTitle: input.taskTitle ?? prev?.taskTitle ?? TASK_AUTOMATION_DEFAULTS.followupTaskTitle,
        hoursDue: input.hoursDue ?? prev?.hoursDue ?? TASK_AUTOMATION_DEFAULTS.followupHoursDue,
      });
    }
    case TASK_AUTOMATION_KIND.STALE_REACTIVATION: {
      const prev = current?.kind === input.kind ? current.config : null;
      return serializeStaleReactivationConfig({
        inactiveDays: input.inactiveDays ?? prev?.inactiveDays ?? TASK_AUTOMATION_DEFAULTS.staleInactiveDays,
        // `undefined` = no se tocó; `null` = el admin borró el mensaje.
        suggestedMessage: input.suggestedMessage !== undefined ? input.suggestedMessage : (prev?.suggestedMessage ?? null),
      });
    }
  }
}

async function audit(organizationId: string, userId: string, action: string, ruleId: string, details: object) {
  await prisma.auditLog.create({
    data: { organizationId, userId, action, entityType: "AutomationRule", entityId: ruleId, detailsJson: JSON.stringify(details) },
  });
}

/** Con una marca activa solo se devuelven sus reglas y las generales (sin marca), que también le aplican. */
export async function listTaskAutomations(organizationId: string, clientId?: string | null): Promise<TaskAutomationSummary[]> {
  const rules = await prisma.automationRule.findMany({
    where: { ...taskRuleWhere(organizationId), ...(clientId ? { OR: [{ clientId }, { clientId: null }] } : {}) },
    select: ruleSelect,
    orderBy: { createdAt: "desc" },
  });
  return rules.map(toSummary).filter((r): r is TaskAutomationSummary => r !== null);
}

/** Etapas del pipeline para elegir cuál dispara el seguimiento. */
export async function listPipelineStageOptions(organizationId: string): Promise<PipelineStageOption[]> {
  return prisma.pipelineStage.findMany({
    where: { organizationId },
    select: { id: true, name: true },
    orderBy: { order: "asc" },
  });
}

export async function createTaskAutomation(organizationId: string, userId: string, input: CreateTaskAutomationInput) {
  if (input.clientId && !(await clientBelongsToOrg(organizationId, input.clientId))) {
    throw new AutomationClientNotFoundError();
  }

  const rule = await prisma.automationRule.create({
    data: {
      organizationId,
      clientId: input.clientId,
      name: input.name,
      triggerEvent: TASK_AUTOMATION_TRIGGER[input.kind],
      actionType: AUTOMATION_ACTION.CREATE_TASKS,
      isActive: input.isActive,
      ...serializeConfig(null, input),
    },
    select: ruleSelect,
  });

  await audit(organizationId, userId, AUTOMATION_AUDIT_ACTION.CREATED, rule.id, {
    kind: input.kind,
    name: rule.name,
    clientId: rule.clientId,
  });
  return toSummary(rule);
}

/** Devuelve null si la regla no existe en la organización o es de otro tipo. */
export async function updateTaskAutomation(
  organizationId: string,
  userId: string,
  ruleId: string,
  input: UpdateTaskAutomationInput
) {
  const existing = await prisma.automationRule.findFirst({
    where: { id: ruleId, ...taskRuleWhere(organizationId), triggerEvent: TASK_AUTOMATION_TRIGGER[input.kind] },
    select: ruleSelect,
  });
  if (!existing) return null;

  if (input.clientId && !(await clientBelongsToOrg(organizationId, input.clientId))) {
    throw new AutomationClientNotFoundError();
  }

  const rule = await prisma.automationRule.update({
    where: { id: ruleId },
    data: {
      name: input.name,
      clientId: input.clientId,
      isActive: input.isActive,
      ...serializeConfig(toSummary(existing), input),
    },
    select: ruleSelect,
  });

  const changes = Object.keys(input).filter((key) => key !== "kind");
  await audit(organizationId, userId, AUTOMATION_AUDIT_ACTION.UPDATED, rule.id, { kind: input.kind, changes });
  return toSummary(rule);
}

/** Devuelve false si la regla no existe en la organización. */
export async function deleteTaskAutomation(organizationId: string, userId: string, ruleId: string) {
  const existing = await prisma.automationRule.findFirst({
    where: { id: ruleId, ...taskRuleWhere(organizationId) },
    select: { id: true, name: true, triggerEvent: true },
  });
  if (!existing) return false;

  await prisma.automationRule.delete({ where: { id: existing.id } });
  await audit(organizationId, userId, AUTOMATION_AUDIT_ACTION.DELETED, existing.id, {
    kind: kindOf(existing.triggerEvent),
    name: existing.name,
  });
  return true;
}
