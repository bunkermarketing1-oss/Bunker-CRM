"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { SMS_TEMPLATE_VARIABLES } from "@/lib/constants/automations";
import { LEAD_STATUS_LABEL, leadSourceLabel, type LeadStatusValue } from "@/lib/constants/crm";
import { BULK_SMS_RESEND_WINDOW_HOURS, SMS_MAX_LENGTH } from "@/lib/constants/messaging";
import { LEAD_SOURCES, LEAD_STATUSES } from "@/lib/validations/lead";
import { useBulkSms, type BulkSmsDraftFilter } from "@/hooks/useBulkSms";
import type { ClientOption } from "@/hooks/useClientOptions";

interface BulkSmsPanelProps {
  clients: ClientOption[];
  onSent: () => void;
}

const inputClass =
  "w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]";

function Chip({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`px-2.5 py-1 rounded-full border text-[11px] ${
        selected ? "bg-[#1F1E1D] text-white border-[#1F1E1D]" : "bg-white text-[#4D4C48] border-[#E8E6DF] hover:border-[#D1CFCA]"
      }`}
    >
      {label}
    </button>
  );
}

const toggle = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

/** Envío masivo (solo admin): filtros → cuántos recibirían → confirmar y enviar. */
export function BulkSmsPanel({ clients, onSent }: BulkSmsPanelProps) {
  const [filter, setFilter] = useState<BulkSmsDraftFilter>({ clientId: null, statuses: [], sources: [] });
  const [template, setTemplate] = useState("Hola {{nombre}}, ");
  const { preview, result, loading, error, reset, previewRecipients, send } = useBulkSms();

  // Cualquier cambio invalida la vista previa: lo que se confirma es exactamente lo que se ve.
  const updateFilter = (next: BulkSmsDraftFilter) => {
    setFilter(next);
    reset();
  };

  const handleSend = async () => {
    if (!preview) return;
    if (!window.confirm(`Se enviarán ${preview.eligible} SMS. ¿Continuar?`)) return;
    if (await send(filter, template)) onSent();
  };

  const overLimit = preview ? preview.eligible > preview.maxRecipients : false;

  return (
    <section className="p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm space-y-4">
      <h2 className="text-sm font-semibold text-[#1F1E1D] flex items-center gap-2">
        <Megaphone className="w-4 h-4 text-[#D97757]" />
        Envío masivo
      </h2>

      <label className="block">
        <span className="block text-xs font-medium text-[#4D4C48] mb-1">Cliente</span>
        <select
          value={filter.clientId ?? ""}
          onChange={(e) => updateFilter({ ...filter, clientId: e.target.value || null })}
          className={inputClass}
        >
          <option value="">Todos los clientes</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend className="block text-xs font-medium text-[#4D4C48] mb-1.5">Estado del lead (ninguno = todos)</legend>
        <div className="flex flex-wrap gap-1.5">
          {LEAD_STATUSES.map((status) => (
            <Chip
              key={status}
              selected={filter.statuses.includes(status)}
              label={LEAD_STATUS_LABEL[status as LeadStatusValue]}
              onClick={() => updateFilter({ ...filter, statuses: toggle(filter.statuses, status) })}
            />
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="block text-xs font-medium text-[#4D4C48] mb-1.5">Fuente (ninguna = todas)</legend>
        <div className="flex flex-wrap gap-1.5">
          {LEAD_SOURCES.map((source) => (
            <Chip
              key={source}
              selected={filter.sources.includes(source)}
              label={leadSourceLabel(source)}
              onClick={() => updateFilter({ ...filter, sources: toggle(filter.sources, source) })}
            />
          ))}
        </div>
      </fieldset>

      <label className="block">
        <span className="flex items-center justify-between text-xs font-medium text-[#4D4C48] mb-1">
          Texto
          <span className={`font-mono text-[10px] ${template.length > SMS_MAX_LENGTH ? "text-red-700" : "text-[#82807C]"}`}>
            {template.length}/{SMS_MAX_LENGTH}
          </span>
        </span>
        <textarea
          rows={3}
          value={template}
          onChange={(e) => {
            setTemplate(e.target.value);
            reset();
          }}
          className={`${inputClass} resize-y`}
        />
        <span className="block mt-1 text-[10px] text-[#82807C]">
          Variables: {Object.keys(SMS_TEMPLATE_VARIABLES).map((v) => `{{${v}}}`).join(" ")}
        </span>
      </label>

      {preview && (
        <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-xs text-[#4D4C48] space-y-1">
          <p>
            <strong className="text-[#1F1E1D]">{preview.eligible}</strong> SMS de {preview.matched} leads.
          </p>
          <p className="text-[11px] text-[#82807C]">
            Se omiten: {preview.skipped.withoutPhone} sin teléfono, {preview.skipped.optedOut} dados de baja,{" "}
            {preview.skipped.duplicates} con teléfono repetido, {preview.skipped.recentlySent} que ya recibieron este texto en
            las últimas {BULK_SMS_RESEND_WINDOW_HOURS} h.
          </p>
          {overLimit && (
            <p className="text-[11px] text-red-700">Supera el máximo de {preview.maxRecipients} por envío: ajusta los filtros.</p>
          )}
        </div>
      )}

      {result && (
        <p role="status" className="text-xs text-emerald-800">
          Enviados {result.sent}, fallidos {result.failed}
          {result.alreadyClaimed > 0 && `, ${result.alreadyClaimed} ya enviados por otro intento de este lote`}.
        </p>
      )}
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          disabled={loading}
          onClick={() => previewRecipients(filter, template)}
          className="flex-1 py-2 rounded-xl bg-[#F4F3EE] border border-[#E8E6DF] text-[#4D4C48] hover:text-[#1F1E1D] text-xs font-medium disabled:opacity-50"
        >
          {loading && !preview ? "Calculando..." : "Ver destinatarios"}
        </button>
        <button
          type="button"
          disabled={loading || !preview || preview.eligible === 0 || overLimit}
          onClick={handleSend}
          className="flex-1 py-2 rounded-xl btn-black-gold text-xs font-semibold disabled:opacity-50"
        >
          {loading && preview ? "Enviando..." : "Enviar"}
        </button>
      </div>
    </section>
  );
}
