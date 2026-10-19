import { z } from "zod";
import { TASK_AUTOMATION_KIND, TASK_AUTOMATION_LIMITS as L } from "@/lib/constants/automations";

const KIND_ERROR = "Tipo de automatización inválido.";
const nameField = z.string().trim().min(1, "El nombre es obligatorio.").max(L.NAME_MAX_LENGTH, `Máximo ${L.NAME_MAX_LENGTH} caracteres.`);
// null = la regla aplica a todos los clientes.
const clientIdField = z.string().uuid("Cliente inválido.").nullable();

const taskTitleField = z
  .string()
  .trim()
  .min(1, "El título de la tarea es obligatorio.")
  .max(L.TASK_TITLE_MAX_LENGTH, `Cada tarea admite máximo ${L.TASK_TITLE_MAX_LENGTH} caracteres.`);

const onboardingFields = {
  tasks: z
    .array(taskTitleField)
    .min(L.ONBOARDING_TASKS_MIN, "Agrega al menos una tarea.")
    .max(L.ONBOARDING_TASKS_MAX, `Máximo ${L.ONBOARDING_TASKS_MAX} tareas.`),
  dueInDays: z
    .number()
    .int("Los días deben ser un número entero.")
    .min(0, "Los días no pueden ser negativos.")
    .max(L.ONBOARDING_DUE_DAYS_MAX, `Máximo ${L.ONBOARDING_DUE_DAYS_MAX} días.`),
};

const stageFollowupFields = {
  stageNameMatch: z
    .string()
    .trim()
    .min(1, "Elige la etapa que dispara el seguimiento.")
    .max(L.STAGE_NAME_MAX_LENGTH, `Máximo ${L.STAGE_NAME_MAX_LENGTH} caracteres.`),
  taskTitle: taskTitleField,
  hoursDue: z
    .number()
    .int("Las horas deben ser un número entero.")
    .min(L.FOLLOWUP_HOURS_MIN, `Mínimo ${L.FOLLOWUP_HOURS_MIN} hora.`)
    .max(L.FOLLOWUP_HOURS_MAX, `Máximo ${L.FOLLOWUP_HOURS_MAX} horas.`),
};

const staleFields = {
  inactiveDays: z
    .number()
    .int("Los días deben ser un número entero.")
    .min(L.STALE_DAYS_MIN, `Mínimo ${L.STALE_DAYS_MIN} día.`)
    .max(L.STALE_DAYS_MAX, `Máximo ${L.STALE_DAYS_MAX} días.`),
  // Vacío = sin mensaje sugerido.
  suggestedMessage: z
    .string()
    .trim()
    .max(L.SUGGESTED_MESSAGE_MAX_LENGTH, `El mensaje sugerido admite máximo ${L.SUGGESTED_MESSAGE_MAX_LENGTH} caracteres.`)
    .nullable()
    .transform((v) => (v ? v : null)),
};

const createCommon = {
  name: nameField,
  clientId: clientIdField.default(null),
  isActive: z.boolean().default(true),
};

const updateCommon = {
  name: nameField.optional(),
  clientId: clientIdField.optional(),
  isActive: z.boolean().optional(),
};

/** El tipo (`kind`) decide el trigger y qué campos lleva la regla. */
export const createTaskAutomationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal(TASK_AUTOMATION_KIND.ONBOARDING), ...createCommon, ...onboardingFields }),
  z.object({ kind: z.literal(TASK_AUTOMATION_KIND.STAGE_FOLLOWUP), ...createCommon, ...stageFollowupFields }),
  z.object({
    kind: z.literal(TASK_AUTOMATION_KIND.STALE_REACTIVATION),
    ...createCommon,
    ...staleFields,
    suggestedMessage: staleFields.suggestedMessage.default(null),
  }),
], { error: KIND_ERROR });

/**
 * Edición parcial. El `kind` es obligatorio para saber qué campos validar y no se puede
 * cambiar: una regla de onboarding no se convierte en una de estancados.
 */
export const updateTaskAutomationSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal(TASK_AUTOMATION_KIND.ONBOARDING), ...updateCommon, ...z.object(onboardingFields).partial().shape }),
  z.object({ kind: z.literal(TASK_AUTOMATION_KIND.STAGE_FOLLOWUP), ...updateCommon, ...z.object(stageFollowupFields).partial().shape }),
  z.object({ kind: z.literal(TASK_AUTOMATION_KIND.STALE_REACTIVATION), ...updateCommon, ...z.object(staleFields).partial().shape }),
], { error: KIND_ERROR });

export type CreateTaskAutomationInput = z.infer<typeof createTaskAutomationSchema>;
export type UpdateTaskAutomationInput = z.infer<typeof updateTaskAutomationSchema>;
