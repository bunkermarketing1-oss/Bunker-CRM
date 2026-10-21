"use client";

import React from "react";
import { Phone, RefreshCw } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useCalls } from "@/hooks/useCalls";
import { useCallableLeads } from "@/hooks/useCallableLeads";
import { usePhoneLines } from "@/hooks/usePhoneLines";
import { useClientOptions } from "@/hooks/useClientOptions";
import { useVoiceDevice } from "@/hooks/useVoiceDevice";
import { PhonePanel } from "@/components/calls/PhonePanel";
import { LiveCallsPanel } from "@/components/calls/LiveCallsPanel";
import { CallHistoryList } from "@/components/calls/CallHistoryList";
import { PhoneLinesPanel } from "@/components/calls/PhoneLinesPanel";

export default function CallsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" && !user?.isClientUser;

  const { calls, liveCalls, loading: callsLoading, refresh: refreshCalls } = useCalls();
  const leads = useCallableLeads();
  const clientOptions = useClientOptions();
  const { lines, create: createLine, update: updateLine } = usePhoneLines(isAdmin);

  const device = useVoiceDevice({
    onCallEnded: () => {
      refreshCalls();
    },
    receiveIncoming: true,
  });

  const canJoin = device.phase === "ready" && !device.active;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EAECF0]">
        <div>
          <h1 className="text-2xl font-semibold text-[#101828] tracking-tight flex items-center gap-2.5">
            <Phone className="w-6 h-6 text-amber-500 shrink-0" />
            <span>Central Telefónica & Marcación</span>
          </h1>
        </div>

        <button
          onClick={refreshCalls}
          className="p-2.5 rounded-xl bg-white border border-[#EAECF0] text-[#475467] hover:text-[#101828] text-xs transition-colors self-start sm:self-auto shadow-2xs"
          title="Actualizar llamadas"
        >
          <RefreshCw className={`w-4 h-4 ${callsLoading ? "animate-spin text-amber-500" : ""}`} />
        </button>
      </div>

      {/* Grid Principal: Marcador + Supervisión en vivo + Historial + Líneas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Columna Izquierda: Teléfono y Llamadas en Vivo (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <PhonePanel
            phase={device.phase}
            error={device.error}
            active={device.active}
            incoming={device.incoming}
            leads={leads}
            onCall={(leadId, label) => device.callLead(leadId, label)}
            onHangup={() => device.hangup()}
            onToggleMute={() => device.toggleMute()}
            onAccept={() => device.acceptIncoming()}
            onReject={() => device.rejectIncoming()}
          />

          {/* Panel de Supervisión en Vivo (Admin o Dueño de Cliente) */}
          <LiveCallsPanel
            calls={liveCalls}
            canJoin={canJoin}
            onMonitor={(callId, mode, label) => device.monitor(callId, mode, label)}
          />
        </div>

        {/* Columna Derecha: Historial de Llamadas y Configuración de Líneas (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <CallHistoryList calls={calls} loading={callsLoading} />

          {isAdmin && (
            <PhoneLinesPanel
              lines={lines}
              clients={clientOptions}
              onCreate={createLine}
              onUpdate={updateLine}
            />
          )}
        </div>
      </div>
    </div>
  );
}
