"use client";

import { useState, useEffect, useCallback } from "react";
import type { AutomationRuleDto, StaleLeadsCheckResult } from "@/types/automations";

export function useAutomations() {
  const [rules, setRules] = useState<AutomationRuleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [runningCheck, setRunningCheck] = useState(false);

  const fetchRules = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/automations");
      const data = await res.json();
      if (data.success) {
        setRules(data.rules || []);
      } else {
        setError(data.error || "No fue posible cargar las reglas de automatización");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error de red al consultar reglas";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  const toggleRule = async (ruleId: string, currentActive: boolean): Promise<boolean> => {
    const nextState = !currentActive;
    // Actualización optimista en la interfaz
    setRules((prev) =>
      prev.map((r) => (r.id === ruleId ? { ...r, isActive: nextState } : r))
    );

    try {
      const res = await fetch(`/api/automations/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextState }),
      });

      const data = await res.json();
      if (!data.success) {
        // Revertir si la API falla
        setRules((prev) =>
          prev.map((r) => (r.id === ruleId ? { ...r, isActive: currentActive } : r))
        );
        alert(data.error || "No se pudo actualizar el estado de la regla");
        return false;
      }

      // Sincronizar datos retornados por el servidor
      if (data.rule) {
        setRules((prev) =>
          prev.map((r) => (r.id === ruleId ? data.rule : r))
        );
      }
      return true;
    } catch (err) {
      // Revertir en caso de excepción
      setRules((prev) =>
        prev.map((r) => (r.id === ruleId ? { ...r, isActive: currentActive } : r))
      );
      const message = err instanceof Error ? err.message : "Error al conectar con el servidor";
      alert(message);
      return false;
    }
  };

  const runStaleCheck = async (): Promise<StaleLeadsCheckResult | null> => {
    try {
      setRunningCheck(true);
      const res = await fetch("/api/automations/run-stale-check", {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) {
        // Recargar reglas para actualizar conteos de ejecuciones
        await fetchRules();
        return data.result as StaleLeadsCheckResult;
      } else {
        alert(data.error || "Error al ejecutar el barrido de prospectos estancados");
        return null;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al ejecutar chequeo";
      alert(message);
      return null;
    } finally {
      setRunningCheck(false);
    }
  };

  return {
    rules,
    loading,
    error,
    refreshRules: fetchRules,
    toggleRule,
    runStaleCheck,
    runningCheck,
  };
}
