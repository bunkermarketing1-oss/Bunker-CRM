"use client";

import { Plus, X } from "lucide-react";
import { TASK_AUTOMATION_LIMITS as L } from "@/lib/constants/automations";
import type { PipelineStageOption, TaskAutomationDraft } from "@/types/task-automations";

type Draft<K extends TaskAutomationDraft["kind"]> = Extract<TaskAutomationDraft, { kind: K }>;

interface FieldsProps<K extends TaskAutomationDraft["kind"]> {
  draft: Draft<K>;
  onChange: (changes: Partial<Draft<K>>) => void;
}

export const inputClass =
  "w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]";
const labelClass = "block text-xs font-medium text-[#4D4C48] mb-1";

/** Un campo numérico vacío se manda como 0 y la API responde con el mínimo permitido. */
const toInt = (value: string) => (value === "" ? 0 : Math.trunc(Number(value)));

export function OnboardingFields({ draft, onChange }: FieldsProps<"onboarding">) {
  const setTask = (index: number, title: string) => onChange({ tasks: draft.tasks.map((t, i) => (i === index ? title : t)) });
  const removeTask = (index: number) => onChange({ tasks: draft.tasks.filter((_, i) => i !== index) });

  return (
    <>
      <fieldset>
        <legend className={labelClass}>
          Tareas del checklist ({draft.tasks.length}/{L.ONBOARDING_TASKS_MAX})
        </legend>
        <div className="space-y-1.5">
          {draft.tasks.map((task, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <input
                required
                maxLength={L.TASK_TITLE_MAX_LENGTH}
                value={task}
                aria-label={`Tarea ${index + 1}`}
                onChange={(e) => setTask(index, e.target.value)}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => removeTask(index)}
                disabled={draft.tasks.length <= L.ONBOARDING_TASKS_MIN}
                aria-label={`Quitar tarea ${index + 1}`}
                className="p-1.5 rounded-lg text-[#82807C] hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={() => onChange({ tasks: [...draft.tasks, ""] })}
          disabled={draft.tasks.length >= L.ONBOARDING_TASKS_MAX}
          className="mt-1.5 text-[11px] font-medium text-[#D97757] flex items-center gap-1 disabled:opacity-40"
        >
          <Plus className="w-3 h-3" /> Agregar tarea
        </button>
      </fieldset>

      <label className="block">
        <span className={labelClass}>Vencen en (días desde el cierre)</span>
        <input
          type="number"
          min={0}
          max={L.ONBOARDING_DUE_DAYS_MAX}
          value={draft.dueInDays}
          onChange={(e) => onChange({ dueInDays: toInt(e.target.value) })}
          className={inputClass}
        />
      </label>
    </>
  );
}

export function StageFollowupFields({ draft, stages, onChange }: FieldsProps<"stage_followup"> & { stages: PipelineStageOption[] }) {
  // Una regla vieja puede apuntar a una etapa renombrada: se muestra igual para no perderla al editar.
  const stageNames = stages.map((s) => s.name);
  const options = draft.stageNameMatch && !stageNames.includes(draft.stageNameMatch) ? [draft.stageNameMatch, ...stageNames] : stageNames;

  return (
    <>
      <label className="block">
        <span className={labelClass}>Etapa que dispara el seguimiento</span>
        {options.length > 0 ? (
          <select required value={draft.stageNameMatch} onChange={(e) => onChange({ stageNameMatch: e.target.value })} className={inputClass}>
            <option value="">Elige una etapa…</option>
            {options.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        ) : (
          <input
            required
            maxLength={L.STAGE_NAME_MAX_LENGTH}
            placeholder="Nombre (o parte) de la etapa"
            value={draft.stageNameMatch}
            onChange={(e) => onChange({ stageNameMatch: e.target.value })}
            className={inputClass}
          />
        )}
        <span className="block mt-1 text-[10px] text-[#82807C]">Coincide si el nombre de la etapa contiene este texto (sin importar tildes ni mayúsculas).</span>
      </label>

      <label className="block">
        <span className={labelClass}>Título de la tarea</span>
        <input
          required
          maxLength={L.TASK_TITLE_MAX_LENGTH}
          value={draft.taskTitle}
          onChange={(e) => onChange({ taskTitle: e.target.value })}
          className={inputClass}
        />
        <span className="block mt-1 text-[10px] text-[#82807C]">Se completa con el nombre de la oportunidad: «{draft.taskTitle || "…"}: Oportunidad».</span>
      </label>

      <label className="block">
        <span className={labelClass}>Vence en (horas)</span>
        <input
          type="number"
          min={L.FOLLOWUP_HOURS_MIN}
          max={L.FOLLOWUP_HOURS_MAX}
          value={draft.hoursDue}
          onChange={(e) => onChange({ hoursDue: toInt(e.target.value) })}
          className={inputClass}
        />
      </label>
    </>
  );
}

export function StaleReactivationFields({ draft, onChange }: FieldsProps<"stale_reactivation">) {
  const message = draft.suggestedMessage ?? "";
  return (
    <>
      <label className="block">
        <span className={labelClass}>Días sin actividad</span>
        <input
          type="number"
          min={L.STALE_DAYS_MIN}
          max={L.STALE_DAYS_MAX}
          value={draft.inactiveDays}
          onChange={(e) => onChange({ inactiveDays: toInt(e.target.value) })}
          className={inputClass}
        />
        <span className="block mt-1 text-[10px] text-[#82807C]">
          Sin actividades, mensajes ni llamadas, y sin cambios en el lead durante ese tiempo.
        </span>
      </label>

      <label className="block">
        <span className="flex items-center justify-between text-xs font-medium text-[#4D4C48] mb-1">
          Mensaje sugerido para el asesor (opcional)
          <span className="font-mono text-[10px] text-[#82807C]">
            {message.length}/{L.SUGGESTED_MESSAGE_MAX_LENGTH}
          </span>
        </span>
        <textarea
          rows={3}
          maxLength={L.SUGGESTED_MESSAGE_MAX_LENGTH}
          value={message}
          onChange={(e) => onChange({ suggestedMessage: e.target.value || null })}
          className={`${inputClass} resize-y`}
        />
        <span className="block mt-1 text-[10px] text-[#82807C]">
          Va en la descripción de la tarea. No se envía solo: el asesor decide si lo manda.
        </span>
      </label>
    </>
  );
}
