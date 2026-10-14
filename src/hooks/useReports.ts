"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReportRangeDays } from "@/lib/constants/reports";
import type { ReportsData, ReportsResponse } from "@/types/reports";

export function useReports(days: ReportRangeDays) {
  const [report, setReport] = useState<ReportsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports?days=${days}`);
      const json = await res.json();
      if (json.success) setReport(json as ReportsResponse);
      else setError(json.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { report, loading, error, refresh };
}
