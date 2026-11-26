import React from "react";
import { Crown, Calendar, Trash2 } from "lucide-react";
import ActionMenu, { type ActionMenuItem } from "@/components/ui/ActionMenu";
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
        <p className="text-[10px] text-[#8C929D] font-mono font-medium">
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
  const buildMenuItems = (advisor: AdvisorLiveRow): ActionMenuItem[] => [
    {
      key: "log",
      label: "Ver bitácora de 15 días",
      icon: Calendar,
      onSelect: () => onOpenAttendanceModal?.(advisor.userId, advisor.name),
    },
    ...(onDeleteAdvisor
      ? [
          {
            key: "delete",
            label: "Eliminar asesor",
            icon: Trash2,
            onSelect: () => onDeleteAdvisor(advisor.userId, advisor.name),
          },
        ]
      : []),
  ];

  return (
    <section className="rounded-[28px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion overflow-hidden transition-all">
      <div className="px-6 pt-5 pb-4 border-b border-[#F2F4F7] dark:border-[#1F242D]">
        <div>
          <h2 className="text-sm font-black text-[#121417] dark:text-white tracking-tight">
            Ejecutivos de Venta & Rendimiento Diario
          </h2>
          <p className="text-[11px] text-[#8C929D] font-medium">
            {advisors.length} {advisors.length === 1 ? "ejecutivo" : "ejecutivos"} · Haz clic en uno para abrir su bitácora de 15 días
          </p>
        </div>
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
                <th className="text-left font-bold px-6 py-3 rounded-tl-none">Ejecutivo de Venta</th>
                <th className="text-left font-bold px-3 py-3">Estatus</th>
                <th className="text-right font-bold px-3 py-3">Llamadas</th>
                <th className="text-right font-bold px-3 py-3">Mensajes Enviados</th>
                <th className="text-center font-bold px-3 py-3">SLA / Velocidad</th>
                <th className="text-right font-bold px-3 py-3">Tiempo Hablado</th>
                <th className="text-right font-bold px-3 py-3">Última Actividad</th>
                <th className="px-4 py-3 w-12" aria-label="Acciones" />
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
                      <div
                        className="flex flex-col items-center gap-0.5"
                        title={`${advisor.today.slaResponseRate}% de respuestas dentro del tiempo estipulado`}
                      >
                        <span
                          className={`font-bold ${
                            advisor.today.slaResponseRate >= 80
                              ? "text-[#121417] dark:text-white"
                              : advisor.today.slaResponseRate >= 50
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-rose-600 dark:text-rose-400"
                          }`}
                        >
                          {advisor.today.slaResponseRate}% a tiempo
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

                  <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end">
                      <ActionMenu items={buildMenuItems(advisor)} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
