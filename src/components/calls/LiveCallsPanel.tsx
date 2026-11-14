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
    <section className="p-5 rounded-[28px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#F2F4F7] dark:border-[#1F242D]">
        <h2 className="text-sm font-black text-[#121417] dark:text-white flex items-center gap-2 tracking-tight">
          <div className="relative flex items-center justify-center">
            {calls.length > 0 && (
              <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-rose-400 opacity-75" />
            )}
            <Radio className={`w-4 h-4 ${calls.length > 0 ? "text-rose-600" : "text-[#8C929D]"}`} />
          </div>
          <span>Supervisión en Vivo</span>
        </h2>
        <span
          className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border font-bold ${
            calls.length > 0
              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 animate-pulse"
              : "bg-[#F8F9FA] dark:bg-[#1A1D24] text-[#8C929D] border-[#E2E5EB] dark:border-[#242A35]"
          }`}
        >
          {calls.length} en curso
        </span>
      </div>

      {calls.length === 0 ? (
        <div className="py-7 px-4 text-center rounded-2xl bg-[#F8F9FA] dark:bg-[#181B22] border border-dashed border-[#E2E5EB] dark:border-[#242A35] space-y-1">
          <p className="text-xs font-bold text-[#121417] dark:text-white">Ninguna llamada activa en este momento</p>
          <p className="text-[11px] text-[#8C929D] font-medium max-w-xs mx-auto">
            Cuando un asesor o cliente esté en llamada, aparecerá aquí para escuchar o asistir en tiempo real.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {calls.map((call) => {
            const label = `${call.userName ?? "Asesor"} → ${call.leadName ?? call.toNumber}`;
            return (
              <li
                key={call.id}
                className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#181B22] border border-rose-200/80 dark:border-rose-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center text-rose-600 dark:text-rose-400 flex-shrink-0">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#121417] dark:text-white truncate">{label}</p>
                    <p className="text-[11px] text-[#8C929D] flex items-center gap-1.5 mt-0.5 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                      <span>{call.answeredAt ? `En llamada desde ${new Date(call.answeredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : "Timbrando al destinatario…"}</span>
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 flex-shrink-0 self-end sm:self-auto">
                  <button
                    type="button"
                    disabled={!canJoin}
                    onClick={() => onMonitor(call.id, MONITOR_MODE.LISTEN, label)}
                    className="px-3 py-1.5 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#242A35] hover:border-amber-400 text-[11px] font-bold text-[#121417] dark:text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                    title="Escuchar la llamada en modo silencioso (nadie te oye)"
                  >
                    <Ear className="w-3.5 h-3.5 text-amber-500" />
                    <span>Escuchar</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canJoin}
                    onClick={() => onMonitor(call.id, MONITOR_MODE.WHISPER, label)}
                    className="px-3 py-1.5 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#242A35] hover:border-blue-400 text-[11px] font-bold text-[#121417] dark:text-white flex items-center gap-1.5 transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                    title="Hablar únicamente con el asesor (el lead no te escucha)"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-blue-500" />
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
