"use client";

import { useCallback, useEffect, useState } from "react";
import type { CallSummary } from "@/types/voice";

const REFRESH_IDLE_MS = 4000;
const REFRESH_LIVE_MS = 2000;

export function useCalls(clientId?: string | null, hasActiveCall = false) {
  const [calls, setCalls] = useState<CallSummary[]>([]);
  const [liveCalls, setLiveCalls] = useState<CallSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const clientQuery = clientId && clientId !== "all" ? `?clientId=${encodeURIComponent(clientId)}` : "";
      const res = await fetch(`/api/voice/calls${clientQuery}`, { cache: "no-store" });
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
    const interval = (hasActiveCall || liveCalls.length > 0) ? REFRESH_LIVE_MS : REFRESH_IDLE_MS;
    const timer = setInterval(refresh, interval);
    return () => clearInterval(timer);
  }, [refresh, hasActiveCall, liveCalls.length]);

  return { calls, liveCalls, loading, error, refresh };
}
