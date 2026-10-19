"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { TASK_AUTOMATION_KIND, TASK_AUTOMATION_KIND_LABEL, type TaskAutomationKind } from "@/lib/constants/automations";
import { StaleCheckPanel } from "@/components/automations/StaleCheckPanel";
import { TaskAutomationCard } from "@/components/automations/TaskAutomationCard";
import { TaskAutomationForm } from "@/components/automations/TaskAutomationForm";
import type { ClientOption } from "@/hooks/useClientOptions";
import type { MutationResult } from "@/hooks/useSmsAutomations";
import type { TaskAutomationChanges } from "@/hooks/useTaskAutomations";
import type { StaleLeadsCheckResult } from "@/types/opportunity-automations";
import type { PipelineStageOption, TaskAutomationDraft, TaskAutomationSummary } from "@/types/task-automations";

interface TaskAutomationsSectionProps {
  kind: TaskAutomationKind;
  description: string;
  automations: TaskAutomationSummary[];
  clients: ClientOption[];
  stages: PipelineStageOption[];
  onCreate: (draft: TaskAutomationDraft) => Promise<MutationResult>;
  onUpdate: (id: string, changes: TaskAutomationChanges) => Promise<MutationResult>;
  onDelete: (id: string) => Promise<MutationResult>;
  staleCheck?: { running: boolean; result: StaleLeadsCheckResult | null; error: string | null; onRun: () => void };
}

// null = formulario cerrado, "new" = crear, objeto = editar esa regla.
type FormState = null | "new" | TaskAutomationSummary;

/** Bloque de un tipo de regla de tareas: sus tarjetas, el botón de nueva y el formulario. */
export function TaskAutomationsSection(props: TaskAutomationsSectionProps) {
  const { kind, description, automations, clients, stages, onCreate, onUpdate, onDelete, staleCheck } = props;
  const [form, setForm] = useState<FormState>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const rules = automations.filter((rule) => rule.kind === kind);

  const runOnRule = async (id: string, action: () => Promise<MutationResult>) => {
    setBusyId(id);
    setActionError(null);
    const result = await action();
    if (!result.ok) setActionError(result.error ?? "No se pudo guardar.");
    setBusyId(null);
  };

  const handleDelete = (rule: TaskAutomationSummary) => {
    if (!window.confirm(`¿Eliminar la automatización "${rule.name}"? Esta acción no se puede deshacer.`)) return;
    runOnRule(rule.id, () => onDelete(rule.id));
  };

  return (
    <section className="space-y-3" aria-label={TASK_AUTOMATION_KIND_LABEL[kind]}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[#1F1E1D]">{TASK_AUTOMATION_KIND_LABEL[kind]}</h2>
          <p className="text-xs text-[#82807C]">{description}</p>
        </div>
        <button
          type="button"
          onClick={() => setForm("new")}
          className="px-3.5 py-2 rounded-xl bg-white border border-[#E8E6DF] text-xs font-medium text-[#1F1E1D] flex items-center gap-1.5 hover:border-[#D1CFCA]"
        >
          <Plus className="w-3.5 h-3.5 text-[#D97757]" /> Nueva regla
        </button>
      </div>

      {actionError && <p role="alert" className="text-xs text-red-700">{actionError}</p>}

      {kind === TASK_AUTOMATION_KIND.STALE_REACTIVATION && staleCheck && (
        <StaleCheckPanel running={staleCheck.running} result={staleCheck.result} error={staleCheck.error} onRun={staleCheck.onRun} />
      )}

      {rules.length === 0 ? (
        <p className="text-xs text-[#82807C] p-4 rounded-2xl border border-dashed border-[#E8E6DF]">Sin reglas: no se crean tareas.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {rules.map((rule) => (
            <TaskAutomationCard
              key={rule.id}
              automation={rule}
              busy={busyId === rule.id}
              onToggle={() => runOnRule(rule.id, () => onUpdate(rule.id, { kind: rule.kind, isActive: !rule.isActive }))}
              onEdit={() => setForm(rule)}
              onDelete={() => handleDelete(rule)}
            />
          ))}
        </div>
      )}

      {form && (
        <TaskAutomationForm
          kind={kind}
          initial={form === "new" ? null : form}
          clients={clients}
          stages={stages}
          onSubmit={(draft) => (form === "new" ? onCreate(draft) : onUpdate(form.id, draft))}
          onClose={() => setForm(null)}
        />
      )}
    </section>
  );
}
