"use client";

import React, { useState, useEffect } from "react";
import {
  KanbanSquare,
  Plus,
  DollarSign,
  ChevronRight,
  Building,
  CheckCircle,
  XCircle,
  X,
  RefreshCw,
} from "lucide-react";

export default function PipelinePage() {
  const [stages, setStages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalPipelineValue: 0, openDealsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form for new deal
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
      alert("Error al mover oportunidad: " + e.message);
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
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <KanbanSquare className="w-5 h-5 text-bunker-400" />
            Pipeline Comercial de Negocios
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Embudo visual por etapas. Monitorea probabilidad de cierre y valor proyectado de la agencia.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-gray-400 uppercase font-semibold">Valor Total en Pipeline</div>
            <div className="text-sm font-black text-amber-400">
              ${stats.totalPipelineValue.toLocaleString()} MXN
            </div>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-bunker-600 hover:bg-bunker-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-bunker-600/30 transition-all"
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
              className="w-72 flex-shrink-0 flex flex-col rounded-2xl bg-[#090d16] border border-[#19243a] max-h-[75vh]"
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-[#19243a] bg-[#0c1220] rounded-t-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: stage.color || "#586ff6" }}
                    ></span>
                    <span className="font-bold text-white text-xs">{stage.name}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 mt-0.5 font-medium">
                    ${stageTotal.toLocaleString()} MXN
                  </div>
                </div>
                <span className="text-[10px] bg-[#141e33] text-gray-300 px-2 py-0.5 rounded-full font-bold">
                  {stage.opportunities.length}
                </span>
              </div>

              {/* Column Opportunities List */}
              <div className="p-3 flex-1 overflow-y-auto space-y-3">
                {stage.opportunities.length === 0 ? (
                  <div className="py-8 text-center text-gray-600 text-[11px] border border-dashed border-[#1a2336] rounded-xl">
                    Sin negocios en esta etapa
                  </div>
                ) : (
                  stage.opportunities.map((opp: any) => (
                    <div
                      key={opp.id}
                      className="p-3.5 rounded-xl bg-[#0e1526] border border-[#1e2a44] hover:border-[#2d3e63] transition-all space-y-2.5 shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-white text-xs leading-snug">{opp.title}</div>
                        {opp.isDemo && (
                          <span className="text-[8px] bg-amber-500/10 text-amber-400 font-semibold px-1 py-0.2 rounded border border-amber-500/20">
                            DEMO
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-gray-400 flex items-center gap-1 truncate max-w-[140px]">
                          <Building className="w-3 h-3 text-gray-500 flex-shrink-0" />
                          <span>{opp.client?.name || opp.lead?.name || "Oportunidad directa"}</span>
                        </span>
                        <span className="font-extrabold text-white">
                          ${opp.value.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#172238] text-[10px]">
                        <span className="text-gray-500">Probabilidad: {opp.probability}%</span>

                        {/* Move Forward / Change Stage Button */}
                        <div className="flex items-center gap-1">
                          {stageIdx < stages.length - 1 && (
                            <button
                              onClick={() => handleMoveStage(opp.id, stages[stageIdx + 1].id, stageIdx + 1 === 4 ? "won" : "open")}
                              className="px-2 py-1 rounded bg-bunker-600/30 hover:bg-bunker-600 text-bunker-300 hover:text-white transition-all font-semibold flex items-center gap-0.5"
                              title={`Avanzar a ${stages[stageIdx + 1]?.name}`}
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

      {/* Create Deal Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0b101d] border border-[#23314d] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#1c263c] flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <KanbanSquare className="w-4 h-4 text-bunker-400" />
                Registrar Oportunidad Comercial
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Título del Negocio *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Campaña Inmobiliaria Preventa 2026"
                  value={dealForm.title}
                  onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Valor Comercial ($ MXN)</label>
                  <input
                    type="number"
                    required
                    value={dealForm.value}
                    onChange={(e) => setDealForm({ ...dealForm, value: e.target.value })}
                    className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Etapa Inicial</label>
                  <select
                    value={dealForm.stageId}
                    onChange={(e) => setDealForm({ ...dealForm, stageId: e.target.value })}
                    className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
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
                <label className="block text-xs font-medium text-gray-300 mb-1">Probabilidad de Cierre (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={dealForm.probability}
                  onChange={(e) => setDealForm({ ...dealForm, probability: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-2 rounded-lg bg-[#141d30] border border-[#23314d] text-gray-300 hover:text-white text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-bunker-600 hover:bg-bunker-500 text-white text-xs font-semibold"
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
