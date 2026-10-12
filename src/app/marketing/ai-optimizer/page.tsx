"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  RefreshCw,
  Sliders,
} from "lucide-react";

export default function MetaAiOptimizerPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [optimizingId, setOptimizingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchOptimizer = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/marketing/ai-optimizer");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOptimizer();
  }, []);

  const handleApplyOptimization = async (campaignId: string, actionType: string) => {
    setOptimizingId(campaignId);
    setFeedback(null);
    try {
      const res = await fetch("/api/marketing/ai-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, actionType }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback(json.message);
        setTimeout(() => setFeedback(null), 5000);
        fetchOptimizer();
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setOptimizingId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Banner / Header */}
      <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-[#FBF1ED] text-[#C15F3C] border border-[#F3D6CB] flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#D97757]" />
              MÓDULO AGÉNTICO BUNKER AI
            </span>
            <span className="text-[#9C9890] text-xs">· Adaptación Algorítmica Meta Ads</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-[#1F1E1D] tracking-tight">
            Optimizador Autónomo de Pautas
          </h1>
          <p className="text-xs text-[#716F6A] mt-1.5 max-w-2xl leading-relaxed">
            La agencia gestiona internamente las pautas de sus clientes. Este agente de IA audita los algoritmos cambiantes de Meta (Advantage+, saturación de audiencia y subastas) para proteger el presupuesto de cada cuenta.
          </p>
        </div>

        <button
          onClick={fetchOptimizer}
          className="px-4 py-2 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-[#716F6A] hover:text-[#1F1E1D] hover:bg-[#FFFFFF] text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#D97757]" : ""}`} />
          <span>Auditar Algoritmos</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Meta Algorithm Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.metaAlgorithmRules?.map((rule: any, i: number) => (
          <div key={i} className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm space-y-1.5">
            <div className="flex items-center gap-2 text-[#1F1E1D] font-bold text-xs">
              <Zap className="w-3.5 h-3.5 text-[#D97757]" />
              <span>{rule.rule}</span>
            </div>
            <p className="text-[11px] text-[#716F6A] leading-relaxed">
              {rule.description}
            </p>
          </div>
        ))}
      </div>

      {/* Campaigns Semaphore & Action Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E6DF]">
          <h2 className="text-sm font-bold text-[#1F1E1D] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[#D97757]" />
            Diagnóstico de Pautas Activas por Cliente
          </h2>
          <span className="text-xs text-[#716F6A]">
            Semáforo de salud publicitaria y optimización en 1 clic
          </span>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-[#9C9890] text-xs">Analizando campañas con Bunker AI...</div>
          ) : (
            data?.campaigns?.map((camp: any) => {
              const isWarning = camp.health === "warning";
              const isDanger = camp.health === "danger";
              const isSuccess = camp.health === "success";

              return (
                <div
                  key={camp.id}
                  className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm hover:border-[#DDD9CF] transition-all space-y-5"
                >
                  {/* Top Bar: Client & Metrics */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#F0EEE6]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          isSuccess ? "bg-emerald-500" : isWarning ? "bg-amber-500" : "bg-red-500"
                        }`}></span>
                        <h3 className="font-serif font-bold text-[#1F1E1D] text-base">{camp.clientName}</h3>
                        <span className="text-[10px] bg-[#F3F1EB] text-[#716F6A] font-semibold px-2 py-0.5 rounded border border-[#E8E6DF]">
                          {camp.objective}
                        </span>
                      </div>
                      <div className="text-xs text-[#716F6A] mt-0.5">{camp.campaignName}</div>
                    </div>

                    {/* Numbers */}
                    <div className="flex items-center gap-6 text-xs">
                      <div>
                        <div className="text-[10px] text-[#9C9890] uppercase font-semibold">Inversión Diaria</div>
                        <div className="font-bold text-[#1F1E1D]">${camp.budgetDaily} MXN/día</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#9C9890] uppercase font-semibold">Leads Generados</div>
                        <div className="font-bold text-[#1F1E1D]">{camp.leadsGenerated} prospectos</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#9C9890] uppercase font-semibold">Costo por Lead (CPA)</div>
                        <div className={`font-black ${
                          camp.costPerLead <= camp.targetCpl ? "text-emerald-700" : "text-[#C15F3C]"
                        }`}>
                          ${camp.costPerLead.toFixed(2)} MXN
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-[#9C9890] uppercase font-semibold">Frecuencia</div>
                        <div className="font-bold text-[#1F1E1D]">
                          {camp.frequency}x
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Plain Language Explanation */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-1">
                      <div className="text-[10px] font-bold text-[#9C9890] uppercase tracking-wider">
                        1. ¿Qué detectó la IA?
                      </div>
                      <div className="text-xs font-bold text-[#1F1E1D] flex items-center gap-1.5 pt-0.5">
                        {isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />}
                        {isWarning && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />}
                        {isDanger && <XCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />}
                        <span>{camp.algorithmInsight.issue}</span>
                      </div>
                      <p className="text-[11px] text-[#716F6A] leading-relaxed pt-1">
                        {camp.algorithmInsight.metaAlgorithmContext}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-1">
                      <div className="text-[10px] font-bold text-[#9C9890] uppercase tracking-wider">
                        2. Recomendación de la Agencia
                      </div>
                      <div className="text-xs font-bold text-[#C15F3C] pt-0.5">
                        Estrategia Algorítmica Adaptativa
                      </div>
                      <p className="text-[11px] text-[#716F6A] leading-relaxed pt-1">
                        {camp.algorithmInsight.recommendation}
                      </p>
                    </div>

                    {/* Action Execution Button */}
                    <div className="p-4 rounded-xl bg-[#FBF1ED] border border-[#F3D6CB] flex flex-col justify-between space-y-3">
                      <div>
                        <div className="text-[10px] font-bold text-[#C15F3C] uppercase tracking-wider">
                          3. Impacto Estimado
                        </div>
                        <div className="text-xs font-bold text-[#1F1E1D] mt-1">
                          {camp.algorithmInsight.estimatedSaving || camp.algorithmInsight.estimatedImpact}
                        </div>
                      </div>

                      <button
                        onClick={() => handleApplyOptimization(camp.id, camp.algorithmInsight.actionType)}
                        disabled={optimizingId === camp.id}
                        className="w-full py-2.5 rounded-xl bg-[#D97757] hover:bg-[#C15F3C] text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                      >
                        {optimizingId === camp.id ? (
                          <span className="flex items-center gap-1.5">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            Aplicando en Meta...
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <Zap className="w-3.5 h-3.5" />
                            {camp.algorithmInsight.actionLabel}
                          </span>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
