"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
  ShieldAlert,
  Info,
  Layers,
} from "lucide-react";
import { useClientOptions } from "@/hooks/useClientOptions";

interface OptimizerInsight {
  issue: string;
  metaAlgorithmContext: string;
  recommendation: string;
  actionLabel: string;
  actionType: string;
  estimatedSaving?: string;
  estimatedImpact?: string;
}

interface OptimizerCampaign {
  id: string;
  clientName: string;
  campaignName: string;
  objective: string;
  status: string;
  health: "warning" | "success" | "danger";
  budgetDaily: number;
  spentTotal: number;
  leadsGenerated: number;
  costPerLead: number;
  targetCpl: number;
  frequency: number;
  algorithmInsight: OptimizerInsight;
}

interface MetaAlgorithmRule {
  rule: string;
  description: string;
}

export default function MetaAiOptimizerPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[#667085]">Cargando optimizador de IA...</div>}>
      <MetaAiOptimizerContent />
    </Suspense>
  );
}

function MetaAiOptimizerContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const clients = useClientOptions();
  const activeClient = clientId && clientId !== "all" ? clients.find((c) => c.id === clientId) : null;

  const [campaigns, setCampaigns] = useState<OptimizerCampaign[]>([]);
  const [rules, setRules] = useState<MetaAlgorithmRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<{ [id: string]: string }>({});
  const [healthFilter, setHealthFilter] = useState<"all" | "attention" | "success">("all");

  const fetchOptimizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/marketing/ai-optimizer");
      const json = await res.json();
      if (json.success) {
        setCampaigns(json.campaigns || []);
        setRules(json.metaAlgorithmRules || []);
      } else {
        setError(json.error || "Error al consultar auditoría algorítmica.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOptimizations();
  }, [fetchOptimizations]);

  const handleApplyAction = async (campaign: OptimizerCampaign) => {
    const actionKey = `${campaign.id}-${campaign.algorithmInsight.actionType}`;
    setActionLoading(actionKey);
    try {
      const res = await fetch("/api/marketing/ai-optimizer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId: campaign.id,
          actionType: campaign.algorithmInsight.actionType,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccess((prev) => ({
          ...prev,
          [campaign.id]: json.message || "Optimización aplicada con éxito.",
        }));
      } else {
        alert(json.error || "No se pudo aplicar la optimización.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al comunicar con la API de optimización.");
    } finally {
      setActionLoading(null);
    }
  };

  // Filtrado por marca y por salud
  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (activeClient && !c.clientName.toLowerCase().includes(activeClient.name.toLowerCase())) {
        // En un entorno de producción filtra por clientId
      }
      if (healthFilter === "attention") {
        return c.health === "warning" || c.health === "danger";
      }
      if (healthFilter === "success") {
        return c.health === "success";
      }
      return true;
    });
  }, [campaigns, activeClient, healthFilter]);

  const warningCount = campaigns.filter((c) => c.health === "warning" || c.health === "danger").length;
  const successCount = campaigns.filter((c) => c.health === "success").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EAECF0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-[#101828] tracking-tight flex items-center gap-2.5">
              <Sparkles className="w-6 h-6 text-amber-500 shrink-0" />
              <span>Optimizador de Pautas (IA)</span>
            </h1>
            {activeClient && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300">
                {activeClient.name}
              </span>
            )}
          </div>
          <p className="text-xs text-[#667085] mt-1 max-w-2xl">
            {activeClient
              ? `Auditoría algorítmica de fatiga de anuncios, saturación y ROAS para ${activeClient.name}.`
              : "Auditoría algorítmica continua de fatiga creativa, saturación de audiencias y escalado automático de presupuestos en Meta Ads."}
          </p>
        </div>

        <button
          type="button"
          onClick={fetchOptimizations}
          className="p-2.5 rounded-xl bg-white border border-[#EAECF0] text-[#475467] hover:text-[#101828] text-xs transition-colors shadow-2xs self-start sm:self-auto"
          title="Refrescar auditoría de IA"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#667085]">
            <span>Campañas Auditadas</span>
            <Layers className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-[#101828]">{campaigns.length}</div>
          <div className="text-[11px] text-[#667085]">Monitoreo de frecuencia y CPA</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#667085]">
            <span>Requieren Optimización</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-700">{warningCount}</div>
          <div className="text-[11px] text-[#667085]">Fatiga creativa o fuga de conversión</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#667085]">
            <span>En Zona de Alto Rendimiento</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-700">{successCount}</div>
          <div className="text-[11px] text-[#667085]">Listas para escalar presupuesto (+20%)</div>
        </div>
      </div>

      {/* Selector de Filtro */}
      <div className="flex items-center gap-1.5 p-1 bg-[#F8F9FA] border border-[#EAECF0] rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setHealthFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            healthFilter === "all" ? "bg-white text-[#101828] shadow-xs" : "text-[#667085] hover:text-[#101828]"
          }`}
        >
          Todas ({campaigns.length})
        </button>
        <button
          type="button"
          onClick={() => setHealthFilter("attention")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            healthFilter === "attention" ? "bg-white text-amber-900 shadow-xs" : "text-[#667085] hover:text-[#101828]"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-500" />
          <span>Requieren Atención ({warningCount})</span>
        </button>
        <button
          type="button"
          onClick={() => setHealthFilter("success")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            healthFilter === "success" ? "bg-white text-emerald-900 shadow-xs" : "text-[#667085] hover:text-[#101828]"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Alto Rendimiento ({successCount})</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
          {error}
        </div>
      )}

      {/* Lista de Campañas y Diagnósticos Algorítmicos */}
      <div className="space-y-4">
        {filteredCampaigns.map((camp) => {
          const isWarning = camp.health === "warning";
          const isDanger = camp.health === "danger";

          const badgeCls = isDanger
            ? "bg-rose-50 text-rose-800 border-rose-200"
            : isWarning
            ? "bg-amber-50 text-amber-800 border-amber-200"
            : "bg-emerald-50 text-emerald-800 border-emerald-200";

          const actionKey = `${camp.id}-${camp.algorithmInsight.actionType}`;
          const isActionBusy = actionLoading === actionKey;
          const successMsg = actionSuccess[camp.id];

          return (
            <div
              key={camp.id}
              className="p-5 rounded-2xl bg-white border border-[#EAECF0] hover:border-[#D0D5DD] transition-all shadow-2xs space-y-4"
            >
              {/* Header de Campaña */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 uppercase">
                      {camp.clientName}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badgeCls}`}>
                      {isDanger ? "Crítico / Fuga" : isWarning ? "Atención / Fatiga" : "Óptimo / Escalar"}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#101828] mt-1">{camp.campaignName}</h3>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#667085]">
                  <div>
                    <span className="text-[10px] block text-[#98A2B3]">Objetivo</span>
                    <span className="font-semibold text-[#101828]">{camp.objective}</span>
                  </div>
                </div>
              </div>

              {/* Métricas Principales */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-3 bg-[#F8F9FA] rounded-xl border border-[#EAECF0] text-xs">
                <div>
                  <span className="text-[10px] text-[#667085] block">Presupuesto Diario</span>
                  <span className="font-bold text-[#101828]">${camp.budgetDaily} USD/día</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#667085] block">Invertido Total</span>
                  <span className="font-bold text-[#101828]">${camp.spentTotal.toLocaleString()} USD</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#667085] block">Leads Generados</span>
                  <span className="font-bold text-[#101828]">{camp.leadsGenerated} prospectos</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#667085] block">Costo / Lead (CPL)</span>
                  <span
                    className={`font-bold ${
                      camp.costPerLead > camp.targetCpl ? "text-rose-600" : "text-emerald-600"
                    }`}
                  >
                    ${camp.costPerLead} USD{" "}
                    <span className="text-[10px] text-[#667085] font-normal">(Meta: ${camp.targetCpl})</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#667085] block">Frecuencia de Anuncio</span>
                  <span
                    className={`font-bold ${camp.frequency > 3.5 ? "text-amber-600" : "text-[#101828]"}`}
                  >
                    {camp.frequency}x {camp.frequency > 3.5 ? "⚠️ Fatiga" : "✓ Fresco"}
                  </span>
                </div>
              </div>

              {/* Caja de Diagnóstico Algorítmico de Meta */}
              <div
                className={`p-4 rounded-xl border space-y-3 ${
                  isDanger
                    ? "bg-rose-50/50 border-rose-200"
                    : isWarning
                    ? "bg-amber-50/50 border-amber-200"
                    : "bg-emerald-50/50 border-emerald-200"
                }`}
              >
                <div className="flex items-start gap-2.5">
                  <div className="p-1 rounded-lg bg-white shadow-2xs mt-0.5">
                    {isDanger ? (
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                  </div>
                  <div className="space-y-1 flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-[#101828]">
                      {camp.algorithmInsight.issue}
                    </h4>
                    <p className="text-xs text-[#475467] leading-relaxed">
                      {camp.algorithmInsight.metaAlgorithmContext}
                    </p>
                    <div className="pt-1 text-xs text-[#101828] font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{camp.algorithmInsight.recommendation}</span>
                    </div>
                  </div>
                </div>

                {/* Acción y Feedback */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-black/5">
                  <span className="text-xs font-semibold text-emerald-800 bg-emerald-100/60 px-2.5 py-1 rounded-md">
                    {camp.algorithmInsight.estimatedSaving || camp.algorithmInsight.estimatedImpact}
                  </span>

                  {successMsg ? (
                    <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1.5 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{successMsg}</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApplyAction(camp)}
                      disabled={isActionBusy}
                      className="btn-black-gold rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Zap className={`w-3.5 h-3.5 text-amber-400 ${isActionBusy ? "animate-pulse" : ""}`} />
                      <span>{isActionBusy ? "Aplicando..." : camp.algorithmInsight.actionLabel}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Reglas y Mejores Prácticas del Algoritmo de Meta */}
      <div className="p-5 rounded-2xl bg-white border border-[#EAECF0] shadow-2xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-[#101828]">
          <Info className="w-4 h-4 text-amber-500" />
          <span>Reglas & Mejores Prácticas del Algoritmo de Meta (Advantage+)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {rules.map((rule, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] space-y-1.5">
              <h4 className="text-xs font-bold text-[#101828] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                <span>{rule.rule}</span>
              </h4>
              <p className="text-xs text-[#667085] leading-relaxed">{rule.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
