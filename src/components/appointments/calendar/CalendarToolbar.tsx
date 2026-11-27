import { ChevronLeft, ChevronRight } from "lucide-react";
import { CALENDAR_VIEW, CALENDAR_VIEW_LABELS, type CalendarView } from "@/lib/constants/appointments";

interface CalendarToolbarProps {
  title: string;
  view: CalendarView;
  onViewChange: (view: CalendarView) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
}

const ICON_BUTTON =
  "p-1.5 rounded-full text-[#667085] dark:text-[#8C929D] hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] transition-colors cursor-pointer";

/** Barra superior estilo iPhone: mes en grande, flechas, «Hoy» y selector Día / Semana / Mes. */
export function CalendarToolbar({ title, view, onViewChange, onPrev, onNext, onToday }: CalendarToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 pt-4 pb-3">
      <div className="flex items-center gap-1.5">
        <h2 className="text-lg sm:text-xl font-black text-[#121417] dark:text-white mr-1">{title}</h2>
        <button type="button" onClick={onPrev} className={ICON_BUTTON} title="Anterior">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button type="button" onClick={onNext} className={ICON_BUTTON} title="Siguiente">
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onToday}
          className="px-3 py-1 rounded-full text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors cursor-pointer"
        >
          Hoy
        </button>
      </div>

      <div className="flex gap-1 p-1 rounded-full bg-[#F3F4F7] dark:bg-[#1A1D24] text-xs font-semibold">
        {Object.values(CALENDAR_VIEW).map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onViewChange(option)}
            className={`px-3.5 py-1 rounded-full transition-colors cursor-pointer ${
              view === option ? "bg-white dark:bg-[#121417] text-[#121417] dark:text-white shadow-2xs" : "text-[#8C929D]"
            }`}
          >
            {CALENDAR_VIEW_LABELS[option]}
          </button>
        ))}
      </div>
    </div>
  );
}
