"use client";

import React, { useState, useMemo, Suspense } from "react";
import {
  Workflow,
  CheckSquare,
  MessageSquare,
  Plus,
  RefreshCw,
  Zap,
  ShieldCheck,
  Flame,
  Building2,
} from "lucide-react";
import { useClientOptions } from "@/hooks/useClientOptions";
import { useActiveClientId } from "@/hooks/useActiveClientId";
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
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-[#8C929D] font-mono animate-pulse">
          Cargando centro de automatizaciones...
        </div>
      }
    >
      <AutomationsPageContent />
    </Suspense>
  );
}

function AutomationsPageContent() {
  const clientId = useActiveClientId();
  const clients = useClientOptions();
  const activeClient = clientId ? clients.find((c) => c.id === clientId) : null;

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
    if (!clientId) return taskAutomations;
    return taskAutomations.filter((a) => !a.clientId || a.clientId === clientId);
  }, [taskAutomations, clientId]);

  const filteredSmsAutomations = useMemo(() => {
    if (!clientId) return smsAutomations;
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
    <div className="space-y-6">
      {/* Cabecera Estilo Cápsula Orvion con Paleta Dorado y Negro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="orvion-badge-gold text-[10px]">
              Automatizaciones & Triggers
            </span>
            {activeClient ? (
              <span className="text-[11px] font-semibold text-[#121417] dark:text-white bg-white dark:bg-[#121417] px-3 py-1 rounded-full border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
                Marca: <strong>{activeClient.name}</strong>
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[#8C929D] bg-white dark:bg-[#121417] px-3 py-1 rounded-full border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
                Flujos Globales de la Agencia
              </span>
            )}
          </div>

          <h1 className="text-3xl font-extrabold text-[#121417] dark:text-white tracking-tight leading-tight flex items-center gap-2.5">
            <Workflow className="w-7 h-7 text-amber-400 shrink-0" />
            <span>Centro de Automatizaciones & Flujos</span>
          </h1>
          <p className="text-xs text-[#8C929D] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs animate-pulse" />
            <span>
              {activeClient
                ? `Reglas automáticas de asignación inmediata, recordatorios SLA y mensajes para ${activeClient.name}.`
                : "Disparadores automáticos de tareas, alertas de reactivación y mensajes SMS para acelerar la conversión comercial."}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={handleRefreshAll}
            className="w-10 h-10 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] flex items-center justify-center text-[#121417] dark:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] shadow-orvion transition-all cursor-pointer"
            title="Refrescar reglas del servidor"
          >
            <RefreshCw className={`w-4 h-4 ${taskLoading || smsLoading ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards de Resumen en Cápsula Orvion */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-[24px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#8C929D]">
            <span>Reglas de Tareas Activas</span>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
              <CheckSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#121417] dark:text-white">{activeTaskCount}</div>
          <div className="text-[11px] text-[#8C929D]">Onboarding, etapas del pipeline y seguimiento</div>
        </div>

        <div className="p-5 rounded-[24px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#8C929D]">
            <span>SMS Automáticos Activos</span>
            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#121417] dark:text-white">{activeSmsCount}</div>
          <div className="text-[11px] text-[#8C929D]">Respuesta y calificación instantánea por fuente</div>
        </div>

        <div className="p-5 rounded-[24px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion space-y-1.5">
          <div className="flex items-center justify-between text-xs font-semibold text-[#8C929D]">
            <span>Protección de Leads Fríos</span>
            <div className="w-8 h-8 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-500">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-[#121417] dark:text-white">Auto-Scan SLA</div>
          <div className="text-[11px] text-[#8C929D]">Barrido periódico de prospectos desatendidos</div>
        </div>
      </div>

      {/* Pestañas de Navegación en Cápsulas Orvion */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab("tasks")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 shadow-orvion cursor-pointer ${
            activeTab === "tasks"
              ? "bg-[#121417] text-white dark:bg-amber-400 dark:text-[#121417]"
              : "bg-white dark:bg-[#121417] text-[#8C929D] hover:text-[#121417] dark:hover:text-white border border-[#E2E5EB] dark:border-[#1F242D]"
          }`}
        >
          <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
          <span>Reglas de Tareas ({filteredTaskAutomations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("sms")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 shadow-orvion cursor-pointer ${
            activeTab === "sms"
              ? "bg-[#121417] text-white dark:bg-amber-400 dark:text-[#121417]"
              : "bg-white dark:bg-[#121417] text-[#8C929D] hover:text-[#121417] dark:hover:text-white border border-[#E2E5EB] dark:border-[#1F242D]"
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
          <span>SMS Automáticos ({filteredSmsAutomations.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("stale")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 shadow-orvion cursor-pointer ${
            activeTab === "stale"
              ? "bg-[#121417] text-white dark:bg-amber-400 dark:text-[#121417]"
              : "bg-white dark:bg-[#121417] text-[#8C929D] hover:text-[#121417] dark:hover:text-white border border-[#E2E5EB] dark:border-[#1F242D]"
          }`}
        >
          <Flame className="w-3.5 h-3.5 text-rose-500" />
          <span>Barrido de Leads Fríos</span>
        </button>
      </div>

      {/* Contenido según pestaña */}
      {activeTab === "tasks" && (
        <div className="space-y-6">
          {taskError && (
            <div className="p-4 rounded-[22px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-800 dark:text-red-300 shadow-orvion">
              {taskError}
            </div>
          )}

          {/* Sección 1: Onboarding inmediato */}
          <div className="bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] rounded-[28px] p-6 shadow-orvion">
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
          <div className="bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] rounded-[28px] p-6 shadow-orvion">
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
          <div className="bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] rounded-[28px] p-6 shadow-orvion">
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
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-[28px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
            <div>
              <h2 className="text-sm font-extrabold text-[#121417] dark:text-white">
                Mensajes SMS de Respuesta Inmediata
              </h2>
              <p className="text-xs text-[#8C929D] mt-0.5">
                Dispara un SMS instantáneo en cuanto un prospecto deja sus datos por Meta Lead Ads, TikTok o formulario web.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingSms(null);
                setSmsFormOpen(true);
              }}
              className="btn-black-gold rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-orvion"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Nueva Regla SMS</span>
            </button>
          </div>

          {smsError && (
            <div className="p-4 rounded-[22px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-800 dark:text-red-300 shadow-orvion">
              {smsError}
            </div>
          )}

          {filteredSmsAutomations.length === 0 ? (
            <div className="p-12 text-center rounded-[28px] border border-dashed border-[#E2E5EB] dark:border-[#262C36] bg-white dark:bg-[#121417] space-y-3 shadow-orvion">
              <Zap className="w-10 h-10 text-amber-400/50 mx-auto" />
              <div className="text-sm font-bold text-[#121417] dark:text-white">
                No hay reglas de SMS automáticos configuradas
              </div>
              <p className="text-xs text-[#8C929D] max-w-sm mx-auto">
                Crea una regla para enviar automáticamente un SMS a los prospectos que entren desde tus campañas publicitarias.
              </p>
              <button
                type="button"
                onClick={() => {
                  setEditingSms(null);
                  setSmsFormOpen(true);
                }}
                className="btn-black-gold rounded-full px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5 shadow-orvion cursor-pointer"
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
        <div className="space-y-6">
          <div className="p-6 rounded-[28px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-extrabold text-[#121417] dark:text-white flex items-center gap-2">
                  <Flame className="w-5 h-5 text-rose-500" />
                  <span>Escáner y Barrido de Reactivación de Leads</span>
                </h2>
                <p className="text-xs text-[#8C929D] mt-1 max-w-2xl">
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
