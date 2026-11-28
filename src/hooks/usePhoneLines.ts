"use client";

import { useCallback, useEffect, useState } from "react";
import type { MutationResult } from "@/hooks/useSmsAutomations";
import type { PhoneLineSummary } from "@/types/voice";
import { useActiveClientId } from "@/hooks/useActiveClientId";

export interface PhoneLineDraft {
  phoneNumber: string;
  label: string;
  clientId: string | null;
  recordCalls: boolean;
}

async function send(url: string, method: string, body: unknown): Promise<MutationResult> {
  try {
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => ({}));
    return json.success ? { ok: true } : { ok: false, error: json.error || "No se pudo guardar." };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Error de red" };
  }
}

/** Líneas telefónicas (solo admin). `enabled: false` no consulta nada (usuario CLIENT). */
export function usePhoneLines(enabled: boolean) {
  const activeClientId = useActiveClientId();
  const [lines, setLines] = useState<PhoneLineSummary[]>([]);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled) return;
    try {
      const res = await fetch(activeClientId ? `/api/voice/lines?clientId=${encodeURIComponent(activeClientId)}` : "/api/voice/lines");
      const json = await res.json();
      if (json.success) setLines(json.lines);
      else setError(json.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    }
  }, [enabled, activeClientId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const withRefresh = async (action: Promise<MutationResult>) => {
    const result = await action;
    if (result.ok) await refresh();
    return result;
  };

  return {
    lines,
    error,
    create: (draft: PhoneLineDraft) => withRefresh(send("/api/voice/lines", "POST", draft)),
    update: (id: string, changes: Partial<Omit<PhoneLineDraft, "phoneNumber">> & { isActive?: boolean }) =>
      withRefresh(send(`/api/voice/lines/${id}`, "PATCH", changes)),
  };
}
