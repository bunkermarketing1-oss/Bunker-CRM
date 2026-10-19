import { History, PhoneIncoming, PhoneOutgoing } from "lucide-react";
import { CALL_DIRECTION, CALL_STATUS, CALL_STATUS_LABEL } from "@/lib/constants/voice";
import type { CallSummary } from "@/types/voice";

const formatDuration = (seconds: number | null) =>
  seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "—";

const STATUS_STYLE: Partial<Record<CallSummary["status"], string>> = {
  [CALL_STATUS.COMPLETED]: "bg-emerald-50 text-emerald-700 border-emerald-200",
  [CALL_STATUS.IN_PROGRESS]: "bg-blue-50 text-blue-700 border-blue-200",
  [CALL_STATUS.RINGING]: "bg-blue-50 text-blue-700 border-blue-200",
  [CALL_STATUS.FAILED]: "bg-red-50 text-red-700 border-red-200",
};

export function CallHistoryList({ calls, loading }: { calls: CallSummary[]; loading: boolean }) {
  return (
    <section className="p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#1F1E1D] flex items-center gap-2">
          <History className="w-4 h-4 text-emerald-600" />
          Historial de llamadas
        </h2>
        <span className="text-[11px] text-[#82807C] font-mono">{calls.length} llamadas</span>
      </div>

      {loading ? (
        <p className="py-10 text-center text-xs text-[#82807C]">Cargando llamadas…</p>
      ) : calls.length === 0 ? (
        <p className="py-10 text-center text-xs text-[#82807C]">Aún no hay llamadas.</p>
      ) : (
        <ul className="divide-y divide-[#F0EFEA] max-h-[520px] overflow-y-auto">
          {calls.map((call) => {
            const inbound = call.direction === CALL_DIRECTION.INBOUND;
            const Icon = inbound ? PhoneIncoming : PhoneOutgoing;
            return (
              <li key={call.id} className="py-3 px-2 flex items-center justify-between gap-3">
                <div className="min-w-0 flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 flex-shrink-0 ${inbound ? "text-emerald-600" : "text-[#82807C]"}`} aria-label={inbound ? "Entrante" : "Saliente"} />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#1F1E1D] truncate">
                      {call.leadName ?? (inbound ? call.fromNumber : call.toNumber)}
                    </p>
                    <p className="text-[11px] text-[#82807C] truncate">
                      {new Date(call.createdAt).toLocaleString()}
                      {call.userName && ` · ${call.userName}`}
                      {call.lineLabel && ` · ${call.lineLabel}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-mono text-[11px] text-[#4D4C48]">{formatDuration(call.durationSec)}</span>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLE[call.status] ?? "bg-gray-50 text-gray-700 border-gray-200"}`}>
                    {CALL_STATUS_LABEL[call.status]}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
