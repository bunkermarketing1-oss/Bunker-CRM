"use client";

import { WEEKDAYS, WEEKDAY_LABEL } from "@/lib/constants/ai-assistant";
import type { BusinessHours, Weekday } from "@/types/ai-assistant";

interface BusinessHoursEditorProps {
  value: BusinessHours;
  onChange: (next: BusinessHours) => void;
}

// Al abrir un día cerrado se propone la jornada más común; el admin la ajusta.
const OPENING_DEFAULT = { start: "08:00", end: "18:00" };

const timeClass =
  "bg-[#FAF9F5] border border-[#E8E6DF] rounded-lg px-2 py-1 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757] disabled:opacity-40";

/** Horario de atención por día, en la hora local del cliente. Fuera de estas franjas contesta la IA. */
export function BusinessHoursEditor({ value, onChange }: BusinessHoursEditorProps) {
  const setDay = (day: Weekday, schedule: BusinessHours[Weekday]) => onChange({ ...value, [day]: schedule });

  return (
    <div className="space-y-1.5">
      {WEEKDAYS.map((day) => {
        const schedule = value[day];
        return (
          <div key={day} className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-2 w-28 text-[#4D4C48]">
              <input
                type="checkbox"
                checked={Boolean(schedule)}
                onChange={(e) => setDay(day, e.target.checked ? OPENING_DEFAULT : null)}
              />
              {WEEKDAY_LABEL[day]}
            </label>
            {schedule ? (
              <>
                <input
                  type="time"
                  aria-label={`${WEEKDAY_LABEL[day]}: apertura`}
                  value={schedule.start}
                  onChange={(e) => setDay(day, { ...schedule, start: e.target.value })}
                  className={timeClass}
                />
                <span className="text-[#82807C]">a</span>
                <input
                  type="time"
                  aria-label={`${WEEKDAY_LABEL[day]}: cierre`}
                  value={schedule.end}
                  onChange={(e) => setDay(day, { ...schedule, end: e.target.value })}
                  className={timeClass}
                />
              </>
            ) : (
              <span className="text-[#82807C]">Cerrado (la IA responde todo el día)</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
