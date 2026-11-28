"use client";

import React, { useState, type FormEvent } from "react";
import { PhoneForwarded, Plus, Check, Copy } from "lucide-react";
import type { MutationResult } from "@/hooks/useSmsAutomations";
import type { PhoneLineDraft } from "@/hooks/usePhoneLines";
import { useActiveClientId } from "@/hooks/useActiveClientId";
import type { ClientOption } from "@/hooks/useClientOptions";
import type { PhoneLineSummary } from "@/types/voice";

interface PhoneLinesPanelProps {
  lines: PhoneLineSummary[];
  clients: ClientOption[];
  onCreate: (draft: PhoneLineDraft) => Promise<MutationResult>;
  onUpdate: (id: string, changes: Partial<Omit<PhoneLineDraft, "phoneNumber">> & { isActive?: boolean }) => Promise<MutationResult>;
}

const inputClass =
  "w-full bg-[#F9FAFB] border border-[#EAECF0] rounded-xl px-3 py-2.5 text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:border-amber-500 focus:bg-white transition-colors";

const EMPTY: PhoneLineDraft = { phoneNumber: "", label: "", clientId: null, recordCalls: true };

/** Control de líneas: qué número de Twilio usa cada cliente y si graba. */
export function PhoneLinesPanel({ lines, clients, onCreate, onUpdate }: PhoneLinesPanelProps) {
  const activeClientId = useActiveClientId();
  const [pickedDraft, setDraft] = useState<PhoneLineDraft>(EMPTY);
  // Con marca activa la línea nueva queda fijada a ella.
  const draft = activeClientId ? { ...pickedDraft, clientId: activeClientId } : pickedDraft;
  // Las líneas de otras marcas no se listan dentro de una marca; las generales (sin marca) sí.
  const visibleLines = activeClientId ? lines.filter((l) => !l.clientId || l.clientId === activeClientId) : lines;
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);

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

  const handleCopyNumber = (phone: string) => {
    navigator.clipboard?.writeText(phone);
    setCopiedNumber(phone);
    setTimeout(() => setCopiedNumber(null), 2000);
  };

  return (
    <section className="p-5 sm:p-6 rounded-3xl bg-white border border-[#EAECF0] shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#F2F4F7]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
            <PhoneForwarded className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#101828]">Líneas Telefónicas</h2>
            <p className="text-[11px] text-[#667085]">Números de Twilio y asignación de marcas</p>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border bg-[#F8F9FA] text-[#667085] border-[#EAECF0]">
          {visibleLines.length} {visibleLines.length === 1 ? "línea" : "líneas"}
        </span>
      </div>

      <p className="text-xs text-[#667085]">
        Registra los números de Twilio. Las llamadas de cada marca salen por su línea específica; si no tiene línea
        asignada, salen por la línea general.
      </p>

      {error && (
        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-700 font-bold ml-2">✕</button>
        </div>
      )}

      {visibleLines.length > 0 && (
        <ul className="space-y-3">
          {visibleLines.map((line) => (
            <li key={line.id} className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#EAECF0] space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="text-xs font-bold text-[#101828] truncate">{line.label}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyNumber(line.phoneNumber)}
                    className="inline-flex items-center gap-1 font-mono text-xs px-2 py-0.5 rounded-lg bg-white border border-[#EAECF0] text-[#344054] hover:bg-[#F2F4F7] transition-colors"
                    title="Copiar número"
                  >
                    <span>{line.phoneNumber}</span>
                    {copiedNumber === line.phoneNumber ? (
                      <Check className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <Copy className="w-3 h-3 text-[#98A2B3]" />
                    )}
                  </button>
                </div>
                <label className="flex items-center gap-1.5 text-xs font-semibold text-[#344054] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={line.isActive}
                    onChange={(e) => run(onUpdate(line.id, { isActive: e.target.checked }))}
                    className="rounded border-[#D0D5DD] text-amber-600 focus:ring-amber-500"
                  />
                  <span>Activa</span>
                </label>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-[#475467]">
                <div className="flex-1 min-w-[200px]">
                  <select
                    value={line.clientId ?? ""}
                    onChange={(e) => run(onUpdate(line.id, { clientId: e.target.value || null }))}
                    aria-label={`Cliente de ${line.label}`}
                    className="w-full bg-white border border-[#EAECF0] rounded-xl px-3 py-1.5 text-xs text-[#101828] focus:outline-none focus:border-amber-500"
                  >
                    <option value="">General (disponible para toda la agencia)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="flex items-center gap-1.5 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={line.recordCalls}
                    onChange={(e) => run(onUpdate(line.id, { recordCalls: e.target.checked }))}
                    className="rounded border-[#D0D5DD] text-amber-600 focus:ring-amber-500"
                  />
                  <span>Grabar (con aviso)</span>
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="space-y-3 pt-3 border-t border-[#F2F4F7]">
        <p className="text-xs font-semibold text-[#344054] flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5 text-amber-600" />
          <span>Agregar nueva línea de Twilio</span>
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <input
            required
            placeholder="+1 469 123 4567"
            value={draft.phoneNumber}
            onChange={(e) => setDraft({ ...draft, phoneNumber: e.target.value })}
            aria-label="Número de Twilio"
            className={`${inputClass} font-mono`}
          />
          <input
            required
            maxLength={80}
            placeholder="Etiqueta (ej. Ventas México, Soporte)"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
            aria-label="Etiqueta"
            className={inputClass}
          />
        </div>

        {!activeClientId && (
        <select
          value={draft.clientId ?? ""}
          onChange={(e) => setDraft({ ...draft, clientId: e.target.value || null })}
          aria-label="Cliente"
          className={inputClass}
        >
          <option value="">General (sin cliente asignado)</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <label className="flex items-center gap-1.5 text-xs text-[#475467] cursor-pointer">
            <input
              type="checkbox"
              checked={draft.recordCalls}
              onChange={(e) => setDraft({ ...draft, recordCalls: e.target.checked })}
              className="rounded border-[#D0D5DD] text-amber-600 focus:ring-amber-500"
            />
            <span>Grabar llamadas (con aviso legal previo)</span>
          </label>

          <button
            type="submit"
            disabled={saving || !draft.phoneNumber || !draft.label}
            className="px-4 py-2 rounded-xl bg-[#101828] hover:bg-[#1E293B] text-white text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {saving ? "Guardando…" : "Agregar línea"}
          </button>
        </div>
      </form>
    </section>
  );
}
