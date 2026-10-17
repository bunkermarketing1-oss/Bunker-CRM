/**
 * Constantes de dominio para el motor de automatizaciones comerciales de Bunker CRM.
 * Evita magic strings en servicios, componentes y APIs.
 */

export const TRIGGER_EVENT = {
  LEAD_CREATED: "lead_created",
  STAGE_CHANGED: "stage_changed",
  DEAL_WON: "deal_won",
  STALE_LEADS_CHECK: "stale_leads_check",
} as const;

export type TriggerEventType = (typeof TRIGGER_EVENT)[keyof typeof TRIGGER_EVENT];

export const TRIGGER_EVENT_LABEL: Record<TriggerEventType, string> = {
  [TRIGGER_EVENT.LEAD_CREATED]: "Lead captado (Meta Ads / Web / Entrada API)",
  [TRIGGER_EVENT.STAGE_CHANGED]: "Oportunidad movida de etapa en pipeline",
  [TRIGGER_EVENT.DEAL_WON]: "Oportunidad marcada como Cerrado Ganado",
  [TRIGGER_EVENT.STALE_LEADS_CHECK]: "Prospectos sin actividad comercial (estancados)",
};

export const ACTION_TYPE = {
  IMMEDIATE_QUALIFICATION_SMS: "immediate_qualification_sms",
  AI_OUT_OF_HOURS_SMS: "ai_out_of_hours_sms",
  CREATE_FOLLOWUP_TASK: "create_followup_task",
  ONBOARDING_DEAL_WON: "onboarding_deal_won",
  REACTIVATE_STALE_LEAD: "reactivate_stale_lead",
} as const;

export type ActionTypeValue = (typeof ACTION_TYPE)[keyof typeof ACTION_TYPE];

export const ACTION_TYPE_LABEL: Record<ActionTypeValue, string> = {
  [ACTION_TYPE.IMMEDIATE_QUALIFICATION_SMS]: "Calificar lead y despachar SMS de bienvenida en < 60s",
  [ACTION_TYPE.AI_OUT_OF_HOURS_SMS]: "IA de respuesta inmediata en horas de ausencia / noche",
  [ACTION_TYPE.CREATE_FOLLOWUP_TASK]: "Crear tarea de llamada de seguimiento para el ejecutivo",
  [ACTION_TYPE.ONBOARDING_DEAL_WON]: "Convertir en Cliente Activo y generar checklist de onboarding",
  [ACTION_TYPE.REACTIVATE_STALE_LEAD]: "Crear alerta y tarea urgente de reactivación comercial",
};

/**
 * Horario laboral por defecto para la detección de horas de ausencia (IA de respuesta).
 * Lunes a Viernes de 8:00 a 19:00 (hora local del cliente).
 */
export const DEFAULT_BUSINESS_HOURS = {
  startHour: 8,
  endHour: 19,
  workDays: [1, 2, 3, 4, 5], // 1=Lunes, 5=Viernes
  timezone: "America/Bogota",
};

/** Umbral de inactividad por defecto para reactivación comercial. */
export const DEFAULT_STALE_DAYS_THRESHOLD = 14;
