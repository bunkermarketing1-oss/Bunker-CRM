/** Valores de dominio de automatizaciones (`AutomationRule`), guardados como texto en la base. */

type ValueOf<T> = T[keyof T];

export const AUTOMATION_TRIGGER = {
  LEAD_CREATED: "lead_created",
} as const;
export type AutomationTrigger = ValueOf<typeof AUTOMATION_TRIGGER>;

export const AUTOMATION_ACTION = {
  SEND_SMS: "send_sms",
} as const;
export type AutomationAction = ValueOf<typeof AUTOMATION_ACTION>;

export const AUTOMATION_TRIGGER_LABEL: Record<AutomationTrigger, string> = {
  lead_created: "Lead nuevo recibido",
};

export const AUTOMATION_ACTION_LABEL: Record<AutomationAction, string> = {
  send_sms: "Enviar SMS al lead",
};

/** Variables que acepta la plantilla de SMS: `{{nombre}}` → valor. */
export const SMS_TEMPLATE_VARIABLES = {
  nombre: "Primer nombre del lead",
  nombre_completo: "Nombre completo del lead",
  cliente: "Nombre del cliente (p. ej. Carrito Naranja)",
  campana: "Campaña de Meta que generó el lead",
} as const;
export type SmsTemplateVariable = keyof typeof SMS_TEMPLATE_VARIABLES;
