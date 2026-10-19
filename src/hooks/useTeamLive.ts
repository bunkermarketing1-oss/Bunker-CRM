"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TEAM_LIVE_REFRESH_MS } from "@/lib/constants/team";
import { usePolling } from "@/hooks/usePolling";
import type { TeamLiveView } from "@/types/team";

/**
 * Vista en vivo del equipo, refrescada cada `TEAM_LIVE_REFRESH_MS` con la pestaña visible.
 * `clientId` filtra un cliente (solo Bunker; la API lo ignora para el dueño).
 */
export function useTeamLive(clientId: string | null, enabled = true) {
  const [view, setView] = useState<TeamLiveView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Descarta respuestas de un filtro anterior que lleguen tarde.
  const requestRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = ++requestRef.current;
    try {
      const query = clientId ? `?clientId=${encodeURIComponent(clientId)}` : "";
      const res = await fetch(`/api/team/live${query}`);
      const json = await res.json();
      if (requestId !== requestRef.current) return;
      if (json.success) {
        setView(json as TeamLiveView);
        setError(null);
      } else {
        setError(json.error || "No se pudo cargar la actividad del equipo.");
      }
    } catch (err) {
      if (requestId === requestRef.current) setError(err instanceof Error ? err.message : "Error de red");
    } finally {
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [clientId]);

  // Al cambiar de cliente no se muestran los datos del anterior mientras llega la respuesta.
  useEffect(() => {
    setView(null);
    setLoading(true);
  }, [clientId]);

  usePolling(refresh, TEAM_LIVE_REFRESH_MS, enabled);

  return { view, loading: enabled && loading, error, refresh };
}
