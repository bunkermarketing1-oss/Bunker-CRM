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

/** Variables que acepta la plantilla de SMS: `{{nombre}}` → valor. */
export const SMS_TEMPLATE_VARIABLES = {
  nombre: "Primer nombre del lead",
  nombre_completo: "Nombre completo del lead",
  cliente: "Nombre del cliente (p. ej. Carrito Naranja)",
  campana: "Campaña de Meta que generó el lead",
} as const;
export type SmsTemplateVariable = keyof typeof SMS_TEMPLATE_VARIABLES;
