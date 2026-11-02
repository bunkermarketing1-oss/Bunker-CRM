"use client";

import React, { useState, useRef, useEffect } from "react";
import { LogIn, LogOut, Clock } from "lucide-react";
import { useAttendance } from "@/hooks/useAttendance";

export function AttendanceCheckInButton() {
  const { isCheckedIn, liveClock, checkIn, checkOut, loading } = useAttendance();
  const [showConfirm, setShowConfirm] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cerrar confirmación al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowConfirm(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-2xl bg-white border border-[#EAECF0] text-xs text-[#82807C] animate-pulse">
        <span className="w-2 h-2 rounded-full bg-slate-300" />
        <span className="text-[11px]">Turno...</span>
      </div>
    );
  }

  return (
    <div className="relative shrink-0" ref={containerRef}>
      {!isCheckedIn ? (
        <button
          type="button"
          onClick={() => checkIn()}
          className="flex items-center gap-2 h-9 px-3 rounded-2xl bg-white hover:bg-emerald-50/50 border border-[#EAECF0] hover:border-emerald-300 text-xs font-semibold text-[#101828] transition-all shadow-xs cursor-pointer group"
          title="Iniciar turno comercial de atención"
        >
          <span className="w-2 h-2 rounded-full bg-zinc-400 group-hover:bg-emerald-500 transition-colors" />
          <LogIn className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-600 transition-colors" />
          <span className="text-[11px] font-medium hidden sm:inline">Iniciar Turno</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowConfirm((prev) => !prev)}
          className="flex items-center gap-2 h-9 px-3 rounded-2xl bg-emerald-50/80 hover:bg-emerald-100/80 border border-emerald-300/80 text-xs font-semibold text-emerald-900 transition-all shadow-xs cursor-pointer"
          title="Estás en turno activo. Clic para registrar salida."
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-[11px] font-bold text-emerald-950">En Turno</span>
          <span className="font-mono text-[10px] bg-white/80 px-1.5 py-0.5 rounded text-emerald-800 border border-emerald-200">
            {liveClock}
          </span>
        </button>
      )}

      {/* Popover de confirmación para Check-out */}
      {showConfirm && isCheckedIn && (
        <div className="absolute right-0 top-11 z-50 w-64 p-3.5 rounded-2xl bg-white border border-[#EAECF0] shadow-xl space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#101828]">Turno Activo</h4>
              <p className="text-[11px] text-[#667085]">Llevas {liveClock} conectado en esta jornada.</p>
            </div>
          </div>

          <div className="pt-2 border-t border-[#F0EEE8] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="px-2.5 py-1 text-[11px] font-medium text-[#667085] hover:text-[#101828] cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConfirm(false);
                checkOut();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold transition-colors cursor-pointer shadow-xs"
            >
              <LogOut className="w-3 h-3" />
              <span>Registrar Salida</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
