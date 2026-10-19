"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClientAiAssistantSettings } from "@/types/ai-assistant";

/** Lo que envía el formulario (mismo formato que acepta `PUT /api/clients/[id]/ai-assistant`). */
export type ClientAiAssistantDraft = Omit<ClientAiAssistantSettings, "clientId" | "updatedAt">;

export interface SaveResult {
  ok: boolean;
  error?: string;
}

export function useClientAiAssistant(clientId: string) {
  const [settings, setSettings] = useState<ClientAiAssistantSettings | null>(null);
  const [aiConfigured, setAiConfigured] = useState(false);
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const apply = (json: { settings: ClientAiAssistantSettings; aiConfigured: boolean; model: string }) => {
    setSettings(json.settings);
    setAiConfigured(json.aiConfigured);
    setModel(json.model);
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/clients/${clientId}/ai-assistant`);
      const json = await res.json();
      if (json.success) apply(json);
      else setError(json.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const save = useCallback(
    async (draft: ClientAiAssistantDraft): Promise<SaveResult> => {
      try {
        const res = await fetch(`/api/clients/${clientId}/ai-assistant`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(draft),
        });
        const json = await res.json().catch(() => ({}));
        if (!json.success) return { ok: false, error: json.error || "No se pudo guardar." };
        apply(json);
        return { ok: true };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Error de red" };
      }
    },
    [clientId]
  );

  return { settings, aiConfigured, model, loading, error, refresh, save };
}
