"use client";

import { Ear, MessageCircle, Mic, MicOff, PhoneOff } from "lucide-react";
import { MONITOR_MODE } from "@/lib/constants/voice";
import { useElapsed } from "@/hooks/useElapsed";
import type { ActiveCallInfo, VoicePhase } from "@/hooks/useVoiceDevice";

interface MonitorSessionBarProps {
  phase: VoicePhase;
  error: string | null;
  active: ActiveCallInfo | null;
  onHangup: () => void;
  onToggleMute: () => void;
}

const PHASE_HINT: Partial<Record<VoicePhase, string>> = {
  loading: "Preparando el audio para escuchar llamadas…",
  unavailable: "El audio no está disponible: no se pueden escuchar llamadas desde aquí.",
};

/** Estado de la escucha del supervisor: a qué llamada está conectado y cómo salir. */
export function MonitorSessionBar({ phase, error, active, onHangup, onToggleMute }: MonitorSessionBarProps) {
  const elapsed = useElapsed(active?.startedAt ?? null);
  const hint = PHASE_HINT[phase];

  if (!active) {
    if (!hint && !error) return null;
    return (
      <p role="status" className="text-xs text-[#82807C] px-4 py-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF]">
        {error || hint}
      </p>
    );
  }

  const isWhisper = active.monitorMode === MONITOR_MODE.WHISPER;
  return (
    <div role="status" className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3">
      <div className="min-w-0 flex items-center gap-2 text-xs text-red-900">
        {isWhisper ? <MessageCircle className="w-4 h-4 flex-shrink-0" /> : <Ear className="w-4 h-4 flex-shrink-0" />}
        <span className="truncate">
          {/* Susurrar: solo el asesor oye al supervisor; el lead no. */}
          {isWhisper ? "Susurrando al asesor" : "Escuchando"} · <strong>{active.label}</strong>
          {elapsed ? <span className="font-mono ml-2">{elapsed}</span> : " · conectando…"}
        </span>
      </div>
      <div className="flex gap-2 flex-shrink-0">
        {isWhisper && (
          <button
            type="button"
            onClick={onToggleMute}
            aria-label={active.muted ? "Activar micrófono" : "Silenciar micrófono"}
            aria-pressed={active.muted}
            className="w-9 h-9 rounded-full border border-red-200 bg-white text-red-900 flex items-center justify-center hover:bg-red-100"
          >
            {active.muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={onHangup}
          className="px-3 h-9 rounded-full bg-red-600 text-white text-xs font-medium flex items-center gap-1.5 hover:bg-red-700"
        >
          <PhoneOff className="w-4 h-4" /> Salir
        </button>
      </div>
    </div>
  );
}
