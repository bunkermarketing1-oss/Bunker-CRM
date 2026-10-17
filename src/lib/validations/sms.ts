import { z } from "zod";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/validations/lead";
import { SMS_MAX_LENGTH } from "@/lib/constants/messaging";
import { SMS_TEMPLATE_VARIABLES } from "@/lib/constants/automations";
import { findUnknownTemplateVariables } from "@/lib/automations/sms-template";

const ALLOWED_VARIABLES = Object.keys(SMS_TEMPLATE_VARIABLES);

export const bulkSmsFilterSchema = z.object({
  clientId: z.string().uuid("Cliente inválido.").nullable().default(null),
  statuses: z.array(z.enum(LEAD_STATUSES)).default([]),
  sources: z.array(z.enum(LEAD_SOURCES)).default([]),
});

export const bulkSmsSchema = z.object({
  filter: bulkSmsFilterSchema.default({ clientId: null, statuses: [], sources: [] }),
  template: z
    .string()
    .trim()
    .min(1, "El texto del SMS es obligatorio.")
    .max(SMS_MAX_LENGTH, `El SMS no puede superar ${SMS_MAX_LENGTH} caracteres.`)
    .superRefine((template, ctx) => {
      const unknown = findUnknownTemplateVariables(template, ALLOWED_VARIABLES);
      if (unknown.length) {
        ctx.addIssue({ code: "custom", message: `Variables no reconocidas: ${unknown.map((v) => `{{${v}}}`).join(", ")}.` });
      }
    }),
  /** true = solo cuenta destinatarios, no envía. */
  dryRun: z.boolean().default(false),
});

export type BulkSmsFilter = z.infer<typeof bulkSmsFilterSchema>;
export type BulkSmsInput = z.infer<typeof bulkSmsSchema>;
