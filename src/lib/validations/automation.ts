import { z } from "zod";
import { LEAD_SOURCES } from "@/lib/validations/lead";
import { SMS_MAX_LENGTH } from "@/lib/constants/messaging";
import { SMS_TEMPLATE_VARIABLES } from "@/lib/constants/automations";
import { findUnknownTemplateVariables } from "@/lib/automations/sms-template";

const ALLOWED_VARIABLES = Object.keys(SMS_TEMPLATE_VARIABLES);

const smsTemplateField = z
  .string()
  .trim()
  .min(1, "El texto del SMS es obligatorio.")
  .max(SMS_MAX_LENGTH, `El SMS no puede superar ${SMS_MAX_LENGTH} caracteres.`)
  .superRefine((template, ctx) => {
    const unknown = findUnknownTemplateVariables(template, ALLOWED_VARIABLES);
    if (unknown.length) {
      ctx.addIssue({
        code: "custom",
        message: `Variables no reconocidas: ${unknown.map((v) => `{{${v}}}`).join(", ")}. Usa: ${ALLOWED_VARIABLES.map((v) => `{{${v}}}`).join(", ")}.`,
      });
    }
  });

const nameField = z.string().trim().min(1, "El nombre es obligatorio.").max(120, "Máximo 120 caracteres.");
// Vacío = la regla aplica a los leads de cualquier fuente.
const sourcesField = z.array(z.enum(LEAD_SOURCES)).max(LEAD_SOURCES.length);
const clientIdField = z.string().uuid("Cliente inválido.").nullable();

/** Regla "lead nuevo → SMS". Es la única combinación de trigger y acción que existe hoy. */
export const createSmsAutomationSchema = z.object({
  name: nameField,
  clientId: clientIdField.default(null),
  sources: sourcesField.default([]),
  template: smsTemplateField,
  isActive: z.boolean().default(true),
});

export const updateSmsAutomationSchema = z.object({
  name: nameField.optional(),
  clientId: clientIdField.optional(),
  sources: sourcesField.optional(),
  template: smsTemplateField.optional(),
  isActive: z.boolean().optional(),
});

export type CreateSmsAutomationInput = z.infer<typeof createSmsAutomationSchema>;
export type UpdateSmsAutomationInput = z.infer<typeof updateSmsAutomationSchema>;
