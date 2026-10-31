"use client";

import { useState } from "react";
import { Mic, MicOff, Phone, PhoneIncoming, PhoneOff, User, Hash, Delete } from "lucide-react";
import { MONITOR_MODE } from "@/lib/constants/voice";
import type { ActiveCallInfo, IncomingCallInfo, VoicePhase } from "@/hooks/useVoiceDevice";
import type { CallableLead } from "@/hooks/useCallableLeads";
import { useElapsed } from "@/hooks/useElapsed";

interface PhonePanelProps {
  phase: VoicePhase;
  error: string | null;
  active: ActiveCallInfo | null;
  incoming: IncomingCallInfo | null;
  leads: CallableLead[];
  onCall: (leadId: string, label: string) => void;
  onCallDirect?: (target: { phone: string; name?: string }, label: string) => void;
  onHangup: () => void;
  onToggleMute: () => void;
  onAccept: () => void;
  onReject: () => void;
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

const DIAL_KEYS = [
  { digit: "1", sub: "" },
  { digit: "2", sub: "ABC" },
  { digit: "3", sub: "DEF" },
  { digit: "4", sub: "GHI" },
  { digit: "5", sub: "JKL" },
  { digit: "6", sub: "MNO" },
  { digit: "7", sub: "PQRS" },
  { digit: "8", sub: "TUV" },
  { digit: "9", sub: "WXYZ" },
  { digit: "*", sub: "" },
  { digit: "0", sub: "+" },
  { digit: "#", sub: "" },
];

export function PhonePanel(props: PhonePanelProps) {
  const { phase, error, active, incoming, leads } = props;
  const [dialMode, setDialMode] = useState<"lead" | "dialpad">("lead");
  const [leadId, setLeadId] = useState("");
  const [customPhone, setCustomPhone] = useState("+1");
  const [customName, setCustomName] = useState("");

  const elapsed = useElapsed(active?.startedAt ?? null);
  const selectedLead = leads.find((l) => l.id === leadId);

  const handleKeypadPress = (digit: string) => {
    setCustomPhone((prev) => prev + digit);
  };

  const handleBackspace = () => {
    setCustomPhone((prev) => (prev.length > 0 ? prev.slice(0, -1) : ""));
  };

  const handleDirectCall = () => {
    const cleanPhone = customPhone.trim();
    if (!cleanPhone || cleanPhone.length < 5) return;
    const label = customName.trim() ? `${customName.trim()} (${cleanPhone})` : cleanPhone;
    if (props.onCallDirect) {
      props.onCallDirect({ phone: cleanPhone, name: customName.trim() || undefined }, label);
    }
  };

  return (
    <section className="p-5 rounded-3xl bg-white border border-[#E8E6DF] shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-[#1F1E1D] flex items-center gap-2">
          <Phone className="w-4 h-4 text-[#D97757]" />
          Central Telefónica WebRTC
        </h2>
        <span
          className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${
            phase === "ready"
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : phase === "in_call"
              ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
              : "bg-[#FAF9F5] text-[#82807C] border-[#E8E6DF]"
          }`}
        >
          {PHASE_LABEL[phase]}
        </span>
      </div>

      {/* Alerta de Llamada Entrante */}
      {incoming && (
        <div role="alert" className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3 shadow-sm animate-pulse">
          <span className="text-xs text-emerald-950 flex items-center gap-2">
            <PhoneIncoming className="w-5 h-5 text-emerald-600 animate-bounce" />
            <span>
              Llamada entrante de <strong className="font-mono">{incoming.from}</strong>
            </span>
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={props.onAccept}
              aria-label="Contestar"
              className={`${roundButton} bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm`}
            >
              <Phone className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={props.onReject}
              aria-label="Rechazar"
              className={`${roundButton} bg-red-600 text-white hover:bg-red-700 shadow-sm`}
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Llamada Activa */}
      {active ? (
        <div className="p-5 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#1F1E1D] truncate">{active.label}</p>
              <p className="text-[11px] text-[#82807C] mt-0.5">
                {active.monitorMode === MONITOR_MODE.LISTEN
                  ? "Escuchando (modo silencioso)"
                  : active.monitorMode === MONITOR_MODE.WHISPER
                  ? "Susurrando (solo te escucha el asesor)"
                  : phase === "in_call"
                  ? "Llamada en curso (audio en vivo)"
                  : "Timbrando al destinatario…"}
              </p>
            </div>
            <span className="font-mono text-base font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
              {elapsed ?? "0:00"}
            </span>
          </div>

          <div className="flex justify-center items-center gap-4 pt-2">
            {active.monitorMode !== MONITOR_MODE.LISTEN && (
              <button
                type="button"
                onClick={props.onToggleMute}
                aria-label={active.muted ? "Activar micrófono" : "Silenciar micrófono"}
                aria-pressed={active.muted}
                className={`${roundButton} border border-[#E8E6DF] ${
                  active.muted ? "bg-red-50 text-red-600 border-red-300" : "bg-white text-[#1F1E1D] hover:bg-[#F4F3EE]"
                }`}
                title={active.muted ? "Micrófono Silenciado" : "Silenciar"}
              >
                {active.muted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={props.onHangup}
              aria-label="Colgar llamada"
              className={`${roundButton} bg-red-600 text-white hover:bg-red-700 shadow-md`}
              title="Colgar"
            >
              <PhoneOff className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Selector de Modo: Lead vs Marcador */
        <div className="space-y-3.5">
          <div className="flex p-1 bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl text-xs">
            <button
              type="button"
              onClick={() => setDialMode("lead")}
              className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
                dialMode === "lead" ? "bg-white text-[#1F1E1D] shadow-sm font-semibold" : "text-[#716F6A] hover:text-[#1F1E1D]"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Desde Prospecto</span>
            </button>
            <button
              type="button"
              onClick={() => setDialMode("dialpad")}
              className={`flex-1 py-1.5 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-all ${
                dialMode === "dialpad" ? "bg-white text-[#1F1E1D] shadow-sm font-semibold" : "text-[#716F6A] hover:text-[#1F1E1D]"
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>Teclado Numérico</span>
            </button>
          </div>

          {dialMode === "lead" ? (
            /* Modo 1: Llamar a Lead de la lista */
            <div className="space-y-3">
              <label className="block">
                <span className="block text-xs font-medium text-[#4D4C48] mb-1">Selecciona el Lead a Contactar:</span>
                <select
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                >
                  <option value="">Selecciona un lead con teléfono…</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} · {l.phone}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                disabled={phase !== "ready" || !selectedLead}
                onClick={() => selectedLead && props.onCall(selectedLead.id, selectedLead.name)}
                className="w-full py-2.5 rounded-xl btn-black-gold font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
              >
                <Phone className="w-3.5 h-3.5 text-[#E5C158]" />
                <span>{selectedLead ? `Llamar a ${selectedLead.name}` : "Llamar Lead"}</span>
              </button>
            </div>
          ) : (
            /* Modo 2: Teclado Numérico Directo */
            <div className="space-y-3">
              {/* Pantalla del número */}
              <div className="space-y-1.5">
                <div className="relative">
                  <input
                    type="tel"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    placeholder="+1 469 123 4567"
                    className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-sm font-mono font-bold text-[#1F1E1D] focus:outline-none focus:border-[#D97757] pr-10"
                  />
                  {customPhone.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#82807C] hover:text-[#1F1E1D] p-1"
                      title="Borrar dígito"
                    >
                      <Delete className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Nombre de contacto (opcional)"
                  className="w-full bg-white border border-[#E8E6DF] rounded-xl px-3 py-1.5 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              {/* Botones de prefijos rápidos */}
              <div className="flex gap-1.5 text-[10px]">
                <button
                  type="button"
                  onClick={() => setCustomPhone("+1")}
                  className="px-2 py-1 bg-[#FAF9F5] hover:bg-[#F4F3EE] rounded-lg border border-[#E8E6DF] text-[#4D4C48]"
                >
                  🇺🇸 +1 (US)
                </button>
                <button
                  type="button"
                  onClick={() => setCustomPhone("+52")}
                  className="px-2 py-1 bg-[#FAF9F5] hover:bg-[#F4F3EE] rounded-lg border border-[#E8E6DF] text-[#4D4C48]"
                >
                  🇲🇽 +52 (MX)
                </button>
                <button
                  type="button"
                  onClick={() => setCustomPhone("+57")}
                  className="px-2 py-1 bg-[#FAF9F5] hover:bg-[#F4F3EE] rounded-lg border border-[#E8E6DF] text-[#4D4C48]"
                >
                  🇨🇴 +57 (CO)
                </button>
              </div>

              {/* Keypad 3x4 */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {DIAL_KEYS.map((k) => (
                  <button
                    key={k.digit}
                    type="button"
                    onClick={() => handleKeypadPress(k.digit)}
                    className="py-2.5 bg-white hover:bg-[#F4F3EE] active:bg-[#ECEAE2] border border-[#E8E6DF] rounded-xl flex flex-col items-center justify-center transition-colors"
                  >
                    <span className="text-sm font-bold text-[#1F1E1D] leading-none">{k.digit}</span>
                    {k.sub && <span className="text-[8px] font-semibold text-[#9C9890] tracking-wider mt-0.5">{k.sub}</span>}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={phase !== "ready" || customPhone.trim().length < 6}
                onClick={handleDirectCall}
                className="w-full py-2.5 rounded-xl btn-black-gold font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
              >
                <Phone className="w-3.5 h-3.5 text-[#E5C158]" />
                <span>Marcar Número Directo</span>
              </button>
            </div>
          )}
        </div>
      )}

      {error && <p role="alert" className="text-xs text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200">{error}</p>}
    </section>
  );
}
