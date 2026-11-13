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
      <div className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-full bg-white dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] text-xs text-[#8C929D] animate-pulse">
        <span className="w-2 h-2 rounded-full bg-[#8C929D]" />
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
          className="flex items-center gap-2 h-9 px-3.5 rounded-full bg-white dark:bg-[#1A1D24] hover:bg-[#F3F4F7] dark:hover:bg-[#202530] border border-[#E2E5EB] dark:border-[#2A2E37] text-xs font-semibold text-[#121417] dark:text-white transition-all shadow-xs cursor-pointer group"
          title="Iniciar turno comercial de atención"
        >
          <span className="w-2 h-2 rounded-full bg-[#8C929D] group-hover:bg-[#D4F933] transition-colors" />
          <LogIn className="w-3.5 h-3.5 text-[#8C929D] group-hover:text-[#121417] dark:group-hover:text-white transition-colors" />
          <span className="text-[11px] font-semibold hidden sm:inline">Iniciar Turno</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setShowConfirm((prev) => !prev)}
          className="flex items-center gap-2 h-9 px-3.5 rounded-full bg-[#D4F933] hover:bg-[#C4EA22] text-xs font-extrabold text-[#121417] transition-all shadow-orvion cursor-pointer"
          title="Estás en turno activo. Clic para registrar salida."
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#121417] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#121417]" />
          </span>
          <span className="text-[11px] font-black">En Turno</span>
          <span className="font-mono text-[10px] bg-[#121417] text-white px-2 py-0.5 rounded-full">
            {liveClock}
          </span>
        </button>
      )}

      {/* Popover de confirmación para Check-out */}
      {showConfirm && isCheckedIn && (
        <div className="absolute right-0 top-11 z-50 w-64 p-4 rounded-[24px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion space-y-3 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#F3F4F7] dark:bg-[#1E2229] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-[#121417] dark:text-[#D4F933]" />
            </div>
            <div>
              <h4 className="text-xs font-extrabold text-[#121417] dark:text-white">Turno Activo</h4>
              <p className="text-[11px] text-[#8C929D] font-medium">Llevas {liveClock} conectado en esta jornada.</p>
            </div>
          </div>

          <div className="pt-2 border-t border-[#F2F4F7] dark:border-[#1F242D] flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowConfirm(false)}
              className="px-3 py-1 rounded-full text-[11px] font-semibold text-[#8C929D] hover:text-[#121417] dark:hover:text-white cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => {
                setShowConfirm(false);
                checkOut();
              }}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold transition-colors cursor-pointer shadow-xs"
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
