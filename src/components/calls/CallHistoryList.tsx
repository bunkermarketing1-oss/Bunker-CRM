"use client";

import React, { useState, useRef, useEffect } from "react";
import { History, PhoneIncoming, PhoneOutgoing, Play, Pause, Download, Volume2, Loader2 } from "lucide-react";
import { CALL_DIRECTION, CALL_STATUS, CALL_STATUS_LABEL } from "@/lib/constants/voice";
import type { CallSummary } from "@/types/voice";

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

export function CallHistoryList({ calls, loading }: { calls: CallSummary[]; loading: boolean }) {
  const [playingCallId, setPlayingCallId] = useState<string | null>(null);
  const [isLoadingAudio, setIsLoadingAudio] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Limpiar el audio si el componente se desmonta
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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
    <section className="p-5 rounded-2xl bg-white border border-[#EAECF0] shadow-xs space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-[#F2F4F7]">
        <h2 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
          <History className="w-4 h-4 text-amber-500" />
          <span>Historial de llamadas</span>
        </h2>
        <span className="text-[11px] text-[#667085] font-mono bg-[#F8F9FA] px-2 py-0.5 rounded-md border border-[#EAECF0]">
          {calls.length} llamadas
        </span>
      </div>

      {playbackError && (
        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <span>{playbackError}</span>
          <button
            onClick={() => setPlaybackError(null)}
            className="text-amber-700 hover:text-amber-900 font-semibold text-[11px] ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {loading ? (
        <p className="py-10 text-center text-xs text-[#667085]">Cargando llamadas…</p>
      ) : calls.length === 0 ? (
        <p className="py-10 text-center text-xs text-[#667085]">Aún no hay llamadas.</p>
      ) : (
        <ul className="divide-y divide-[#F2F4F7] max-h-[520px] overflow-y-auto">
          {calls.map((call) => {
            const inbound = call.direction === CALL_DIRECTION.INBOUND;
            const Icon = inbound ? PhoneIncoming : PhoneOutgoing;
            const isPlaying = playingCallId === call.id;
            const isLoading = isLoadingAudio === call.id;

            return (
              <li
                key={call.id}
                className={`py-3 px-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl transition-colors ${
                  isPlaying ? "bg-amber-50/60 border border-amber-200" : "hover:bg-[#F9FAFB]"
                }`}
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <div
                    className={`p-2 rounded-lg flex-shrink-0 ${
                      inbound ? "bg-emerald-50 text-emerald-600" : "bg-[#F2F4F7] text-[#475467]"
                    }`}
                  >
                    <Icon className="w-4 h-4" aria-label={inbound ? "Entrante" : "Saliente"} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#101828] truncate">
                      {call.leadName ?? (inbound ? call.fromNumber : call.toNumber)}
                    </p>
                    <p className="text-[11px] text-[#667085] truncate">
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
                  {/* Botón de reproducción de grabación */}
                  {call.hasRecording && (
                    <div className="flex items-center gap-1 mr-1">
                      <button
                        onClick={() => handleTogglePlay(call.id)}
                        disabled={isLoading}
                        title={isPlaying ? "Pausar grabación" : "Escuchar grabación"}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors shadow-2xs ${
                          isPlaying
                            ? "bg-amber-500 text-white border-amber-600 hover:bg-amber-600"
                            : "bg-white text-amber-800 border-amber-300 hover:bg-amber-50"
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

                      <a
                        href={`/api/voice/calls/${call.id}/recording`}
                        download={`grabacion-${call.id}.mp3`}
                        title="Descargar MP3"
                        className="p-1 rounded-lg text-[#667085] hover:text-[#101828] hover:bg-[#F2F4F7] transition-colors"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  )}

                  <span className="font-mono text-[11px] text-[#344054] px-1.5 py-0.5 rounded bg-[#F8F9FA] border border-[#EAECF0]">
                    {formatDuration(call.durationSec)}
                  </span>
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded-md border ${
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
    </section>
  );
}
