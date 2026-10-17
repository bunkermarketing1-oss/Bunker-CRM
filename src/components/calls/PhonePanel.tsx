"use client";

import { useEffect, useState } from "react";
import { Mic, MicOff, Phone, PhoneIncoming, PhoneOff } from "lucide-react";
import { MONITOR_MODE } from "@/lib/constants/voice";
import type { ActiveCallInfo, IncomingCallInfo, VoicePhase } from "@/hooks/useVoiceDevice";
import type { CallableLead } from "@/hooks/useCallableLeads";

interface PhonePanelProps {
  phase: VoicePhase;
  error: string | null;
  active: ActiveCallInfo | null;
  incoming: IncomingCallInfo | null;
  leads: CallableLead[];
  onCall: (leadId: string, label: string) => void;
  onHangup: () => void;
  onToggleMute: () => void;
  onAccept: () => void;
  onReject: () => void;
}

function useElapsed(startedAt: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  if (!startedAt) return null;
  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

const PHASE_LABEL: Record<VoicePhase, string> = {
  loading: "Conectando teléfono…",
  unavailable: "Teléfono no disponible",
  ready: "Listo para llamar",
  connecting: "Marcando…",
  in_call: "En llamada",
  incoming: "Llamada entrante",
};

const roundButton = "w-10 h-10 rounded-full flex items-center justify-center transition-colors disabled:opacity-50";

export function PhonePanel(props: PhonePanelProps) {
  const { phase, error, active, incoming, leads } = props;
  const [leadId, setLeadId] = useState("");
  const elapsed = useElapsed(active?.startedAt ?? null);
  const selected = leads.find((l) => l.id === leadId);

  return (
    <section className="p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#1F1E1D] flex items-center gap-2">
          <Phone className="w-4 h-4 text-[#D97757]" />
          Teléfono
        </h2>
        <span
          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
            phase === "ready" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-[#FAF9F5] text-[#82807C] border-[#E8E6DF]"
          }`}
        >
          {PHASE_LABEL[phase]}
        </span>
      </div>

      {incoming && (
        <div role="alert" className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
          <span className="text-xs text-emerald-900 flex items-center gap-2">
            <PhoneIncoming className="w-4 h-4" />
            <span>
              Entrante de <strong className="font-mono">{incoming.from}</strong>
            </span>
          </span>
          <div className="flex gap-2">
            <button type="button" onClick={props.onAccept} aria-label="Contestar" className={`${roundButton} bg-emerald-600 text-white hover:bg-emerald-700`}>
              <Phone className="w-4 h-4" />
            </button>
            <button type="button" onClick={props.onReject} aria-label="Rechazar" className={`${roundButton} bg-red-600 text-white hover:bg-red-700`}>
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {active ? (
        <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1F1E1D] truncate">{active.label}</p>
              <p className="text-[11px] text-[#82807C]">
                {active.monitorMode === MONITOR_MODE.LISTEN
                  ? "Escuchando (nadie te oye)"
                  : active.monitorMode === MONITOR_MODE.WHISPER
                    ? "Susurrando (solo te oye el asesor)"
                    : phase === "in_call"
                      ? "En llamada"
                      : "Timbrando…"}
              </p>
            </div>
            <span className="font-mono text-sm text-[#1F1E1D]">{elapsed ?? "0:00"}</span>
          </div>
          <div className="flex justify-center gap-3">
            {active.monitorMode !== MONITOR_MODE.LISTEN && (
              <button
                type="button"
                onClick={props.onToggleMute}
                aria-label={active.muted ? "Activar micrófono" : "Silenciar micrófono"}
                aria-pressed={active.muted}
                className={`${roundButton} border border-[#E8E6DF] ${active.muted ? "bg-[#1F1E1D] text-white" : "bg-white text-[#1F1E1D] hover:bg-[#F4F3EE]"}`}
              >
                {active.muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            <button type="button" onClick={props.onHangup} aria-label="Colgar" className={`${roundButton} bg-red-600 text-white hover:bg-red-700`}>
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-[#4D4C48] mb-1">Lead</span>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
            >
              <option value="">Selecciona un lead…</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} · {l.phone}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={phase !== "ready" || !selected}
            onClick={() => selected && props.onCall(selected.id, selected.name)}
            className="w-full py-2.5 rounded-2xl btn-black-gold font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Phone className="w-4 h-4 text-[#E5C158]" />
            Llamar
          </button>
        </div>
      )}

      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
    </section>
  );
}
