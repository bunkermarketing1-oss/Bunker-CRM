"use client";

import React, { Suspense } from "react";
import { RefreshCw } from "lucide-react";
import { AppointmentsCalendarView } from "@/components/appointments/AppointmentsCalendarView";
import { AvailabilityPanel } from "@/components/appointments/AvailabilityPanel";

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
      <div>
        <h1 className="text-2xl sm:text-3xl font-black text-[#121417] dark:text-white tracking-tight">Citas</h1>
        <p className="text-xs text-[#8C929D] mt-0.5">Recordatorios por SMS automáticos 24 h y 2 h antes de cada cita.</p>
      </div>

      <AvailabilityPanel />

      {/* Vista de Citas y Calendario */}
      <AppointmentsCalendarView />
    </div>
  );
}
