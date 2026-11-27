import { eventsOnDay, isSameDay, type CalendarEvent } from "@/lib/calendar-layout";

interface MonthGridProps {
  days: Date[];
  month: number;
  selectedDate: Date;
  now: Date;
  events: CalendarEvent[];
  onSelectDay: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

const WEEKDAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const TIME_FORMAT = new Intl.DateTimeFormat("es", { hour: "numeric", minute: "2-digit", hour12: false });
const MAX_DOTS = 3;

/** Mes completo con puntos bajo los días que tienen citas o bloqueos; al tocar un día se listan abajo, como en el iPhone. */
export function MonthGrid({ days, month, selectedDate, now, events, onSelectDay, onEventClick }: MonthGridProps) {
  const selectedEvents = eventsOnDay(events, selectedDate).sort((a, b) => a.start.getTime() - b.start.getTime());

  return (
    <div>
      <div className="grid grid-cols-7 px-2 sm:px-4 border-t border-[#E2E5EB] dark:border-[#1F242D]">
        {WEEKDAY_LETTERS.map((letter, index) => (
          <span key={index} className="py-2 text-center text-[10px] font-bold text-[#8C929D]">
            {letter}
          </span>
        ))}
        {days.map((day) => {
          const dayEvents = eventsOnDay(events, day);
          const appointments = dayEvents.filter((event) => event.kind === "appointment").length;
          const hasBlock = dayEvents.some((event) => event.kind === "block");
          const isToday = isSameDay(day, now);
          const isSelected = isSameDay(day, selectedDate);
          const inMonth = day.getMonth() === month;

          const circle = isSelected
            ? isToday
              ? "bg-amber-500 text-black"
              : "bg-[#121417] text-white dark:bg-white dark:text-[#121417]"
            : isToday
            ? "text-amber-600 dark:text-amber-400"
            : inMonth
            ? "text-[#121417] dark:text-white"
            : "text-[#CBD5E1] dark:text-[#475467]";

          return (
            <button key={day.getTime()} type="button" onClick={() => onSelectDay(day)} className="flex flex-col items-center gap-1 py-1.5 cursor-pointer">
              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${circle}`}>
                {day.getDate()}
              </span>
              <span className="flex gap-0.5 h-1.5">
                {Array.from({ length: Math.min(appointments, MAX_DOTS) }, (_, index) => (
                  <span key={index} className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                ))}
                {hasBlock && <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="border-t border-[#E2E5EB] dark:border-[#1F242D] divide-y divide-[#E2E5EB] dark:divide-[#1F242D]">
        {selectedEvents.length === 0 ? (
          <li className="px-5 py-4 text-xs text-[#8C929D]">Sin citas este día.</li>
        ) : (
          selectedEvents.map((event) => (
            <li key={`${event.id}-${event.start.getTime()}`}>
              <button
                type="button"
                disabled={event.kind === "block"}
                onClick={() => onEventClick(event)}
                className="w-full flex items-center gap-3 px-5 py-2.5 text-left hover:bg-[#F8F9FA] dark:hover:bg-[#16181F] disabled:hover:bg-transparent transition-colors cursor-pointer disabled:cursor-default"
              >
                <span className={`w-1 h-8 rounded-full ${event.kind === "block" ? "bg-slate-400" : "bg-amber-500"}`} />
                <span className="text-[11px] font-mono text-[#8C929D] w-24 shrink-0">
                  {TIME_FORMAT.format(event.start)}–{TIME_FORMAT.format(event.end)}
                </span>
                <span className={`text-xs truncate ${event.kind === "block" ? "text-[#8C929D]" : "font-semibold text-[#121417] dark:text-white"}`}>
                  {event.title}
                </span>
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
