"use client";

import React, { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  KanbanSquare,
  Plus,
  ChevronRight,
  Building,
  X,
  Zap,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useClientOptions } from "@/hooks/useClientOptions";

interface OpportunityItem {
  id: string;
  title: string;
  value: number;
  probability: number;
  status: string;
  stageId: string;
  isDemo?: boolean;
  client?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
  lead?: {
    id: string;
    name: string;
    phone?: string | null;
  } | null;
}

interface PipelineStageItem {
  id: string;
  name: string;
  order: number;
  color?: string | null;
  opportunities: OpportunityItem[];
}

interface PipelineStats {
  totalPipelineValue: number;
  totalWonValue: number;
  openDealsCount: number;
}

// Oportunidades realistas de demostración para presentaciones con clientes
const DEMO_OPPORTUNITIES: OpportunityItem[] = [
  {
    id: "demo-opp-1",
    title: "Campaña Preventa Inmobiliaria Q4",
    value: 24500,
    probability: 45,
    status: "open",
    stageId: "stage-0",
    isDemo: true,
    client: { id: "c1", name: "Grupo Alianza Constructora" },
  },
  {
    id: "demo-opp-2",
    title: "Retainer Anual E-Commerce Scaling",
    value: 14000,
    probability: 60,
    status: "open",
    stageId: "stage-1",
    isDemo: true,
    client: { id: "c2", name: "Kroma Brands Latam" },
  },
  {
    id: "demo-opp-3",
    title: "Auditoría Growth & Funnel Meta Ads",
    value: 6500,
    probability: 50,
    status: "open",
    stageId: "stage-1",
    isDemo: true,
    client: { id: "c3", name: "FinTech Soluciones" },
  },
  {
    id: "demo-opp-4",
    title: "Optimización Conversión Web SaaS",
    value: 9800,
    probability: 75,
    status: "open",
    stageId: "stage-2",
    isDemo: true,
    client: { id: "c4", name: "Nova Cloud Tech" },
  },
  {
    id: "demo-opp-5",
    title: "Cierre Expansión Retail B2B",
    value: 32000,
    probability: 85,
    status: "open",
    stageId: "stage-2",
    isDemo: true,
    client: { id: "c5", name: "MacroAlimentos Corp" },
  },
  {
    id: "demo-opp-6",
    title: "Contrato Anual Branding & Pauta Meta",
    value: 45000,
    probability: 100,
    status: "won",
    stageId: "stage-3",
    isDemo: true,
    client: { id: "c6", name: "AutoPremium Motors" },
  },
];

export default function PipelinePage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-semibold text-[#8C929D] flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
          <span>Cargando pipeline comercial...</span>
        </div>
      }
    >
      <PipelineContent />
    </Suspense>
  );
}

function PipelineContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const clients = useClientOptions();
  const activeClient = clientId && clientId !== "all" ? clients.find((c) => c.id === clientId) : null;

  const [rawStages, setRawStages] = useState<PipelineStageItem[]>([]);
  const [rawStats, setRawStats] = useState<PipelineStats>({
    totalPipelineValue: 0,
    totalWonValue: 0,
    openDealsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [dealForm, setDealForm] = useState({
    title: "",
    value: "3500",
    stageId: "",
    probability: "50",
  });

  const fetchPipeline = useCallback(async () => {
    try {
      setLoading(true);
      const query = clientId && clientId !== "all" ? `?clientId=${encodeURIComponent(clientId)}` : "";
      const res = await fetch(`/api/pipeline${query}`);
      const json = await res.json();
      if (json.success) {
        setRawStages(json.stages || []);
        setRawStats(json.stats || { totalPipelineValue: 0, totalWonValue: 0, openDealsCount: 0 });
        if (json.stages && json.stages.length > 0 && !dealForm.stageId) {
          setDealForm((prev) => ({ ...prev, stageId: json.stages[0].id }));
        }

        // Si la base está totalmente vacía de negocios en esta vista, activar demo por defecto
        const totalLiveDeals = (json.stages || []).reduce(
          (sum: number, s: PipelineStageItem) => sum + s.opportunities.length,
          0
        );
        if (totalLiveDeals === 0) {
          setIsDemoMode(true);
        }
      }
    } catch (e) {
      console.error("Error al obtener pipeline:", e);
    } finally {
      setLoading(false);
    }
  }, [clientId, dealForm.stageId]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

  // Si el modo demo está activo, fusionamos o poblamos los stages con datos de demostración
  const stages: PipelineStageItem[] = useMemo(() => {
    if (!isDemoMode || rawStages.length === 0) return rawStages;

    return rawStages.map((stage, idx) => {
      // Repartir oportunidades demo según el índice de la columna
      const assignedDemos = DEMO_OPPORTUNITIES.filter((demo) => {
        if (idx === 0) return demo.stageId === "stage-0";
        if (idx === 1) return demo.stageId === "stage-1";
        if (idx === 2) return demo.stageId === "stage-2";
        if (idx >= 3) return demo.stageId === "stage-3";
        return false;
      });

      return {
        ...stage,
        opportunities: [...stage.opportunities, ...assignedDemos],
      };
    });
  }, [isDemoMode, rawStages]);

  // Estadísticas calculadas dinámicamente
  const stats: PipelineStats = useMemo(() => {
    if (!isDemoMode) return rawStats;

    let total = rawStats.totalPipelineValue;
    let won = rawStats.totalWonValue;
    let count = rawStats.openDealsCount;

    DEMO_OPPORTUNITIES.forEach((opp) => {
      if (opp.status === "open") {
        total += opp.value;
        count += 1;
      } else if (opp.status === "won") {
        won += opp.value;
      }
    });

    return {
      totalPipelineValue: total,
      totalWonValue: won,
      openDealsCount: count,
    };
  }, [isDemoMode, rawStats]);

  const handleMoveStage = async (oppId: string, nextStageId: string, status?: string) => {
    if (oppId.startsWith("demo-")) {
      setFeedback({
        type: "success",
        text: "Oportunidad de demostración avanzada con éxito en el embudo.",
      });
      return;
    }

    try {
      const res = await fetch("/api/pipeline", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: oppId, stageId: nextStageId, status: status || "open" }),
      });
      const json = await res.json();
      if (json.success) {
        fetchPipeline();
      } else {
        setFeedback({ type: "error", text: json.error || "Error al actualizar etapa" });
      }
    } catch (e) {
      setFeedback({ type: "error", text: e instanceof Error ? e.message : "Error al actualizar la etapa" });
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const payload: Record<string, unknown> = { ...dealForm };
      if (clientId && clientId !== "all") {
        payload.clientId = clientId;
      }
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setIsCreateOpen(false);
        setDealForm({
          title: "",
          value: "3500",
          stageId: rawStages[0]?.id || "",
          probability: "50",
        });
        setFeedback({ type: "success", text: "Oportunidad registrada exitosamente en el pipeline." });
        fetchPipeline();
      } else {
        setFeedback({ type: "error", text: json.error || "No se pudo registrar la oportunidad" });
      }
    } catch (e) {
      setFeedback({ type: "error", text: e instanceof Error ? e.message : "Error inesperado" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header Orvion Capsule */}
      <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] p-6 shadow-orvion">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="orvion-badge-gold">
                <Sparkles className="w-3 h-3 text-amber-500" />
                <span>Embudo Comercial</span>
              </span>
              {activeClient && (
                <span className="orvion-badge-dark text-xs py-1 px-3">
                  <Building className="w-3 h-3 text-amber-400" />
                  <span>{activeClient.name}</span>
                </span>
              )}
              {isDemoMode && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/10 border border-amber-400/40 text-amber-600 dark:text-amber-400">
                  ✦ Modo Presentación Activo
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#121417] dark:text-white tracking-tight">
              Pipeline de Negocios y Cierres
            </h1>
            <p className="text-xs text-[#8C929D] font-medium max-w-2xl leading-relaxed">
              Monitoreo visual de negociaciones comerciales, probabilidad de conversión y valor proyectado por etapas.
            </p>
          </div>

          {/* Acciones y Métricas Resumen */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Toggle Modo Demo para Clientes */}
            <button
              type="button"
              onClick={() => setIsDemoMode(!isDemoMode)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold border transition-all flex items-center gap-2 cursor-pointer shadow-2xs ${
                isDemoMode
                  ? "bg-[#121417] text-white border-[#121417] dark:bg-amber-400 dark:text-[#121417] dark:border-amber-400"
                  : "bg-[#F8F9FA] dark:bg-[#1A1D24] text-[#667085] border-[#E2E5EB] dark:border-[#242A35] hover:text-[#121417]"
              }`}
              title="Alternar datos demo para presentación a clientes"
            >
              <Zap className={`w-3.5 h-3.5 ${isDemoMode ? "text-amber-400 dark:text-[#121417]" : "text-[#8C929D]"}`} />
              <span>{isDemoMode ? "Demo Activada" : "Modo Demo"}</span>
            </button>

            {/* Cápsula de Valor Total */}
            <div className="px-4 py-2 rounded-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#242A35] text-right hidden sm:block">
              <span className="text-[10px] uppercase font-bold text-[#8C929D] tracking-wider block">
                Valor Total Pipeline
              </span>
              <span className="text-sm font-black text-[#121417] dark:text-white">
                ${stats.totalPipelineValue.toLocaleString()} USD
              </span>
            </div>

            {/* Botón Refrescar */}
            <button
              onClick={fetchPipeline}
              aria-label="Actualizar datos del pipeline"
              className="p-2.5 rounded-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#242A35] text-[#8C929D] hover:text-[#121417] dark:hover:text-white transition-colors cursor-pointer"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-500" : ""}`} />
            </button>

            {/* Botón Nueva Oportunidad */}
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-5 py-2.5 rounded-full bg-[#121417] hover:bg-[#1E2229] dark:bg-white dark:hover:bg-[#F3F4F7] text-white dark:text-[#121417] text-xs font-bold flex items-center gap-2 shadow-orvion transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400 dark:text-[#121417]" />
              <span>Nueva Oportunidad</span>
            </button>
          </div>
        </div>
      </div>

      {/* Banner de Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-2xl border text-xs font-semibold flex items-center justify-between gap-3 shadow-2xs animate-fade-in-up ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300"
              : "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300"
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-bold hover:opacity-75 cursor-pointer px-2 py-1 rounded-lg"
          >
            ✕
          </button>
        </div>
      )}

      {/* Kanban Board Columns Grid */}
      <div className="flex gap-4 overflow-x-auto pb-6 pt-1 select-none scrollbar-thin">
        {stages.map((stage, stageIdx) => {
          const stageTotal = stage.opportunities.reduce(
            (acc: number, opp: OpportunityItem) => acc + (opp.value || 0),
            0
          );

          return (
            <div
              key={stage.id}
              className="w-80 flex-shrink-0 flex flex-col rounded-[26px] bg-white/70 dark:bg-[#121417]/80 backdrop-blur-md border border-[#E2E5EB] dark:border-[#1F242D] max-h-[78vh] shadow-orvion transition-all"
            >
              {/* Cabecera de la Columna */}
              <div className="p-4 border-b border-[#F2F4F7] dark:border-[#1F242D] bg-white dark:bg-[#16181F] rounded-t-[26px] flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full ring-2 ring-amber-400/20"
                      style={{ backgroundColor: stage.color || "#F59E0B" }}
                    />
                    <span className="font-black text-[#121417] dark:text-white text-xs tracking-tight">
                      {stage.name}
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-1">
                    ${stageTotal.toLocaleString()} USD
                  </div>
                </div>

                <span className="text-[10px] bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] text-[#121417] dark:text-white px-2.5 py-0.5 rounded-full font-extrabold shadow-2xs">
                  {stage.opportunities.length}
                </span>
              </div>

              {/* Lista de Negocios en la Columna */}
              <div className="p-3.5 flex-1 overflow-y-auto space-y-3">
                {stage.opportunities.length === 0 ? (
                  <div className="py-12 text-center text-[#8C929D] text-[11px] font-medium border border-dashed border-[#E2E5EB] dark:border-[#242A35] rounded-2xl bg-[#F8F9FA]/60 dark:bg-[#181B22]/40">
                    Sin negocios en esta etapa
                  </div>
                ) : (
                  stage.opportunities.map((opp) => (
                    <div
                      key={opp.id}
                      className="p-4 rounded-2xl bg-white dark:bg-[#181B22] border border-[#E2E5EB] dark:border-[#242A35] hover:border-amber-400/80 dark:hover:border-amber-400/80 hover:shadow-md transition-all space-y-3 shadow-2xs group"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-[#121417] dark:text-white text-xs leading-snug">
                          {opp.title}
                        </div>
                        {opp.isDemo && (
                          <span className="text-[9px] bg-amber-500/10 dark:bg-amber-400/15 text-amber-700 dark:text-amber-300 font-extrabold px-1.5 py-0.5 rounded-md border border-amber-300/40 shrink-0">
                            DEMO
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[#8C929D] font-medium flex items-center gap-1.5 truncate max-w-[150px]">
                          <Building className="w-3.5 h-3.5 text-[#8C929D] shrink-0" />
                          <span className="truncate">{opp.client?.name || opp.lead?.name || "Directo"}</span>
                        </span>
                        <span className="font-black text-[#121417] dark:text-white text-sm">
                          ${opp.value.toLocaleString()}
                        </span>
                      </div>

                      {/* Barra de Probabilidad */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[10px] text-[#8C929D] font-bold">
                          <span>Probabilidad</span>
                          <span>{opp.probability}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-[#F2F4F7] dark:bg-[#242A35] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(100, Math.max(5, opp.probability))}%` }}
                          />
                        </div>
                      </div>

                      {/* Acciones de Avance de Etapa */}
                      <div className="flex items-center justify-between pt-2.5 border-t border-[#F2F4F7] dark:border-[#1F242D] text-[11px]">
                        <span className="text-[10px] font-bold text-[#8C929D]">
                          {opp.status === "won" ? "Ganado" : "Abierto"}
                        </span>

                        <div className="flex items-center gap-1">
                          {stageIdx < stages.length - 1 && (
                            <button
                              onClick={() =>
                                handleMoveStage(
                                  opp.id,
                                  stages[stageIdx + 1].id,
                                  stageIdx + 1 === stages.length - 1 ? "won" : "open"
                                )
                              }
                              className="px-2.5 py-1 rounded-full bg-[#F8F9FA] hover:bg-[#121417] text-[#121417] hover:text-white dark:bg-[#242A35] dark:hover:bg-white dark:text-white dark:hover:text-[#121417] border border-[#E2E5EB] dark:border-[#2A2E37] transition-all font-bold flex items-center gap-1 text-[10px] cursor-pointer"
                            >
                              <span>Avanzar</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Registrar Oportunidad Orvion Capsule */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] rounded-[32px] w-full max-w-md overflow-hidden shadow-orvion">
            <div className="p-5 border-b border-[#F2F4F7] dark:border-[#1F242D] flex items-center justify-between bg-[#F8F9FA] dark:bg-[#181B22]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-400/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <KanbanSquare className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-black text-[#121417] dark:text-white tracking-tight">
                    Registrar Oportunidad
                  </h2>
                  <p className="text-[11px] text-[#8C929D] font-medium">Añade un negocio al embudo de ventas</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 rounded-full bg-white dark:bg-[#242A35] border border-[#E2E5EB] dark:border-[#2A2E37] flex items-center justify-center text-[#8C929D] hover:text-[#121417] dark:hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#121417] dark:text-white pl-1">
                  Título del Negocio *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Campaña Inmobiliaria Preventa 2026"
                  value={dealForm.title}
                  onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                  className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white placeholder:text-[#8C929D] focus:outline-hidden focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#121417] dark:text-white pl-1">
                    Valor Comercial ($ USD)
                  </label>
                  <input
                    type="number"
                    required
                    value={dealForm.value}
                    onChange={(e) => setDealForm({ ...dealForm, value: e.target.value })}
                    className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white placeholder:text-[#8C929D] focus:outline-hidden focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] transition-all"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-[#121417] dark:text-white pl-1">
                    Etapa Inicial
                  </label>
                  <select
                    value={dealForm.stageId}
                    onChange={(e) => setDealForm({ ...dealForm, stageId: e.target.value })}
                    className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] transition-all"
                  >
                    {rawStages.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#121417] dark:text-white pl-1">
                  Probabilidad de Cierre (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={dealForm.probability}
                  onChange={(e) => setDealForm({ ...dealForm, probability: e.target.value })}
                  className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] transition-all"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#242A35] text-[#667085] hover:text-[#121417] dark:hover:text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-full bg-[#121417] hover:bg-[#1E2229] dark:bg-white dark:hover:bg-[#F3F4F7] text-white dark:text-[#121417] text-xs font-bold shadow-orvion transition-all cursor-pointer disabled:opacity-60"
                >
                  {submitting ? "Creando..." : "Crear Oportunidad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
