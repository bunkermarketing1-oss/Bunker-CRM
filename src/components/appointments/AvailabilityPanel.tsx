"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  APPOINTMENT_SLOT_MINUTES,
  BLOCK_KIND,
  BOOKING_DAY_END,
  BOOKING_DAY_START,
  WEEKDAY_LABELS,
} from "@/lib/constants/appointments";
import type { AvailabilityBlockDto, CreateAvailabilityBlockInput } from "@/types/availability";
import { BlockFormModal } from "./BlockFormModal";

const WORKDAYS_KEY = "1,2,3,4,5";

function describeBlock(block: AvailabilityBlockDto): string {
  if (block.kind === BLOCK_KIND.WEEKLY) {
    const days =
      block.weekdays.join(",") === WORKDAYS_KEY
        ? "Lun–Vie"
        : block.weekdays.map((day) => WEEKDAY_LABELS[day]).join(", ");
    return `${days} · ${block.startTime}–${block.endTime}`;
  }
  const start = new Date(block.startsAt!);
  const end = new Date(block.endsAt!);
  const time = (value: Date) => value.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${start.toLocaleDateString("es", { day: "numeric", month: "short" })} · ${time(start)}–${time(end)}`;
}

interface AvailabilityPanelProps {
  blocks: AvailabilityBlockDto[];
  loading: boolean;
  create: (input: CreateAvailabilityBlockInput) => Promise<string | null>;
  remove: (id: string) => Promise<string | null>;
}

/** Horarios que el vendedor deja no disponibles (comida, reuniones…); las reservas de su enlace los respetan. */
export function AvailabilityPanel({ blocks, loading, create, remove }: AvailabilityPanelProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRemove = async (id: string) => {
    setError(null);
    const message = await remove(id);
    if (message) setError(message);
  };

  return (
    <div className="bg-white dark:bg-[#121417] rounded-[24px] border border-[#E2E5EB] dark:border-[#1F242D] p-5 shadow-orvion space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-sm font-bold text-[#121417] dark:text-white">Mi disponibilidad</h2>
          <p className="text-[11px] text-[#8C929D]">
            {BOOKING_DAY_START}–{BOOKING_DAY_END} · bloques de {APPOINTMENT_SLOT_MINUTES} min
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsFormOpen(true)}
          className="px-3.5 py-2 rounded-full border border-[#E2E5EB] dark:border-[#242A35] text-xs font-bold text-[#121417] dark:text-white hover:bg-[#F8F9FA] dark:hover:bg-[#181B22] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
        >
          <Plus className="w-3.5 h-3.5 text-amber-500" />
          <span>Bloquear horario</span>
        </button>
      </div>

      {loading ? null : blocks.length === 0 ? (
        <p className="text-xs text-[#8C929D]">No tienes horarios bloqueados. Bloquea tu comida para que nadie agende en ese momento.</p>
      ) : (
        <ul className="divide-y divide-[#E2E5EB] dark:divide-[#1F242D]">
          {blocks.map((block) => (
            <li key={block.id} className="flex items-center justify-between gap-3 py-2">
              <div className="min-w-0 text-xs">
                <span className="font-semibold text-[#121417] dark:text-white">{block.title}</span>
                <span className="text-[#8C929D]"> · {describeBlock(block)}</span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(block.id)}
                className="p-1.5 rounded-full text-[#8C929D] hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors cursor-pointer"
                title="Quitar bloqueo"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}

      {isFormOpen && <BlockFormModal onClose={() => setIsFormOpen(false)} onSave={create} />}
    </div>
  );
}
