"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Radio,
  RefreshCw,
  PhoneCall,
  Building2,
  MessageSquare,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTeamLive } from "@/hooks/useTeamLive";
import { useClientOptions } from "@/hooks/useClientOptions";
import { useVoiceDevice } from "@/hooks/useVoiceDevice";
import { AdvisorLiveTable } from "@/components/team/AdvisorLiveTable";
import { LiveCallsPanel } from "@/components/calls/LiveCallsPanel";
import { MonitorSessionBar } from "@/components/team/MonitorSessionBar";
import { SellerAttendanceModal } from "@/components/team/SellerAttendanceModal";
import { ADVISOR_STATUS } from "@/lib/constants/team";
import { formatClock } from "@/lib/team-live";
import { ROUTES } from "@/lib/constants/routes";

export default function TeamLivePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#667085]">Cargando ejecutivos de venta...</div>}>
      <TeamLiveContent />
    </Suspense>
  );
}

function TeamLiveContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlClientId = searchParams.get("clientId");
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMIN" && !user?.isClientUser;
  const clientOptions = useClientOptions();

  const [selectedClientId, setSelectedClientId] = useState<string | null>(
    urlClientId && urlClientId !== "all" ? urlClientId : null
  );
  const [selectedSellerForModal, setSelectedSellerForModal] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    if (urlClientId && urlClientId !== "all") {
      setSelectedClientId(urlClientId);
    } else if (urlClientId === "all" || !urlClientId) {
      setSelectedClientId(null);
    }
  }, [urlClientId]);

  const activeClient = selectedClientId ? clientOptions.find((c) => c.id === selectedClientId) : null;

  const handleSelectClient = (id: string | null) => {
    setSelectedClientId(id);
    if (id) {
      router.push(`${ROUTES.TEAM_LIVE}?clientId=${encodeURIComponent(id)}`);
    } else {
      router.push(ROUTES.TEAM_LIVE);
    }
  };

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
  const checkedInCount = advisors.filter((a) => a.isCheckedIn).length;
  const totalCallsToday = advisors.reduce((acc, a) => acc + a.today.callsMade, 0);
  const totalMessagesToday = advisors.reduce((acc, a) => acc + a.today.totalMessagesSent, 0);
  const totalTalkSec = advisors.reduce((acc, a) => acc + a.today.talkTimeSec, 0);

  const canJoin = device.phase === "ready" && !device.active;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EAECF0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-md border border-amber-200 flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-amber-600" />
              Módulo Exclusivo de Dueño & Supervisión
            </span>
            {activeClient ? (
              <span className="text-[11px] font-semibold text-[#101828] bg-[#F8F9FA] px-2.5 py-0.5 rounded-md border border-[#EAECF0] flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-amber-600" />
                Empresa: <strong>{activeClient.name}</strong>
              </span>
            ) : (
              <span className="text-[11px] text-[#667085] bg-[#F8F9FA] px-2 py-0.5 rounded-md border border-[#EAECF0]">
                Todos los Ejecutivos
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-[#101828] tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-amber-500 shrink-0" />
            <span>Ejecutivos de Venta & Monitoreo de Actividad</span>
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Estatus en tiempo real (online/offline), llamadas, canales atendidos (WhatsApp, Facebook, Instagram, SMS) y bitácora de 15 días.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Selector de Empresa para Administradores de Bunker */}
          {isAdmin && (
            <select
              value={selectedClientId ?? ""}
              onChange={(e) => handleSelectClient(e.target.value ? e.target.value : null)}
              className="bg-white border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 font-semibold shadow-2xs cursor-pointer"
            >
              <option value="">Todas las empresas</option>
              {clientOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white border border-[#EAECF0] text-[#475467] hover:text-[#101828] text-xs transition-colors shadow-2xs cursor-pointer"
            title="Actualizar datos del equipo"
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
            <span>En Turno (Online)</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-[#101828]">
            {availableCount} <span className="text-xs font-normal text-[#667085]">/ {advisors.length} vendedores</span>
          </div>
          <p className="text-[11px] text-[#667085] mt-1">{checkedInCount} con check-in registrado hoy</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#667085] mb-1">
            <span>En Llamada Ahora</span>
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
          </div>
          <div className="text-2xl font-bold text-[#101828]">{onCallCount}</div>
          <p className="text-[11px] text-[#667085] mt-1">{liveCalls.length} llamada(s) en vivo</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#667085] mb-1">
            <span>Llamadas Realizadas Hoy</span>
            <PhoneCall className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-[#101828]">{totalCallsToday}</div>
          <p className="text-[11px] text-[#667085] mt-1">{formatClock(totalTalkSec)} conversación</p>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#667085] mb-1">
            <span>Mensajes Enviados Hoy</span>
            <MessageSquare className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-[#101828] font-mono">{totalMessagesToday}</div>
          <p className="text-[11px] text-[#667085] mt-1">por WhatsApp, Messenger, IG y SMS</p>
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
            onOpenAttendanceModal={(id, name) => setSelectedSellerForModal({ id, name })}
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
                <span className="font-bold text-[#101828] shrink-0">• Clic en Vendedor:</span>
                <span>Abre la bitácora histórica de los últimos 15 días con hora de check-in, check-out y actividad.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#101828] shrink-0">• Escuchar / Susurrar:</span>
                <span>El dueño puede escuchar llamadas en tiempo real o susurrar al vendedor sin que el cliente lo oiga.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#101828] shrink-0">• Datos Duros:</span>
                <span>Conteo automático de mensajes atendidos en WhatsApp, Facebook Messenger, Instagram Direct y SMS.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Modal de Bitácora de 15 Días */}
      {selectedSellerForModal && (
        <SellerAttendanceModal
          sellerId={selectedSellerForModal.id}
          sellerName={selectedSellerForModal.name}
          onClose={() => setSelectedSellerForModal(null)}
        />
      )}
    </div>
  );
}
