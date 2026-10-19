import { Crown, Users } from "lucide-react";
import { ADVISOR_STATUS, ADVISOR_STATUS_LABEL, type AdvisorStatus } from "@/lib/constants/team";
import { formatClock } from "@/lib/team-live";
import type { AdvisorLiveRow } from "@/types/team";

interface AdvisorLiveTableProps {
  advisors: AdvisorLiveRow[];
  loading: boolean;
  /** Bunker ve varios clientes a la vez: se muestra la columna de empresa. */
  showClient: boolean;
}

const STATUS_STYLE: Record<AdvisorStatus, string> = {
  on_call: "bg-red-50 text-red-700 border-red-200",
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  idle: "bg-[#FAF9F5] text-[#82807C] border-[#E8E6DF]",
};

const timeOf = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }) : "Sin actividad hoy";

function StatusCell({ advisor }: { advisor: AdvisorLiveRow }) {
  const call = advisor.currentCall;
  return (
    <div className="space-y-1">
      <span className={`inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border ${STATUS_STYLE[advisor.status]}`}>
        {ADVISOR_STATUS_LABEL[advisor.status]}
      </span>
      {advisor.status === ADVISOR_STATUS.ON_CALL && call && (
        <p className="text-[11px] text-[#1F1E1D] truncate max-w-[180px]">
          {call.leadName ?? call.counterpart}
          <span className="font-mono text-[#82807C] ml-1.5">{call.answered ? formatClock(call.durationSec) : "timbrando"}</span>
        </p>
      )}
    </div>
  );
}

const HEADERS = ["Llamadas", "Contestadas", "Tiempo hablado", "SMS", "Leads contactados", "Tareas", "Última actividad"];

/** Estado y contadores de hoy por asesor. Solo presenta: los datos llegan por props. */
export function AdvisorLiveTable({ advisors, loading, showClient }: AdvisorLiveTableProps) {
  return (
    <section className="rounded-2xl bg-white border border-[#E8E6DF] shadow-sm overflow-hidden">
      <h2 className="px-5 pt-5 pb-3 text-sm font-semibold text-[#1F1E1D] flex items-center gap-2">
        <Users className="w-4 h-4 text-[#D97757]" />
        Asesores
        <span className="text-[11px] font-mono text-[#82807C]">{advisors.length}</span>
      </h2>

      {loading && advisors.length === 0 ? (
        <p className="px-5 pb-5 text-xs text-[#82807C]">Cargando actividad del equipo…</p>
      ) : advisors.length === 0 ? (
        <p className="px-5 pb-5 text-xs text-[#82807C]">No hay asesores activos en esta empresa.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#FAF9F5] text-[#82807C] text-[11px]">
              <tr>
                <th className="text-left font-medium px-5 py-2">Asesor</th>
                <th className="text-left font-medium px-3 py-2">Estado</th>
                {HEADERS.map((header) => (
                  <th key={header} className="text-right font-medium px-3 py-2 whitespace-nowrap">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {advisors.map((advisor) => (
                <tr key={advisor.userId} className="border-t border-[#F0EEE8]">
                  <td className="px-5 py-3">
                    <p className="font-semibold text-[#1F1E1D] flex items-center gap-1.5">
                      {advisor.name}
                      {advisor.isOwner && <Crown className="w-3.5 h-3.5 text-amber-500" aria-label="Dueño" />}
                    </p>
                    <p className="text-[11px] text-[#82807C]">{showClient ? advisor.clientName ?? "Sin empresa" : advisor.email}</p>
                  </td>
                  <td className="px-3 py-3">
                    <StatusCell advisor={advisor} />
                  </td>
                  <td className="px-3 py-3 text-right font-mono">{advisor.today.callsMade}</td>
                  <td className="px-3 py-3 text-right font-mono">{advisor.today.callsAnswered}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatClock(advisor.today.talkTimeSec)}</td>
                  <td className="px-3 py-3 text-right font-mono">{advisor.today.smsSent}</td>
                  <td className="px-3 py-3 text-right font-mono">{advisor.today.leadsContacted}</td>
                  <td className="px-3 py-3 text-right font-mono">{advisor.today.tasksCompleted}</td>
                  <td className="px-3 py-3 text-right text-[#82807C] whitespace-nowrap">{timeOf(advisor.lastActivityAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
