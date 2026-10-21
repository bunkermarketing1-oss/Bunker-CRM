"use client";

import React, { useState } from "react";
import { Headphones, Radio, RefreshCw, PhoneCall, Clock } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTeamLive } from "@/hooks/useTeamLive";
import { useClientOptions } from "@/hooks/useClientOptions";
import { useVoiceDevice } from "@/hooks/useVoiceDevice";
import { AdvisorLiveTable } from "@/components/team/AdvisorLiveTable";
import { LiveCallsPanel } from "@/components/calls/LiveCallsPanel";
import { MonitorSessionBar } from "@/components/team/MonitorSessionBar";
import { ADVISOR_STATUS } from "@/lib/constants/team";
import { formatClock } from "@/lib/team-live";

export default function TeamLivePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" && !user?.isClientUser;

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const clientOptions = useClientOptions();

  const { view, loading, error, refresh } = useTeamLive(selectedClientId);

  const device = useVoiceDevice({
    onCallEnded: () => {
      refresh();
    },
    receiveIncoming: false,
  });

  const advisors = view?.advisors ?? [];
  const liveCalls = view?.liveCalls ?? [];

  // Métricas agregadas de hoy
  const onCallCount = advisors.filter((a) => a.status === ADVISOR_STATUS.ON_CALL).length;
  const availableCount = advisors.filter((a) => a.status === ADVISOR_STATUS.AVAILABLE).length;
  const totalCallsToday = advisors.reduce((acc, a) => acc + a.today.callsMade, 0);
  const totalTalkSec = advisors.reduce((acc, a) => acc + a.today.talkTimeSec, 0);

  const canJoin = device.phase === "ready" && !device.active;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EAECF0]">
        <div>
          <h1 className="text-2xl font-semibold text-[#101828] tracking-tight flex items-center gap-2.5">
            <Headphones className="w-6 h-6 text-amber-500 shrink-0" />
            <span>Asesores en Vivo & Supervisión</span>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de Empresa para Administradores de Bunker */}
          {isAdmin && (
            <select
              value={selectedClientId ?? ""}
              onChange={(e) => setSelectedClientId(e.target.value ? e.target.value : null)}
              className="bg-white border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 font-semibold shadow-2xs"
            >
              <option value="">🏢 Todas las Empresas</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  👤 {c.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={refresh}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white border border-[#EAECF0] text-[#475467] hover:text-[#101828] text-xs transition-colors shadow-2xs"
            title="Actualizar estado del equipo"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Barra de Monitoreo Activo (Escucha / Susurro) */}
      <MonitorSessionBar
        phase={device.phase}
        error={device.error}
        active={device.active}
        onHangup={device.hangup}
        onToggleMute={device.toggleMute}
      />

      {/* KPI Cards de Supervisión */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#667085] mb-1">
            <span>En Llamada Ahora</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-[#101828]">{onCallCount}</div>
          <p className="text-[11px] text-[#667085] mt-1">{liveCalls.length} llamada(s) activas</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#667085] mb-1">
            <span>Disponibles</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-[#101828]">{availableCount}</div>
          <p className="text-[11px] text-[#667085] mt-1">de {advisors.length} asesores</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#667085] mb-1">
            <span>Llamadas Hoy</span>
            <PhoneCall className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-[#101828]">{totalCallsToday}</div>
          <p className="text-[11px] text-[#667085] mt-1">marcadas por el equipo</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#667085] mb-1">
            <span>Tiempo Hablado Hoy</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-[#101828] font-mono">{formatClock(totalTalkSec)}</div>
          <p className="text-[11px] text-[#667085] mt-1">conversación acumulada</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
          {error}
        </div>
      )}

      {/* Grid: Tabla de Asesores + Llamadas en Vivo */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Tabla de Asesores (8 cols) */}
        <div className="lg:col-span-8">
          <AdvisorLiveTable
            advisors={advisors}
            loading={loading}
            showClient={isAdmin && !selectedClientId}
          />
        </div>

        {/* Panel de Supervisión en Vivo & Guía (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <LiveCallsPanel
            calls={liveCalls}
            canJoin={canJoin}
            onMonitor={(callId, mode, label) => device.monitor(callId, mode, label)}
          />

          {/* Guía Rápida de Supervisión */}
          <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#EAECF0] space-y-2.5">
            <h3 className="text-xs font-bold text-[#101828] flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-amber-600" />
              <span>Instrucciones de Supervisión</span>
            </h3>
            <ul className="text-[11px] text-[#475467] space-y-2 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#101828] shrink-0">• Escuchar:</span>
                <span>Entras en modo silencioso. Ni el prospecto ni el asesor escucharán nada de tu audio.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#101828] shrink-0">• Susurrar:</span>
                <span>Solo tu asesor te escucha por sus audífonos para orientarlo; el cliente NO escucha tus instrucciones.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#101828] shrink-0">• Grabación:</span>
                <span>Las llamadas se archivan en el historial con audio descargable para auditoría de calidad comercial.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
