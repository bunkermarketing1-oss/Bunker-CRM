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
  /**
   * Clave del lote, generada por el navegador al mostrar la vista previa. Si el envío se
   * reintenta (timeout, doble clic) el servidor reconoce el lote y no lo vuelve a mandar.
   */
  batchId: z.string().uuid("Clave de envío inválida.").optional(),
}).superRefine((input, ctx) => {
  if (!input.dryRun && !input.batchId) {
    ctx.addIssue({ code: "custom", path: ["batchId"], message: "Vuelve a calcular los destinatarios antes de enviar." });
  }
});

export type BulkSmsFilter = z.infer<typeof bulkSmsFilterSchema>;
export type BulkSmsInput = z.infer<typeof bulkSmsSchema>;

// El formulario manda "" cuando no hay selección: se trata igual que no mandar el campo.
const optionalId = (message: string) =>
  z.preprocess((value) => (value === "" ? null : value), z.string().uuid(message).nullable().optional());

/** SMS manual (`POST /api/messages/sms`). El número se normaliza a E.164 en el service. */
export const manualSmsSchema = z.object({
  recipient: z.string().trim().max(40, "El número telefónico no es válido.").nullable().optional(),
  message: z
    .string({ error: "El cuerpo del mensaje no puede estar vacío." })
    .trim()
    .min(1, "El cuerpo del mensaje no puede estar vacío.")
    .max(SMS_MAX_LENGTH, `El mensaje supera el límite máximo de caracteres para SMS (${SMS_MAX_LENGTH}).`),
  leadId: optionalId("Lead inválido."),
  clientId: optionalId("Cliente inválido."),
  contactId: optionalId("Contacto inválido."),
});

export type ManualSmsInput = z.infer<typeof manualSmsSchema>;
