"use client";

import { useCallback, useEffect, useState } from "react";
import type { SettingsData, SettingsResponse } from "@/types/settings";

export function useSettings() {
  const [settings, setSettings] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings");
      const json = await res.json();
      if (json.success) setSettings(json as SettingsResponse);
      else setError(json.error);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { settings, loading, error, refresh };
}
