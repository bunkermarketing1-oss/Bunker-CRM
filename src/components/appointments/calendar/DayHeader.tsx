import { isSameDay } from "@/lib/calendar-layout";

interface DayHeaderProps {
  day: Date;
  selectedDate: Date;
  now: Date;
  onSelect: (day: Date) => void;
}

const WEEKDAY_FORMAT = new Intl.DateTimeFormat("es", { weekday: "short" });

/** Cabecera de un día: letra del día y número en círculo (negro si está elegido, ámbar si es hoy), como en el iPhone. */
export function DayHeader({ day, selectedDate, now, onSelect }: DayHeaderProps) {
  const isToday = isSameDay(day, now);
  const isSelected = isSameDay(day, selectedDate);

  const circle = isSelected
    ? isToday
      ? "bg-amber-500 text-black"
      : "bg-[#121417] text-white dark:bg-white dark:text-[#121417]"
    : isToday
    ? "text-amber-600 dark:text-amber-400"
    : "text-[#121417] dark:text-white";

  return (
    <button type="button" onClick={() => onSelect(day)} className="flex-1 flex flex-col items-center gap-1 py-2 cursor-pointer">
      <span className="text-[10px] font-bold uppercase text-[#8C929D]">{WEEKDAY_FORMAT.format(day).replace(".", "")}</span>
      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${circle}`}>
        {day.getDate()}
      </span>
    </button>
  );
}
