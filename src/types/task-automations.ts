import type { TaskAutomationKind } from "@/lib/constants/automations";

/** Checklist que se crea al cerrar una oportunidad como ganada. */
export interface OnboardingRuleConfig {
  tasks: string[];
  /** Días hasta el vencimiento de cada tarea (0 = vence hoy). */
  dueInDays: number;
}

/** Tarea que se crea cuando una oportunidad entra a una etapa cuyo nombre coincide. */
export interface StageFollowupRuleConfig {
  /** Texto que debe contener el nombre de la etapa; null = cualquier etapa. */
  stageNameMatch: string | null;
  taskTitle: string;
  hoursDue: number;
}

/** Tarea de reactivación para leads abiertos sin actividad en N días. */
export interface StaleReactivationRuleConfig {
  inactiveDays: number;
  /** Texto sugerido que el asesor puede usar al retomar el contacto; no se envía solo. */
  suggestedMessage: string | null;
}

export interface TaskRuleDefaults {
  onboardingTasks: string[];
  onboardingDueInDays: number;
  followupTaskTitle: string;
  followupHoursDue: number;
  staleInactiveDays: number;
}

interface TaskAutomationBase {
  id: string;
  name: string;
  clientId: string | null;
  clientName: string | null;
  isActive: boolean;
  executionCount: number;
  lastRunAt: string | null;
  createdAt: string;
}

export interface OnboardingAutomationSummary extends TaskAutomationBase {
  kind: Extract<TaskAutomationKind, "onboarding">;
  config: OnboardingRuleConfig;
}

export interface StageFollowupAutomationSummary extends TaskAutomationBase {
  kind: Extract<TaskAutomationKind, "stage_followup">;
  config: StageFollowupRuleConfig;
}

export interface StaleReactivationAutomationSummary extends TaskAutomationBase {
  kind: Extract<TaskAutomationKind, "stale_reactivation">;
  config: StaleReactivationRuleConfig;
}

/** Regla que crea tareas, tal como la ve la pantalla de Automatizaciones. */
export type TaskAutomationSummary =
  | OnboardingAutomationSummary
  | StageFollowupAutomationSummary
  | StaleReactivationAutomationSummary;

/** Etapa del pipeline de la organización, para elegir el disparador del seguimiento. */
export interface PipelineStageOption {
  id: string;
  name: string;
}

interface TaskAutomationDraftBase {
  name: string;
  clientId: string | null;
  isActive: boolean;
}

/** Datos que envía el formulario de una regla de tareas (mismo formato que acepta la API). */
export type TaskAutomationDraft =
  | (TaskAutomationDraftBase & { kind: OnboardingAutomationSummary["kind"] } & OnboardingRuleConfig)
  | (TaskAutomationDraftBase & { kind: StageFollowupAutomationSummary["kind"]; stageNameMatch: string } & Omit<StageFollowupRuleConfig, "stageNameMatch">)
  | (TaskAutomationDraftBase & { kind: StaleReactivationAutomationSummary["kind"] } & StaleReactivationRuleConfig);

export interface TaskAutomationsResponse {
  success: true;
  automations: TaskAutomationSummary[];
  stages: PipelineStageOption[];
}
