"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import { History, PhoneIncoming, PhoneOutgoing, Play, Pause, Download, Loader2, Disc, Sparkles } from "lucide-react";
import { CALL_DIRECTION, CALL_STATUS, CALL_STATUS_LABEL } from "@/lib/constants/voice";
import type { CallSummary } from "@/types/voice";
import { CallIntelligenceModal } from "./CallIntelligenceModal";

const formatDuration = (seconds: number | null) =>
  seconds ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "—";

const STATUS_STYLE: Partial<Record<CallSummary["status"], string>> = {
  [CALL_STATUS.COMPLETED]: "bg-emerald-50 text-emerald-700 border-emerald-200",
  [CALL_STATUS.IN_PROGRESS]: "bg-blue-50 text-blue-700 border-blue-200",
  [CALL_STATUS.RINGING]: "bg-blue-50 text-blue-700 border-blue-200",
  [CALL_STATUS.FAILED]: "bg-red-50 text-red-700 border-red-200",
  [CALL_STATUS.NO_ANSWER]: "bg-amber-50 text-amber-700 border-amber-200",
  [CALL_STATUS.BUSY]: "bg-amber-50 text-amber-700 border-amber-200",
  [CALL_STATUS.CANCELED]: "bg-gray-50 text-gray-700 border-gray-200",
};

type HistoryFilter = "all" | "inbound" | "outbound" | "recorded";

export function CallHistoryList({ calls, loading }: { calls: CallSummary[]; loading: boolean }) {
  const [callItems, setCallItems] = useState<CallSummary[]>(calls);
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [selectedAiCall, setSelectedAiCall] = useState<CallSummary | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    setCallItems(calls);
  }, [calls]);

  // Limpiar el audio si el componente se desmonta
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  const counts = useMemo(() => {
    let inbound = 0;
    let outbound = 0;
    let recorded = 0;
    for (const c of callItems) {
      if (c.direction === CALL_DIRECTION.INBOUND) inbound++;
      else outbound++;
      if (c.hasRecording) recorded++;
    }
    return { all: callItems.length, inbound, outbound, recorded };
  }, [callItems]);

  const filteredCalls = useMemo(() => {
    if (filter === "inbound") return callItems.filter((c) => c.direction === CALL_DIRECTION.INBOUND);
    if (filter === "outbound") return callItems.filter((c) => c.direction === CALL_DIRECTION.OUTBOUND);
    if (filter === "recorded") return callItems.filter((c) => c.hasRecording);
    return callItems;
  }, [callItems, filter]);

  const handleTogglePlay = (callId: string) => {
    setPlaybackError(null);

    // Si ya está sonando este mismo audio, pausarlo
    if (playingCallId === callId && audioRef.current) {
      if (audioRef.current.paused) {
        audioRef.current.play().catch(() => setPlaybackError("No se pudo reanudar el audio."));
      } else {
        audioRef.current.pause();
        setPlayingCallId(null);
      }
      return;
    }

    // Detener cualquier audio previo
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    setIsLoadingAudio(callId);
    const audio = new Audio(`/api/voice/calls/${callId}/recording`);
    audioRef.current = audio;

    audio.oncanplay = () => {
      setIsLoadingAudio(null);
      setPlayingCallId(callId);
      audio.play().catch(() => {
        setPlaybackError("El navegador bloqueó la reproducción automática.");
        setPlayingCallId(null);
      });
    };

    audio.onended = () => {
      setPlayingCallId(null);
    };

    audio.onerror = () => {
      setIsLoadingAudio(null);
      setPlayingCallId(null);
      setPlaybackError("La grabación aún se está procesando o no está disponible.");
    };
  };

  return (
    <section className="p-5 sm:p-6 rounded-3xl bg-white border border-[#EAECF0] shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F2F4F7]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
            <History className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#101828]">Historial de Llamadas</h2>
            <p className="text-[11px] text-[#667085]">Registro y grabaciones de audio</p>
          </div>
        </div>

        {/* Filtros rápidos de historial */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F9FAFB] rounded-xl border border-[#EAECF0]">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === "all" ? "bg-white text-[#101828] shadow-2xs" : "text-[#667085] hover:text-[#101828]"
            }`}
          >
            Todas ({counts.all})
          </button>
          <button
            type="button"
            onClick={() => setFilter("inbound")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === "inbound" ? "bg-white text-emerald-700 shadow-2xs" : "text-[#667085] hover:text-[#101828]"
            }`}
          >
            Entrantes ({counts.inbound})
          </button>
          <button
            type="button"
            onClick={() => setFilter("outbound")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
              filter === "outbound" ? "bg-white text-blue-700 shadow-2xs" : "text-[#667085] hover:text-[#101828]"
            }`}
          >
            Salientes ({counts.outbound})
          </button>
          <button
            type="button"
            onClick={() => setFilter("recorded")}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              filter === "recorded" ? "bg-white text-amber-800 shadow-2xs" : "text-[#667085] hover:text-[#101828]"
            }`}
          >
            <Disc className="w-3 h-3 text-amber-600" />
            <span>Grabadas ({counts.recorded})</span>
          </button>
        </div>
      </div>

      {playbackError && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <span>{playbackError}</span>
          <button
            onClick={() => setPlaybackError(null)}
            className="text-amber-700 hover:text-amber-950 font-bold text-xs ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-[#667085] space-y-2">
          <Loader2 className="w-5 h-5 animate-spin mx-auto text-amber-500" />
          <p>Cargando historial de llamadas…</p>
        </div>
      ) : filteredCalls.length === 0 ? (
        <div className="py-12 px-4 text-center rounded-2xl bg-[#F9FAFB] border border-[#EAECF0]/60 space-y-1">
          <p className="text-xs font-semibold text-[#344054]">
            {calls.length === 0 ? "Aún no se han registrado llamadas." : "Ninguna llamada coincide con este filtro."}
          </p>
          <p className="text-[11px] text-[#98A2B3]">
            {calls.length === 0
              ? "Las llamadas salientes o entrantes se registrarán aquí automáticamente en tiempo real."
              : "Prueba seleccionando 'Todas' o cambiando el filtro de marca."}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-[#F2F4F7] max-h-[560px] overflow-y-auto space-y-1">
          {filteredCalls.map((call) => {
            const inbound = call.direction === CALL_DIRECTION.INBOUND;
            const Icon = inbound ? PhoneIncoming : PhoneOutgoing;
            const isPlaying = playingCallId === call.id;
            const isLoading = isLoadingAudio === call.id;

            return (
              <li
                key={call.id}
                className={`py-3 px-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl transition-all ${
                  isPlaying ? "bg-amber-50/70 border border-amber-300 shadow-2xs" : "hover:bg-[#F9FAFB]"
                }`}
              >
                <div className="min-w-0 flex items-center gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      inbound ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-[#F2F4F7] text-[#475467] border border-[#EAECF0]"
                    }`}
                  >
                    <Icon className="w-4 h-4" aria-label={inbound ? "Entrante" : "Saliente"} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#101828] truncate">
                      {call.leadName ?? (inbound ? call.fromNumber : call.toNumber)}
                    </p>
                    <p className="text-[11px] text-[#667085] truncate mt-0.5">
                      {new Date(call.createdAt).toLocaleString("es-MX", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                      {call.userName && ` · ${call.userName}`}
                      {call.lineLabel && ` · ${call.lineLabel}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                  {/* Botón de reproducción de grabación y Minuta IA */}
                  {call.hasRecording && (
                    <div className="flex items-center gap-1.5 mr-1">
                      <button
                        onClick={() => handleTogglePlay(call.id)}
                        disabled={isLoading}
                        title={isPlaying ? "Pausar reproducción" : "Reproducir grabación"}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 shadow-2xs ${
                          isPlaying
                            ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600 shadow-amber-500/25"
                            : "bg-white text-amber-900 border-amber-300 hover:bg-amber-50"
                        }`}
                      >
                        {isLoading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : isPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                        <span>{isPlaying ? "Pausar" : "Escuchar"}</span>
                      </button>

                      {/* Botón Minuta IA / Análisis de Llamada */}
                      <button
                        type="button"
                        onClick={() => setSelectedAiCall(call)}
                        title={call.aiSummary ? "Ver Minuta Ejecutiva y Análisis IA" : "Analizar llamada con IA"}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer active:scale-95 shadow-2xs ${
                          call.aiSummary
                            ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
                            : "bg-white text-[#475467] border-[#D0D5DD] hover:bg-[#F9FAFB]"
                        }`}
                      >
                        <Sparkles className={`w-3.5 h-3.5 ${call.aiSummary ? "text-purple-600 fill-purple-200" : "text-amber-500"}`} />
                        <span className="hidden sm:inline">{call.aiSummary ? "Minuta IA" : "Analizar IA"}</span>
                      </button>

                      <a
                        href={`/api/voice/calls/${call.id}/recording`}
                        download={`grabacion-${call.id}.mp3`}
                        title="Descargar audio MP3"
                        className="p-1.5 rounded-xl text-[#667085] hover:text-[#101828] hover:bg-[#F2F4F7] border border-transparent hover:border-[#EAECF0] transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  {call.aiSentiment && (
                    <span
                      title={`Sentimiento del cliente: ${call.aiSentiment === "positive" ? "Positivo" : call.aiSentiment === "negative" ? "Objeción o Negativo" : "Neutral"}`}
                      className="text-xs cursor-help"
                    >
                      {call.aiSentiment === "positive" ? "🟢" : call.aiSentiment === "negative" ? "🔴" : "🟡"}
                    </span>
                  )}

                  <span className="font-mono text-[11px] font-semibold text-[#344054] px-2 py-0.5 rounded-md bg-[#F8F9FA] border border-[#EAECF0]">
                    {formatDuration(call.durationSec)}
                  </span>
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                      STATUS_STYLE[call.status] ?? "bg-gray-50 text-gray-700 border-gray-200"
                    }`}
                  >
                    {CALL_STATUS_LABEL[call.status]}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selectedAiCall && (
        <CallIntelligenceModal
          call={selectedAiCall}
          onClose={() => setSelectedAiCall(null)}
          onAnalysisUpdated={(updatedCall) => {
            setSelectedAiCall(updatedCall);
            setCallItems((prev) => prev.map((c) => (c.id === updatedCall.id ? updatedCall : c)));
          }}
        />
      )}
    </section>
  );
}
