"use client";

import React, { useState } from "react";
import { Sparkles, X, FileText, CheckCircle2, AlertCircle, Bot, Loader2, RotateCcw } from "lucide-react";
import type { CallSummary } from "@/types/voice";

interface CallIntelligenceModalProps {
  call: CallSummary;
  onClose: () => void;
  onAnalysisUpdated: (updatedCall: CallSummary) => void;
}

export function CallIntelligenceModal({ call, onClose, onAnalysisUpdated }: CallIntelligenceModalProps) {
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    setError(null);
    try {
      const res = await fetch(`/api/voice/calls/${call.id}/analyze`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al analizar la llamada con IA.");
      }

      const updated: CallSummary = {
        ...call,
        aiSummary: data.analysis.summary,
        aiKeyTakeaways: data.analysis.keyTakeaways,
        aiActionItems: data.analysis.actionItems,
        aiSentiment: data.analysis.sentiment,
        transcriptionText: data.analysis.transcription,
      };
      onAnalysisUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setAnalyzing(false);
    }
  };

  const sentiment = call.aiSentiment;
  const sentimentBadge =
    sentiment === "positive"
      ? { text: "Disposición Positiva", bg: "bg-emerald-50 text-emerald-800 border-emerald-200", icon: "😊" }
      : sentiment === "negative"
      ? { text: "Objeción o Negativa", bg: "bg-rose-50 text-rose-800 border-rose-200", icon: "😟" }
      : { text: "Disposición Neutral", bg: "bg-slate-50 text-slate-800 border-slate-200", icon: "😐" };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-[#EAECF0] max-h-[90vh] flex flex-col space-y-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[#F2F4F7] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500/10 to-indigo-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-[#101828]">Inteligencia de Llamada (IA)</h3>
                {call.aiSummary && (
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${sentimentBadge.bg}`}>
                    <span>{sentimentBadge.icon}</span>
                    <span>{sentimentBadge.text}</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-[#667085] mt-0.5">
                {call.leadName ? `Prospecto: ${call.leadName}` : call.toNumber} · {call.userName || "Asesor"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#98A2B3] hover:text-[#101828] rounded-xl hover:bg-[#F2F4F7] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Content */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {!call.aiSummary ? (
            <div className="py-10 text-center space-y-4 rounded-2xl bg-[#F9FAFB] border border-[#EAECF0] p-6">
              <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center border border-purple-200">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#101828]">Esta llamada aún no ha sido analizada</h4>
                <p className="text-xs text-[#667085] max-w-md mx-auto mt-1">
                  La IA de Whisper transcribirá la conversación y generará un resumen ejecutivo, puntos clave, objeciones y tareas de seguimiento.
                </p>
              </div>
              <button
                onClick={handleRunAnalysis}
                disabled={analyzing}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#101828] text-white hover:bg-[#1E293B] shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer"
              >
                {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-400" />}
                <span>{analyzing ? "Transcribiendo y analizando..." : "Iniciar Análisis con IA"}</span>
              </button>
            </div>
          ) : (
            <>
              {/* Resumen Ejecutivo */}
              <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#EAECF0] space-y-1.5">
                <div className="flex items-center gap-2 text-xs font-bold text-[#344054]">
                  <FileText className="w-4 h-4 text-purple-600" />
                  <span>Resumen Ejecutivo de la Conversación</span>
                </div>
                <p className="text-xs text-[#101828] leading-relaxed whitespace-pre-line font-medium">
                  {call.aiSummary}
                </p>
              </div>

              {/* Grid: Puntos Clave & Acciones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Puntos Clave */}
                <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#EAECF0] space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-[#344054]">
                    <span className="text-amber-500 font-black">💡</span>
                    <span>Puntos Clave & Dudas</span>
                  </div>
                  <p className="text-xs text-[#475467] leading-relaxed whitespace-pre-line">
                    {call.aiKeyTakeaways || "No se detectaron puntos específicos."}
                  </p>
                </div>

                {/* Compromisos y Acciones */}
                <div className="p-4 rounded-2xl bg-purple-50/40 border border-purple-200/60 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900">
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                    <span>Compromisos & Tareas</span>
                  </div>
                  <p className="text-xs text-purple-950 leading-relaxed whitespace-pre-line font-medium">
                    {call.aiActionItems || "Sin compromisos detectados."}
                  </p>
                </div>
              </div>

              {/* Transcripción Whisper */}
              {call.transcriptionText && (
                <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#344054]">Transcripción Completa (Whisper)</span>
                    <span className="text-[10px] text-[#98A2B3] font-medium">Español</span>
                  </div>
                  <div className="max-h-40 overflow-y-auto p-3 rounded-xl bg-[#F9FAFB] text-xs text-[#475467] leading-relaxed border border-[#EAECF0]">
                    {call.transcriptionText}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[#F2F4F7]">
          {call.aiSummary && (
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#667085] hover:text-[#101828] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              <span>{analyzing ? "Re-analizando..." : "Re-analizar llamada"}</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="ml-auto px-4 py-2 rounded-xl text-xs font-bold bg-[#F2F4F7] text-[#344054] hover:bg-[#EAECF0] transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
