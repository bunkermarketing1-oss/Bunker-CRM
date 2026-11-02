"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Calendar,
  Clock,
  PhoneCall,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  Building2,
  CheckCircle2,
} from "lucide-react";
import type { SellerAttendanceHistoryResponse } from "@/types/team";

interface SellerAttendanceModalProps {
  sellerId: string | null;
  sellerName: string;
  onClose: () => void;
}

export function SellerAttendanceModal({ sellerId, sellerName, onClose }: SellerAttendanceModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<SellerAttendanceHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sellerId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetch(`/api/team/attendance/${sellerId}?days=15`)
      .then((res) => res.json())
      .then((json: SellerAttendanceHistoryResponse) => {
        if (!isMounted) return;
        if (json.success) {
          setData(json);
        } else {
          setError(json.error || "No se pudo cargar la bitácora.");
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [sellerId]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!sellerId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-3xl border border-[#EAECF0] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-label="Bitácora de Asistencia del Vendedor"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-5 sm:p-6 border-b border-[#EAECF0] bg-gradient-to-r from-[#FAF9F5] to-white">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold tracking-wider uppercase text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
                Bitácora de Ejecutivos de Venta · Últimos 15 Días
              </span>
              {data?.clientName && (
                <span className="text-[11px] font-medium text-[#667085] flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-amber-600" />
                  {data.clientName}
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#101828] tracking-tight flex items-center gap-2">
              <span>{data?.sellerName || sellerName}</span>
            </h2>
            <p className="text-xs text-[#667085]">
              Auditoría diaria de check-in, check-out por hora y resumen de actividades comerciales (llamadas y mensajes).
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-[#667085] hover:text-[#101828] hover:bg-[#EAECF0] transition-colors cursor-pointer"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading && (
            <div className="py-16 flex flex-col items-center justify-center space-y-3 text-[#667085]">
              <RefreshCw className="w-7 h-7 animate-spin text-amber-500" />
              <p className="text-sm font-medium text-[#101828]">Cargando bitácora de asistencia...</p>
              <p className="text-xs text-[#667085]">Consolidando turnos y actividades de los últimos 15 días.</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-semibold">No se pudo cargar la información</p>
                <p className="text-amber-800">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Tarjetas de Resumen de 15 Días */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#667085] font-medium">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    <span>Días en Turno</span>
                  </div>
                  <p className="text-lg font-bold text-[#101828]">
                    {data.totals.daysWorked} <span className="text-xs font-normal text-[#667085]">/ 15 días</span>
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#667085] font-medium">
                    <Clock className="w-3.5 h-3.5 text-blue-600" />
                    <span>Horas Trabajadas</span>
                  </div>
                  <p className="text-lg font-bold text-[#101828]">{data.totals.totalHoursFormatted}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#667085] font-medium">
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Llamadas Totales</span>
                  </div>
                  <p className="text-lg font-bold text-[#101828]">{data.totals.totalCalls}</p>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#667085] font-medium">
                    <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                    <span>Mensajes Totales</span>
                  </div>
                  <p className="text-lg font-bold text-[#101828]">{data.totals.totalMessages}</p>
                </div>
              </div>

              {/* Desglose de Canales Atendidos */}
              <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700">Total mensajes por canal en 15 días:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                  WhatsApp: {data.totals.whatsappTotal}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-semibold text-[11px]">
                  Messenger: {data.totals.messengerTotal}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-pink-100 text-pink-800 font-semibold text-[11px]">
                  Instagram: {data.totals.instagramTotal}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 font-semibold text-[11px]">
                  SMS: {data.totals.smsTotal}
                </span>
              </div>

              {/* Tabla Día por Día */}
              <div className="rounded-2xl border border-[#EAECF0] overflow-hidden shadow-xs">
                <div className="px-4 py-3 bg-[#FAF9F5] border-b border-[#EAECF0] flex items-center justify-between">
                  <h3 className="text-xs font-bold text-[#101828]">Detalle Cronológico (Día a Día)</h3>
                  <span className="text-[11px] text-[#667085]">Hora y duración exacta de turnos</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#FAF9F5]/70 text-[#667085] text-[11px] border-b border-[#EAECF0]">
                      <tr>
                        <th className="py-2.5 px-4 font-semibold">Fecha</th>
                        <th className="py-2.5 px-3 font-semibold">Estado</th>
                        <th className="py-2.5 px-3 font-semibold">Entrada (Check-in)</th>
                        <th className="py-2.5 px-3 font-semibold">Salida (Check-out)</th>
                        <th className="py-2.5 px-3 font-semibold">Duración</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Llamadas</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Mensajes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EEE8]">
                      {data.days.map((day) => (
                        <tr key={day.date} className="hover:bg-[#FAF9F5]/60 transition-colors">
                          <td className="py-2.5 px-4 font-medium text-[#101828] capitalize">
                            {day.dayLabel}
                            <span className="block text-[10px] text-[#667085] font-mono">{day.date}</span>
                          </td>

                          <td className="py-2.5 px-3">
                            {day.status === "completed" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Turno Completo
                              </span>
                            ) : day.status === "in_progress" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                                En Turno
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-zinc-100 text-zinc-500 border border-zinc-200">
                                Sin Registro
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 font-mono text-[#101828]">
                            {day.checkInTime || <span className="text-zinc-400">—</span>}
                          </td>

                          <td className="py-2.5 px-3 font-mono text-[#101828]">
                            {day.checkOutTime || <span className="text-zinc-400">—</span>}
                          </td>

                          <td className="py-2.5 px-3 font-medium text-[#101828]">
                            {day.durationMinutes > 0 ? (
                              day.durationFormatted
                            ) : (
                              <span className="text-zinc-400">0m</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-semibold text-[#101828]">
                            {day.callsMade}
                          </td>

                          <td className="py-2.5 px-4 text-right">
                            <span className="font-mono font-semibold text-[#101828] mr-2">
                              {day.totalMessages}
                            </span>
                            {day.totalMessages > 0 && (
                              <span className="text-[10px] text-[#667085]">
                                (WA: {day.whatsappMessages} · FB: {day.messengerMessages} · IG: {day.instagramMessages} · SMS: {day.smsMessages})
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#EAECF0] bg-[#FAF9F5] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[#101828] hover:bg-slate-800 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Cerrar Bitácora
          </button>
        </div>
      </div>
    </div>
  );
}
