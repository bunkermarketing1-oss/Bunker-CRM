"use client";

import { useCallback, useEffect, useState } from "react";
import type { CallSummary } from "@/types/voice";

// Las llamadas en curso cambian rápido; cada 5 s basta para ver quién está hablando.
const REFRESH_MS = 5000;

export function useCalls(clientId?: string | null) {
  const [calls, setCalls] = useState<CallSummary[]>([]);
  const [liveCalls, setLiveCalls] = useState<CallSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const clientQuery = clientId && clientId !== "all" ? `?clientId=${encodeURIComponent(clientId)}` : "";
      const res = await fetch(`/api/voice/calls${clientQuery}`);
      const json = await res.json();
      if (json.success) {
        setCalls(json.calls);
        setLiveCalls(json.liveCalls);
        setError(null);
      } else {
        setError(json.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return { calls, liveCalls, loading, error, refresh };
}
