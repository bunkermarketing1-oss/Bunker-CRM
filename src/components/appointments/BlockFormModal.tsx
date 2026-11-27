"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  APPOINTMENT_SLOT_MINUTES,
  BLOCK_KIND,
  WEEKDAY_LABELS,
  type BlockKind,
} from "@/lib/constants/appointments";
import type { CreateAvailabilityBlockInput } from "@/types/availability";

interface BlockFormModalProps {
  onClose: () => void;
  onSave: (input: CreateAvailabilityBlockInput) => Promise<string | null>;
}

const WORKDAYS = [1, 2, 3, 4, 5];
const INPUT_CLASS =
  "w-full px-3 py-2 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-xs focus:outline-hidden";

/** Formulario para bloquear un horario: cada semana (p. ej. la comida) o una sola vez. */
export function BlockFormModal({ onClose, onSave }: BlockFormModalProps) {
  const [title, setTitle] = useState("Comida");
  const [kind, setKind] = useState<BlockKind>(BLOCK_KIND.WEEKLY);
  const [weekdays, setWeekdays] = useState<number[]>(WORKDAYS);
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("13:00");
  const [endTime, setEndTime] = useState("14:00");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleWeekday = (day: number) =>
    setWeekdays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (kind === BLOCK_KIND.ONCE && !date) {
      setError("Elige la fecha.");
      return;
    }

    const input: CreateAvailabilityBlockInput =
      kind === BLOCK_KIND.WEEKLY
        ? {
            kind: BLOCK_KIND.WEEKLY,
            title,
            weekdays,
            startTime,
            endTime,
            // La zona horaria del navegador del vendedor: la comida de las 13:00 es la de su reloj, viaje o no el cliente.
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }
        : {
            kind: BLOCK_KIND.ONCE,
            title,
            startsAt: new Date(`${date}T${startTime}:00`).toISOString(),
            endsAt: new Date(`${date}T${endTime}:00`).toISOString(),
          };

    setSaving(true);
    const message = await onSave(input);
    setSaving(false);
    if (message) setError(message);
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion p-6 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-[#121417] dark:text-white">Bloquear horario</h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-full text-[#8C929D] hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] cursor-pointer" title="Cerrar">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">Nombre</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={60} className={INPUT_CLASS} placeholder="Comida, reunión…" />
        </div>

        <div className="flex gap-1 p-1 rounded-full bg-[#F3F4F7] dark:bg-[#1A1D24] text-xs font-semibold">
          {[
            { value: BLOCK_KIND.WEEKLY, label: "Cada semana" },
            { value: BLOCK_KIND.ONCE, label: "Una sola vez" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setKind(option.value)}
              className={`flex-1 py-1.5 rounded-full transition-colors cursor-pointer ${
                kind === option.value ? "bg-white dark:bg-[#121417] text-[#121417] dark:text-white shadow-2xs" : "text-[#8C929D]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        {kind === BLOCK_KIND.WEEKLY ? (
          <div className="flex gap-1.5">
            {WEEKDAY_LABELS.map((label, day) => (
              <button
                key={label}
                type="button"
                onClick={() => toggleWeekday(day)}
                className={`flex-1 py-1.5 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer ${
                  weekdays.includes(day)
                    ? "bg-[#121417] text-white border-[#121417] dark:bg-white dark:text-[#121417]"
                    : "border-[#E2E5EB] dark:border-[#242A35] text-[#8C929D]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        ) : (
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={INPUT_CLASS} />
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">Desde</label>
            <input type="time" step={APPOINTMENT_SLOT_MINUTES * 60} value={startTime} onChange={(e) => setStartTime(e.target.value)} className={INPUT_CLASS} />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">Hasta</label>
            <input type="time" step={APPOINTMENT_SLOT_MINUTES * 60} value={endTime} onChange={(e) => setEndTime(e.target.value)} className={INPUT_CLASS} />
          </div>
        </div>

        {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-full text-xs font-semibold text-[#667085] hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] cursor-pointer">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2 rounded-full bg-[#121417] hover:bg-[#1E2229] dark:bg-white dark:text-[#121417] text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Guardar</span>
          </button>
        </div>
      </form>
    </div>
  );
}
