"use client";

import { useCallback, useEffect, useState } from "react";
import type { SmsAutomationSummary } from "@/types/automations";
import { useActiveClientId } from "@/hooks/useActiveClientId";

/** Datos que envía el formulario de una regla (mismo formato que acepta la API). */
export interface SmsAutomationDraft {
  name: string;
  clientId: string | null;
  sources: string[];
  template: string;
  isActive: boolean;
}

/** `error` viene solo cuando `ok` es false. */
export interface MutationResult {
  ok: boolean;
  error?: string;
}

/** POST/PATCH/DELETE con la forma de respuesta `{ success, error }`; lo reusa `useTaskAutomations`. */
export async function sendJsonMutation(url: string, method: string, body?: unknown): Promise<MutationResult> {
  try {
    const res = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = await res.json().catch(() => ({}));
    return json.success ? { ok: true } : { ok: false, error: json.error || "No se pudo guardar." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de red" };
  }
}

export function useSmsAutomations() {
  const activeClientId = useActiveClientId();
  const [automations, setAutomations] = useState<SmsAutomationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(activeClientId ? `/api/automations?clientId=${encodeURIComponent(activeClientId)}` : "/api/automations");
      const json = await res.json();
      if (json.success) setAutomations(json.automations);
      else setError(json.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, [activeClientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const withRefresh = useCallback(
    async (action: Promise<MutationResult>) => {
      const result = await action;
      if (result.ok) await refresh();
      return result;
    },
    [refresh]
  );

  const create = useCallback((draft: SmsAutomationDraft) => withRefresh(sendJsonMutation("/api/automations", "POST", draft)), [withRefresh]);
  const update = useCallback(
    (id: string, changes: Partial<SmsAutomationDraft>) => withRefresh(sendJsonMutation(`/api/automations/${id}`, "PATCH", changes)),
    [withRefresh]
  );
  const remove = useCallback((id: string) => withRefresh(sendJsonMutation(`/api/automations/${id}`, "DELETE")), [withRefresh]);

  return { automations, loading, error, refresh, create, update, remove };
}
