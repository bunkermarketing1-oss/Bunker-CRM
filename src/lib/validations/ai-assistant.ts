import { z } from "zod";
import {
  AI_INSTRUCTIONS_MAX_LENGTH,
  AI_KNOWLEDGE_BASE_MAX_LENGTH,
  AI_MAX_REPLIES_PER_DAY_LIMIT,
  AI_REPLY_MAX_LENGTH,
} from "@/lib/constants/ai-assistant";
import { isValidTimeZone, parseTimeOfDay } from "@/lib/ai-assistant/business-hours";

const timeField = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "La hora debe tener el formato HH:MM (24 h).");

// Sin franjas que crucen la medianoche: un horario de 20:00 a 02:00 se parte en dos días.
const dayScheduleField = z
  .object({ start: timeField, end: timeField })
  .refine((day) => (parseTimeOfDay(day.start) ?? 0) < (parseTimeOfDay(day.end) ?? 0), {
    message: "La hora de cierre debe ser posterior a la de apertura.",
  })
  .nullable();

export const businessHoursSchema = z.object({
  mon: dayScheduleField,
  tue: dayScheduleField,
  wed: dayScheduleField,
  thu: dayScheduleField,
  fri: dayScheduleField,
  sat: dayScheduleField,
  sun: dayScheduleField,
});

export const clientAiAssistantSchema = z
  .object({
    isEnabled: z.boolean(),
    timezone: z.string().trim().refine(isValidTimeZone, "Zona horaria inválida (usa un identificador IANA, p. ej. America/Bogota)."),
    businessHours: businessHoursSchema,
    knowledgeBase: z
      .string()
      .trim()
      .max(AI_KNOWLEDGE_BASE_MAX_LENGTH, `La base de conocimiento no puede superar ${AI_KNOWLEDGE_BASE_MAX_LENGTH} caracteres.`),
    instructions: z
      .string()
      .trim()
      .max(AI_INSTRUCTIONS_MAX_LENGTH, `Las indicaciones no pueden superar ${AI_INSTRUCTIONS_MAX_LENGTH} caracteres.`)
      .default(""),
    handoffMessage: z
      .string()
      .trim()
      .min(1, "El mensaje de traspaso es obligatorio.")
      .max(AI_REPLY_MAX_LENGTH, `El mensaje de traspaso no puede superar ${AI_REPLY_MAX_LENGTH} caracteres.`),
    maxRepliesPerDay: z
      .number()
      .int("El tope debe ser un número entero.")
      .min(1, "El tope mínimo es 1 respuesta.")
      .max(AI_MAX_REPLIES_PER_DAY_LIMIT, `El tope máximo es ${AI_MAX_REPLIES_PER_DAY_LIMIT} respuestas.`),
  })
  // Sin base de conocimiento la IA solo podría improvisar: no se deja activar.
  .refine((input) => !input.isEnabled || input.knowledgeBase.length > 0, {
    message: "Para activar el asistente carga primero la base de conocimiento.",
    path: ["knowledgeBase"],
  });

export type ClientAiAssistantInput = z.infer<typeof clientAiAssistantSchema>;
