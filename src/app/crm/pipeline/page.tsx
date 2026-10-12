"use client";

import React, { useState, useEffect } from "react";
import {
  KanbanSquare,
  Plus,
  ChevronRight,
  Building,
  X,
} from "lucide-react";

export default function PipelinePage() {
  const [stages, setStages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalPipelineValue: 0, openDealsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dealForm, setDealForm] = useState({
    title: "",
    value: "50000",
    stageId: "",
    probability: "50",
  });

  const fetchPipeline = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pipeline");
      const json = await res.json();
      if (json.success) {
        setStages(json.stages);
        setStats(json.stats);
        if (json.stages.length > 0 && !dealForm.stageId) {
          setDealForm((prev) => ({ ...prev, stageId: json.stages[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPipeline();
  }, []);

  const handleMoveStage = async (oppId: string, nextStageId: string, status?: string) => {
    try {
      const res = await fetch("/api/pipeline", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: oppId, stageId: nextStageId, status: status || "open" }),
      });
      const json = await res.json();
      if (json.success) {
        fetchPipeline();
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dealForm),
      });
      const json = await res.json();
      if (json.success) {
        setIsCreateOpen(false);
        setDealForm({
          title: "",
          value: "50000",
          stageId: stages[0]?.id || "",
          probability: "50",
        });
        fetchPipeline();
      } else {
        alert(json.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E8E6DF]">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1F1E1D] tracking-tight">
            Pipeline Comercial de Negocios
          </h1>
          <p className="text-xs text-[#716F6A] mt-1 max-w-xl">
            Embudo visual por etapas. Monitorea probabilidad de cierre y valor proyectado de la agencia.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-[#9C9890] uppercase font-semibold">Valor Total</div>
            <div className="text-sm font-bold text-[#C15F3C]">
              ${stats.totalPipelineValue.toLocaleString()} MXN
            </div>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#D97757] hover:bg-[#C15F3C] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Oportunidad</span>
          </button>
        </div>
      </div>

      {/* Kanban Board Columns Grid */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-1 select-none">
        {stages.map((stage, stageIdx) => {
          const stageTotal = stage.opportunities.reduce((acc: number, opp: any) => acc + (opp.value || 0), 0);

          return (
            <div
              key={stage.id}
              className="w-72 flex-shrink-0 flex flex-col rounded-2xl bg-[#FAF9F5] border border-[#E8E6DF] max-h-[75vh]"
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-[#E8E6DF] bg-[#FFFFFF] rounded-t-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: stage.color || "#D97757" }}
                    ></span>
                    <span className="font-semibold text-[#1F1E1D] text-xs">{stage.name}</span>
                  </div>
                  <div className="text-[10px] text-[#716F6A] mt-0.5">
                    ${stageTotal.toLocaleString()} MXN
                  </div>
                </div>
                <span className="text-[10px] bg-[#FAF9F5] border border-[#E8E6DF] text-[#716F6A] px-2 py-0.5 rounded-full font-bold">
                  {stage.opportunities.length}
                </span>
              </div>

              {/* Column Opportunities */}
              <div className="p-3 flex-1 overflow-y-auto space-y-2.5">
                {stage.opportunities.length === 0 ? (
                  <div className="py-8 text-center text-[#9C9890] text-[11px] border border-dashed border-[#E8E6DF] rounded-xl bg-[#FFFFFF]">
                    Sin negocios
                  </div>
                ) : (
                  stage.opportunities.map((opp: any) => (
                    <div
                      key={opp.id}
                      className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E8E6DF] hover:border-[#DDD9CF] transition-all space-y-2 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-[#1F1E1D] text-xs leading-snug">{opp.title}</div>
                        {opp.isDemo && (
                          <span className="text-[8px] bg-[#FBF1ED] text-[#C15F3C] font-semibold px-1 py-0.2 rounded border border-[#F3D6CB]">
                            DEMO
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#716F6A] flex items-center gap-1 truncate max-w-[140px]">
                          <Building className="w-3 h-3 text-[#9C9890] flex-shrink-0" />
                          <span>{opp.client?.name || opp.lead?.name || "Directo"}</span>
                        </span>
                        <span className="font-bold text-[#1F1E1D]">
                          ${opp.value.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#F0EEE6] text-[10px]">
                        <span className="text-[#9C9890]">{opp.probability}% prob.</span>

                        <div className="flex items-center gap-1">
                          {stageIdx < stages.length - 1 && (
                            <button
                              onClick={() => handleMoveStage(opp.id, stages[stageIdx + 1].id, stageIdx + 1 === 4 ? "won" : "open")}
                              className="px-2 py-0.5 rounded-md bg-[#FAF9F5] hover:bg-[#FBF1ED] text-[#C15F3C] border border-[#E8E6DF] transition-all font-semibold flex items-center gap-0.5"
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

      {/* Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-[#FFFFFF] border border-[#E8E6DF] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#E8E6DF] flex items-center justify-between bg-[#FAF9F5]">
              <h2 className="text-sm font-serif font-bold text-[#1F1E1D] flex items-center gap-2">
                <KanbanSquare className="w-4 h-4 text-[#D97757]" />
                Registrar Oportunidad
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-[#716F6A] hover:text-[#1F1E1D]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Título del Negocio *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Campaña Inmobiliaria Preventa 2026"
                  value={dealForm.title}
                  onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Valor Comercial ($ MXN)</label>
                  <input
                    type="number"
                    required
                    value={dealForm.value}
                    onChange={(e) => setDealForm({ ...dealForm, value: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Etapa Inicial</label>
                  <select
                    value={dealForm.stageId}
                    onChange={(e) => setDealForm({ ...dealForm, stageId: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  >
                    {stages.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Probabilidad de Cierre (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={dealForm.probability}
                  onChange={(e) => setDealForm({ ...dealForm, probability: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-[#716F6A] hover:text-[#1F1E1D] text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-xl bg-[#D97757] hover:bg-[#C15F3C] text-white text-xs font-semibold shadow-sm"
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
