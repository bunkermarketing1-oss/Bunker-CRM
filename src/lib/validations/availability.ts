import { z } from "zod";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

const title = z.string().trim().min(1, "Ponle un nombre al bloqueo.").max(60, "Máximo 60 caracteres.");
const time = z.string().regex(TIME_PATTERN, "Hora no válida.");

const weeklyBlockSchema = z
  .object({
    kind: z.literal("weekly"),
    title,
    weekdays: z.array(z.number().int().min(0).max(6)).min(1, "Elige al menos un día."),
    startTime: time,
    endTime: time,
    timezone: z.string().refine(isValidTimeZone, "Zona horaria no válida."),
  })
  .refine((block) => block.endTime > block.startTime, { message: "La hora de fin debe ser posterior a la de inicio.", path: ["endTime"] });

const onceBlockSchema = z
  .object({
    kind: z.literal("once"),
    title,
    startsAt: z.string().datetime({ message: "Fecha de inicio no válida." }),
    endsAt: z.string().datetime({ message: "Fecha de fin no válida." }),
  })
  .refine((block) => Date.parse(block.endsAt) > Date.parse(block.startsAt), {
    message: "La hora de fin debe ser posterior a la de inicio.",
    path: ["endsAt"],
  });

export const createAvailabilityBlockSchema = z.union([weeklyBlockSchema, onceBlockSchema]);
