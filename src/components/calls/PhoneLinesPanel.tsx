"use client";

import { useState, type FormEvent } from "react";
import { PhoneForwarded } from "lucide-react";
import type { MutationResult } from "@/hooks/useSmsAutomations";
import type { PhoneLineDraft } from "@/hooks/usePhoneLines";
import type { ClientOption } from "@/hooks/useClientOptions";
import type { PhoneLineSummary } from "@/types/voice";

interface PhoneLinesPanelProps {
  lines: PhoneLineSummary[];
  clients: ClientOption[];
  onCreate: (draft: PhoneLineDraft) => Promise<MutationResult>;
  onUpdate: (id: string, changes: Partial<Omit<PhoneLineDraft, "phoneNumber">> & { isActive?: boolean }) => Promise<MutationResult>;
}

const inputClass =
  "w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]";

const EMPTY: PhoneLineDraft = { phoneNumber: "", label: "", clientId: null, recordCalls: false };

/** Control de líneas: qué número de Twilio usa cada cliente y si graba. */
export function PhoneLinesPanel({ lines, clients, onCreate, onUpdate }: PhoneLinesPanelProps) {
  const [draft, setDraft] = useState<PhoneLineDraft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: Promise<MutationResult>) => {
    setError(null);
    const result = await action;
    if (!result.ok) setError(result.error ?? "No se pudo guardar.");
    return result.ok;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    if (await run(onCreate(draft))) setDraft(EMPTY);
    setSaving(false);
  };

  return (
    <section className="p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm space-y-4">
      <h2 className="text-sm font-semibold text-[#1F1E1D] flex items-center gap-2">
        <PhoneForwarded className="w-4 h-4 text-[#D97757]" />
        Líneas
      </h2>
      <p className="text-[11px] text-[#82807C]">
        Compra el número en Twilio y regístralo aquí. Las llamadas a leads de un cliente salen por su línea; sin línea,
        salen por el número general.
      </p>

      {lines.length > 0 && (
        <ul className="space-y-2">
          {lines.map((line) => (
            <li key={line.id} className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-[#1F1E1D] truncate">
                  {line.label} <span className="font-mono font-normal text-[#82807C]">{line.phoneNumber}</span>
                </span>
                <label className="flex items-center gap-1.5 text-[11px] text-[#4D4C48] flex-shrink-0">
                  <input type="checkbox" checked={line.isActive} onChange={(e) => run(onUpdate(line.id, { isActive: e.target.checked }))} />
                  Activa
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#4D4C48]">
                <select
                  value={line.clientId ?? ""}
                  onChange={(e) => run(onUpdate(line.id, { clientId: e.target.value || null }))}
                  aria-label={`Cliente de ${line.label}`}
                  className="flex-1 min-w-0 bg-white border border-[#E8E6DF] rounded-lg px-2 py-1 text-[11px]"
                >
                  <option value="">General (sin cliente)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <label className="flex items-center gap-1.5">
                  <input type="checkbox" checked={line.recordCalls} onChange={(e) => run(onUpdate(line.id, { recordCalls: e.target.checked }))} />
                  Grabar (con aviso)
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="space-y-2.5 pt-2 border-t border-[#F0EFEA]">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <input
            required
            placeholder="+52 55 1234 5678"
            value={draft.phoneNumber}
            onChange={(e) => setDraft({ ...draft, phoneNumber: e.target.value })}
            aria-label="Número de Twilio"
            className={`${inputClass} font-mono`}
          />
          <input
            required
            maxLength={80}
            placeholder="Etiqueta (p. ej. Carrito Naranja)"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            aria-label="Etiqueta"
            className={inputClass}
          />
        </div>
        <select
          value={draft.clientId ?? ""}
          onChange={(e) => setDraft({ ...draft, clientId: e.target.value || null })}
          aria-label="Cliente"
          className={inputClass}
        >
          <option value="">General (sin cliente)</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="flex items-center justify-between gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-[#4D4C48]">
            <input type="checkbox" checked={draft.recordCalls} onChange={(e) => setDraft({ ...draft, recordCalls: e.target.checked })} />
            Grabar llamadas (con aviso)
          </label>
          <button type="submit" disabled={saving} className="px-4 py-2 rounded-xl btn-black-gold text-xs font-semibold disabled:opacity-50">
            {saving ? "Guardando…" : "Agregar línea"}
          </button>
        </div>
      </form>

      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </section>
  );
}
