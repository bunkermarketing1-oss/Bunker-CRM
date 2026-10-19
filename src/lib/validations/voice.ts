import { z } from "zod";
import { validateAndNormalizePhone } from "@/lib/phone";
import { TWILIO_CALL_SID_PATTERN } from "@/lib/constants/voice";

const phoneNumberField = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const phone = validateAndNormalizePhone(value);
    if (!phone.isValid || !phone.normalized) {
      ctx.addIssue({ code: "custom", message: phone.error || "Número inválido. Usa formato internacional (+52 55 1234 5678)." });
      return z.NEVER;
    }
    return phone.normalized;
  });

const labelField = z.string().trim().min(1, "La etiqueta es obligatoria.").max(80, "Máximo 80 caracteres.");
const clientIdField = z.string().uuid("Cliente inválido.").nullable();

export const createPhoneLineSchema = z.object({
  phoneNumber: phoneNumberField,
  label: labelField,
  clientId: clientIdField.default(null),
  recordCalls: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

// El número no se edita: si cambia, es otra línea (y otro número en Twilio).
export const updatePhoneLineSchema = z.object({
  label: labelField.optional(),
  clientId: clientIdField.optional(),
  recordCalls: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const startCallSchema = z.object({
  leadId: z.string().uuid("Lead inválido."),
});

export const claimCallSchema = z.object({
  // El SID termina en la base y en la API REST de Twilio: solo se acepta un CallSid real.
  agentCallSid: z.string().regex(TWILIO_CALL_SID_PATTERN, "Identificador de llamada inválido.").nullable().default(null),
});

export type CreatePhoneLineInput = z.infer<typeof createPhoneLineSchema>;
export type UpdatePhoneLineInput = z.infer<typeof updatePhoneLineSchema>;
