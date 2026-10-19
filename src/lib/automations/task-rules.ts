/**
 * Lectura y escritura de la configuración de las reglas que crean tareas (onboarding,
 * seguimiento por etapa y reactivación de estancados). Solo imports de tipos a propósito:
 * lógica pura que se prueba directo con Node. Los valores por defecto viven en
 * `TASK_AUTOMATION_DEFAULTS` (`lib/constants/automations.ts`) y se pasan como argumento.
 *
 * Formato en `AutomationRule` (compatible con las reglas que ya existían):
 * - onboarding: actionPayload `{ tasks, dueInDays }`
 * - seguimiento: conditionJson `{ stageNameMatch }`, actionPayload `{ taskTitle, hoursDue }`
 * - estancados: conditionJson `{ inactiveDays }`, actionPayload `{ suggestedMessage }`
 */

import type {
  OnboardingRuleConfig,
  StageFollowupRuleConfig,
  StaleReactivationRuleConfig,
  TaskRuleDefaults,
} from "@/types/task-automations";

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

type JsonObject = Record<string, unknown>;

/** JSON guardado como texto; cualquier valor inválido se trata como objeto vacío. */
export function parseRuleJson(raw: string | null | undefined): JsonObject {
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as JsonObject) : {};
  } catch {
    return {};
  }
}

function nonNegativeInt(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 ? value : fallback;
}

function positiveNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

export function readOnboardingConfig(payload: JsonObject, defaults: TaskRuleDefaults): OnboardingRuleConfig {
  const titles = Array.isArray(payload.tasks)
    ? payload.tasks.map(nonEmptyString).filter((t): t is string => t !== null)
    : [];
  return {
    tasks: titles.length > 0 ? titles : [...defaults.onboardingTasks],
    dueInDays: nonNegativeInt(payload.dueInDays, defaults.onboardingDueInDays),
  };
}

export function readStageFollowupConfig(
  condition: JsonObject,
  payload: JsonObject,
  defaults: TaskRuleDefaults
): StageFollowupRuleConfig {
  return {
    stageNameMatch: nonEmptyString(condition.stageNameMatch),
    taskTitle: nonEmptyString(payload.taskTitle) ?? defaults.followupTaskTitle,
    hoursDue: positiveNumber(payload.hoursDue, defaults.followupHoursDue),
  };
}

export function readStaleReactivationConfig(
  condition: JsonObject,
  payload: JsonObject,
  defaults: TaskRuleDefaults
): StaleReactivationRuleConfig {
  return {
    inactiveDays: positiveNumber(condition.inactiveDays, defaults.staleInactiveDays),
    suggestedMessage: nonEmptyString(payload.suggestedMessage),
  };
}

export function serializeOnboardingConfig(config: OnboardingRuleConfig) {
  return { conditionJson: null, actionPayload: JSON.stringify({ tasks: config.tasks, dueInDays: config.dueInDays }) };
}

export function serializeStageFollowupConfig(config: StageFollowupRuleConfig) {
  return {
    conditionJson: config.stageNameMatch ? JSON.stringify({ stageNameMatch: config.stageNameMatch }) : null,
    actionPayload: JSON.stringify({ taskTitle: config.taskTitle, hoursDue: config.hoursDue }),
  };
}

export function serializeStaleReactivationConfig(config: StaleReactivationRuleConfig) {
  return {
    conditionJson: JSON.stringify({ inactiveDays: config.inactiveDays }),
    actionPayload: JSON.stringify({ suggestedMessage: config.suggestedMessage }),
  };
}

/** Minúsculas y sin tildes: "Negociación" debe coincidir con "negociacion". */
function normalizeForMatch(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

/** ¿La etapa a la que entró la oportunidad dispara la regla? Sin filtro, cualquier etapa. */
export function stageMatches(stageName: string | null | undefined, stageNameMatch: string | null) {
  if (!stageNameMatch) return true;
  return normalizeForMatch(stageName ?? "").includes(normalizeForMatch(stageNameMatch));
}

/**
 * Reglas que aplican a un registro de un cliente: si el cliente tiene reglas propias, solo
 * esas; si no, las generales (`clientId: null`). Así una regla personalizada reemplaza a la
 * general en vez de sumarse (mismo criterio que el SMS de bienvenida) y no se duplican
 * checklists ni seguimientos.
 */
export function pickRulesForClient<T extends { clientId: string | null }>(rules: T[], clientId: string | null): T[] {
  const own = clientId ? rules.filter((r) => r.clientId === clientId) : [];
  return own.length > 0 ? own : rules.filter((r) => r.clientId === null);
}

export function addDays(from: Date, days: number) {
  return new Date(from.getTime() + days * DAY_MS);
}

export function addHours(from: Date, hours: number) {
  return new Date(from.getTime() + hours * HOUR_MS);
}

/** Fecha límite: lo que no tuvo movimiento desde antes de este instante está estancado. */
export function staleCutoff(now: Date, inactiveDays: number) {
  return addDays(now, -inactiveDays);
}

/** Último contacto conocido de un lead: el más reciente entre las fechas que existan. */
export function lastTouchAt(dates: Array<Date | null | undefined>): Date | null {
  let latest: Date | null = null;
  for (const date of dates) {
    if (date && (!latest || date.getTime() > latest.getTime())) latest = date;
  }
  return latest;
}

export function daysSince(date: Date, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
}

/** Descripción de la tarea de reactivación, con el texto sugerido si la regla lo define. */
export function staleTaskDescription(params: { daysInactive: number; ruleName: string; suggestedMessage: string | null }) {
  const lines = [`Sin actividad comercial desde hace ${params.daysInactive} días. Regla: "${params.ruleName}".`];
  if (params.suggestedMessage) lines.push("", "Mensaje sugerido para retomar el contacto:", params.suggestedMessage);
  return lines.join("\n");
}
