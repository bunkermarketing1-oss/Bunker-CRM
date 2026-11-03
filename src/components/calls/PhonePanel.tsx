"use client";

import React, { useState } from "react";
import { Mic, MicOff, Phone, PhoneIncoming, PhoneOff, User, Hash, Delete, Radio } from "lucide-react";
import { MONITOR_MODE } from "@/lib/constants/voice";
import { playBackspaceTone, playDtmfTone } from "@/lib/dtmf";
import type { ActiveCallInfo, IncomingCallInfo, VoicePhase } from "@/hooks/useVoiceDevice";
import type { CallableLead } from "@/hooks/useCallableLeads";
import { useElapsed } from "@/hooks/useElapsed";
import SlidingTabs, { type SlidingTabOption } from "@/components/ui/SlidingTabs";

interface PhonePanelProps {
  phase: VoicePhase;
  error: string | null;
  active: ActiveCallInfo | null;
  incoming: IncomingCallInfo | null;
  leads: CallableLead[];
  onCall: (leadId: string, label: string) => void;
  onCallDirect?: (target: { phone: string; name?: string }, label: string) => void;
  onSendDigits?: (digits: string) => void;
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

const roundButton = "w-11 h-11 rounded-full flex items-center justify-center transition-all disabled:opacity-50 active:scale-95";

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

const DIAL_MODE_OPTIONS: SlidingTabOption<"lead" | "dialpad">[] = [
  { value: "lead", label: "Desde Prospecto" },
  { value: "dialpad", label: "Teclado Numérico" },
];

export function PhonePanel(props: PhonePanelProps) {
  const { phase, error, active, incoming, leads } = props;
  const [dialMode, setDialMode] = useState<"lead" | "dialpad">("dialpad");
  const [leadId, setLeadId] = useState("");
  const [customPhone, setCustomPhone] = useState("+1");
  const [customName, setCustomName] = useState("");
  const [showInCallKeypad, setShowInCallKeypad] = useState(false);
  const [inCallDigits, setInCallDigits] = useState("");

  const elapsed = useElapsed(active?.startedAt ?? null);
  const selectedLead = leads.find((l) => l.id === leadId);

  const handleKeypadPress = (digit: string) => {
    playDtmfTone(digit);
    setCustomPhone((prev) => prev + digit);
  };

  const handleBackspace = () => {
    if (customPhone.length > 0) {
      playBackspaceTone();
      setCustomPhone((prev) => prev.slice(0, -1));
    }
  };

  const handlePhoneInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (/^[0-9*#+]$/.test(e.key)) {
      playDtmfTone(e.key);
    } else if (e.key === "Backspace" && customPhone.length > 0) {
      playBackspaceTone();
    } else if (e.key === "Enter" && phase === "ready" && customPhone.trim().length >= 6) {
      e.preventDefault();
      handleDirectCall();
    }
  };

  const handlePrefixSelect = (prefix: string, toneDigit: string) => {
    playDtmfTone(toneDigit);
    setCustomPhone(prefix);
  };

  const handleInCallDigitPress = (digit: string) => {
    playDtmfTone(digit);
    setInCallDigits((prev) => prev + digit);
    props.onSendDigits?.(digit);
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
    <section className="p-5 sm:p-6 rounded-3xl bg-white border border-[#EAECF0] shadow-sm space-y-5">
      {/* Header con estatus visual */}
      <div className="flex items-center justify-between pb-1 border-b border-[#F2F4F7]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#101828]">Central Telefónica</h2>
            <p className="text-[11px] text-[#667085]">Llamadas VoIP en vivo</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {phase === "ready" && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
          )}
          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
              phase === "ready"
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : phase === "in_call"
                ? "bg-amber-50 text-amber-700 border-amber-200 animate-pulse"
                : phase === "connecting"
                ? "bg-blue-50 text-blue-700 border-blue-200 animate-pulse"
                : "bg-[#F8F9FA] text-[#667085] border-[#EAECF0]"
            }`}
          >
            {PHASE_LABEL[phase]}
          </span>
        </div>
      </div>

      {/* Alerta de Llamada Entrante */}
      {incoming && (
        <div
          role="alert"
          className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/15 to-emerald-500/10 border border-emerald-300 flex items-center justify-between gap-3 shadow-sm animate-pulse"
        >
          <div className="min-w-0 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 animate-bounce">
              <PhoneIncoming className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-emerald-950">Llamada entrante</p>
              <p className="font-mono text-sm font-semibold text-emerald-800 truncate">{incoming.from}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={props.onAccept}
              aria-label="Contestar llamada"
              className={`${roundButton} bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/30`}
              title="Contestar"
            >
              <Phone className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={props.onReject}
              aria-label="Rechazar llamada"
              className={`${roundButton} bg-red-600 hover:bg-red-700 text-white shadow-md shadow-red-600/30`}
              title="Rechazar"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Llamada Activa */}
      {active ? (
        <div className="p-5 rounded-2xl bg-gradient-to-b from-[#F9FAFB] to-[#F2F4F7] border border-[#EAECF0] space-y-4 shadow-inner">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 flex-shrink-0">
                <Radio className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#101828] truncate">{active.label}</p>
                <p className="text-[11px] text-[#667085] mt-0.5 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                  <span>
                    {active.monitorMode === MONITOR_MODE.LISTEN
                      ? "Escuchando (modo silencioso)"
                      : active.monitorMode === MONITOR_MODE.WHISPER
                      ? "Susurrando (solo te escucha el asesor)"
                      : phase === "in_call"
                      ? "Llamada conectada · Audio en vivo"
                      : "Timbrando al destinatario…"}
                  </span>
                </p>
              </div>
            </div>

            <span className="font-mono text-base font-bold text-amber-800 bg-amber-50/80 px-3 py-1 rounded-xl border border-amber-200 shadow-2xs">
              {elapsed ?? "0:00"}
            </span>
          </div>

          {/* Teclado en llamada (DTMF) */}
          {showInCallKeypad && active.monitorMode !== MONITOR_MODE.LISTEN && (
            <div className="space-y-2 pt-1 animate-in fade-in duration-200">
              {inCallDigits && (
                <div className="px-3 py-1.5 rounded-xl bg-white border border-[#EAECF0] text-center font-mono text-xs font-bold text-[#101828] tracking-widest">
                  {inCallDigits}
                </div>
              )}
              <div className="grid grid-cols-3 gap-1.5">
                {DIAL_KEYS.map((k) => (
                  <button
                    key={k.digit}
                    type="button"
                    onClick={() => handleInCallDigitPress(k.digit)}
                    className="py-2 bg-white hover:bg-[#F9FAFB] active:scale-95 border border-[#EAECF0] rounded-xl flex flex-col items-center justify-center transition-all select-none shadow-2xs cursor-pointer"
                  >
                    <span className="text-xs font-bold text-[#101828] leading-none">{k.digit}</span>
                    {k.sub && <span className="text-[7px] font-semibold text-[#98A2B3] tracking-wider mt-0.5">{k.sub}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Botones de Control de Llamada */}
          <div className="flex justify-center items-center gap-4 pt-2">
            {active.monitorMode !== MONITOR_MODE.LISTEN && (
              <>
                <button
                  type="button"
                  onClick={props.onToggleMute}
                  aria-label={active.muted ? "Activar micrófono" : "Silenciar micrófono"}
                  aria-pressed={active.muted}
                  className={`${roundButton} border ${
                    active.muted
                      ? "bg-red-50 text-red-600 border-red-300 shadow-sm"
                      : "bg-white text-[#344054] border-[#EAECF0] hover:bg-[#F9FAFB] shadow-2xs"
                  }`}
                  title={active.muted ? "Micrófono Silenciado (clic para hablar)" : "Silenciar micrófono"}
                >
                  {active.muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInCallKeypad((prev) => !prev)}
                  aria-label="Teclado numérico en llamada"
                  aria-pressed={showInCallKeypad}
                  className={`${roundButton} border ${
                    showInCallKeypad
                      ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                      : "bg-white text-[#344054] border-[#EAECF0] hover:bg-[#F9FAFB] shadow-2xs"
                  }`}
                  title="Abrir teclado numérico (DTMF)"
                >
                  <Hash className="w-5 h-5" />
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setShowInCallKeypad(false);
                setInCallDigits("");
                props.onHangup();
              }}
              aria-label="Colgar llamada"
              className={`${roundButton} bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30`}
              title="Colgar llamada"
            >
              <PhoneOff className="w-5 h-5" />
            </button>
          </div>
        </div>
      ) : (
        /* Selector de Modo con pastilla deslizante estilo iOS */
        <div className="space-y-4">
          <div className="p-1 rounded-xl bg-[#F2F4F7] border border-[#EAECF0]">
            <SlidingTabs
              options={DIAL_MODE_OPTIONS}
              value={dialMode}
              onChange={(v) => setDialMode(v)}
              ariaLabel="Modo de marcación"
              className="w-full justify-between"
            />
          </div>

          {dialMode === "lead" ? (
            /* Modo 1: Llamar a Lead */
            <div className="space-y-3.5">
              <label className="block space-y-1.5">
                <span className="block text-xs font-semibold text-[#344054]">Selecciona el Prospecto a Contactar:</span>
                <select
                  value={leadId}
                  onChange={(e) => setLeadId(e.target.value)}
                  className="w-full bg-[#F9FAFB] border border-[#EAECF0] rounded-xl px-3.5 py-2.5 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                >
                  <option value="">Selecciona un lead de tu lista…</option>
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
                className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm ${
                  phase === "ready" && selectedLead
                    ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-600/25 cursor-pointer active:scale-[0.99]"
                    : "bg-[#EAECF0] text-[#98A2B3] cursor-not-allowed"
                }`}
              >
                <Phone className="w-4 h-4" />
                <span>{selectedLead ? `Llamar a ${selectedLead.name}` : "Llamar Prospecto"}</span>
              </button>
            </div>
          ) : (
            /* Modo 2: Teclado Numérico Directo */
            <div className="space-y-3.5">
              {/* Display de Marcación */}
              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="tel"
                    value={customPhone}
                    onChange={(e) => setCustomPhone(e.target.value)}
                    onKeyDown={handlePhoneInputKeyDown}
                    placeholder="+1 469 123 4567"
                    className="w-full bg-[#F9FAFB] border border-[#EAECF0] rounded-2xl px-4 py-3 text-lg font-mono font-bold text-[#101828] focus:outline-none focus:border-amber-500 focus:bg-white transition-colors pr-12 tracking-wide"
                  />
                  {customPhone.length > 0 && (
                    <button
                      type="button"
                      onClick={handleBackspace}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#101828] p-1.5 active:scale-90 transition-transform"
                      title="Borrar dígito"
                    >
                      <Delete className="w-5 h-5" />
                    </button>
                  )}
                </div>

                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Nombre de contacto o empresa (opcional)"
                  className="w-full bg-white border border-[#EAECF0] rounded-xl px-3.5 py-2 text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Botones de prefijos rápidos */}
              <div className="flex gap-2 text-[11px]">
                <button
                  type="button"
                  onClick={() => handlePrefixSelect("+1", "1")}
                  className={`flex-1 py-1 px-2 rounded-lg border text-center transition-all active:scale-95 ${
                    customPhone.startsWith("+1")
                      ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold"
                      : "bg-[#F9FAFB] border-[#EAECF0] text-[#475467] hover:bg-[#F2F4F7]"
                  }`}
                >
                  🇺🇸 +1 (US)
                </button>
                <button
                  type="button"
                  onClick={() => handlePrefixSelect("+52", "5")}
                  className={`flex-1 py-1 px-2 rounded-lg border text-center transition-all active:scale-95 ${
                    customPhone.startsWith("+52")
                      ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold"
                      : "bg-[#F9FAFB] border-[#EAECF0] text-[#475467] hover:bg-[#F2F4F7]"
                  }`}
                >
                  🇲🇽 +52 (MX)
                </button>
                <button
                  type="button"
                  onClick={() => handlePrefixSelect("+57", "7")}
                  className={`flex-1 py-1 px-2 rounded-lg border text-center transition-all active:scale-95 ${
                    customPhone.startsWith("+57")
                      ? "bg-amber-50 border-amber-300 text-amber-900 font-semibold"
                      : "bg-[#F9FAFB] border-[#EAECF0] text-[#475467] hover:bg-[#F2F4F7]"
                  }`}
                >
                  🇨🇴 +57 (CO)
                </button>
              </div>

              {/* Keypad 3x4 */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                {DIAL_KEYS.map((k) => (
                  <button
                    key={k.digit}
                    type="button"
                    onClick={() => handleKeypadPress(k.digit)}
                    className="py-3 bg-white hover:bg-[#F9FAFB] active:bg-[#EAECF0] active:scale-95 border border-[#EAECF0] hover:border-[#D0D5DD] rounded-2xl flex flex-col items-center justify-center transition-all select-none shadow-2xs cursor-pointer"
                  >
                    <span className="text-base font-bold text-[#101828] leading-none">{k.digit}</span>
                    {k.sub && (
                      <span className="text-[8px] font-semibold text-[#98A2B3] tracking-widest mt-1">
                        {k.sub}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Botón de Llamar Directo */}
              <button
                type="button"
                disabled={phase !== "ready" || customPhone.trim().length < 6}
                onClick={handleDirectCall}
                className={`w-full py-3.5 rounded-2xl font-bold text-xs flex items-center justify-center gap-2.5 transition-all shadow-md ${
                  phase === "ready" && customPhone.trim().length >= 6
                    ? "bg-gradient-to-r from-emerald-600 via-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-600/30 cursor-pointer active:scale-[0.99]"
                    : "bg-[#EAECF0] text-[#98A2B3] cursor-not-allowed"
                }`}
              >
                <Phone className="w-4 h-4 fill-current" />
                <span>Marcar Número Directo</span>
              </button>
            </div>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-xs text-red-700 bg-red-50 p-3 rounded-xl border border-red-200 animate-in fade-in">
          {error}
        </p>
      )}
    </section>
  );
}
