"use client";

import { useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { renderSmsTemplate } from "@/lib/automations/sms-template";
import { SMS_TEMPLATE_VARIABLES, type SmsTemplateVariable } from "@/lib/constants/automations";
import { leadSourceLabel } from "@/lib/constants/crm";
import { SMS_MAX_LENGTH } from "@/lib/constants/messaging";
import { LEAD_SOURCES } from "@/lib/validations/lead";
import type { ClientOption } from "@/hooks/useClientOptions";
import type { MutationResult, SmsAutomationDraft } from "@/hooks/useSmsAutomations";
import type { SmsAutomationSummary } from "@/types/automations";

interface SmsAutomationFormProps {
  initial: SmsAutomationSummary | null;
  clients: ClientOption[];
  onSubmit: (draft: SmsAutomationDraft) => Promise<MutationResult>;
  onClose: () => void;
}

const DEFAULT_TEMPLATE = "Hola {{nombre}}, gracias por tu interés en {{cliente}}. ¿Te podemos llamar hoy? Responde SI o el mejor horario.";

const PREVIEW_VALUES: Record<SmsTemplateVariable, string> = {
  nombre: "Ana",
  nombre_completo: "Ana López",
  cliente: "Carrito Naranja",
  campana: "Campaña Octubre",
};

const inputClass =
  "w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]";

export function SmsAutomationForm({ initial, clients, onSubmit, onClose }: SmsAutomationFormProps) {
  const [draft, setDraft] = useState<SmsAutomationDraft>({
    name: initial?.name ?? "SMS de calificación inmediata",
    clientId: initial?.clientId ?? null,
    sources: initial?.sources ?? ["meta_ads"],
    template: initial?.template ?? DEFAULT_TEMPLATE,
    isActive: initial?.isActive ?? true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = renderSmsTemplate(draft.template, {
    ...PREVIEW_VALUES,
    cliente: clients.find((c) => c.id === draft.clientId)?.name ?? PREVIEW_VALUES.cliente,
  });

  const toggleSource = (source: string) =>
    setDraft((d) => ({
      ...d,
      sources: d.sources.includes(source) ? d.sources.filter((s) => s !== source) : [...d.sources, source],
    }));

  const insertVariable = (variable: string) => setDraft((d) => ({ ...d, template: `${d.template}{{${variable}}}` }));

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
          <h2 className="text-sm font-semibold text-[#1F1E1D]">{initial ? "Editar automatización" : "Nueva automatización"}</h2>
          <button type="button" onClick={onClose} aria-label="Cerrar" className="text-[#82807C] hover:text-[#1F1E1D] p-1 rounded-lg hover:bg-[#F4F3EE]">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <label className="block">
            <span className="block text-xs font-medium text-[#4D4C48] mb-1">Nombre</span>
            <input required maxLength={120} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} className={inputClass} />
          </label>

          <label className="block">
            <span className="block text-xs font-medium text-[#4D4C48] mb-1">Cliente</span>
            <select
              value={draft.clientId ?? ""}
              onChange={(e) => setDraft({ ...draft, clientId: e.target.value || null })}
              className={inputClass}
            >
              <option value="">Todos los clientes</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>

          <fieldset>
            <legend className="block text-xs font-medium text-[#4D4C48] mb-1.5">Fuentes del lead (ninguna = todas)</legend>
            <div className="flex flex-wrap gap-1.5">
              {LEAD_SOURCES.map((source) => {
                const selected = draft.sources.includes(source);
                return (
                  <button
                    key={source}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => toggleSource(source)}
                    className={`px-2.5 py-1 rounded-full border text-[11px] ${
                      selected ? "bg-[#1F1E1D] text-white border-[#1F1E1D]" : "bg-white text-[#4D4C48] border-[#E8E6DF] hover:border-[#D1CFCA]"
                    }`}
                  >
                    {leadSourceLabel(source)}
                  </button>
                );
              })}
            </div>
          </fieldset>

          <div>
            <label className="block">
              <span className="flex items-center justify-between text-xs font-medium text-[#4D4C48] mb-1">
                Texto del SMS
                <span className={`font-mono text-[10px] ${draft.template.length > SMS_MAX_LENGTH ? "text-red-700" : "text-[#82807C]"}`}>
                  {draft.template.length}/{SMS_MAX_LENGTH}
                </span>
              </span>
              <textarea
                required
                rows={4}
                value={draft.template}
                onChange={(e) => setDraft({ ...draft, template: e.target.value })}
                className={`${inputClass} resize-y`}
              />
            </label>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {Object.entries(SMS_TEMPLATE_VARIABLES).map(([variable, description]) => (
                <button
                  key={variable}
                  type="button"
                  title={description}
                  onClick={() => insertVariable(variable)}
                  className="px-2 py-0.5 rounded-md bg-[#F4F3EE] border border-[#E8E6DF] text-[10px] font-mono text-[#4D4C48] hover:text-[#1F1E1D]"
                >
                  {`{{${variable}}}`}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF]">
            <p className="text-[10px] uppercase tracking-wide text-[#82807C] mb-1">Vista previa</p>
            <p className="text-xs text-[#1F1E1D] whitespace-pre-line">{preview || "—"}</p>
          </div>

          <label className="flex items-center gap-2 text-xs text-[#4D4C48]">
            <input type="checkbox" checked={draft.isActive} onChange={(e) => setDraft({ ...draft, isActive: e.target.checked })} />
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
