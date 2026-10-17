import { Ear, Radio, MessageCircle } from "lucide-react";
import { MONITOR_MODE, type MonitorMode } from "@/lib/constants/voice";
import type { CallSummary } from "@/types/voice";

interface LiveCallsPanelProps {
  calls: CallSummary[];
  /** false mientras el supervisor ya está en una llamada o el teléfono no está listo. */
  canJoin: boolean;
  onMonitor: (callId: string, mode: MonitorMode, label: string) => void;
}

/** Llamadas en curso de los asesores; el supervisor puede escuchar o susurrar. */
export function LiveCallsPanel({ calls, canJoin, onMonitor }: LiveCallsPanelProps) {
  return (
    <section className="p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm space-y-4">
      <h2 className="text-sm font-semibold text-[#1F1E1D] flex items-center gap-2">
        <Radio className="w-4 h-4 text-red-600" />
        En vivo
        <span className="text-[11px] font-mono text-[#82807C]">{calls.length}</span>
      </h2>

      {calls.length === 0 ? (
        <p className="text-xs text-[#82807C]">No hay llamadas en curso.</p>
      ) : (
        <ul className="space-y-2">
          {calls.map((call) => {
            const label = `${call.userName ?? "Asesor"} → ${call.leadName ?? call.toNumber}`;
            return (
              <li key={call.id} className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-[#1F1E1D] truncate">{label}</p>
                  <p className="text-[11px] text-[#82807C]">
                    {call.answeredAt ? `Desde ${new Date(call.answeredAt).toLocaleTimeString()}` : "Timbrando…"}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    disabled={!canJoin}
                    onClick={() => onMonitor(call.id, MONITOR_MODE.LISTEN, label)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E8E6DF] text-[11px] font-medium text-[#1F1E1D] hover:bg-[#F4F3EE] flex items-center gap-1 disabled:opacity-50"
                  >
                    <Ear className="w-3.5 h-3.5" /> Escuchar
                  </button>
                  <button
                    type="button"
                    disabled={!canJoin}
                    onClick={() => onMonitor(call.id, MONITOR_MODE.WHISPER, label)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-[#E8E6DF] text-[11px] font-medium text-[#1F1E1D] hover:bg-[#F4F3EE] flex items-center gap-1 disabled:opacity-50"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> Susurrar
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
