"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  KanbanSquare,
  Plus,
  ChevronRight,
  Building,
  X,
} from "lucide-react";
import { useClientOptions } from "@/hooks/useClientOptions";

export default function PipelinePage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[#667085]">Cargando pipeline...</div>}>
      <PipelineContent />
    </Suspense>
  );
}

function PipelineContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const clients = useClientOptions();
  const activeClient = clientId && clientId !== "all" ? clients.find((c) => c.id === clientId) : null;

  const [stages, setStages] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({ totalPipelineValue: 0, openDealsCount: 0 });
  const [loading, setLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [dealForm, setDealForm] = useState({
    title: "",
    value: "3000",
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
  }, [clientId, dealForm.stageId]);

  useEffect(() => {
    fetchPipeline();
  }, [fetchPipeline]);

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
      const payload: Record<string, any> = { ...dealForm };
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
          value: "3000",
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
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#EAECF0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-semibold text-[#101828] tracking-tight">
              Pipeline Comercial de Negocios
            </h1>
            {activeClient && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300">
                {activeClient.name}
              </span>
            )}
          </div>
          <p className="text-xs text-[#475467] mt-1 max-w-xl">
            Embudo visual por etapas. Monitorea probabilidad de cierre y valor proyectado {activeClient ? `de ${activeClient.name}` : "de la agencia"}.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-[#9C9890] uppercase font-semibold">Valor Total</div>
            <div className="text-sm font-bold text-[#C15F3C]">
              ${stats.totalPipelineValue.toLocaleString()} USD
            </div>
          </div>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn-black-gold rounded-2xl px-4 py-2 text-xs font-semibold flex items-center gap-2"
          >
            <Plus className="w-4 h-4 text-amber-400" />
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
              className="w-72 flex-shrink-0 flex flex-col rounded-2xl bg-[#F8F9FA] border border-[#EAECF0] max-h-[75vh]"
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-[#EAECF0] bg-[#FFFFFF] rounded-t-2xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: stage.color || "#F59E0B" }}
                    ></span>
                    <span className="font-semibold text-[#101828] text-xs">{stage.name}</span>
                  </div>
                  <div className="text-[10px] text-[#475467] mt-0.5">
                    ${stageTotal.toLocaleString()} USD
                  </div>
                </div>
                <span className="text-[10px] bg-[#F8F9FA] border border-[#EAECF0] text-[#475467] px-2 py-0.5 rounded-full font-bold">
                  {stage.opportunities.length}
                </span>
              </div>

              {/* Column Opportunities */}
              <div className="p-3 flex-1 overflow-y-auto space-y-2.5">
                {stage.opportunities.length === 0 ? (
                  <div className="py-8 text-center text-[#9C9890] text-[11px] border border-dashed border-[#EAECF0] rounded-xl bg-[#FFFFFF]">
                    Sin negocios
                  </div>
                ) : (
                  stage.opportunities.map((opp: any) => (
                    <div
                      key={opp.id}
                      className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#EAECF0] hover:border-[#DDD9CF] transition-all space-y-2 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-semibold text-[#101828] text-xs leading-snug">{opp.title}</div>
                        {opp.isDemo && (
                          <span className="text-[8px] bg-[#FBF1ED] text-[#C15F3C] font-semibold px-1 py-0.2 rounded border border-[#F3D6CB]">
                            DEMO
                          </span>
                        )}
                      </div>

                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#475467] flex items-center gap-1 truncate max-w-[140px]">
                          <Building className="w-3 h-3 text-[#9C9890] flex-shrink-0" />
                          <span>{opp.client?.name || opp.lead?.name || "Directo"}</span>
                        </span>
                        <span className="font-bold text-[#101828]">
                          ${opp.value.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#F0EEE6] text-[10px]">
                        <span className="text-[#9C9890]">{opp.probability}% prob.</span>

                        <div className="flex items-center gap-1">
                          {stageIdx < stages.length - 1 && (
                            <button
                              onClick={() => handleMoveStage(opp.id, stages[stageIdx + 1].id, stageIdx + 1 === 4 ? "won" : "open")}
                              className="px-2 py-0.5 rounded-md bg-[#F8F9FA] hover:bg-[#FBF1ED] text-[#C15F3C] border border-[#EAECF0] transition-all font-semibold flex items-center gap-0.5"
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
          <div className="bg-[#FFFFFF] border border-[#EAECF0] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#EAECF0] flex items-center justify-between bg-[#F8F9FA]">
              <h2 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
                <KanbanSquare className="w-4 h-4 text-amber-500" />
                Registrar Oportunidad
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-[#475467] hover:text-[#101828]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeal} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#101828] mb-1">Título del Negocio *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Campaña Inmobiliaria Preventa 2026"
                  value={dealForm.title}
                  onChange={(e) => setDealForm({ ...dealForm, title: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Valor Comercial ($ USD)</label>
                  <input
                    type="number"
                    required
                    value={dealForm.value}
                    onChange={(e) => setDealForm({ ...dealForm, value: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Etapa Inicial</label>
                  <select
                    value={dealForm.stageId}
                    onChange={(e) => setDealForm({ ...dealForm, stageId: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
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
                <label className="block text-xs font-medium text-[#101828] mb-1">Probabilidad de Cierre (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={dealForm.probability}
                  onChange={(e) => setDealForm({ ...dealForm, probability: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] text-[#475467] hover:text-[#101828] text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-black-gold rounded-xl px-4 py-1.5 text-xs font-semibold"
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
