import type { AppointmentStatus } from "@/lib/constants/appointments";

export type CalendarEventKind = "appointment" | "block";

export interface CalendarEvent {
  id: string;
  kind: CalendarEventKind;
  title: string;
  start: Date;
  end: Date;
  status?: AppointmentStatus;
}

export interface PositionedEvent {
  event: CalendarEvent;
  /** Minutos desde medianoche, recortados al rango visible. */
  startMin: number;
  endMin: number;
  /** Columna dentro de un grupo de eventos que se traslapan, y cuántas columnas tiene el grupo. */
  column: number;
  columns: number;
}

const MINUTES_PER_DAY = 24 * 60;
const MS_PER_MINUTE = 60_000;
const DAYS_IN_WEEK = 7;
const MONTH_GRID_DAYS = 42;

/** "09:00" -> 540 */
export function hhmmToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function startOfDay(date: Date): Date {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

/** Suma días calendario (no 24 h), así el cambio de horario no desplaza el día. */
export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/** Suma meses conservando el día cuando es posible (31 de enero + 1 mes = 28 de febrero). */
export function addMonths(date: Date, months: number): Date {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** La semana empieza en lunes. */
export function startOfWeek(date: Date): Date {
  const day = startOfDay(date);
  return addDays(day, -((day.getDay() + 6) % DAYS_IN_WEEK));
}

export function weekDays(date: Date): Date[] {
  const first = startOfWeek(date);
  return Array.from({ length: DAYS_IN_WEEK }, (_, index) => addDays(first, index));
}

/** Seis semanas completas que contienen el mes, para que la cuadrícula tenga siempre la misma altura. */
export function monthGrid(date: Date): Date[] {
  const start = startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1));
  return Array.from({ length: MONTH_GRID_DAYS }, (_, index) => addDays(start, index));
}

export function eventsOnDay(events: CalendarEvent[], day: Date): CalendarEvent[] {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(startOfDay(day), 1).getTime();
  return events.filter((event) => event.start.getTime() < dayEnd && event.end.getTime() > dayStart);
}

export function dateAtMinutes(day: Date, minutes: number): Date {
  const date = startOfDay(day);
  date.setMinutes(minutes);
  return date;
}

/** Redondea hacia abajo al bloque de la agenda (20 min): tocar a las 9:25 elige el bloque de las 9:20. */
export function snapMinutes(minutes: number, snap: number): number {
  return Math.floor(minutes / snap) * snap;
}

/** Rango de horas visible: el horario de atención, ampliado si hay citas fuera de él. */
export function visibleRange(events: CalendarEvent[], defaultStartMin: number, defaultEndMin: number) {
  let startMin = defaultStartMin;
  let endMin = defaultEndMin;
  for (const event of events) {
    const dayStart = startOfDay(event.start).getTime();
    const eventStartMin = (event.start.getTime() - dayStart) / MS_PER_MINUTE;
    const eventEndMin = Math.min(MINUTES_PER_DAY, (event.end.getTime() - dayStart) / MS_PER_MINUTE);
    startMin = Math.min(startMin, Math.floor(eventStartMin / 60) * 60);
    endMin = Math.max(endMin, Math.ceil(eventEndMin / 60) * 60);
  }
  return { startMin: Math.max(0, startMin), endMin: Math.min(MINUTES_PER_DAY, endMin) };
}

/** Coloca los eventos de un día; los que se traslapan quedan lado a lado en columnas. */
export function layoutDayEvents(events: CalendarEvent[], day: Date, gridStartMin: number, gridEndMin: number): PositionedEvent[] {
  const dayStart = startOfDay(day).getTime();
  const dayEnd = addDays(startOfDay(day), 1).getTime();

  const items = eventsOnDay(events, day)
    .map((event) => ({
      event,
      startMin: Math.max(gridStartMin, (Math.max(event.start.getTime(), dayStart) - dayStart) / MS_PER_MINUTE),
      endMin: Math.min(gridEndMin, (Math.min(event.end.getTime(), dayEnd) - dayStart) / MS_PER_MINUTE),
    }))
    .filter((item) => item.endMin > item.startMin)
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin);

  const positioned: PositionedEvent[] = [];
  let group: Array<{ item: (typeof items)[number]; column: number }> = [];
  let columnEnds: number[] = [];
  let groupEnd = -Infinity;

  const closeGroup = () => {
    const columns = columnEnds.length;
    for (const { item, column } of group) positioned.push({ ...item, column, columns });
    group = [];
    columnEnds = [];
    groupEnd = -Infinity;
  };

  for (const item of items) {
    if (item.startMin >= groupEnd) closeGroup();
    let column = columnEnds.findIndex((end) => end <= item.startMin);
    if (column === -1) column = columnEnds.length;
    columnEnds[column] = item.endMin;
    groupEnd = Math.max(groupEnd, item.endMin);
    group.push({ item, column });
  }
  closeGroup();

  return positioned;
}
