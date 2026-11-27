import type { BookedInterval } from "@/lib/appointment-slots";

/** Un bloqueo tal como se guarda: único (startsAt/endsAt) o semanal (weekdays + horas en una zona horaria). */
export interface BlockRule {
  /** Opcionales: la agenda interna los usa para mostrar el nombre del bloqueo; el servidor no los necesita. */
  id?: string;
  title?: string;
  startsAt: string | null;
  endsAt: string | null;
  weekdays: number[];
  startTime: string | null;
  endTime: string | null;
  timezone: string | null;
}

const MS_PER_MINUTE = 60_000;
const MS_PER_DAY = 24 * 60 * MS_PER_MINUTE;
// Tope de días a recorrer al expandir un bloqueo semanal: cubre la cuadrícula de un mes (42 días).
const MAX_EXPANDED_DAYS = 62;

/** Diferencia (zona − UTC) en milisegundos en ese instante; cambia con el horario de verano. */
function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const value = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  const asUtc = Date.UTC(value("year"), value("month") - 1, value("day"), value("hour"), value("minute"), value("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Instante UTC en que el reloj de esa zona marca `date` (YYYY-MM-DD) a las `time` (HH:mm). */
export function zonedWallTimeToUtcMs(date: string, time: string, timeZone: string): number {
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes] = time.split(":").map(Number);
  const wallAsUtc = Date.UTC(year, month - 1, day, hours, minutes);
  const firstOffset = zoneOffsetMs(wallAsUtc, timeZone);
  const candidate = wallAsUtc - firstOffset;
  // Si al restar el desfase se cruzó un cambio de horario, el desfase real es otro: se corrige una vez.
  const secondOffset = zoneOffsetMs(candidate, timeZone);
  return secondOffset === firstOffset ? candidate : wallAsUtc - secondOffset;
}

function localDateString(utcMs: number, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(utcMs));
}

function minutesOfDay(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Convierte los bloqueos de un vendedor en intervalos concretos dentro de [fromMs, toMs],
 * con el mismo formato que las citas, para que la agenda los trate igual que una cita ocupada.
 */
export interface ExpandedBlock extends BookedInterval {
  blockId?: string;
  title?: string;
}

export function expandBlocksToIntervals(blocks: BlockRule[], fromMs: number, toMs: number): ExpandedBlock[] {
  const intervals: ExpandedBlock[] = [];

  for (const block of blocks) {
    const isWeekly = block.weekdays.length > 0 && block.startTime && block.endTime && block.timezone;

    if (!isWeekly) {
      if (!block.startsAt || !block.endsAt) continue;
      const start = new Date(block.startsAt).getTime();
      const end = new Date(block.endsAt).getTime();
      if (end <= fromMs || start >= toMs || end <= start) continue;
      intervals.push({
        scheduledAt: new Date(start).toISOString(),
        durationMinutes: Math.round((end - start) / MS_PER_MINUTE),
        blockId: block.id,
        title: block.title,
      });
      continue;
    }

    const durationMinutes = minutesOfDay(block.endTime!) - minutesOfDay(block.startTime!);
    if (durationMinutes <= 0) continue;

    const timeZone = block.timezone!;
    const [startYear, startMonth, startDay] = localDateString(fromMs, timeZone).split("-").map(Number);
    for (let offset = 0; offset < MAX_EXPANDED_DAYS; offset++) {
      const dayUtcMidnight = Date.UTC(startYear, startMonth - 1, startDay) + offset * MS_PER_DAY;
      const day = new Date(dayUtcMidnight);
      if (!block.weekdays.includes(day.getUTCDay())) continue;

      const dateStr = day.toISOString().slice(0, 10);
      const startMs = zonedWallTimeToUtcMs(dateStr, block.startTime!, timeZone);
      if (startMs >= toMs) break;
      if (startMs + durationMinutes * MS_PER_MINUTE <= fromMs) continue;
      intervals.push({ scheduledAt: new Date(startMs).toISOString(), durationMinutes, blockId: block.id, title: block.title });
    }
  }

  return intervals;
}
