"use client";

import React, { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Phone, RefreshCw, Building2, Globe } from "lucide-react";
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
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#667085]">Cargando central telefónica...</div>}>
      <CallsContent />
    </Suspense>
  );
}

function CallsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" && !user?.isClientUser;
  const searchParams = useSearchParams();
  const urlClientId = searchParams.get("clientId");
  const urlPhone = searchParams.get("phone");
  const urlLeadId = searchParams.get("leadId");
  const urlName = searchParams.get("name");

  // Si en la URL viene clientId, se inicializa con ese o con "all"
  const [selectedClientId, setSelectedClientId] = useState<string>(urlClientId || "all");
  const clientOptions = useClientOptions();

  useEffect(() => {
    if (urlClientId) {
      setSelectedClientId(urlClientId);
    }
  }, [urlClientId]);

  const activeClient = selectedClientId && selectedClientId !== "all" ? clientOptions.find((c) => c.id === selectedClientId) : null;

  // Teléfono del navegador
  const device = useVoiceDevice({
    onCallStarted: () => {
      refreshCalls();
    },
    onCallEnded: () => {
      refreshCalls();
      // Refrescos desfasados para atrapar el webhook de duración y grabación de Twilio
      setTimeout(refreshCalls, 1500);
      setTimeout(refreshCalls, 3500);
    },
    receiveIncoming: true,
  });

  const { calls, liveCalls, loading: callsLoading, refresh: refreshCalls } = useCalls(
    selectedClientId,
    Boolean(device.active)
  );
  const leads = useCallableLeads(selectedClientId);
  const { lines, create: createLine, update: updateLine } = usePhoneLines(isAdmin);

  const canJoin = device.phase === "ready" && !device.active;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#EAECF0]">
        <div>
          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200">
              Telefonía VoIP
            </span>
            {activeClient ? (
              <span className="text-[11px] font-semibold text-[#101828] bg-[#F8F9FA] px-2.5 py-0.5 rounded-md border border-[#EAECF0] flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-600" />
                Filtrando por: <strong>{activeClient.name}</strong>
              </span>
            ) : (
              <span className="text-[11px] font-semibold text-[#344054] bg-[#F8F9FA] px-2.5 py-0.5 rounded-md border border-[#EAECF0] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                Todas las Llamadas (Global)
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[#101828] tracking-tight flex items-center gap-2.5">
            <Phone className="w-6 h-6 text-amber-500 shrink-0" />
            <span>Central Telefónica & Marcación</span>
          </h1>
        </div>

        {/* Controles del encabezado: Selector de Marca + Botón de Actualizar */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          {isAdmin && (
            <div className="flex items-center gap-1.5 bg-white border border-[#EAECF0] rounded-xl px-3 py-2 shadow-2xs">
              <Building2 className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="text-xs font-semibold text-[#101828] bg-transparent border-none focus:outline-none cursor-pointer"
                title="Filtrar llamadas por marca"
              >
                <option value="all">Todas las marcas (Global)</option>
                {clientOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={refreshCalls}
            className="px-3 py-2 rounded-xl bg-white border border-[#EAECF0] text-[#344054] hover:text-[#101828] hover:border-[#D0D5DD] text-xs font-semibold transition-colors shadow-2xs flex items-center gap-2 cursor-pointer active:scale-95"
            title="Actualizar llamadas en tiempo real"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${callsLoading ? "animate-spin text-amber-500" : "text-[#667085]"}`} />
            <span>Actualizar</span>
          </button>
        </div>
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
            initialPhone={urlPhone}
            initialLeadId={urlLeadId}
            initialName={urlName}
            onCall={(leadId, label) => device.callLead(leadId, label)}
            onCallDirect={(target, label) =>
              device.callTarget(
                {
                  ...target,
                  clientId: selectedClientId !== "all" ? selectedClientId : undefined,
                },
                label
              )
            }
            onHangup={() => device.hangup()}
            onToggleMute={() => device.toggleMute()}
            onSendDigits={(digits) => device.sendDigits(digits)}
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
