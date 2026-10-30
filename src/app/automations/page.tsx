"use client";

import React, { useState, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Workflow,
  CheckSquare,
  MessageSquare,
  Plus,
  RefreshCw,
  Zap,
  ShieldCheck,
  Flame,
} from "lucide-react";
import { useClientOptions } from "@/hooks/useClientOptions";
import { useTaskAutomations } from "@/hooks/useTaskAutomations";
import { useSmsAutomations } from "@/hooks/useSmsAutomations";
import { TaskAutomationsSection } from "@/components/automations/TaskAutomationsSection";
import { SmsAutomationCard } from "@/components/automations/SmsAutomationCard";
import { SmsAutomationForm } from "@/components/automations/SmsAutomationForm";
import { StaleCheckPanel } from "@/components/automations/StaleCheckPanel";
import { TASK_AUTOMATION_KIND } from "@/lib/constants/automations";
import type { SmsAutomationSummary } from "@/types/automations";

export default function AutomationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[#667085]">Cargando automatizaciones...</div>}>
      <AutomationsPageContent />
    </Suspense>
  );
}

function AutomationsPageContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const clients = useClientOptions();
  const activeClient = clientId && clientId !== "all" ? clients.find((c) => c.id === clientId) : null;

  const [activeTab, setActiveTab] = useState<"tasks" | "sms" | "stale">("tasks");
  const [smsFormOpen, setSmsFormOpen] = useState(false);
  const [editingSms, setEditingSms] = useState<SmsAutomationSummary | null>(null);
  const [busySmsId, setBusySmsId] = useState<string | null>(null);

  const {
    automations: taskAutomations,
    stages,
    loading: taskLoading,
    error: taskError,
    create: createTaskRule,
    update: updateTaskRule,
    remove: removeTaskRule,
    staleCheck,
    runStaleCheck,
    refresh: refreshTasks,
  } = useTaskAutomations();

  const {
    automations: smsAutomations,
    loading: smsLoading,
    error: smsError,
    create: createSmsRule,
    update: updateSmsRule,
    remove: removeSmsRule,
    refresh: refreshSms,
  } = useSmsAutomations();

  // Filtrar por cliente si hay uno seleccionado
  const filteredTaskAutomations = useMemo(() => {
    if (!clientId || clientId === "all") return taskAutomations;
    return taskAutomations.filter((a) => !a.clientId || a.clientId === clientId);
  }, [taskAutomations, clientId]);

  const filteredSmsAutomations = useMemo(() => {
    if (!clientId || clientId === "all") return smsAutomations;
    return smsAutomations.filter((a) => !a.clientId || a.clientId === clientId);
  }, [smsAutomations, clientId]);

  const activeTaskCount = filteredTaskAutomations.filter((a) => a.isActive).length;
  const activeSmsCount = filteredSmsAutomations.filter((a) => a.isActive).length;

  const handleRefreshAll = () => {
    refreshTasks();
    refreshSms();
  };

  const handleToggleSms = async (item: SmsAutomationSummary) => {
    setBusySmsId(item.id);
    await updateSmsRule(item.id, { isActive: !item.isActive });
    setBusySmsId(null);
  };

  const handleDeleteSms = async (item: SmsAutomationSummary) => {
    if (!window.confirm(`¿Eliminar la automatización de SMS "${item.name}"?`)) return;
    setBusySmsId(item.id);
    await removeSmsRule(item.id);
    setBusySmsId(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EAECF0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-[#101828] tracking-tight flex items-center gap-2.5">
              <Workflow className="w-6 h-6 text-amber-500 shrink-0" />
              <span>Centro de Automatizaciones & Flujos</span>
            </h1>
            {activeClient && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300">
                {activeClient.name}
              </span>
            )}
          </div>
          <p className="text-xs text-[#667085] mt-1 max-w-2xl">
            {activeClient
              ? `Reglas automáticas de onboarding, tareas y mensajes SMS configuradas para ${activeClient.name}.`
              : "Disparadores automáticos de tareas, alertas de reactivación y mensajes SMS para acelerar la conversión comercial de la agencia."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleRefreshAll}
            className="p-2.5 rounded-xl bg-white border border-[#EAECF0] text-[#475467] hover:text-[#101828] text-xs transition-colors shadow-2xs"
            title="Refrescar automatizaciones"
          >
            <RefreshCw className={`w-4 h-4 ${taskLoading || smsLoading ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#667085]">
            <span>Reglas de Tareas Activas</span>
            <CheckSquare className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-[#101828]">{activeTaskCount}</div>
          <div className="text-[11px] text-[#667085]">Onboarding, etapas y reactivación</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#667085]">
            <span>SMS Automáticos Activos</span>
            <MessageSquare className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-[#101828]">{activeSmsCount}</div>
          <div className="text-[11px] text-[#667085]">Calificación inmediata por fuente</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#667085]">
            <span>Protección de Leads Fríos</span>
            <ShieldCheck className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-[#101828]">Auto-Scan</div>
          <div className="text-[11px] text-[#667085]">Barrido de estancamiento en pipeline</div>
        </div>
      </div>

      {/* Pestañas de Navegación */}
      <div className="flex items-center gap-1.5 p-1 bg-[#F8F9FA] border border-[#EAECF0] rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "tasks" ? "bg-white text-[#101828] shadow-xs" : "text-[#667085] hover:text-[#101828]"
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
          <span>Reglas de Tareas ({filteredTaskAutomations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sms")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "sms" ? "bg-white text-[#101828] shadow-xs" : "text-[#667085] hover:text-[#101828]"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
          <span>SMS Automáticos ({filteredSmsAutomations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("stale")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeTab === "stale" ? "bg-white text-[#101828] shadow-xs" : "text-[#667085] hover:text-[#101828]"
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-rose-500" />
          <span>Barrido de Leads Fríos</span>
        </button>
      </div>

      {/* Contenido según pestaña */}
      {activeTab === "tasks" && (
        <div className="space-y-8">
          {taskError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              {taskError}
            </div>
          )}

          {/* Sección 1: Onboarding inmediato */}
          <div className="bg-white border border-[#EAECF0] rounded-2xl p-5 shadow-2xs">
            <TaskAutomationsSection
              kind={TASK_AUTOMATION_KIND.ONBOARDING}
              description="Crea tareas inmediatas para el asesor en cuanto entra un nuevo prospecto (ej. primer contacto dentro de los primeros 15 minutos)."
              automations={filteredTaskAutomations}
              clients={clients}
              stages={stages}
              onCreate={createTaskRule}
              onUpdate={updateTaskRule}
              onDelete={removeTaskRule}
            />
          </div>

          {/* Sección 2: Transición de Etapa */}
          <div className="bg-white border border-[#EAECF0] rounded-2xl p-5 shadow-2xs">
            <TaskAutomationsSection
              kind={TASK_AUTOMATION_KIND.STAGE_FOLLOWUP}
              description="Dispara tareas cuando una oportunidad avanza a una etapa clave del pipeline (ej. agendar demo técnica, enviar cotización formal)."
              automations={filteredTaskAutomations}
              clients={clients}
              stages={stages}
              onCreate={createTaskRule}
              onUpdate={updateTaskRule}
              onDelete={removeTaskRule}
            />
          </div>

          {/* Sección 3: Reactivación de Leads Estancados */}
          <div className="bg-white border border-[#EAECF0] rounded-2xl p-5 shadow-2xs">
            <TaskAutomationsSection
              kind={TASK_AUTOMATION_KIND.STALE_REACTIVATION}
              description="Genera tareas automáticas de reactivación si un lead o negocio pasa demasiados días sin llamadas, mensajes ni notas."
              automations={filteredTaskAutomations}
              clients={clients}
              stages={stages}
              onCreate={createTaskRule}
              onUpdate={updateTaskRule}
              onDelete={removeTaskRule}
              staleCheck={{
                running: staleCheck.running,
                result: staleCheck.result,
                error: staleCheck.error,
                onRun: runStaleCheck,
              }}
            />
          </div>
        </div>
      )}

      {activeTab === "sms" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-2xs">
            <div>
              <h2 className="text-sm font-semibold text-[#101828]">Mensajes SMS de Respuesta Inmediata</h2>
              <p className="text-xs text-[#667085]">
                Dispara un SMS instantáneo en cuanto un prospecto deja sus datos por Meta Lead Ads, TikTok o formulario web.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingSms(null);
                setSmsFormOpen(true);
              }}
              className="btn-black-gold rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Nueva Regla SMS</span>
            </button>
          </div>

          {smsError && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
              {smsError}
            </div>
          )}

          {filteredSmsAutomations.length === 0 ? (
            <div className="p-12 text-center rounded-2xl border border-dashed border-[#EAECF0] bg-white space-y-3">
              <Zap className="w-10 h-10 text-[#D0D5DD] mx-auto" />
              <div className="text-sm font-semibold text-[#101828]">No hay reglas de SMS automáticos configuradas</div>
              <p className="text-xs text-[#667085] max-w-sm mx-auto">
                Crea una regla para enviar automáticamente un SMS a los prospectos que entren desde tus campañas publicitarias.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingSms(null);
                  setSmsFormOpen(true);
                }}
                className="btn-black-gold rounded-xl px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-amber-400" />
                <span>Crear Regla SMS</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredSmsAutomations.map((rule) => (
                <SmsAutomationCard
                  key={rule.id}
                  automation={rule}
                  busy={busySmsId === rule.id}
                  onToggle={() => handleToggleSms(rule)}
                  onEdit={() => {
                    setEditingSms(rule);
                    setSmsFormOpen(true);
                  }}
                  onDelete={() => handleDeleteSms(rule)}
                />
              ))}
            </div>
          )}

          {smsFormOpen && (
            <SmsAutomationForm
              initial={editingSms}
              clients={clients}
              onSubmit={async (draft) => {
                const res = editingSms ? await updateSmsRule(editingSms.id, draft) : await createSmsRule(draft);
                if (res.ok) setSmsFormOpen(false);
                return res;
              }}
              onClose={() => {
                setSmsFormOpen(false);
                setEditingSms(null);
              }}
            />
          )}
        </div>
      )}

      {activeTab === "stale" && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-white border border-[#EAECF0] shadow-2xs space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-[#101828] flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-500" />
                  <span>Escáner y Barrido de Reactivación de Leads</span>
                </h2>
                <p className="text-xs text-[#667085] mt-1 max-w-2xl">
                  Revisa todos los prospectos de la agencia y detecta aquellos sin contacto reciente para asignar tareas
                  de reactivación comercial a los asesores correspondientes.
                </p>
              </div>
            </div>

            <StaleCheckPanel
              running={staleCheck.running}
              result={staleCheck.result}
              error={staleCheck.error}
              onRun={runStaleCheck}
            />
          </div>
        </div>
      )}
    </div>
  );
}
