"use client";

import React, { Suspense } from "react";
import { CalendarDays, ShieldCheck, RefreshCw } from "lucide-react";
import { AppointmentsCalendarView } from "@/components/appointments/AppointmentsCalendarView";

export default function AppointmentsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-semibold text-[#8C929D] flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
          <span>Cargando agenda de citas...</span>
        </div>
      }
    >
      <AppointmentsPageContent />
    </Suspense>
  );
}

function AppointmentsPageContent() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Cabecera Estilo Cápsula Orvion */}
      <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] p-6 shadow-orvion">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="orvion-badge-gold">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Suite de Agendamiento & Conversión</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F8F9FA] dark:bg-[#1A1D24] text-[#8C929D] border border-[#E2E5EB] dark:border-[#242A35]">
                Recordatorios SMS Automáticos (24h y 2h)
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#121417] dark:text-white tracking-tight flex items-center gap-2.5">
              <CalendarDays className="w-6 h-6 text-amber-500 shrink-0" />
              <span>Citas & Calendario Comercial</span>
            </h1>
            <p className="text-xs text-[#8C929D] font-medium max-w-2xl leading-relaxed">
              Programa visitas a showroom, citas virtuales y llamadas de cierre. Comparte enlaces públicos de agendamiento y activa recordatorios automáticos por SMS para eliminar el ausentismo de clientes.
            </p>
          </div>
        </div>
      </div>

      {/* Vista de Citas y Calendario */}
      <AppointmentsCalendarView />
    </div>
  );
}
