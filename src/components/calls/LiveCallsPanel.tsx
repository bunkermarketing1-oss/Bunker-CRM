"use client";

import React from "react";
import { Ear, Radio, MessageCircle, User } from "lucide-react";
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
    <section className="p-5 rounded-2xl bg-white border border-[#EAECF0] shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#F2F4F7]">
        <h2 className="text-sm font-bold text-[#101828] flex items-center gap-2">
          <div className="relative flex items-center justify-center">
            {calls.length > 0 && (
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-red-400 opacity-75" />
            )}
            <Radio className={`w-4 h-4 ${calls.length > 0 ? "text-red-600" : "text-[#98A2B3]"}`} />
          </div>
          <span>Supervisión en Vivo</span>
        </h2>
        <span
          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${
            calls.length > 0
              ? "bg-red-50 text-red-700 border-red-200 animate-pulse"
              : "bg-[#F8F9FA] text-[#667085] border-[#EAECF0]"
          }`}
        >
          {calls.length} en curso
        </span>
      </div>

      {calls.length === 0 ? (
        <div className="py-6 px-4 text-center rounded-xl bg-[#F9FAFB] border border-[#EAECF0]/60 space-y-1">
          <p className="text-xs font-medium text-[#475467]">Ninguna llamada activa en este momento</p>
          <p className="text-[11px] text-[#98A2B3]">
            Cuando un asesor o cliente esté en llamada, aparecerá aquí para escuchar o asistir en tiempo real.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {calls.map((call) => {
            const label = `${call.userName ?? "Asesor"} → ${call.leadName ?? call.toNumber}`;
            return (
              <li
                key={call.id}
                className="p-3.5 rounded-xl bg-gradient-to-r from-red-50/40 via-white to-red-50/20 border border-red-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-red-100/70 border border-red-200 flex items-center justify-center text-red-700 flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#101828] truncate">{label}</p>
                    <p className="text-[11px] text-[#667085] flex items-center gap-1.5 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                      <span>{call.answeredAt ? `En llamada desde ${new Date(call.answeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : "Timbrando al destinatario…"}</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={!canJoin}
                    onClick={() => onMonitor(call.id, MONITOR_MODE.LISTEN, label)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-[#D0D5DD] hover:border-amber-400 hover:bg-amber-50 text-[11px] font-semibold text-[#344054] flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                    title="Escuchar la llamada en modo silencioso (nadie te oye)"
                  >
                    <Ear className="w-3.5 h-3.5 text-amber-600" />
                    <span>Escuchar</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canJoin}
                    onClick={() => onMonitor(call.id, MONITOR_MODE.WHISPER, label)}
                    className="px-2.5 py-1.5 rounded-lg bg-white border border-[#D0D5DD] hover:border-blue-400 hover:bg-blue-50 text-[11px] font-semibold text-[#344054] flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                    title="Hablar únicamente con el asesor (el lead no te escucha)"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-blue-600" />
                    <span>Susurrar</span>
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
