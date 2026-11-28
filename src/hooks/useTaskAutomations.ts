"use client";

import { useCallback, useEffect, useState } from "react";
import { sendJsonMutation, type MutationResult } from "@/hooks/useSmsAutomations";
import type { StaleLeadsCheckResult } from "@/types/opportunity-automations";
import type {
  PipelineStageOption,
  TaskAutomationDraft,
  TaskAutomationSummary,
  TaskAutomationsResponse,
} from "@/types/task-automations";
import { useActiveClientId } from "@/hooks/useActiveClientId";

const BASE_URL = "/api/automations/tasks";

/** Cambios de una regla existente: el `kind` va siempre para que la API sepa qué validar. */
export type TaskAutomationChanges = TaskAutomationDraft extends infer D
  ? D extends TaskAutomationDraft
    ? Pick<D, "kind"> & Partial<Omit<D, "kind">>
    : never
  : never;

/** Reglas de onboarding, seguimiento por etapa y reactivación, más el barrido manual. */
export function useTaskAutomations() {
  const [automations, setAutomations] = useState<TaskAutomationSummary[]>([]);
  const [stages, setStages] = useState<PipelineStageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const activeClientId = useActiveClientId();
  const [staleCheck, setStaleCheck] = useState<{ running: boolean; result: StaleLeadsCheckResult | null; error: string | null }>({
    running: false,
    result: null,
    error: null,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(activeClientId ? `${BASE_URL}?clientId=${encodeURIComponent(activeClientId)}` : BASE_URL);
      const json: TaskAutomationsResponse | { success: false; error: string } = await res.json();
      // `in` en vez de `json.success`: sin strictNullChecks TS no estrecha por el literal booleano.
      if ("automations" in json) {
        setAutomations(json.automations);
        setStages(json.stages);
      } else setError(json.error);
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

  const create = useCallback((draft: TaskAutomationDraft) => withRefresh(sendJsonMutation(BASE_URL, "POST", draft)), [withRefresh]);
  const update = useCallback(
    (id: string, changes: TaskAutomationChanges) => withRefresh(sendJsonMutation(`${BASE_URL}/${id}`, "PATCH", changes)),
    [withRefresh]
  );
  const remove = useCallback((id: string) => withRefresh(sendJsonMutation(`${BASE_URL}/${id}`, "DELETE")), [withRefresh]);

  const runStaleCheck = useCallback(async () => {
    setStaleCheck({ running: true, result: null, error: null });
    try {
      const res = await fetch("/api/automations/run-stale-check", { method: "POST" });
      const json = await res.json();
      if (json.success) setStaleCheck({ running: false, result: json.result, error: null });
      else setStaleCheck({ running: false, result: null, error: json.error || "No se pudo ejecutar el chequeo." });
      // Los contadores de ejecución de las reglas cambian con el barrido.
      if (json.success) await refresh();
    } catch (err) {
      setStaleCheck({ running: false, result: null, error: err instanceof Error ? err.message : "Error de red" });
    }
  }, [refresh]);

  return { automations, stages, loading, error, create, update, remove, staleCheck, runStaleCheck, refresh };
}
