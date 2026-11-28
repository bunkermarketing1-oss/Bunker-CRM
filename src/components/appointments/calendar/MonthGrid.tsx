import { eventsOnDay, isSameDay, type CalendarEvent } from "@/lib/calendar-layout";

interface MonthGridProps {
  days: Date[];
  month: number;
  selectedDate: Date;
  now: Date;
  events: CalendarEvent[];
  onSelectDay: (day: Date) => void;
}

const WEEKDAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const MAX_DOTS = 3;

/** Mes completo con puntos bajo los días que tienen citas o bloqueos; al tocar un día se abre su vista de día. */
export function MonthGrid({ days, month, selectedDate, now, events, onSelectDay }: MonthGridProps) {
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
    </div>
  );
}
