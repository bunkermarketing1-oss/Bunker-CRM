"use client";

import React, { useState } from "react";
import { Plus, Workflow } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import EmptyState from "@/components/ui/EmptyState";
import { SmsAutomationCard } from "@/components/automations/SmsAutomationCard";
import { SmsAutomationForm } from "@/components/automations/SmsAutomationForm";
import { useSmsAutomations, type MutationResult } from "@/hooks/useSmsAutomations";
import { useClientOptions } from "@/hooks/useClientOptions";
import type { SmsAutomationSummary } from "@/types/automations";

// null = formulario cerrado, "new" = crear, objeto = editar esa regla.
type FormState = null | "new" | SmsAutomationSummary;

export default function AutomationsPage() {
  const { automations, loading, error, create, update, remove } = useSmsAutomations();
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
        description="SMS automático en cuanto llega un lead, con el texto de cada cliente."
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
