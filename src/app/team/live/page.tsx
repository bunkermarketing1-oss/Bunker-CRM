"use client";

import React, { useState } from "react";
import { Lock } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { AdvisorLiveTable } from "@/components/team/AdvisorLiveTable";
import { MonitorSessionBar } from "@/components/team/MonitorSessionBar";
import { LiveCallsPanel } from "@/components/calls/LiveCallsPanel";
import { useAuth } from "@/context/AuthContext";
import { useClientOptions } from "@/hooks/useClientOptions";
import { TEAM_LIVE_REFRESH_MS } from "@/lib/constants/team";
import { useTeamLive } from "@/hooks/useTeamLive";
import { useVoiceDevice } from "@/hooks/useVoiceDevice";

/** Filtro de cliente (solo Bunker): se monta aparte para que el dueño no consulte la lista de clientes. */
function ClientFilter({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const clients = useClientOptions();
  return (
    <select
      aria-label="Filtrar por cliente"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-2 rounded-xl bg-white border border-[#E8E6DF] text-xs text-[#1F1E1D]"
    >
      <option value="">Todos los clientes</option>
      {clients.map((client) => (
        <option key={client.id} value={client.id}>
          {client.name}
        </option>
      ))}
    </select>
  );
}

/** Supervisión del equipo comercial: el dueño ve a sus asesores y Bunker a los de todos los clientes. */
function TeamLiveContent({ isAdmin }: { isAdmin: boolean }) {
  const [clientId, setClientId] = useState("");
  const { view, loading, error, refresh } = useTeamLive(clientId || null);
  // Solo sale a escuchar: sin registrar el dispositivo, las entrantes no timbran en esta pantalla.
  const voice = useVoiceDevice({ onCallEnded: refresh, receiveIncoming: false });

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        section="Equipo"
        title="Equipo en vivo"
        description={`Quién está en llamada y qué ha hecho hoy cada asesor. Se actualiza cada ${TEAM_LIVE_REFRESH_MS / 1000} segundos.${
          view ? ` Día contado desde las 00:00 (${view.timeZone}).` : ""
        }`}
        actions={isAdmin ? <ClientFilter value={clientId} onChange={setClientId} /> : undefined}
      />

      {error && (
        <p role="alert" className="text-xs text-red-700 px-4 py-2.5 rounded-xl bg-red-50 border border-red-200">
          {error}
        </p>
      )}

      <MonitorSessionBar
        phase={voice.phase}
        error={voice.error}
        active={voice.active}
        onHangup={voice.hangup}
        onToggleMute={voice.toggleMute}
      />

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <AdvisorLiveTable advisors={view?.advisors ?? []} loading={loading} showClient={isAdmin && !clientId} />
        </div>
        <div>
          <LiveCallsPanel calls={view?.liveCalls ?? []} canJoin={voice.phase === "ready"} onMonitor={voice.monitor} />
        </div>
      </div>
    </div>
  );
}

export default function TeamLivePage() {
  const { user, isLoading } = useAuth();
  if (isLoading || !user) return null;

  const isAdmin = !user.isClientUser;
  // La API también responde 403 a un asesor; aquí solo se evita montar el teléfono y el sondeo.
  if (!isAdmin && !user.isClientOwner) {
    return (
      <EmptyState
        icon={Lock}
        title="Vista reservada al dueño de la empresa"
        description="La actividad en vivo del equipo solo la ve el dueño de la empresa. Si necesitas acceso, pídeselo a Bunker."
      />
    );
  }

  return <TeamLiveContent isAdmin={isAdmin} />;
}
