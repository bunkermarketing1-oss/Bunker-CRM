"use client";

import React, { useState } from "react";
import { Sparkles, X, Bot, Copy, Check, Target, MessageSquare, Flame } from "lucide-react";

interface AiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AiAssistantModal({ isOpen, onClose }: AiModalProps) {
  const [activeTab, setActiveTab] = useState<"qualify" | "copy" | "sms">("qualify");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Form states
  const [leadData, setLeadData] = useState({
    companyName: "Inmobiliaria Mar Azul",
    estimatedValue: "75000",
    source: "meta_ads",
    notes: "Buscan captar inversionistas para preventa de condominios en Cancún.",
  });

  const [copyData, setCopyData] = useState({
    clientName: "Bunker Marketing Agency",
    topic: "Lanzamiento de embudos híbridos con IA y Meta Ads",
    platform: "Instagram & Facebook",
  });

  const [smsData, setSmsData] = useState({
    leadName: "Roberto Garza",
    purpose: "Confirmación de reunión de análisis de pauta digital",
    date: "mañana jueves a las 11:30 AM",
  });

  if (!isOpen) return null;

  const handleRunAi = async () => {
    setLoading(true);
    setResult(null);

    try {
      let task = "";
      let payload = {};

      if (activeTab === "qualify") {
        task = "qualify_lead";
        payload = leadData;
      } else if (activeTab === "copy") {
        task = "generate_copy";
        payload = copyData;
      } else {
        task = "generate_sms";
        payload = smsData;
      }

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ task, data: payload }),
      });

      const json = await res.json();
      if (json.success) {
        setResult(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] border border-[#E8E6DF] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#E8E6DF] flex items-center justify-between bg-[#FAF9F5]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#FBF1ED] border border-[#F3D6CB] flex items-center justify-center text-[#D97757]">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-serif font-bold text-[#1F1E1D] flex items-center gap-2">
                Asistente Bunker AI
                <span className="text-[10px] bg-[#FBF1ED] text-[#C15F3C] font-semibold px-2 py-0.5 rounded-full border border-[#F3D6CB]">
                  Claude Engine
                </span>
              </h2>
              <p className="text-[11px] text-[#716F6A]">
                Automatización comercial y asistencia editorial para la agencia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#FFFFFF] border border-[#E8E6DF] flex items-center justify-center text-[#716F6A] hover:text-[#1F1E1D] hover:bg-[#FAF8F2]"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#E8E6DF] bg-[#FAF9F5]/50 px-4">
          <button
            onClick={() => { setActiveTab("qualify"); setResult(null); }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "qualify"
                ? "border-[#D97757] text-[#1F1E1D]"
                : "border-transparent text-[#716F6A] hover:text-[#1F1E1D]"
            }`}
          >
            <Target className="w-3.5 h-3.5 text-[#D97757]" />
            Calificador de Leads
          </button>
          <button
            onClick={() => { setActiveTab("copy"); setResult(null); }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "copy"
                ? "border-[#D97757] text-[#1F1E1D]"
                : "border-transparent text-[#716F6A] hover:text-[#1F1E1D]"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-600" />
            Generador de Copy Redes
          </button>
          <button
            onClick={() => { setActiveTab("sms"); setResult(null); }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "sms"
                ? "border-[#D97757] text-[#1F1E1D]"
                : "border-transparent text-[#716F6A] hover:text-[#1F1E1D]"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
            Redactor de SMS
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === "qualify" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Nombre de la Empresa / Prospecto</label>
                <input
                  type="text"
                  value={leadData.companyName}
                  onChange={(e) => setLeadData({ ...leadData, companyName: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Presupuesto Estimado ($ MXN)</label>
                  <input
                    type="number"
                    value={leadData.estimatedValue}
                    onChange={(e) => setLeadData({ ...leadData, estimatedValue: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Canal de Captación</label>
                  <select
                    value={leadData.source}
                    onChange={(e) => setLeadData({ ...leadData, source: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  >
                    <option value="meta_ads">Meta Ads (Instagram / FB)</option>
                    <option value="google_ads">Google Ads</option>
                    <option value="referral">Recomendación Directa</option>
                    <option value="website">Formulario Web</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Detalles del Requerimiento</label>
                <textarea
                  rows={2}
                  value={leadData.notes}
                  onChange={(e) => setLeadData({ ...leadData, notes: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>
            </div>
          )}

          {activeTab === "copy" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Tema o Propuesta de Valor</label>
                <input
                  type="text"
                  value={copyData.topic}
                  onChange={(e) => setCopyData({ ...copyData, topic: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Nombre del Cliente / Marca</label>
                  <input
                    type="text"
                    value={copyData.clientName}
                    onChange={(e) => setCopyData({ ...copyData, clientName: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Plataforma</label>
                  <select
                    value={copyData.platform}
                    onChange={(e) => setCopyData({ ...copyData, platform: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  >
                    <option value="Instagram & Facebook">Instagram & Facebook</option>
                    <option value="LinkedIn">LinkedIn B2B</option>
                    <option value="TikTok">TikTok Caption</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {activeTab === "sms" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Nombre del Contacto</label>
                  <input
                    type="text"
                    value={smsData.leadName}
                    onChange={(e) => setSmsData({ ...smsData, leadName: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Fecha / Horario</label>
                  <input
                    type="text"
                    value={smsData.date}
                    onChange={(e) => setSmsData({ ...smsData, date: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Objetivo del SMS</label>
                <input
                  type="text"
                  value={smsData.purpose}
                  onChange={(e) => setSmsData({ ...smsData, purpose: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleRunAi}
            disabled={loading}
            className="w-full py-2.5 rounded-2xl btn-black-gold font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2 text-[#FAF8F3]">
                <span className="w-3.5 h-3.5 border-2 border-[#D4AF37]/40 border-t-[#D4AF37] rounded-full animate-spin"></span>
                Pensando con Bunker AI...
              </span>
            ) : (
              <span className="flex items-center gap-2 text-[#FAF8F3]">
                <Sparkles className="w-3.5 h-3.5 text-[#E5C158]" />
                Ejecutar con Bunker AI
              </span>
            )}
          </button>

          {/* Results Output */}
          {result && (
            <div className="mt-4 p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-3">
              <div className="text-[11px] font-bold text-[#C15F3C] uppercase tracking-wider flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Resultado Generado
              </div>

              {result.score !== undefined && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#716F6A]">Puntaje de Potencial:</span>
                    <span className="text-base font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      {result.score}/100
                    </span>
                  </div>
                  <p className="text-xs text-[#1F1E1D] leading-relaxed bg-[#FFFFFF] p-3 rounded-xl border border-[#E8E6DF]">
                    {result.summary}
                  </p>
                  <div className="text-[11px] text-amber-800 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                    <strong>Acción recomendada:</strong> {result.recommendedAction}
                  </div>
                </div>
              )}

              {result.copies && (
                <div className="space-y-2.5">
                  {result.copies.map((copyText: string, i: number) => (
                    <div key={i} className="p-3 bg-[#FFFFFF] rounded-xl border border-[#E8E6DF] text-xs text-[#1F1E1D] relative group">
                      <div className="text-[10px] text-[#9C9890] font-semibold mb-1">Variación #{i + 1}</div>
                      <p className="leading-relaxed pr-8">{copyText}</p>
                      <button
                        onClick={() => copyToClipboard(copyText, i)}
                        className="absolute top-2.5 right-2.5 text-[#716F6A] hover:text-[#1F1E1D] p-1 rounded-lg bg-[#FAF9F5] border border-[#E8E6DF]"
                      >
                        {copiedIndex === i ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {result.templates && (
                <div className="space-y-2">
                  {result.templates.map((tmpl: string, i: number) => (
                    <div key={i} className="p-3 bg-[#FFFFFF] rounded-xl border border-[#E8E6DF] text-xs text-[#1F1E1D] relative group flex items-start justify-between gap-3">
                      <p className="leading-relaxed">{tmpl}</p>
                      <button
                        onClick={() => copyToClipboard(tmpl, i)}
                        className="text-[#716F6A] hover:text-[#1F1E1D] p-1 rounded-lg bg-[#FAF9F5] border border-[#E8E6DF] flex-shrink-0"
                      >
                        {copiedIndex === i ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
