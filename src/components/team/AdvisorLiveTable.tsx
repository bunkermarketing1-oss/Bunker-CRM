import React from "react";
import { Crown, Users, Calendar, Trash2 } from "lucide-react";
import { ADVISOR_STATUS, ADVISOR_STATUS_LABEL, type AdvisorStatus } from "@/lib/constants/team";
import { formatClock } from "@/lib/team-live";
import type { AdvisorLiveRow } from "@/types/team";

interface AdvisorLiveTableProps {
  advisors: AdvisorLiveRow[];
  loading: boolean;
  /** Bunker ve varios clientes a la vez: se muestra la columna de empresa. */
  showClient: boolean;
  onOpenAttendanceModal?: (sellerId: string, sellerName: string) => void;
  onDeleteAdvisor?: (sellerId: string, sellerName: string) => void;
}

const STATUS_STYLE: Record<AdvisorStatus, string> = {
  on_call: "bg-red-50 text-red-700 border-red-200",
  available: "bg-emerald-50 text-emerald-700 border-emerald-200",
  idle: "bg-[#FAF9F5] text-[#82807C] border-[#E8E6DF]",
};

const timeOf = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true }) : "Sin actividad hoy";

function StatusCell({ advisor }: { advisor: AdvisorLiveRow }) {
  const call = advisor.currentCall;
  const isOnline = advisor.status === ADVISOR_STATUS.AVAILABLE;
  const isOnCall = advisor.status === ADVISOR_STATUS.ON_CALL;

  return (
    <div className="space-y-1">
      <span
        className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${STATUS_STYLE[advisor.status]}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isOnline ? "bg-emerald-500 animate-pulse" : isOnCall ? "bg-red-500 animate-pulse" : "bg-zinc-400"
          }`}
        />
        {ADVISOR_STATUS_LABEL[advisor.status]}
      </span>

      {isOnCall && call && (
        <p className="text-[11px] text-[#1F1E1D] truncate max-w-[180px]">
          {call.leadName ?? call.counterpart}
          <span className="font-mono text-[#82807C] ml-1.5">{call.answered ? formatClock(call.durationSec) : "timbrando"}</span>
        </p>
      )}

      {advisor.isCheckedIn && advisor.checkedInAt && (
        <p className="text-[10px] text-emerald-700 font-mono">
          Entrada: {new Date(advisor.checkedInAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true })}
        </p>
      )}
    </div>
  );
}

/** Estado, canales atendidos y contadores de hoy por asesor. */
export function AdvisorLiveTable({
  advisors,
  loading,
  showClient,
  onOpenAttendanceModal,
  onDeleteAdvisor,
}: AdvisorLiveTableProps) {
  return (
    <section className="rounded-2xl bg-white border border-[#E8E6DF] shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-[#F0EEE8]">
        <h2 className="text-sm font-bold text-[#1F1E1D] flex items-center gap-2">
          <Users className="w-4 h-4 text-[#D97757]" />
          <span>Ejecutivos de Venta & Rendimiento Diario</span>
          <span className="text-[11px] font-mono text-[#82807C] bg-[#FAF9F5] px-2 py-0.5 rounded-md border border-[#E8E6DF]">
            {advisors.length}
          </span>
        </h2>
        <span className="text-[11px] text-[#82807C] hidden sm:inline">
          Haz clic en cualquier vendedor para abrir su bitácora de los últimos 15 días
        </span>
      </div>

      {loading && advisors.length === 0 ? (
        <p className="px-5 py-8 text-center text-xs text-[#82807C]">Cargando actividad de ejecutivos…</p>
      ) : advisors.length === 0 ? (
        <p className="px-5 py-8 text-center text-xs text-[#82807C]">No hay ejecutivos de venta asignados a esta empresa.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#FAF9F5] text-[#82807C] text-[11px]">
              <tr>
                <th className="text-left font-medium px-5 py-2.5">Ejecutivo de Venta</th>
                <th className="text-left font-medium px-3 py-2.5">Estatus</th>
                <th className="text-center font-medium px-3 py-2.5">Canales Atendidos Hoy</th>
                <th className="text-right font-medium px-3 py-2.5">Llamadas</th>
                <th className="text-right font-medium px-3 py-2.5">Mensajes Enviados</th>
                <th className="text-right font-medium px-3 py-2.5">Tiempo Hablado</th>
                <th className="text-right font-medium px-3 py-2.5">Última Actividad</th>
                <th className="text-center font-medium px-4 py-2.5">Bitácora</th>
                {onDeleteAdvisor && <th className="text-center font-medium px-3 py-2.5">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EEE8]">
              {advisors.map((advisor) => (
                <tr
                  key={advisor.userId}
                  onClick={() => onOpenAttendanceModal?.(advisor.userId, advisor.name)}
                  className="hover:bg-[#FAF9F5]/70 transition-colors cursor-pointer group"
                >
                  <td className="px-5 py-3">
                    <p className="font-semibold text-[#1F1E1D] group-hover:text-amber-800 transition-colors flex items-center gap-1.5">
                      <span className="group-hover:underline">{advisor.name}</span>
                      {advisor.isOwner && <Crown className="w-3.5 h-3.5 text-amber-500" aria-label="Dueño" />}
                    </p>
                    <p className="text-[11px] text-[#82807C]">{showClient ? advisor.clientName ?? "Sin empresa" : advisor.email}</p>
                  </td>

                  <td className="px-3 py-3">
                    <StatusCell advisor={advisor} />
                  </td>

                  {/* Canales atendidos hoy */}
                  <td className="px-3 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {advisor.today.whatsappSent > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200" title="WhatsApp">
                          WA
                        </span>
                      )}
                      {advisor.today.messengerSent > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200" title="Facebook Messenger">
                          FB
                        </span>
                      )}
                      {advisor.today.instagramSent > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-pink-50 text-pink-800 border border-pink-200" title="Instagram Direct">
                          IG
                        </span>
                      )}
                      {advisor.today.smsSent > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200" title="Twilio SMS">
                          SMS
                        </span>
                      )}
                      {advisor.today.callsMade > 0 && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200" title="Llamadas">
                          TEL
                        </span>
                      )}
                      {advisor.today.channelsAttended.length === 0 && (
                        <span className="text-[10px] text-zinc-400">Sin canales hoy</span>
                      )}
                    </div>
                  </td>

                  {/* Llamadas */}
                  <td className="px-3 py-3 text-right">
                    <span className="font-mono font-semibold text-[#1F1E1D]">{advisor.today.callsMade}</span>
                    <span className="text-[10px] text-[#82807C] block">({advisor.today.callsAnswered} cont.)</span>
                  </td>

                  {/* Mensajes enviados hoy */}
                  <td className="px-3 py-3 text-right">
                    <span className="font-mono font-semibold text-[#1F1E1D]">{advisor.today.totalMessagesSent}</span>
                    {advisor.today.totalMessagesSent > 0 && (
                      <span className="text-[10px] text-[#82807C] block">
                        (WA: {advisor.today.whatsappSent} · FB: {advisor.today.messengerSent} · IG: {advisor.today.instagramSent} · SMS: {advisor.today.smsSent})
                      </span>
                    )}
                  </td>

                  {/* Tiempo hablado */}
                  <td className="px-3 py-3 text-right font-mono text-[#1F1E1D]">{formatClock(advisor.today.talkTimeSec)}</td>

                  {/* Última actividad */}
                  <td className="px-3 py-3 text-right text-[#82807C] whitespace-nowrap">{timeOf(advisor.lastActivityAt)}</td>

                  {/* Botón Bitácora */}
                  <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onOpenAttendanceModal?.(advisor.userId, advisor.name)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white hover:bg-slate-900 hover:text-white border border-[#E8E6DF] text-[#1F1E1D] text-[11px] font-medium transition-colors shadow-xs cursor-pointer"
                      title="Ver bitácora de asistencia de los últimos 15 días"
                    >
                      <Calendar className="w-3 h-3 text-amber-500" />
                      <span>15 días</span>
                    </button>
                  </td>

                  {/* Botón Eliminar para Administrador */}
                  {onDeleteAdvisor && (
                    <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onDeleteAdvisor(advisor.userId, advisor.name)}
                        className="inline-flex items-center justify-center p-1.5 rounded-lg border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors shadow-xs cursor-pointer"
                        title={`Eliminar asesor ${advisor.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
