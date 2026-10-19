"use client";

import { useState } from "react";
import {
  AI_INSTRUCTIONS_MAX_LENGTH,
  AI_KNOWLEDGE_BASE_MAX_LENGTH,
  AI_MAX_REPLIES_PER_DAY_LIMIT,
  AI_REPLY_MAX_LENGTH,
} from "@/lib/constants/ai-assistant";
import { BusinessHoursEditor } from "@/components/clients/BusinessHoursEditor";
import type { ClientAiAssistantDraft, SaveResult } from "@/hooks/useClientAiAssistant";
import type { ClientAiAssistantSettings } from "@/types/ai-assistant";

interface AiAssistantFormProps {
  settings: ClientAiAssistantSettings;
  onSave: (draft: ClientAiAssistantDraft) => Promise<SaveResult>;
}

const inputClass =
  "w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]";

function Counter({ length, max }: { length: number; max: number }) {
  return <span className={`font-mono text-[10px] ${length > max ? "text-red-700" : "text-[#82807C]"}`}>{length}/{max}</span>;
}

function Field({ label, length, max, hint, children }: { label: string; length?: number; max?: number; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-xs font-medium text-[#4D4C48] mb-1">
        {label}
        {max !== undefined && <Counter length={length ?? 0} max={max} />}
      </span>
      {children}
      {hint && <span className="block mt-1 text-[10px] text-[#82807C]">{hint}</span>}
    </label>
  );
}

const toDraft = ({ clientId: _clientId, updatedAt: _updatedAt, ...draft }: ClientAiAssistantSettings): ClientAiAssistantDraft => draft;

/** Formulario del asistente; la validación definitiva la hace la API (Zod). */
export function AiAssistantForm({ settings, onSave }: AiAssistantFormProps) {
  const [draft, setDraft] = useState<ClientAiAssistantDraft>(() => toDraft(settings));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const set = <K extends keyof ClientAiAssistantDraft>(key: K, value: ClientAiAssistantDraft[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const result = await onSave(draft);
    setSaving(false);
    setMessage(result.ok ? { ok: true, text: "Configuración guardada." } : { ok: false, text: result.error ?? "No se pudo guardar." });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="flex items-center gap-2 text-xs font-semibold text-[#1F1E1D]">
        <input type="checkbox" checked={draft.isEnabled} onChange={(e) => set("isEnabled", e.target.checked)} />
        Responder con IA los SMS que lleguen fuera del horario de atención
      </label>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div className="space-y-4">
          <Field label="Zona horaria (IANA)" hint="Ejemplos: America/Bogota, America/Mexico_City.">
            <input value={draft.timezone} onChange={(e) => set("timezone", e.target.value)} className={inputClass} />
          </Field>
          <fieldset>
            <legend className="block text-xs font-medium text-[#4D4C48] mb-1.5">Horario de atención (dentro de él responden los asesores)</legend>
            <BusinessHoursEditor value={draft.businessHours} onChange={(next) => set("businessHours", next)} />
          </fieldset>
          <Field label="Máximo de respuestas automáticas por conversación (24 h)">
            <input
              type="number"
              min={1}
              max={AI_MAX_REPLIES_PER_DAY_LIMIT}
              value={draft.maxRepliesPerDay}
              onChange={(e) => set("maxRepliesPerDay", Number(e.target.value))}
              className={inputClass}
            />
          </Field>
          <Field
            label="Mensaje de traspaso"
            length={draft.handoffMessage.length}
            max={AI_REPLY_MAX_LENGTH}
            hint="Se envía tal cual si la IA no responde a tiempo o falla."
          >
            <textarea rows={3} value={draft.handoffMessage} onChange={(e) => set("handoffMessage", e.target.value)} className={`${inputClass} resize-y`} />
          </Field>
        </div>

        <div className="space-y-4">
          <Field
            label="Base de conocimiento"
            length={draft.knowledgeBase.length}
            max={AI_KNOWLEDGE_BASE_MAX_LENGTH}
            hint="Servicios, precios, preguntas frecuentes, ubicación y políticas. La IA solo responde con lo que esté aquí."
          >
            <textarea rows={14} value={draft.knowledgeBase} onChange={(e) => set("knowledgeBase", e.target.value)} className={`${inputClass} resize-y`} />
          </Field>
          <Field label="Tono e indicaciones" length={draft.instructions.length} max={AI_INSTRUCTIONS_MAX_LENGTH} hint="Ej.: tutea al cliente, sé breve y cálido.">
            <textarea rows={3} value={draft.instructions} onChange={(e) => set("instructions", e.target.value)} className={`${inputClass} resize-y`} />
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl btn-black-gold text-xs font-semibold disabled:opacity-50">
          {saving ? "Guardando..." : "Guardar configuración"}
        </button>
        {message && (
          <p role={message.ok ? "status" : "alert"} className={`text-xs ${message.ok ? "text-emerald-800" : "text-red-700"}`}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
