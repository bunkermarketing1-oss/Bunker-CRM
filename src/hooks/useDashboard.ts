"use client";

import { useCallback, useEffect, useState } from "react";
import type { DashboardData, DashboardResponse } from "@/types/dashboard";

export function useDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (json.success) setDashboard(json as DashboardResponse);
      else setError(json.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(() => {
      refresh(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { dashboard, loading, error, refresh };
}
