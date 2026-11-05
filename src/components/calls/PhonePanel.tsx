"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Mic,
  MicOff,
  Phone,
  PhoneIncoming,
  PhoneOff,
  User,
  Hash,
  Delete,
  Search,
  MessageSquare,
  Smartphone,
  Megaphone,
  X,
} from "lucide-react";
import { MONITOR_MODE } from "@/lib/constants/voice";
import { playBackspaceTone, playDtmfTone } from "@/lib/dtmf";
import type { ActiveCallInfo, IncomingCallInfo, VoicePhase } from "@/hooks/useVoiceDevice";
import type { CallableLead } from "@/hooks/useCallableLeads";
import { useElapsed } from "@/hooks/useElapsed";
import SlidingTabs, { type SlidingTabOption } from "@/components/ui/SlidingTabs";

export interface PhonePanelProps {
  phase: VoicePhase;
  error: string | null;
  active: ActiveCallInfo | null;
  incoming: IncomingCallInfo | null;
  leads: CallableLead[];
  initialPhone?: string | null;
  initialName?: string | null;
  initialLeadId?: string | null;
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

type LeadCategory = "all" | "whatsapp" | "sms" | "meta_ads" | "manual";

export function PhonePanel(props: PhonePanelProps) {
  const { phase, error, active, incoming, leads } = props;
  const [dialMode, setDialMode] = useState<"lead" | "dialpad">("lead");
  const [leadId, setLeadId] = useState(props.initialLeadId || "");
  const [leadCategory, setLeadCategory] = useState<LeadCategory>("all");
  const [leadSearch, setLeadSearch] = useState("");

  const [customPhone, setCustomPhone] = useState(props.initialPhone || "+1");
  const [customName, setCustomName] = useState(props.initialName || "");
  const [showInCallKeypad, setShowInCallKeypad] = useState(false);
  const [inCallDigits, setInCallDigits] = useState("");

  const elapsed = useElapsed(active?.startedAt ?? null);
  const selectedLead = leads.find((l) => l.id === leadId);

  // Auto-selección cuando se abre la central desde el Inbox o URL externa
  useEffect(() => {
    if (props.initialLeadId) {
      setLeadId(props.initialLeadId);
      setDialMode("lead");
    } else if (props.initialPhone) {
      const cleanTarget = props.initialPhone.replace(/\D/g, "");
      const match = leads.find((l) => {
        const leadDigits = l.phone.replace(/\D/g, "");
        return leadDigits.endsWith(cleanTarget.slice(-8)) || cleanTarget.endsWith(leadDigits.slice(-8));
      });
      if (match) {
        setLeadId(match.id);
        setDialMode("lead");
      } else {
        setCustomPhone(props.initialPhone);
        if (props.initialName) setCustomName(props.initialName);
        setDialMode("dialpad");
      }
    }
  }, [props.initialLeadId, props.initialPhone, props.initialName, leads]);

  // Contadores por canal de origen
  const counts = useMemo(() => {
    let whatsapp = 0;
    let sms = 0;
    let metaAds = 0;
    let manual = 0;

    for (const l of leads) {
      const s = l.source;
      if (s.includes("whatsapp")) whatsapp++;
      else if (s.includes("sms") || s.includes("text") || s.includes("mobile")) sms++;
      else if (s.includes("meta") || s.includes("facebook") || s.includes("ads")) metaAds++;
      else manual++;
    }

    return { all: leads.length, whatsapp, sms, metaAds, manual };
  }, [leads]);

  // Filtrado de prospectos con búsqueda y canales
  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      // 1. Filtro por canal/origen
      if (leadCategory === "whatsapp" && !l.source.includes("whatsapp")) return false;
      if (leadCategory === "sms" && !l.source.includes("sms") && !l.source.includes("text") && !l.source.includes("mobile")) return false;
      if (leadCategory === "meta_ads" && !l.source.includes("meta") && !l.source.includes("facebook") && !l.source.includes("ads")) return false;
      if (leadCategory === "manual" && (l.source.includes("whatsapp") || l.source.includes("meta") || l.source.includes("facebook") || l.source.includes("ads") || l.source.includes("sms"))) return false;

      // 2. Filtro por texto de búsqueda
      if (leadSearch.trim()) {
        const q = leadSearch.toLowerCase().trim();
        const matchName = l.name.toLowerCase().includes(q);
        const matchCompany = l.companyName?.toLowerCase().includes(q) ?? false;
        const matchPhone = l.phone.includes(q) || l.phone.replace(/\D/g, "").includes(q);
        const matchClient = l.clientName?.toLowerCase().includes(q) ?? false;
        return matchName || matchCompany || matchPhone || matchClient;
      }
      return true;
    });
  }, [leads, leadCategory, leadSearch]);

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

  const getSourceBadge = (source: string) => {
    const s = source.toLowerCase();
    if (s.includes("whatsapp")) {
      return { label: "WhatsApp", icon: MessageSquare, color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
    if (s.includes("sms") || s.includes("text")) {
      return { label: "SMS", icon: Smartphone, color: "bg-purple-50 text-purple-700 border-purple-200" };
    }
    if (s.includes("meta") || s.includes("facebook") || s.includes("ads")) {
      return { label: "Meta Ads", icon: Megaphone, color: "bg-blue-50 text-blue-700 border-blue-200" };
    }
    return { label: "CRM", icon: User, color: "bg-amber-50 text-amber-700 border-amber-200" };
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
      {incoming && phase === "incoming" && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 space-y-3 animate-in zoom-in-95">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center animate-bounce shadow-md shadow-emerald-500/30">
              <PhoneIncoming className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-900 truncate">Llamada entrante de:</p>
              <p className="text-sm font-mono font-bold text-emerald-950 truncate">{incoming.from}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={props.onAccept}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Phone className="w-4 h-4 fill-current" />
              <span>Responder</span>
            </button>
            <button
              type="button"
              onClick={props.onReject}
              className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 active:scale-95 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Rechazar</span>
            </button>
          </div>
        </div>
      )}

      {/* Estado Activo de Llamada (En Curso / Conectando / Supervisión) */}
      {active ? (
        <div className="p-5 rounded-2xl bg-[#101828] text-white space-y-4 shadow-lg shadow-slate-900/10">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-semibold text-slate-300">
                  {active.monitorMode === MONITOR_MODE.WHISPER
                    ? "Susurrando a Vendedor"
                    : active.monitorMode === MONITOR_MODE.LISTEN
                    ? "Escuchando en Silencio"
                    : "Llamada Activa"}
                </span>
              </div>
              <p className="text-base font-bold truncate max-w-[240px] text-white">
                {active.label || "Llamada Telefónica"}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl font-mono font-bold text-[#E5C158]">{elapsed}</span>
              <p className="text-[10px] text-slate-400">tiempo transcurrido</p>
            </div>
          </div>

          {/* Keypad en llamada (DTMF para IVR) */}
          {showInCallKeypad && (
            <div className="pt-3 border-t border-slate-800 space-y-2 animate-in fade-in">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Marcador de tonos (DTMF):</span>
                <span className="font-mono text-[#E5C158] font-bold">{inCallDigits || "—"}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {DIAL_KEYS.map((k) => (
                  <button
                    key={k.digit}
                    type="button"
                    onClick={() => handleInCallDigitPress(k.digit)}
                    className="py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-mono font-bold text-sm transition-all cursor-pointer"
                  >
                    {k.digit}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Controles de Llamada Activa */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={props.onToggleMute}
              aria-label={active.muted ? "Activar micrófono" : "Silenciar micrófono"}
              className={`${roundButton} ${
                active.muted ? "bg-red-500/20 text-red-400 border border-red-500/40" : "bg-slate-800 hover:bg-slate-700 text-white"
              }`}
              title={active.muted ? "Activar micrófono" : "Silenciar micrófono"}
            >
              {active.muted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              type="button"
              onClick={() => setShowInCallKeypad(!showInCallKeypad)}
              aria-label="Teclado numérico de tonos"
              className={`${roundButton} ${
                showInCallKeypad ? "bg-amber-500/20 text-[#E5C158] border border-amber-500/40" : "bg-slate-800 hover:bg-slate-700 text-white"
              }`}
              title="Teclado numérico de tonos DTMF"
            >
              <Hash className="w-5 h-5" />
            </button>

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
            /* Modo 1: Llamar a Prospecto con Segmentación por Canal */
            <div className="space-y-3.5">
              {/* Filtros de Lista / Canal */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-[#344054]">
                  <span className="font-semibold">Seleccionar Lista de Contacto:</span>
                  <span className="text-[11px] text-[#667085] font-mono">
                    {filteredLeads.length} con teléfono
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setLeadCategory("all")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      leadCategory === "all"
                        ? "bg-[#101828] text-white shadow-xs"
                        : "bg-[#F8F9FA] text-[#667085] hover:bg-[#EAECF0] hover:text-[#101828]"
                    }`}
                  >
                    <span>Todos</span>
                    <span className="text-[10px] font-mono opacity-80">({counts.all})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeadCategory("whatsapp")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      leadCategory === "whatsapp"
                        ? "bg-emerald-700 text-white shadow-xs"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200"
                    }`}
                  >
                    <MessageSquare className="w-3 h-3" />
                    <span>WhatsApp</span>
                    <span className="text-[10px] font-mono opacity-80">({counts.whatsapp})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeadCategory("sms")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      leadCategory === "sms"
                        ? "bg-purple-700 text-white shadow-xs"
                        : "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                    }`}
                  >
                    <Smartphone className="w-3 h-3" />
                    <span>SMS</span>
                    <span className="text-[10px] font-mono opacity-80">({counts.sms})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeadCategory("meta_ads")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      leadCategory === "meta_ads"
                        ? "bg-blue-700 text-white shadow-xs"
                        : "bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200"
                    }`}
                  >
                    <Megaphone className="w-3 h-3" />
                    <span>Pautas</span>
                    <span className="text-[10px] font-mono opacity-80">({counts.metaAds})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLeadCategory("manual")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      leadCategory === "manual"
                        ? "bg-amber-700 text-white shadow-xs"
                        : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
                    }`}
                  >
                    <User className="w-3 h-3" />
                    <span>CRM</span>
                    <span className="text-[10px] font-mono opacity-80">({counts.manual})</span>
                  </button>
                </div>
              </div>

              {/* Buscador en Vivo de Prospectos */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  placeholder="Buscar por nombre, empresa o teléfono..."
                  className="w-full bg-[#F9FAFB] border border-[#EAECF0] rounded-xl pl-9 pr-8 py-2 text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
                />
                {leadSearch && (
                  <button
                    type="button"
                    onClick={() => setLeadSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#101828] p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Prospecto Seleccionado o Lista de Selección */}
              {selectedLead ? (
                <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                        {selectedLead.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-bold text-[#101828] truncate">{selectedLead.name}</p>
                          {(() => {
                            const badge = getSourceBadge(selectedLead.source);
                            const Icon = badge.icon;
                            return (
                              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.2 rounded-md border ${badge.color}`}>
                                <Icon className="w-2.5 h-2.5" />
                                {badge.label}
                              </span>
                            );
                          })()}
                        </div>
                        <p className="text-xs font-mono font-semibold text-emerald-800">{selectedLead.phone}</p>
                        {selectedLead.companyName && (
                          <p className="text-[11px] text-[#475467] truncate">{selectedLead.companyName}</p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setLeadId("")}
                      className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer shrink-0"
                    >
                      Cambiar
                    </button>
                  </div>

                  {/* Botón de Llamar al Prospecto Seleccionado */}
                  <button
                    type="button"
                    disabled={phase !== "ready"}
                    onClick={() => props.onCall(selectedLead.id, `${selectedLead.name} (${selectedLead.phone})`)}
                    className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md ${
                      phase === "ready"
                        ? "bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white shadow-emerald-600/30 cursor-pointer active:scale-[0.99]"
                        : "bg-[#EAECF0] text-[#98A2B3] cursor-not-allowed"
                    }`}
                  >
                    <Phone className="w-4 h-4 fill-current" />
                    <span>Llamar a {selectedLead.name}</span>
                  </button>
                </div>
              ) : (
                /* Lista Desplegable Interactiva de Leads */
                <div className="space-y-2">
                  <div className="max-h-56 overflow-y-auto space-y-1.5 border border-[#EAECF0] rounded-2xl p-1 bg-[#FAFAFA]">
                    {filteredLeads.length === 0 ? (
                      <div className="py-6 px-4 text-center space-y-1">
                        <p className="text-xs font-semibold text-[#344054]">No hay prospectos con teléfono</p>
                        <p className="text-[11px] text-[#667085]">
                          {leadSearch
                            ? "Ningún prospecto coincide con tu búsqueda."
                            : "Esta lista no tiene contactos con número telefónico registrado."}
                        </p>
                        {leadCategory !== "all" && (
                          <button
                            type="button"
                            onClick={() => {
                              setLeadCategory("all");
                              setLeadSearch("");
                            }}
                            className="mt-2 text-xs font-semibold text-amber-600 hover:underline cursor-pointer"
                          >
                            Ver todos los prospectos con teléfono ({counts.all})
                          </button>
                        )}
                      </div>
                    ) : (
                      filteredLeads.slice(0, 50).map((l) => {
                        const badge = getSourceBadge(l.source);
                        const Icon = badge.icon;
                        return (
                          <button
                            key={l.id}
                            type="button"
                            onClick={() => {
                              playDtmfTone("1");
                              setLeadId(l.id);
                            }}
                            className="w-full text-left p-2.5 rounded-xl bg-white hover:bg-emerald-50/50 hover:border-emerald-300 border border-transparent transition-all flex items-center justify-between gap-2 shadow-2xs group cursor-pointer"
                          >
                            <div className="min-w-0 flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-[#F2F4F7] group-hover:bg-emerald-100 text-[#344054] group-hover:text-emerald-800 flex items-center justify-center font-bold text-[11px] shrink-0 transition-colors">
                                {l.name.slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-[#101828] group-hover:text-emerald-950 truncate">
                                  {l.name}
                                </p>
                                <p className="text-[11px] font-mono text-[#667085] group-hover:text-emerald-800 truncate">
                                  {l.phone}
                                </p>
                              </div>
                            </div>

                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md border shrink-0 ${badge.color}`}>
                              <Icon className="w-2.5 h-2.5" />
                              {badge.label}
                            </span>
                          </button>
                        );
                      })
                    )}
                  </div>
                  {filteredLeads.length > 50 && (
                    <p className="text-[10px] text-[#667085] text-center">
                      Mostrando primeros 50 de {filteredLeads.length} prospectos. Usa el buscador para filtrar más rápido.
                    </p>
                  )}
                </div>
              )}
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
