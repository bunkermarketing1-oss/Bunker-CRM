"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  ArrowRight,
  Shield,
  RefreshCw,
  Sliders,
  DollarSign,
  Play,
  RotateCcw,
  Flame,
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
      <div className="p-6 rounded-2xl bg-gradient-to-r from-bunker-950 via-[#0d1424] to-[#121b2f] border border-bunker-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-bunker-600/15 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-bunker-500/20 text-bunker-300 border border-bunker-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-bunker-400" />
                MÓDULO AGÉNTICO BUNKER AI
              </span>
              <span className="text-gray-400 text-xs">| Adaptación Algorítmica Meta Ads</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Optimizador Autónomo de Pautas (Meta Ads)
            </h1>
            <p className="text-xs text-gray-300 mt-1 max-w-2xl leading-relaxed">
              La agencia gestiona internamente las campañas de sus clientes. Este agente de IA audita los algoritmos cambiantes de Meta (Advantage+, subastas dinámicas y fatiga publicitaria) para proteger el presupuesto de cada cuenta.
            </p>
          </div>

          <button
            onClick={fetchOptimizer}
            className="px-4 py-2.5 rounded-xl bg-[#141d30] border border-[#23314d] text-gray-200 hover:text-white text-xs font-semibold flex items-center gap-2 self-start md:self-auto shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Auditar Algoritmos</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 text-xs font-bold flex items-center gap-2.5 shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Meta Algorithm 2026 Core Pillars (Education for non-technical clients) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {data?.metaAlgorithmRules?.map((rule: any, i: number) => (
          <div key={i} className="p-4 rounded-xl bg-[#090d16] border border-[#19243a] space-y-1.5">
            <div className="flex items-center gap-2 text-white font-bold text-xs">
              <Zap className="w-3.5 h-3.5 text-bunker-400" />
              <span>{rule.rule}</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              {rule.description}
            </p>
          </div>
        ))}
      </div>

      {/* Campaigns Semaphore & Action Cards ("For Dummies" Interface) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-bunker-400" />
            Diagnóstico de Pautas Activas por Cliente
          </h2>
          <span className="text-xs text-gray-400">
            Semáforo de salud publicitaria y acciones con 1 clic
          </span>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="py-12 text-center text-gray-500 text-xs">Analizando campañas con Bunker AI...</div>
          ) : (
            data?.campaigns?.map((camp: any) => {
              const isWarning = camp.health === "warning";
              const isDanger = camp.health === "danger";
              const isSuccess = camp.health === "success";

              return (
                <div
                  key={camp.id}
                  className={`p-6 rounded-2xl bg-[#0c111e] border transition-all shadow-xl space-y-5 ${
                    isSuccess ? "border-emerald-500/30 hover:border-emerald-500/50" :
                    isWarning ? "border-amber-500/30 hover:border-amber-500/50" :
                    "border-red-500/30 hover:border-red-500/50"
                  }`}
                >
                  {/* Top Bar: Client & Metrics */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-[#1b2538]">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full animate-pulse ${
                          isSuccess ? "bg-emerald-400" : isWarning ? "bg-amber-400" : "bg-red-400"
                        }`}></span>
                        <h3 className="font-extrabold text-white text-base">{camp.clientName}</h3>
                        <span className="text-[10px] bg-[#162033] text-gray-300 font-semibold px-2 py-0.5 rounded">
                          {camp.objective}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{camp.campaignName}</div>
                    </div>

                    {/* Quick Numbers */}
                    <div className="flex items-center gap-6 text-xs">
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase font-semibold">Inversión Diaria</div>
                        <div className="font-bold text-white">${camp.budgetDaily} MXN/día</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase font-semibold">Leads Generados</div>
                        <div className="font-bold text-white">{camp.leadsGenerated} prospectos</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase font-semibold">Costo por Lead (CPA)</div>
                        <div className={`font-black ${
                          camp.costPerLead <= camp.targetCpl ? "text-emerald-400" : "text-amber-400"
                        }`}>
                          ${camp.costPerLead.toFixed(2)} MXN
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase font-semibold">Frecuencia</div>
                        <div className={`font-bold ${camp.frequency > 3.5 ? "text-amber-400" : "text-gray-300"}`}>
                          {camp.frequency}x
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Explanation in Plain Spanish ("For Dummies") */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="p-4 rounded-xl bg-[#080d16] border border-[#19243a] space-y-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        1. ¿Qué detectó la IA?
                      </div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5 pt-0.5">
                        {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
                        {isWarning && <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />}
                        {isDanger && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />}
                        <span>{camp.algorithmInsight.issue}</span>
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed pt-1">
                        {camp.algorithmInsight.metaAlgorithmContext}
                      </p>
                    </div>

                    <div className="p-4 rounded-xl bg-[#080d16] border border-[#19243a] space-y-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        2. Recomendación de la Agencia
                      </div>
                      <div className="text-xs font-bold text-bunker-300 pt-0.5">
                        Estrategia Algorítmica Adaptativa
                      </div>
                      <p className="text-[11px] text-gray-300 leading-relaxed pt-1">
                        {camp.algorithmInsight.recommendation}
                      </p>
                    </div>

                    {/* Action Execution Button */}
                    <div className="p-4 rounded-xl bg-gradient-to-br from-[#0c1220] to-[#12192b] border border-[#1e2a44] flex flex-col justify-between space-y-3">
                      <div>
                        <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                          3. Impacto Estimado
                        </div>
                        <div className="text-xs font-black text-white mt-1">
                          {camp.algorithmInsight.estimatedSaving || camp.algorithmInsight.estimatedImpact}
                        </div>
                      </div>

                      <button
                        onClick={() => handleApplyOptimization(camp.id, camp.algorithmInsight.actionType)}
                        disabled={optimizingId === camp.id}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all ${
                          isSuccess
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
                            : isWarning
                            ? "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/20"
                            : "bg-bunker-600 hover:bg-bunker-500 text-white shadow-bunker-600/20"
                        }`}
                      >
                        {optimizingId === camp.id ? (
                          <span className="flex items-center gap-1.5">
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
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
