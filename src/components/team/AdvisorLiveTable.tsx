import React from "react";
import { Crown, Users, Calendar, Trash2, Timer } from "lucide-react";
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
  on_call: "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50",
  available: "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50",
  idle: "bg-[#F8F9FA] dark:bg-[#1A1D24] text-[#8C929D] border-[#E2E5EB] dark:border-[#242A35]",
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
        className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${STATUS_STYLE[advisor.status]}`}
      >
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isOnline ? "bg-emerald-500 animate-pulse" : isOnCall ? "bg-rose-500 animate-pulse" : "bg-zinc-400"
          }`}
        />
        {ADVISOR_STATUS_LABEL[advisor.status]}
      </span>

      {isOnCall && call && (
        <p className="text-[11px] text-[#121417] dark:text-white truncate max-w-[180px] font-medium">
          {call.leadName ?? call.counterpart}
          <span className="font-mono text-[#8C929D] ml-1.5">{call.answered ? formatClock(call.durationSec) : "timbrando"}</span>
        </p>
      )}

      {advisor.isCheckedIn && advisor.checkedInAt && (
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
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
    <section className="rounded-[28px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion overflow-hidden transition-all">
      <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-[#F2F4F7] dark:border-[#1F242D]">
        <h2 className="text-sm font-black text-[#121417] dark:text-white flex items-center gap-2 tracking-tight">
          <Users className="w-4 h-4 text-amber-500" />
          <span>Ejecutivos de Venta & Rendimiento Diario</span>
          <span className="text-[11px] font-bold text-[#121417] dark:text-white bg-[#F8F9FA] dark:bg-[#1A1D24] px-2.5 py-0.5 rounded-full border border-[#E2E5EB] dark:border-[#242A35]">
            {advisors.length}
          </span>
        </h2>
        <span className="text-[11px] text-[#8C929D] font-medium hidden sm:inline">
          Haz clic en cualquier vendedor para abrir su bitácora de los últimos 15 días
        </span>
      </div>

      {loading && advisors.length === 0 ? (
        <p className="px-5 py-10 text-center text-xs text-[#8C929D] font-medium">Cargando actividad de ejecutivos…</p>
      ) : advisors.length === 0 ? (
        <p className="px-5 py-10 text-center text-xs text-[#8C929D] font-medium">No hay ejecutivos de venta asignados a esta empresa.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-[#F8F9FA] dark:bg-[#181B22] text-[#8C929D] text-[11px] border-b border-[#F2F4F7] dark:border-[#1F242D]">
              <tr>
                <th className="text-left font-bold px-6 py-3">Ejecutivo de Venta</th>
                <th className="text-left font-bold px-3 py-3">Estatus</th>
                <th className="text-center font-bold px-3 py-3">Canales Atendidos Hoy</th>
                <th className="text-right font-bold px-3 py-3">Llamadas</th>
                <th className="text-right font-bold px-3 py-3">Mensajes Enviados</th>
                <th className="text-center font-bold px-3 py-3">SLA / Velocidad</th>
                <th className="text-right font-bold px-3 py-3">Tiempo Hablado</th>
                <th className="text-right font-bold px-3 py-3">Última Actividad</th>
                <th className="text-center font-bold px-4 py-3">Bitácora</th>
                {onDeleteAdvisor && <th className="text-center font-bold px-3 py-3">Acción</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#1F242D]">
              {advisors.map((advisor) => (
                <tr
                  key={advisor.userId}
                  onClick={() => onOpenAttendanceModal?.(advisor.userId, advisor.name)}
                  className="hover:bg-[#F8F9FA]/80 dark:hover:bg-[#181B22]/60 transition-colors cursor-pointer group"
                >
                  <td className="px-6 py-3.5">
                    <p className="font-bold text-[#121417] dark:text-white group-hover:text-amber-500 transition-colors flex items-center gap-1.5">
                      <span className="group-hover:underline">{advisor.name}</span>
                      {advisor.isOwner && <Crown className="w-3.5 h-3.5 text-amber-500" aria-label="Dueño" />}
                    </p>
                    <p className="text-[11px] text-[#8C929D] font-medium">{showClient ? advisor.clientName ?? "Sin empresa" : advisor.email}</p>
                  </td>

                  <td className="px-3 py-3.5">
                    <StatusCell advisor={advisor} />
                  </td>

                  {/* Canales atendidos hoy */}
                  <td className="px-3 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {advisor.today.whatsappSent > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800" title="WhatsApp">
                          WA
                        </span>
                      )}
                      {advisor.today.messengerSent > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800" title="Facebook Messenger">
                          FB
                        </span>
                      )}
                      {advisor.today.instagramSent > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-50 dark:bg-pink-950/40 text-pink-800 dark:text-pink-300 border border-pink-200 dark:border-pink-800" title="Instagram Direct">
                          IG
                        </span>
                      )}
                      {advisor.today.smsSent > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800" title="Twilio SMS">
                          SMS
                        </span>
                      )}
                      {advisor.today.callsMade > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800" title="Llamadas">
                          TEL
                        </span>
                      )}
                      {advisor.today.channelsAttended.length === 0 && (
                        <span className="text-[10px] text-[#8C929D] font-medium">Sin canales hoy</span>
                      )}
                    </div>
                  </td>

                  {/* Llamadas */}
                  <td className="px-3 py-3.5 text-right">
                    <span className="font-mono font-bold text-[#121417] dark:text-white">{advisor.today.callsMade}</span>
                    <span className="text-[10px] text-[#8C929D] block">({advisor.today.callsAnswered} cont.)</span>
                  </td>

                  {/* Mensajes enviados hoy */}
                  <td className="px-3 py-3.5 text-right">
                    <span className="font-mono font-bold text-[#121417] dark:text-white">{advisor.today.totalMessagesSent}</span>
                    {advisor.today.totalMessagesSent > 0 && (
                      <span className="text-[10px] text-[#8C929D] block font-medium">
                        (WA: {advisor.today.whatsappSent} · FB: {advisor.today.messengerSent} · IG: {advisor.today.instagramSent} · SMS: {advisor.today.smsSent})
                      </span>
                    )}
                  </td>

                  {/* Velocidad de Respuesta y SLA */}
                  <td className="px-3 py-3.5 text-center">
                    {advisor.today.slaResponseRate !== null && advisor.today.slaResponseRate !== undefined ? (
                      <div className="flex flex-col items-center gap-0.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border shadow-2xs ${
                            advisor.today.slaResponseRate >= 80
                              ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                              : advisor.today.slaResponseRate >= 50
                              ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                              : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                          }`}
                          title={`${advisor.today.slaResponseRate}% de respuestas dentro del tiempo estipulado`}
                        >
                          <Timer className="w-2.5 h-2.5 shrink-0" />
                          <span>{advisor.today.slaResponseRate}% a tiempo</span>
                        </span>
                        <span className="text-[9px] text-[#8C929D] font-mono">
                          {advisor.today.slaOkCount ?? 0} rápidas • {advisor.today.slaBreachedCount ?? 0} lentas
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-[#8C929D] font-medium">Sin respuestas hoy</span>
                    )}
                  </td>

                  {/* Tiempo hablado */}
                  <td className="px-3 py-3.5 text-right font-mono font-bold text-[#121417] dark:text-white">{formatClock(advisor.today.talkTimeSec)}</td>

                  {/* Última actividad */}
                  <td className="px-3 py-3.5 text-right text-[#8C929D] whitespace-nowrap font-medium">{timeOf(advisor.lastActivityAt)}</td>

                  {/* Botón Bitácora */}
                  <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => onOpenAttendanceModal?.(advisor.userId, advisor.name)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#F8F9FA] hover:bg-[#121417] text-[#121417] hover:text-white dark:bg-[#1A1D24] dark:hover:bg-white dark:text-white dark:hover:text-[#121417] border border-[#E2E5EB] dark:border-[#2A2E37] text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                      title="Ver bitácora de asistencia de los últimos 15 días"
                    >
                      <Calendar className="w-3 h-3 text-amber-500" />
                      <span>15 días</span>
                    </button>
                  </td>

                  {/* Botón Eliminar para Administrador */}
                  {onDeleteAdvisor && (
                    <td className="px-3 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onDeleteAdvisor(advisor.userId, advisor.name)}
                        className="inline-flex items-center justify-center p-1.5 rounded-full border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 transition-colors shadow-2xs cursor-pointer"
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
