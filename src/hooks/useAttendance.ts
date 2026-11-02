"use client";

import { useState, useEffect, useCallback, useRef } from "react";

interface AttendanceState {
  isCheckedIn: boolean;
  checkedInAt: string | null;
  checkedOutAt: string | null;
  durationMinutes: number;
  durationFormatted: string;
}

export function useAttendance() {
  const [state, setState] = useState<AttendanceState>({
    isCheckedIn: false,
    checkedInAt: null,
    checkedOutAt: null,
    durationMinutes: 0,
    durationFormatted: "0m",
  });
  const [loading, setLoading] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const lastHeartbeatRef = useRef<number>(0);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/team/attendance/status");
      const json = await res.json();
      if (json.success) {
        setState({
          isCheckedIn: Boolean(json.isCheckedIn),
          checkedInAt: json.checkedInAt || null,
          checkedOutAt: json.checkedOutAt || null,
          durationMinutes: json.durationMinutes || 0,
          durationFormatted: json.durationFormatted || "0m",
        });

        if (json.isCheckedIn && json.checkedInAt) {
          const diff = Math.max(0, Math.floor((Date.now() - new Date(json.checkedInAt).getTime()) / 1000));
          setElapsedSeconds(diff);
        }
      }
    } catch (e) {
      console.warn("No se pudo obtener estado de asistencia:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Contador de tiempo en vivo mientras esté en turno (checked in)
  useEffect(() => {
    if (!state.isCheckedIn || !state.checkedInAt) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((Date.now() - new Date(state.checkedInAt!).getTime()) / 1000));
      setElapsedSeconds(diff);
    }, 1000);

    return () => clearInterval(interval);
  }, [state.isCheckedIn, state.checkedInAt]);

  const checkIn = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/team/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_in" }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchStatus();
      }
    } catch (e) {
      console.error("Error al registrar check-in:", e);
    } finally {
      setLoading(false);
    }
  }, [fetchStatus]);

  const checkOut = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/team/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_out" }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchStatus();
      }
    } catch (e) {
      console.error("Error al registrar check-out:", e);
    } finally {
      setLoading(false);
    }
  }, [fetchStatus]);

  // Alternativa temporal: heartbeat con debounce para contar clics en conversaciones como actividad
  const heartbeat = useCallback(async () => {
    const now = Date.now();
    // Throttle de al menos 45 segundos para no saturar
    if (now - lastHeartbeatRef.current < 45000) return;
    lastHeartbeatRef.current = now;

    try {
      await fetch("/api/team/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "heartbeat" }),
      });
    } catch {
      // Silencioso
    }
  }, []);

  const formatElapsed = () => {
    const h = Math.floor(elapsedSeconds / 3600);
    const m = Math.floor((elapsedSeconds % 3600) / 60);
    const s = elapsedSeconds % 60;
    const pad = (n: number) => n.toString().padStart(2, "0");
    if (h > 0) return `${pad(h)}:${pad(m)}:${pad(s)}`;
    return `${pad(m)}:${pad(s)}`;
  };

  return {
    ...state,
    loading,
    elapsedSeconds,
    liveClock: formatElapsed(),
    checkIn,
    checkOut,
    heartbeat,
    refreshStatus: fetchStatus,
  };
}
