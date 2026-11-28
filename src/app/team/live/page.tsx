"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  Radio,
  RefreshCw,
  PhoneCall,
  Building2,
  MessageSquare,
  ShieldAlert,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTeamLive } from "@/hooks/useTeamLive";
import { useActiveClientId } from "@/hooks/useActiveClientId";
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
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-semibold text-[#8C929D] flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
          <span>Cargando ejecutivos de venta...</span>
        </div>
      }
    >
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
  const activeClientId = useActiveClientId();

  const [pickedClientId, setSelectedClientId] = useState<string | null>(
    urlClientId && urlClientId !== "all" ? urlClientId : null
  );
  const [selectedSellerForModal, setSelectedSellerForModal] = useState<{ id: string; name: string } | null>(null);

  // Estado de eliminación de asesor
  const [advisorToDelete, setAdvisorToDelete] = useState<{ id: string; name: string } | null>(null);
  const [isDeletingAdvisor, setIsDeletingAdvisor] = useState(false);
  const [deleteAdvisorError, setDeleteAdvisorError] = useState<string | null>(null);

  // Con marca activa manda ella; el estado solo sirve en la vista de agencia.
  const selectedClientId = activeClientId ?? pickedClientId;

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

  const handleDeleteAdvisor = async () => {
    if (!advisorToDelete) return;
    setIsDeletingAdvisor(true);
    setDeleteAdvisorError(null);
    try {
      const res = await fetch(`/api/users?id=${encodeURIComponent(advisorToDelete.id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!json.success) {
        setDeleteAdvisorError(json.error || "No se pudo eliminar el asesor.");
      } else {
        setAdvisorToDelete(null);
        refresh();
      }
    } catch (err) {
      setDeleteAdvisorError(err instanceof Error ? err.message : "Error al eliminar asesor.");
    } finally {
      setIsDeletingAdvisor(false);
    }
  };

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
    <div className="space-y-6 animate-fade-in-up">
      {/* Header Orvion Capsule */}
      <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] p-6 shadow-orvion">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="orvion-badge-gold">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                <span>Supervisión de Ventas & SLA</span>
              </span>
              {activeClient ? (
                <span className="orvion-badge-dark text-xs py-1 px-3">
                  <Building2 className="w-3 h-3 text-amber-400" />
                  <span>Empresa: {activeClient.name}</span>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F8F9FA] dark:bg-[#1A1D24] text-[#8C929D] border border-[#E2E5EB] dark:border-[#242A35]">
                  Todos los Ejecutivos
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#121417] dark:text-white tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-amber-500 shrink-0" />
              <span>Ejecutivos de Venta & Monitoreo en Vivo</span>
            </h1>
            <p className="text-xs text-[#8C929D] font-medium max-w-2xl leading-relaxed">
              Estatus en tiempo real, velocidad de respuesta multicanal (WhatsApp, Instagram Direct, Facebook Messenger, SMS) y auditoría de llamadas.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Selector de Empresa para Administradores de Bunker */}
            {isAdmin && clientOptions.length > 1 && (
              <select
                value={selectedClientId ?? ""}
                onChange={(e) => handleSelectClient(e.target.value ? e.target.value : null)}
                className="bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#242A35] rounded-full px-4 py-2 text-xs text-[#121417] dark:text-white font-bold shadow-2xs cursor-pointer focus:outline-hidden focus:border-amber-400"
              >
                <option value="">Todas las empresas</option>
                {clientOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            <Link
              href={activeClientId ? `${ROUTES.TEAM_USERS}?clientId=${encodeURIComponent(activeClientId)}` : ROUTES.TEAM_USERS}
              className="px-4 py-2 rounded-full bg-[#121417] dark:bg-white text-white dark:text-[#121417] text-xs font-bold flex items-center gap-1.5 shadow-orvion hover:scale-102 transition-all cursor-pointer"
            >
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Gestionar Asesores</span>
            </Link>

            <button
              type="button"
              onClick={refresh}
              disabled={loading}
              className="p-2.5 rounded-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#242A35] text-[#8C929D] hover:text-[#121417] dark:hover:text-white text-xs transition-colors shadow-2xs cursor-pointer"
              title="Actualizar datos del equipo"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Barra de Monitoreo Activo (Escucha / Susurro) */}
      <MonitorSessionBar
        phase={device.phase}
        error={device.error}
        active={device.active}
        onHangup={() => device.hangup()}
        onToggleMute={() => device.toggleMute()}
      />

      {/* KPI Cards Orvion Capsule */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="p-4 rounded-[22px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
          <div className="flex items-center justify-between text-xs text-[#8C929D] font-bold mb-1">
            <span>En Llamada</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          </div>
          <div className="text-2xl font-black text-[#121417] dark:text-white font-mono">{onCallCount}</div>
          <p className="text-[11px] text-[#8C929D] font-medium mt-1">hablando ahora</p>
        </div>

        <div className="p-4 rounded-[22px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
          <div className="flex items-center justify-between text-xs text-[#8C929D] font-bold mb-1">
            <span>Disponibles</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-black text-[#121417] dark:text-white font-mono">{availableCount}</div>
          <p className="text-[11px] text-[#8C929D] font-medium mt-1">en línea listos</p>
        </div>

        <div className="p-4 rounded-[22px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
          <div className="flex items-center justify-between text-xs text-[#8C929D] font-bold mb-1">
            <span>Asistencia Hoy</span>
            <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              check-in
            </span>
          </div>
          <div className="text-2xl font-black text-[#121417] dark:text-white font-mono">
            {checkedInCount} <span className="text-xs text-[#8C929D] font-normal">/ {advisors.length}</span>
          </div>
          <p className="text-[11px] text-[#8C929D] font-medium mt-1">ingreso registrado</p>
        </div>

        <div className="p-4 rounded-[22px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
          <div className="flex items-center justify-between text-xs text-[#8C929D] font-bold mb-1">
            <span>Llamadas Hoy</span>
            <PhoneCall className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-[#121417] dark:text-white font-mono">{totalCallsToday}</div>
          <p className="text-[11px] text-[#8C929D] font-medium mt-1">realizadas por equipo</p>
        </div>

        <div className="p-4 rounded-[22px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
          <div className="flex items-center justify-between text-xs text-[#8C929D] font-bold mb-1">
            <span>Tiempo Hablado</span>
            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">total</span>
          </div>
          <div className="text-2xl font-black text-[#121417] dark:text-white font-mono">{formatClock(totalTalkSec)}</div>
          <p className="text-[11px] text-[#8C929D] font-medium mt-1">en llamadas hoy</p>
        </div>

        <div className="p-4 rounded-[22px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
          <div className="flex items-center justify-between text-xs text-[#8C929D] font-bold mb-1">
            <span>Mensajes Hoy</span>
            <MessageSquare className="w-3.5 h-3.5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-[#121417] dark:text-white font-mono">{totalMessagesToday}</div>
          <p className="text-[11px] text-[#8C929D] font-medium mt-1">WhatsApp, IG, FB & SMS</p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-800 dark:text-rose-400">
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
            onDeleteAdvisor={isAdmin ? (id, name) => {
              setDeleteAdvisorError(null);
              setAdvisorToDelete({ id, name });
            } : undefined}
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
          <div className="p-5 rounded-[24px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion space-y-3">
            <h3 className="text-xs font-black text-[#121417] dark:text-white flex items-center gap-1.5 tracking-tight">
              <Radio className="w-3.5 h-3.5 text-amber-500" />
              <span>Instrucciones de Supervisión</span>
            </h3>
            <ul className="text-[11px] text-[#8C929D] space-y-2 leading-relaxed">
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#121417] dark:text-white shrink-0">• Clic en Vendedor:</span>
                <span>Abre la bitácora de asistencia histórica de los últimos 15 días con hora de check-in, check-out y actividad.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#121417] dark:text-white shrink-0">• Escuchar / Susurrar:</span>
                <span>El supervisor puede escuchar llamadas activas o susurrar al vendedor indicaciones sin que el prospecto lo oiga.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="font-bold text-[#121417] dark:text-white shrink-0">• Métricas Multicanal:</span>
                <span>Conteo automático en vivo de mensajes atendidos en WhatsApp, Facebook Messenger, Instagram Direct y Twilio SMS.</span>
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

      {/* Modal de Confirmación de Eliminación de Asesor */}
      {advisorToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white dark:bg-[#121417] rounded-[32px] border border-rose-200 dark:border-rose-900/60 shadow-orvion max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2F4F7] dark:border-[#1F242D]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#121417] dark:text-white">Eliminar Asesor</h4>
                  <p className="text-[11px] text-[#8C929D]">Acción permanente</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdvisorToDelete(null)}
                disabled={isDeletingAdvisor}
                className="w-8 h-8 rounded-full bg-[#F8F9FA] dark:bg-[#1A1D24] text-[#8C929D] hover:text-[#121417] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {deleteAdvisorError && (
              <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-700 dark:text-rose-400">
                {deleteAdvisorError}
              </div>
            )}

            <p className="text-xs text-[#8C929D] leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente al asesor{" "}
              <strong className="text-[#121417] dark:text-white font-bold">{advisorToDelete.name}</strong>?
            </p>

            <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#242A35] text-[11px] text-[#8C929D] space-y-1.5">
              <p className="font-bold text-[#121417] dark:text-white">Consecuencias de la eliminación:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Se desvinculará de sus prospectos, tareas y llamadas registradas.</li>
                <li>Se revocará su acceso a la plataforma de forma inmediata.</li>
                <li>Se registrará esta acción en la bitácora de auditoría.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F2F4F7] dark:border-[#1F242D]">
              <button
                type="button"
                disabled={isDeletingAdvisor}
                onClick={() => setAdvisorToDelete(null)}
                className="px-4 py-2 rounded-full border border-[#E2E5EB] dark:border-[#242A35] hover:bg-[#F8F9FA] dark:hover:bg-[#1A1D24] text-xs font-bold text-[#667085] hover:text-[#121417] dark:hover:text-white cursor-pointer transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingAdvisor}
                onClick={handleDeleteAdvisor}
                className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50 transition-all"
              >
                {isDeletingAdvisor ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Asesor</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
