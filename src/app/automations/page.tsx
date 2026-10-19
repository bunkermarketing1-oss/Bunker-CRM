"use client";

import React, { useState } from "react";
import { Plus, Workflow } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { SmsAutomationCard } from "@/components/automations/SmsAutomationCard";
import { SmsAutomationForm } from "@/components/automations/SmsAutomationForm";
import { TaskAutomationsSection } from "@/components/automations/TaskAutomationsSection";
import { useSmsAutomations, type MutationResult } from "@/hooks/useSmsAutomations";
import { useTaskAutomations } from "@/hooks/useTaskAutomations";
import { useClientOptions } from "@/hooks/useClientOptions";
import { TASK_AUTOMATION_KIND } from "@/lib/constants/automations";
import type { SmsAutomationSummary } from "@/types/automations";

const TASK_SECTIONS = [
  {
    kind: TASK_AUTOMATION_KIND.ONBOARDING,
    description: "Al cerrar una oportunidad como ganada se crea el checklist de arranque del cliente.",
  },
  {
    kind: TASK_AUTOMATION_KIND.STAGE_FOLLOWUP,
    description: "Cuando una oportunidad entra a una etapa, el asesor recibe una tarea de seguimiento.",
  },
  {
    kind: TASK_AUTOMATION_KIND.STALE_REACTIVATION,
    description: "Los leads abiertos que llevan días sin contacto generan una tarea para retomarlos.",
  },
] as const;

// null = formulario cerrado, "new" = crear, objeto = editar esa regla.
type FormState = null | "new" | SmsAutomationSummary;

export default function AutomationsPage() {
  const { automations, loading, error, create, update, remove } = useSmsAutomations();
  const tasks = useTaskAutomations();
  const clients = useClientOptions();
  const [form, setForm] = useState<FormState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const runOnRule = async (id: string, action: () => Promise<MutationResult>) => {
    setBusyId(id);
    setActionError(null);
    const result = await action();
    if (!result.ok) setActionError(result.error ?? "No se pudo guardar.");
    setBusyId(null);
  };

  const handleDelete = (rule: SmsAutomationSummary) => {
    if (!window.confirm(`¿Eliminar la automatización "${rule.name}"? Esta acción no se puede deshacer.`)) return;
    runOnRule(rule.id, () => remove(rule.id));
  };

  const newButton = (
    <button
      type="button"
      onClick={() => setForm("new")}
      className="btn-black-gold rounded-2xl px-4 py-2 text-xs font-semibold flex items-center gap-2"
    >
      <Plus className="w-4 h-4 text-[#E5C158]" />
      <span>Nueva automatización</span>
    </button>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader
        section="Operaciones"
        title="Automatizaciones"
        description="SMS automático al recibir un lead y tareas automáticas de onboarding, seguimiento y reactivación."
        actions={newButton}
      />

      {(error || actionError) && (
        <p role="alert" className="text-xs text-red-700">{error || actionError}</p>
      )}

      {loading ? (
        <p className="text-xs text-[#82807C]">Cargando automatizaciones…</p>
      ) : automations.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="Aún no hay automatizaciones"
          description="Crea un SMS de calificación para que cada lead nuevo de Meta reciba un mensaje al instante."
          action={newButton}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {automations.map((rule) => (
            <SmsAutomationCard
              key={rule.id}
              automation={rule}
              busy={busyId === rule.id}
              onToggle={() => runOnRule(rule.id, () => update(rule.id, { isActive: !rule.isActive }))}
              onEdit={() => setForm(rule)}
              onDelete={() => handleDelete(rule)}
            />
          ))}
        </div>
      )}

      <div className="pt-4 border-t border-[#E8E6DF] space-y-8">
        <div>
          <h2 className="text-base font-semibold text-[#1F1E1D]">Tareas automáticas</h2>
          <p className="text-xs text-[#82807C]">Crean tareas para los asesores; nunca envían mensajes al lead por su cuenta.</p>
        </div>
        {tasks.error && <p role="alert" className="text-xs text-red-700">{tasks.error}</p>}
        {tasks.loading ? (
          <p className="text-xs text-[#82807C]">Cargando reglas de tareas…</p>
        ) : (
          TASK_SECTIONS.map((section) => (
            <TaskAutomationsSection
              key={section.kind}
              kind={section.kind}
              description={section.description}
              automations={tasks.automations}
              clients={clients}
              stages={tasks.stages}
              onCreate={tasks.create}
              onUpdate={tasks.update}
              onDelete={tasks.remove}
              staleCheck={{ ...tasks.staleCheck, onRun: tasks.runStaleCheck }}
            />
          ))
        )}
      </div>

      {form && (
        <SmsAutomationForm
          initial={form === "new" ? null : form}
          clients={clients}
          onSubmit={(draft) => (form === "new" ? create(draft) : update(form.id, draft))}
          onClose={() => setForm(null)}
        />
      )}
    </div>
  );
}
