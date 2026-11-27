"use client";

import { useEffect, useRef } from "react";
import { APPOINTMENT_SLOT_MINUTES } from "@/lib/constants/appointments";
import {
  dateAtMinutes,
  isSameDay,
  layoutDayEvents,
  snapMinutes,
  type CalendarEvent,
  type PositionedEvent,
} from "@/lib/calendar-layout";
import { DayHeader } from "./DayHeader";

const HOUR_PX = 72;
const MIN_EVENT_PX = 20;
const GUTTER_CLASS = "w-12 shrink-0";

const APPOINTMENT_STYLES: Record<string, string> = {
  scheduled: "bg-amber-100 dark:bg-amber-500/20 border-amber-500 text-amber-950 dark:text-amber-200",
  confirmed: "bg-blue-100 dark:bg-blue-500/20 border-blue-500 text-blue-950 dark:text-blue-200",
  completed: "bg-emerald-100 dark:bg-emerald-500/20 border-emerald-500 text-emerald-950 dark:text-emerald-200",
};

// Rayas finas cada 20 min (los bloques de la agenda) y una línea más marcada cada hora.
const SLOT_PX = (HOUR_PX * APPOINTMENT_SLOT_MINUTES) / 60;
const GRID_BACKGROUND = [
  `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_PX - 1}px, rgba(148,163,184,.45) ${HOUR_PX - 1}px, rgba(148,163,184,.45) ${HOUR_PX}px)`,
  `repeating-linear-gradient(to bottom, transparent 0, transparent ${SLOT_PX - 1}px, rgba(148,163,184,.16) ${SLOT_PX - 1}px, rgba(148,163,184,.16) ${SLOT_PX}px)`,
].join(",");
const BLOCK_STRIPES = "repeating-linear-gradient(135deg, rgba(148,163,184,.22) 0 6px, transparent 6px 12px)";

const TIME_FORMAT = new Intl.DateTimeFormat("es", { hour: "numeric", minute: "2-digit", hour12: false });

interface TimeGridProps {
  days: Date[];
  /** Con varios días, la cabecera de cada día se dibuja alineada con su columna. */
  showHeaders: boolean;
  selectedDate: Date;
  events: CalendarEvent[];
  now: Date;
  gridStartMin: number;
  gridEndMin: number;
  onSelectDay: (day: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
  onSlotClick: (date: Date) => void;
}

function EventBox({ positioned, gridStartMin, onClick }: { positioned: PositionedEvent; gridStartMin: number; onClick: (event: CalendarEvent) => void }) {
  const { event, startMin, endMin, column, columns } = positioned;
  const height = Math.max(MIN_EVENT_PX, ((endMin - startMin) / 60) * HOUR_PX - 2);
  const position = {
    top: ((startMin - gridStartMin) / 60) * HOUR_PX,
    height,
    left: `calc(${(column / columns) * 100}% + 1px)`,
    width: `calc(${100 / columns}% - 3px)`,
  };

  if (event.kind === "block") {
    // Los bloqueos no capturan el clic: se puede agendar encima si el vendedor así lo decide.
    return (
      <div
        className="absolute rounded-lg px-1.5 py-0.5 overflow-hidden pointer-events-none bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[11px] font-semibold"
        style={{ ...position, backgroundImage: BLOCK_STRIPES }}
      >
        <span className="truncate block">{event.title}</span>
      </div>
    );
  }

  const style = APPOINTMENT_STYLES[event.status ?? "scheduled"] ?? APPOINTMENT_STYLES.scheduled;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick(event);
      }}
      className={`absolute text-left rounded-lg border-l-[3px] px-1.5 py-0.5 overflow-hidden shadow-2xs hover:brightness-95 transition-all cursor-pointer ${style}`}
      style={position}
      title={event.title}
    >
      <span className="block text-[11px] font-bold leading-tight truncate">{event.title}</span>
      {height >= 36 && (
        <span className="block text-[10px] opacity-75 truncate">
          {TIME_FORMAT.format(event.start)}–{TIME_FORMAT.format(event.end)}
        </span>
      )}
    </button>
  );
}

/** Cuadrícula de horas con una o varias columnas (día o semana): citas, bloqueos y la línea roja de «ahora». */
export function TimeGrid({ days, showHeaders, selectedDate, events, now, gridStartMin, gridEndMin, onSelectDay, onEventClick, onSlotClick }: TimeGridProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const totalHeight = ((gridEndMin - gridStartMin) / 60) * HOUR_PX;
  const hours = Array.from({ length: (gridEndMin - gridStartMin) / 60 }, (_, index) => gridStartMin / 60 + index);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const firstDayKey = days[0].getTime();

  // Al abrir o cambiar de semana se lleva la vista a la hora actual (si es hoy) o al inicio del horario.
  useEffect(() => {
    const scroller = scrollRef.current;
    if (!scroller) return;
    // Si hoy cabe en pantalla se empieza por la primera hora; si no, la hora actual queda a media altura.
    const nowOffset = days.some((day) => isSameDay(day, now)) ? ((nowMin - gridStartMin) / 60) * HOUR_PX : 0;
    scroller.scrollTo({ top: Math.max(0, nowOffset - scroller.clientHeight / 2) });
  }, [firstDayKey, days.length, gridStartMin]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSlotClick = (day: Date, e: React.MouseEvent<HTMLDivElement>) => {
    const y = e.clientY - e.currentTarget.getBoundingClientRect().top;
    onSlotClick(dateAtMinutes(day, snapMinutes(gridStartMin + (y / HOUR_PX) * 60, APPOINTMENT_SLOT_MINUTES)));
  };

  return (
    <div className="overflow-x-auto">
      <div className={days.length > 1 ? "min-w-[640px]" : ""}>
        {showHeaders && (
          <div className="flex border-y border-[#E2E5EB] dark:border-[#1F242D]">
            <div className={GUTTER_CLASS} />
            {days.map((day) => (
              <DayHeader key={day.getTime()} day={day} selectedDate={selectedDate} now={now} onSelect={onSelectDay} />
            ))}
          </div>
        )}

        <div ref={scrollRef} className="overflow-y-auto max-h-[calc(100vh-340px)] min-h-[420px] border-t border-[#E2E5EB] dark:border-[#1F242D]">
          <div className="flex relative" style={{ height: totalHeight }}>
            <div className={`${GUTTER_CLASS} relative`}>
              {hours.map((hour) => (
                <span
                  key={hour}
                  className="absolute right-2 -translate-y-1/2 text-[10px] font-medium text-[#8C929D]"
                  style={{ top: ((hour * 60 - gridStartMin) / 60) * HOUR_PX + (hour * 60 === gridStartMin ? 8 : 0) }}
                >
                  {hour}:00
                </span>
              ))}
            </div>

            {days.map((day) => (
              <div
                key={day.getTime()}
                onClick={(e) => handleSlotClick(day, e)}
                className="flex-1 relative border-l border-[#E2E5EB] dark:border-[#1F242D] cursor-pointer"
                style={{ backgroundImage: GRID_BACKGROUND }}
              >
                {layoutDayEvents(events, day, gridStartMin, gridEndMin).map((positioned) => (
                  <EventBox key={`${positioned.event.id}-${positioned.startMin}`} positioned={positioned} gridStartMin={gridStartMin} onClick={onEventClick} />
                ))}

                {isSameDay(day, now) && nowMin >= gridStartMin && nowMin <= gridEndMin && (
                  <div
                    className="absolute left-0 right-0 h-0.5 bg-rose-500 pointer-events-none z-10"
                    style={{ top: ((nowMin - gridStartMin) / 60) * HOUR_PX }}
                  >
                    <span className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-rose-500" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
