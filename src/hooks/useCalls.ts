"use client";

import { useCallback, useEffect, useState } from "react";
import type { CallSummary } from "@/types/voice";

// Las llamadas en curso cambian rápido; cada 5 s basta para ver quién está hablando.
const REFRESH_MS = 5000;

export function useCalls() {
  const [calls, setCalls] = useState<CallSummary[]>([]);
  const [liveCalls, setLiveCalls] = useState<CallSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/voice/calls");
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
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  return { calls, liveCalls, loading, error, refresh };
}
