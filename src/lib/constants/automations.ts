/** Valores de dominio de automatizaciones (`AutomationRule`), guardados como texto en la base. */

type ValueOf<T> = T[keyof T];

export const AUTOMATION_TRIGGER = {
  LEAD_CREATED: "lead_created",
  STAGE_CHANGED: "stage_changed",
  DEAL_WON: "deal_won",
  STALE_LEADS_CHECK: "stale_leads_check",
} as const;
export type AutomationTrigger = ValueOf<typeof AUTOMATION_TRIGGER>;

export const AUTOMATION_ACTION = {
  SEND_SMS: "send_sms",
  CREATE_TASKS: "create_tasks",
} as const;
export type AutomationAction = ValueOf<typeof AUTOMATION_ACTION>;

export const AUTOMATION_TRIGGER_LABEL: Record<AutomationTrigger, string> = {
  lead_created: "Lead nuevo recibido",
  stage_changed: "Oportunidad cambia de etapa",
  deal_won: "Negocio cerrado como ganado",
  stale_leads_check: "Lead sin actividad",
};

export const AUTOMATION_ACTION_LABEL: Record<AutomationAction, string> = {
  send_sms: "Enviar SMS al lead",
  create_tasks: "Crear tareas",
};

/** Días sin actividad para considerar un lead estancado, si la regla no define otro valor. */
export const DEFAULT_STALE_DAYS_THRESHOLD = 14;

/** Tope de leads por barrido de estancados, para que una ejecución no cree cientos de tareas. */
export const STALE_LEADS_BATCH_SIZE = 100;

/** Prefijo de las tareas de reactivación: identifica las pendientes y evita duplicarlas. */
export const STALE_LEAD_TASK_PREFIX = "Reactivación de prospecto estancado";

/**
 * Ventana en la que no se repite el SMS automático a un mismo teléfono: quien llena dos
 * formularios (o el mismo dos veces) en un día recibe un solo mensaje.
 */
export const LEAD_SMS_DEDUPE_WINDOW_HOURS = 24;

/** Variables que acepta la plantilla de SMS: `{{nombre}}` → valor. */
export const SMS_TEMPLATE_VARIABLES = {
  nombre: "Primer nombre del lead",
  nombre_completo: "Nombre completo del lead",
  cliente: "Nombre del cliente (p. ej. Carrito Naranja)",
  campana: "Campaña de Meta que generó el lead",
} as const;
export type SmsTemplateVariable = keyof typeof SMS_TEMPLATE_VARIABLES;

/**
 * Reglas que crean tareas, tal como las ve la pantalla de Automatizaciones. Cada tipo es una
 * combinación fija de trigger + acción `create_tasks`; el tipo no se guarda en la base, se
 * deduce del trigger (`TASK_AUTOMATION_TRIGGER`).
 */
export const TASK_AUTOMATION_KIND = {
  ONBOARDING: "onboarding",
  STAGE_FOLLOWUP: "stage_followup",
  STALE_REACTIVATION: "stale_reactivation",
} as const;
export type TaskAutomationKind = ValueOf<typeof TASK_AUTOMATION_KIND>;

export const TASK_AUTOMATION_TRIGGER: Record<TaskAutomationKind, AutomationTrigger> = {
  onboarding: AUTOMATION_TRIGGER.DEAL_WON,
  stage_followup: AUTOMATION_TRIGGER.STAGE_CHANGED,
  stale_reactivation: AUTOMATION_TRIGGER.STALE_LEADS_CHECK,
};

export const TASK_AUTOMATION_KIND_LABEL: Record<TaskAutomationKind, string> = {
  onboarding: "Onboarding al cerrar ganado",
  stage_followup: "Seguimiento al cambiar de etapa",
  stale_reactivation: "Reactivación de estancados",
};

/** Límites de las reglas de tareas: los comparten la validación Zod y los formularios. */
export const TASK_AUTOMATION_LIMITS = {
  NAME_MAX_LENGTH: 120,
  TASK_TITLE_MAX_LENGTH: 120,
  ONBOARDING_TASKS_MIN: 1,
  ONBOARDING_TASKS_MAX: 10,
  ONBOARDING_DUE_DAYS_MAX: 90,
  FOLLOWUP_HOURS_MIN: 1,
  // 30 días: más allá ya no es un seguimiento del cambio de etapa.
  FOLLOWUP_HOURS_MAX: 720,
  STAGE_NAME_MAX_LENGTH: 80,
  STALE_DAYS_MIN: 1,
  STALE_DAYS_MAX: 180,
  // Igual que SMS_MAX_LENGTH (lib/constants/messaging.ts): el asesor puede copiarlo tal cual a
  // un SMS. Va escrito aquí porque este archivo no importa nada (lo cargan los tests de Node).
  SUGGESTED_MESSAGE_MAX_LENGTH: 480,
} as const;

/**
 * Valores que usa una regla cuando su JSON no los trae (reglas creadas antes de la pantalla o
 * con datos incompletos). Se pasan como argumento a `lib/automations/task-rules.ts`.
 */
export const TASK_AUTOMATION_DEFAULTS = {
  onboardingTasks: [
    "Reunión de kickoff estratégico con el cliente",
    "Configuración de accesos y portafolio Meta Ads",
    "Checklist de pauta inicial y metas de conversión",
  ],
  onboardingDueInDays: 1,
  followupTaskTitle: "Llamada de seguimiento",
  followupHoursDue: 48,
  staleInactiveDays: DEFAULT_STALE_DAYS_THRESHOLD,
};

/** Prefijo de las tareas del checklist de onboarding. */
export const ONBOARDING_TASK_PREFIX = "[Onboarding]";

export const AUTOMATION_AUDIT_ACTION = {
  CREATED: "automation_created",
  UPDATED: "automation_updated",
  DELETED: "automation_deleted",
  TASKS_CREATED: "automation_tasks_created",
  STALE_CHECK_EXECUTED: "automation_stale_leads_check_executed",
} as const;
