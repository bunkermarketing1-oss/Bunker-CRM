export interface BookedInterval {
  scheduledAt: string;
  durationMinutes: number;
}

const MS_PER_MINUTE = 60_000;

function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatHHmm(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Inicios de cada bloque del día: ("09:00", "10:00", 20) -> ["09:00", "09:20", "09:40"]. El bloque debe caber completo. */
export function buildDaySlots(start: string, end: string, slotMinutes: number): string[] {
  const slots: string[] = [];
  for (let current = toMinutes(start); current + slotMinutes <= toMinutes(end); current += slotMinutes) {
    slots.push(formatHHmm(current));
  }
  return slots;
}

/** Dos intervalos se traslapan si cada uno empieza antes de que el otro termine. */
export function intervalsOverlap(aStartMs: number, aMinutes: number, bStartMs: number, bMinutes: number): boolean {
  return aStartMs < bStartMs + bMinutes * MS_PER_MINUTE && bStartMs < aStartMs + aMinutes * MS_PER_MINUTE;
}

/**
 * Un bloque está ocupado si se traslapa con cualquier cita, no solo si empieza a la misma hora:
 * una cita antigua de 45 minutos ocupa también los bloques de 20 minutos que alcanza.
 * Compara instantes (no textos), así que no depende de la zona horaria.
 */
export function isSlotTaken(slotStart: Date, slotMinutes: number, bookings: BookedInterval[]): boolean {
  return bookings.some((booking) =>
    intervalsOverlap(slotStart.getTime(), slotMinutes, new Date(booking.scheduledAt).getTime(), booking.durationMinutes)
  );
}
