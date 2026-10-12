"use client";

import React, { useState } from "react";
import { Sparkles, X, Send, Bot, Copy, Check, Target, MessageSquare, Flame } from "lucide-react";

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
    notes: "Buscan captar inversionistas para preventa de 40 condominios en Cancún.",
  });

  const [copyData, setCopyData] = useState({
    clientName: "Bunker Marketing Agency",
    topic: "Lanzamiento de servicio de embudos híbridos con IA",
    platform: "Instagram & Facebook",
  });

  const [smsData, setSmsData] = useState({
    leadName: "Roberto Garza",
    purpose: "Confirmación de reunión de auditoría de pauta digital",
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0b101d] border border-[#23314d] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#1c263c] flex items-center justify-between bg-gradient-to-r from-bunker-950 via-[#0b101d] to-[#0b101d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-bunker-600/30 border border-bunker-500/40 flex items-center justify-center text-bunker-400">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                Agente Bunker AI
                <span className="text-[10px] bg-bunker-500/20 text-bunker-300 font-normal px-2 py-0.5 rounded-full border border-bunker-500/30">
                  Operativo
                </span>
              </h2>
              <p className="text-[11px] text-gray-400">
                Automatización comercial y asistencia para la agencia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-[#141d30] border border-[#23314d] flex items-center justify-center text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#1c263c] bg-[#070b14] px-4">
          <button
            onClick={() => { setActiveTab("qualify"); setResult(null); }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "qualify"
                ? "border-bunker-500 text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Target className="w-3.5 h-3.5 text-bunker-400" />
            Calificador de Leads
          </button>
          <button
            onClick={() => { setActiveTab("copy"); setResult(null); }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "copy"
                ? "border-bunker-500 text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-amber-400" />
            Generador de Copy Redes
          </button>
          <button
            onClick={() => { setActiveTab("sms"); setResult(null); }}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all ${
              activeTab === "sms"
                ? "border-bunker-500 text-white"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
            Redactor de SMS
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {activeTab === "qualify" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Nombre de la Empresa / Prospecto</label>
                <input
                  type="text"
                  value={leadData.companyName}
                  onChange={(e) => setLeadData({ ...leadData, companyName: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Presupuesto Estimado ($ MXN)</label>
                  <input
                    type="number"
                    value={leadData.estimatedValue}
                    onChange={(e) => setLeadData({ ...leadData, estimatedValue: e.target.value })}
                    className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Canal de Captación</label>
                  <select
                    value={leadData.source}
                    onChange={(e) => setLeadData({ ...leadData, source: e.target.value })}
                    className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                  >
                    <option value="meta_ads">Meta Ads (Instagram / FB)</option>
                    <option value="google_ads">Google Ads</option>
                    <option value="referral">Recomendación Directa</option>
                    <option value="website">Formulario Web</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Detalles del Requerimiento</label>
                <textarea
                  rows={2}
                  value={leadData.notes}
                  onChange={(e) => setLeadData({ ...leadData, notes: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                />
              </div>
            </div>
          )}

          {activeTab === "copy" && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Tema o Propuesta de Valor</label>
                <input
                  type="text"
                  value={copyData.topic}
                  onChange={(e) => setCopyData({ ...copyData, topic: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Nombre del Cliente / Marca</label>
                  <input
                    type="text"
                    value={copyData.clientName}
                    onChange={(e) => setCopyData({ ...copyData, clientName: e.target.value })}
                    className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Plataforma</label>
                  <select
                    value={copyData.platform}
                    onChange={(e) => setCopyData({ ...copyData, platform: e.target.value })}
                    className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
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
                  <label className="block text-xs font-medium text-gray-300 mb-1">Nombre del Contacto</label>
                  <input
                    type="text"
                    value={smsData.leadName}
                    onChange={(e) => setSmsData({ ...smsData, leadName: e.target.value })}
                    className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Fecha / Horario</label>
                  <input
                    type="text"
                    value={smsData.date}
                    onChange={(e) => setSmsData({ ...smsData, date: e.target.value })}
                    className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Objetivo del SMS</label>
                <input
                  type="text"
                  value={smsData.purpose}
                  onChange={(e) => setSmsData({ ...smsData, purpose: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                />
              </div>
            </div>
          )}

          {/* Action Button */}
          <button
            onClick={handleRunAi}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-bunker-600 to-indigo-600 hover:from-bunker-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-bunker-600/30 transition-all disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                Analizando con Bunker AI...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Ejecutar Asistente con IA
              </span>
            )}
          </button>

          {/* Results Output */}
          {result && (
            <div className="mt-4 p-4 rounded-xl bg-[#080d17] border border-[#1e2a44] space-y-3">
              <div className="text-[11px] font-bold text-bunker-400 uppercase tracking-wider flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                Resultado Generado por IA
              </div>

              {result.score !== undefined && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-300">Puntaje de Potencial:</span>
                    <span className="text-base font-extrabold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      {result.score}/100
                    </span>
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed bg-[#101726] p-3 rounded-lg border border-[#1b2538]">
                    {result.summary}
                  </p>
                  <div className="text-[11px] text-amber-300 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                    <strong>Acción sugerida:</strong> {result.recommendedAction}
                  </div>
                </div>
              )}

              {result.copies && (
                <div className="space-y-3">
                  {result.copies.map((copyText: string, i: number) => (
                    <div key={i} className="p-3 bg-[#101726] rounded-lg border border-[#1b2538] text-xs text-gray-200 relative group">
                      <div className="text-[10px] text-gray-400 font-semibold mb-1">Variación #{i + 1}</div>
                      <p className="leading-relaxed pr-8">{copyText}</p>
                      <button
                        onClick={() => copyToClipboard(copyText, i)}
                        className="absolute top-3 right-3 text-gray-400 hover:text-white p-1 rounded bg-[#17223b]"
                      >
                        {copiedIndex === i ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {result.templates && (
                <div className="space-y-2">
                  {result.templates.map((tmpl: string, i: number) => (
                    <div key={i} className="p-3 bg-[#101726] rounded-lg border border-[#1b2538] text-xs text-gray-200 relative group flex items-start justify-between gap-3">
                      <p className="leading-relaxed">{tmpl}</p>
                      <button
                        onClick={() => copyToClipboard(tmpl, i)}
                        className="text-gray-400 hover:text-white p-1 rounded bg-[#17223b] flex-shrink-0"
                      >
                        {copiedIndex === i ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
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
