"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import {
  TASK_AUTOMATION_DEFAULTS,
  TASK_AUTOMATION_KIND,
  TASK_AUTOMATION_KIND_LABEL,
  TASK_AUTOMATION_LIMITS,
  type TaskAutomationKind,
} from "@/lib/constants/automations";
import { OnboardingFields, StageFollowupFields, StaleReactivationFields, inputClass } from "@/components/automations/TaskAutomationFields";
import type { ClientOption } from "@/hooks/useClientOptions";
import { useActiveClientId } from "@/hooks/useActiveClientId";
import type { MutationResult } from "@/hooks/useSmsAutomations";
import type { PipelineStageOption, TaskAutomationDraft, TaskAutomationSummary } from "@/types/task-automations";

interface TaskAutomationFormProps {
  kind: TaskAutomationKind;
  initial: TaskAutomationSummary | null;
  clients: ClientOption[];
  stages: PipelineStageOption[];
  onSubmit: (draft: TaskAutomationDraft) => Promise<MutationResult>;
  onClose: () => void;
}

/** Borrador inicial: la regla que se edita o valores sugeridos para una nueva. */
function initialDraft(kind: TaskAutomationKind, initial: TaskAutomationSummary | null, activeClientId: string | null): TaskAutomationDraft {
  const common = {
    name: initial?.name ?? TASK_AUTOMATION_KIND_LABEL[kind],
    clientId: initial ? initial.clientId : activeClientId,
    isActive: initial?.isActive ?? true,
  };
  if (initial) {
    if (initial.kind === TASK_AUTOMATION_KIND.STAGE_FOLLOWUP) {
      return { ...common, kind: initial.kind, ...initial.config, stageNameMatch: initial.config.stageNameMatch ?? "" };
    }
    return { ...common, kind: initial.kind, ...initial.config } as TaskAutomationDraft;
  }
  switch (kind) {
    case TASK_AUTOMATION_KIND.ONBOARDING:
      return { ...common, kind, tasks: [...TASK_AUTOMATION_DEFAULTS.onboardingTasks], dueInDays: TASK_AUTOMATION_DEFAULTS.onboardingDueInDays };
    case TASK_AUTOMATION_KIND.STAGE_FOLLOWUP:
      return {
        ...common,
        kind,
        stageNameMatch: "",
        taskTitle: TASK_AUTOMATION_DEFAULTS.followupTaskTitle,
        hoursDue: TASK_AUTOMATION_DEFAULTS.followupHoursDue,
      };
    case TASK_AUTOMATION_KIND.STALE_REACTIVATION:
      return { ...common, kind, inactiveDays: TASK_AUTOMATION_DEFAULTS.staleInactiveDays, suggestedMessage: null };
  }
}

export function TaskAutomationForm({ kind, initial, clients, stages, onSubmit, onClose }: TaskAutomationFormProps) {
  const activeClientId = useActiveClientId();
  const [draft, setDraft] = useState<TaskAutomationDraft>(() => initialDraft(kind, initial, activeClientId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El tipo del borrador no cambia: cada rama del formulario solo toca campos de su tipo.
  const patch = (changes: Partial<TaskAutomationDraft>) => setDraft((d) => ({ ...d, ...changes }) as TaskAutomationDraft);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await onSubmit(draft);
    setSaving(false);
    if (result.ok) onClose();
    else setError(result.error ?? "No se pudo guardar.");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
      <div className="bg-white border border-[#E8E6DF] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-4 border-b border-[#E8E6DF] flex items-center justify-between bg-[#FDFDFC]">
          <h2 className="text-sm font-semibold text-[#1F1E1D]">
            {initial ? "Editar" : "Nueva"}: {TASK_AUTOMATION_KIND_LABEL[draft.kind].toLowerCase()}
          </h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-[#82807C] hover:text-[#1F1E1D] p-1 rounded-lg hover:bg-[#F4F3EE]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <label className="block">
            <span className="block text-xs font-medium text-[#4D4C48] mb-1">Nombre</span>
            <input
              required
              maxLength={TASK_AUTOMATION_LIMITS.NAME_MAX_LENGTH}
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              className={inputClass}
            />
          </label>

          {!activeClientId && (
            <label className="block">
              <span className="block text-xs font-medium text-[#4D4C48] mb-1">Cliente</span>
              <select value={draft.clientId ?? ""} onChange={(e) => patch({ clientId: e.target.value || null })} className={inputClass}>
                <option value="">Todos los clientes</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <span className="block mt-1 text-[10px] text-[#82807C]">Una regla de un cliente reemplaza a la general para ese cliente.</span>
            </label>
          )}

          {draft.kind === TASK_AUTOMATION_KIND.ONBOARDING && <OnboardingFields draft={draft} onChange={patch} />}
          {draft.kind === TASK_AUTOMATION_KIND.STAGE_FOLLOWUP && <StageFollowupFields draft={draft} stages={stages} onChange={patch} />}
          {draft.kind === TASK_AUTOMATION_KIND.STALE_REACTIVATION && <StaleReactivationFields draft={draft} onChange={patch} />}

          <label className="flex items-center gap-2 text-xs text-[#4D4C48]">
            <input type="checkbox" checked={draft.isActive} onChange={(e) => patch({ isActive: e.target.checked })} />
            Activa
          </label>

          {error && <p role="alert" className="text-xs text-red-700">{error}</p>}

          <div className="pt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl bg-[#F4F3EE] border border-[#E8E6DF] text-[#4D4C48] hover:text-[#1F1E1D] text-xs font-medium"
            >
              Cancelar
            </button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl btn-black-gold text-xs font-semibold">
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
