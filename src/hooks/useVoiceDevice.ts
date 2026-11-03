"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Call, Device } from "@twilio/voice-sdk";
import type { MonitorMode } from "@/lib/constants/voice";

export type VoicePhase = "loading" | "unavailable" | "ready" | "connecting" | "in_call" | "incoming";

export interface ActiveCallInfo {
  /** Id de `Call` en el CRM. */
  callId: string | null;
  label: string;
  startedAt: number | null;
  muted: boolean;
  /** Si es una escucha de supervisor. */
  monitorMode: MonitorMode | null;
}

export interface IncomingCallInfo {
  callId: string | null;
  from: string;
}

async function fetchToken(): Promise<{ token: string } | { error: string }> {
  try {
    const res = await fetch("/api/voice/token");
    const json = await res.json();
    return json.success ? { token: json.token } : { error: json.error || "No se pudo habilitar el teléfono." };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Error de red" };
  }
}

/**
 * Teléfono del navegador (Twilio Voice SDK): registra el dispositivo, hace y recibe
 * llamadas, y renueva el token antes de que expire. El SDK se carga solo en el cliente.
 */
export interface UseVoiceDeviceOptions {
  onCallStarted?: () => void;
  onCallEnded?: () => void;
  /**
   * false = solo para salir (p. ej. escuchar desde la vista del equipo): no registra el
   * dispositivo, así las entrantes no timbran en una pantalla que no tiene cómo contestarlas.
   */
  receiveIncoming?: boolean;
}

export function useVoiceDevice({ onCallStarted, onCallEnded, receiveIncoming = true }: UseVoiceDeviceOptions = {}) {
  const deviceRef = useRef<Device | null>(null);
  const callRef = useRef<Call | null>(null);
  const incomingRef = useRef<Call | null>(null);
  const onStartedRef = useRef(onCallStarted);
  onStartedRef.current = onCallStarted;
  const onEndedRef = useRef(onCallEnded);
  onEndedRef.current = onCallEnded;

  const [phase, setPhase] = useState<VoicePhase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveCallInfo | null>(null);
  const [incoming, setIncoming] = useState<IncomingCallInfo | null>(null);

  const clearCall = useCallback(() => {
    callRef.current = null;
    setActive(null);
    setPhase(deviceRef.current ? "ready" : "unavailable");
    onEndedRef.current?.();
  }, []);

  const trackCall = useCallback(
    (call: Call, info: Omit<ActiveCallInfo, "startedAt" | "muted">) => {
      callRef.current = call;
      setActive({ ...info, startedAt: null, muted: false });
      setPhase("connecting");
      onStartedRef.current?.();

      call.on("accept", () => {
        setActive((a) => (a ? { ...a, startedAt: Date.now() } : a));
        setPhase("in_call");
        onStartedRef.current?.();
      });
      call.on("mute", (muted: boolean) => setActive((a) => (a ? { ...a, muted } : a)));
      call.on("disconnect", clearCall);
      call.on("cancel", clearCall);
      call.on("reject", clearCall);
      call.on("error", (err: { message?: string }) => {
        setError(err.message || "Error en la llamada.");
        clearCall();
      });
    },
    [clearCall]
  );

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const result = await fetchToken();
      if (cancelled) return;
      if ("error" in result) {
        setError(result.error);
        setPhase("unavailable");
        return;
      }

      const { Device: TwilioDevice, Call: TwilioCall } = await import("@twilio/voice-sdk");
      if (cancelled) return;
      const device = new TwilioDevice(result.token, {
        codecPreferences: [TwilioCall.Codec.Opus, TwilioCall.Codec.PCMU],
        // Avisa antes de cerrar la pestaña con una llamada activa.
        closeProtection: true,
      });
      deviceRef.current = device;

      device.on("tokenWillExpire", async () => {
        const next = await fetchToken();
        if ("token" in next) device.updateToken(next.token);
      });
      device.on("error", (err: { message?: string }) => setError(err.message || "Error del teléfono."));
      device.on("incoming", (call: Call) => {
        // Ya en llamada: la entrante sigue timbrando en los demás asesores.
        if (callRef.current) {
          call.reject();
          return;
        }
        incomingRef.current = call;
        setIncoming({ callId: call.customParameters.get("callId") ?? null, from: call.parameters.From ?? "Número desconocido" });
        setPhase("incoming");
        const clearIncoming = () => {
          incomingRef.current = null;
          setIncoming(null);
          setPhase((p) => (p === "incoming" ? "ready" : p));
        };
        call.on("cancel", clearIncoming);
        call.on("reject", clearIncoming);
      });

      // Las salientes (`connect`) no necesitan registro; solo recibir llamadas lo necesita.
      if (!receiveIncoming) {
        setPhase("ready");
        return;
      }
      try {
        await device.register();
        if (!cancelled) setPhase("ready");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo registrar el teléfono.");
        setPhase("unavailable");
      }
    })();

    return () => {
      cancelled = true;
      deviceRef.current?.destroy();
      deviceRef.current = null;
    };
  }, [receiveIncoming]);

  const callTarget = useCallback(
    async (target: { leadId?: string; phone?: string; name?: string; clientId?: string | null }, label: string) => {
      const device = deviceRef.current;
      if (!device || callRef.current) return;
      setError(null);
      setPhase("connecting");
      try {
        const res = await fetch("/api/voice/calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(target),
        });
        const json = await res.json();
        if (!json.success) {
          setError(json.error || "No se pudo iniciar la llamada.");
          setPhase("ready");
          return;
        }
        const call = await device.connect({ params: { callId: json.callId } });
        trackCall(call, { callId: json.callId, label, monitorMode: null });
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo iniciar la llamada.");
        setPhase("ready");
      }
    },
    [trackCall]
  );

  const callLead = useCallback(
    (leadId: string, label: string) => callTarget({ leadId }, label),
    [callTarget]
  );

  const monitor = useCallback(
    async (callId: string, mode: MonitorMode, label: string) => {
      const device = deviceRef.current;
      if (!device || callRef.current) return;
      setError(null);
      try {
        const call = await device.connect({ params: { monitorCallId: callId, mode } });
        trackCall(call, { callId, label, monitorMode: mode });
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo entrar a la llamada.");
      }
    },
    [trackCall]
  );

  const acceptIncoming = useCallback(async () => {
    const call = incomingRef.current;
    if (!call) return;
    const callId = call.customParameters.get("callId") ?? null;
    incomingRef.current = null;
    setIncoming(null);
    trackCall(call, { callId, label: call.parameters.From ?? "Entrante", monitorMode: null });
    call.accept();
    if (callId) {
      // Deja registrado quién contestó; si otro asesor ganó, la llamada ya no es nuestra.
      const res = await fetch(`/api/voice/calls/${callId}/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentCallSid: call.parameters.CallSid ?? null }),
      }).catch(() => null);
      if (res && !res.ok) setError("Otro asesor ya tomó esta llamada.");
    }
  }, [trackCall]);

  const rejectIncoming = useCallback(() => incomingRef.current?.reject(), []);
  const hangup = useCallback(() => callRef.current?.disconnect(), []);
  const toggleMute = useCallback(() => {
    const call = callRef.current;
    if (call) call.mute(!call.isMuted());
  }, []);

  const sendDigits = useCallback((digits: string) => {
    const call = callRef.current;
    if (call && typeof call.sendDigits === "function") {
      call.sendDigits(digits);
    }
  }, []);

  return { phase, error, active, incoming, callLead, callTarget, monitor, acceptIncoming, rejectIncoming, hangup, toggleMute, sendDigits };
}
