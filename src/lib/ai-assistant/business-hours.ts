/**
 * Horario de atención en la zona horaria del cliente. Lógica pura con `Intl` (sin
 * dependencias ni imports con alias): se prueba directo con Node
 * (`tests/ai-assistant.test.mjs`).
 */

import type { BusinessHours, Weekday } from "@/types/ai-assistant";

// `Intl` en inglés devuelve el día abreviado así; se traduce a las claves del horario.
const INTL_WEEKDAY: Record<string, Weekday> = {
  Mon: "mon",
  Tue: "tue",
  Wed: "wed",
  Thu: "thu",
  Fri: "fri",
  Sat: "sat",
  Sun: "sun",
};

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "08:30" -> 510. null si no es una hora válida de 24 h. */
export function parseTimeOfDay(value: string): number | null {
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

/** La zona es un identificador IANA que el runtime conoce (p. ej. "America/Bogota"). */
export function isValidTimeZone(timeZone: string) {
  if (!timeZone.trim()) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** Día de la semana y minuto del día de `date` en la zona del cliente (respeta horario de verano). */
export function localWeekdayAndMinutes(date: Date, timeZone: string): { weekday: Weekday; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    // h23 evita el "24:05" que devuelven algunos runtimes con hour12: false.
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return {
    weekday: INTL_WEEKDAY[get("weekday")],
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

/**
 * Si `date` cae dentro del horario de atención. La franja incluye el inicio y excluye el
 * fin (de 08:00 a 18:00, a las 18:00 ya está cerrado). Un día sin franja (null) está cerrado
 * todo el día. Las franjas no cruzan la medianoche: la validación exige inicio < fin.
 */
export function isWithinBusinessHours(date: Date, timeZone: string, hours: BusinessHours) {
  const { weekday, minutes } = localWeekdayAndMinutes(date, timeZone);
  const schedule = hours[weekday];
  if (!schedule) return false;
  const start = parseTimeOfDay(schedule.start);
  const end = parseTimeOfDay(schedule.end);
  if (start === null || end === null) return false;
  return minutes >= start && minutes < end;
}
