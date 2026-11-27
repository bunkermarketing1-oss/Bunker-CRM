"use client";

import { useEffect, useMemo, useState } from "react";
import {
  APPOINTMENT_STATUS,
  BOOKING_DAY_END,
  BOOKING_DAY_START,
  CALENDAR_VIEW,
  type CalendarView,
} from "@/lib/constants/appointments";
import {
  addDays,
  addMonths,
  hhmmToMinutes,
  monthGrid,
  startOfDay,
  visibleRange,
  weekDays,
  type CalendarEvent,
} from "@/lib/calendar-layout";
import { expandBlocksToIntervals } from "@/lib/availability-blocks";
import type { AppointmentDto } from "@/types/appointments";
import type { AvailabilityBlockDto } from "@/types/availability";
import { CalendarToolbar } from "./CalendarToolbar";
import { DayHeader } from "./DayHeader";
import { MonthGrid } from "./MonthGrid";
import { TimeGrid } from "./TimeGrid";

interface AgendaCalendarProps {
  appointments: AppointmentDto[];
  blocks: AvailabilityBlockDto[];
  onSelectAppointment: (appointment: AppointmentDto) => void;
  /** Se tocó un bloque libre de la cuadrícula: abre la creación de una cita a esa hora. */
  onCreateAt: (date: Date) => void;
}

const MS_PER_MINUTE = 60_000;
const NOW_REFRESH_MS = 60_000;
const MOBILE_BREAKPOINT_PX = 640;
const TITLE_FORMAT = new Intl.DateTimeFormat("es", { month: "long", year: "numeric" });
// Las citas canceladas o sin asistencia ya no ocupan tiempo: no se dibujan en la cuadrícula.
const HIDDEN_STATUSES: string[] = [APPOINTMENT_STATUS.CANCELLED, APPOINTMENT_STATUS.NO_SHOW];

function capitalizeFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * El calendario depende de "hoy" y de la zona horaria del navegador, que el servidor no conoce: si se dibujara
 * en el servidor, el HTML no coincidiría con el del navegador (error de hidratación). Por eso solo se muestra ya montado.
 */
export function AgendaCalendar(props: AgendaCalendarProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div className="min-h-[560px] bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion" aria-hidden />;
  }
  return <AgendaCalendarContent {...props} />;
}

/** Calendario estilo iPhone (día, semana y mes) con las citas y los bloqueos del vendedor. */
function AgendaCalendarContent({ appointments, blocks, onSelectAppointment, onCreateAt }: AgendaCalendarProps) {
  const [view, setView] = useState<CalendarView>(CALENDAR_VIEW.WEEK);
  const [selectedDate, setSelectedDate] = useState(() => startOfDay(new Date()));
  const [now, setNow] = useState(() => new Date());

  // En pantallas angostas la semana de 7 columnas no cabe: se abre en vista de día.
  useEffect(() => {
    if (window.innerWidth < MOBILE_BREAKPOINT_PX) setView(CALENDAR_VIEW.DAY);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), NOW_REFRESH_MS);
    return () => clearInterval(timer);
  }, []);

  const month = selectedDate.getMonth();
  const monthDays = useMemo(() => monthGrid(selectedDate), [selectedDate]);

  const events = useMemo<CalendarEvent[]>(() => {
    const fromAppointments = appointments
      .filter((appointment) => !HIDDEN_STATUSES.includes(appointment.status))
      .map((appointment) => {
        const start = new Date(appointment.scheduledAt);
        return {
          id: appointment.id,
          kind: "appointment" as const,
          title: appointment.customerName || appointment.leadName || appointment.title,
          start,
          end: new Date(start.getTime() + appointment.durationMinutes * MS_PER_MINUTE),
          status: appointment.status,
        };
      });

    // Los bloqueos semanales se expanden a días concretos para las seis semanas que muestra el mes.
    const from = monthDays[0].getTime();
    const to = addDays(monthDays[monthDays.length - 1], 1).getTime();
    const fromBlocks = expandBlocksToIntervals(blocks, from, to).map((interval) => {
      const start = new Date(interval.scheduledAt);
      return {
        id: interval.blockId ?? interval.scheduledAt,
        kind: "block" as const,
        title: interval.title ?? "Bloqueado",
        start,
        end: new Date(start.getTime() + interval.durationMinutes * MS_PER_MINUTE),
      };
    });

    return [...fromAppointments, ...fromBlocks];
  }, [appointments, blocks, monthDays]);

  const { startMin, endMin } = useMemo(
    () => visibleRange(events, hhmmToMinutes(BOOKING_DAY_START), hhmmToMinutes(BOOKING_DAY_END)),
    [events]
  );

  const step = (direction: 1 | -1) =>
    setSelectedDate((current) => {
      if (view === CALENDAR_VIEW.MONTH) return addMonths(current, direction);
      return addDays(current, direction * (view === CALENDAR_VIEW.WEEK ? 7 : 1));
    });

  const handleEventClick = (event: CalendarEvent) => {
    const appointment = appointments.find((item) => item.id === event.id);
    if (appointment) onSelectAppointment(appointment);
  };

  const week = weekDays(selectedDate);
  const gridProps = { selectedDate, events, now, gridStartMin: startMin, gridEndMin: endMin, onSelectDay: setSelectedDate, onEventClick: handleEventClick, onSlotClick: onCreateAt };

  return (
    <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion overflow-hidden">
      <CalendarToolbar
        title={capitalizeFirst(TITLE_FORMAT.format(selectedDate))}
        view={view}
        onViewChange={setView}
        onPrev={() => step(-1)}
        onNext={() => step(1)}
        onToday={() => setSelectedDate(startOfDay(new Date()))}
      />

      {view === CALENDAR_VIEW.MONTH && (
        <MonthGrid days={monthDays} month={month} selectedDate={selectedDate} now={now} events={events} onSelectDay={setSelectedDate} onEventClick={handleEventClick} />
      )}

      {view === CALENDAR_VIEW.WEEK && <TimeGrid days={week} showHeaders {...gridProps} />}

      {view === CALENDAR_VIEW.DAY && (
        <>
          <div className="flex px-2 border-t border-[#E2E5EB] dark:border-[#1F242D]">
            {week.map((day) => (
              <DayHeader key={day.getTime()} day={day} selectedDate={selectedDate} now={now} onSelect={setSelectedDate} />
            ))}
          </div>
          <TimeGrid days={[selectedDate]} showHeaders={false} {...gridProps} />
        </>
      )}
    </div>
  );
}
