"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useClientOptions } from "@/hooks/useClientOptions";
import EmptyState from "@/components/ui/EmptyState";

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
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-[#8C929D] font-mono animate-pulse">
          Cargando auditor algorítmico de IA...
        </div>
      }
    >
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
  const [actionError, setActionError] = useState<{ [id: string]: string }>({});
  const [healthFilter, setHealthFilter] = useState<"all" | "attention" | "success">("all");

  const fetchOptimizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url =
        clientId && clientId !== "all"
          ? `/api/marketing/ai-optimizer?clientId=${encodeURIComponent(clientId)}`
          : "/api/marketing/ai-optimizer";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setCampaigns(json.campaigns || []);
        setRules(json.metaAlgorithmRules || []);
      } else {
        setError(json.error || "Aviso al consultar auditoría algorítmica del servidor.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchOptimizations();
  }, [fetchOptimizations]);

  const filteredCampaigns = useMemo(() => {
    if (healthFilter === "all") return campaigns;
    if (healthFilter === "attention") {
      return campaigns.filter((c) => c.health === "warning" || c.health === "danger");
    }
    return campaigns.filter((c) => c.health === "success");
  }, [campaigns, healthFilter]);

  const warningCount = campaigns.filter((c) => c.health === "warning" || c.health === "danger").length;
  const successCount = campaigns.filter((c) => c.health === "success").length;

  const handleApplyAction = async (campaign: OptimizerCampaign) => {
    const actionKey = `${campaign.id}-${campaign.algorithmInsight.actionType}`;
    setActionLoading(actionKey);
    setActionError((prev) => ({ ...prev, [campaign.id]: "" }));

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
        setActionSuccess((prev) => ({ ...prev, [campaign.id]: json.message || "Acción algorítmica aplicada con éxito." }));
        fetchOptimizations();
      } else {
        setActionError((prev) => ({ ...prev, [campaign.id]: json.error || "No se pudo ejecutar la acción." }));
      }
    } catch (e) {
      setActionError((prev) => ({
        ...prev,
        [campaign.id]: e instanceof Error ? e.message : "Error inesperado al conectar con el servidor.",
      }));
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabecera: título y una línea de contexto */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1.5">
          <h1 className="text-3xl font-extrabold text-[#121417] dark:text-white tracking-tight leading-tight flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-amber-400 shrink-0" />
            <span>Optimizador de Meta Ads</span>
          </h1>
          <p className="text-xs text-[#8C929D] font-medium">{activeClient ? activeClient.name : "Todas las marcas"}</p>
        </div>

        <button
          type="button"
          onClick={fetchOptimizations}
          className="w-10 h-10 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] flex items-center justify-center text-[#121417] dark:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] shadow-orvion transition-all cursor-pointer"
          title="Refrescar auditoría"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
        </button>
      </div>

      {/* Filtros de estado */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {(
          [
            { key: "all", label: "Todas", count: campaigns.length },
            { key: "attention", label: "Requieren atención", count: warningCount },
            { key: "success", label: "Alto rendimiento", count: successCount },
          ] as const
        ).map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setHealthFilter(key)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 shadow-orvion cursor-pointer ${
              healthFilter === key
                ? "bg-[#121417] text-white dark:bg-amber-400 dark:text-[#121417]"
                : "bg-white dark:bg-[#121417] text-[#8C929D] hover:text-[#121417] dark:hover:text-white border border-[#E2E5EB] dark:border-[#1F242D]"
            }`}
          >
            {label} ({count})
          </button>
        ))}
      </div>

      {error && (
        <div className="p-4 rounded-[22px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-800 dark:text-red-300 shadow-orvion">
          {error}
        </div>
      )}

      {/* Lista de Campañas y Diagnósticos Algorítmicos */}
      <div className="space-y-4">
        {!loading && !error && filteredCampaigns.length === 0 && (
          <div className="rounded-[28px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
            <EmptyState
              icon={Sparkles}
              title="Sin campañas para auditar"
              description={
                campaigns.length === 0
                  ? "Cuando existan campañas activas, aquí verás sus diagnósticos y recomendaciones."
                  : "Ninguna campaña coincide con el filtro seleccionado."
              }
            />
          </div>
        )}
        {filteredCampaigns.map((camp) => {
          const isWarning = camp.health === "warning";
          const isDanger = camp.health === "danger";

          const badgeCls = isDanger
            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50"
            : "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-900/50";

          const actionKey = `${camp.id}-${camp.algorithmInsight.actionType}`;
          const isActionBusy = actionLoading === actionKey;
          const successMsg = actionSuccess[camp.id];
          const errorMsg = actionError[camp.id];

          return (
            <div
              key={camp.id}
              className="p-6 rounded-[28px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] hover:border-amber-400/40 transition-all shadow-orvion space-y-4"
            >
              {/* Header de Campaña: nombre, estado (solo si pide atención) y contexto en una línea */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-[#121417] dark:text-white">{camp.campaignName}</h3>
                  <p className="text-[11px] text-[#8C929D] mt-0.5">{[camp.clientName, camp.objective].filter(Boolean).join(" · ")}</p>
                </div>
                {isDanger || isWarning ? (
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${badgeCls}`}>
                    {isDanger ? "Crítico" : "Atención"}
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-[#8C929D] shrink-0">Óptimo</span>
                )}
              </div>

              {/* Métricas Principales en Cápsula */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-[#F8F9FB] dark:bg-[#161A20] rounded-[20px] border border-[#E2E5EB]/80 dark:border-[#262C36] text-xs">
                <div>
                  <span className="text-[10px] text-[#8C929D] block font-mono">Presupuesto</span>
                  <span className="font-extrabold text-[#121417] dark:text-white">${camp.budgetDaily}/día</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8C929D] block font-mono">Invertido</span>
                  <span className="font-extrabold text-[#121417] dark:text-white">${camp.spentTotal.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8C929D] block font-mono">Leads</span>
                  <span className="font-extrabold text-[#121417] dark:text-white">{camp.leadsGenerated}</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8C929D] block font-mono">Costo / Lead (CPL)</span>
                  <span
                    className={`font-extrabold ${
                      camp.costPerLead > camp.targetCpl ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    ${camp.costPerLead}{" "}
                    <span className="text-[10px] text-[#8C929D] font-normal">(Meta: ${camp.targetCpl})</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8C929D] block font-mono">Frecuencia</span>
                  <span className="font-extrabold text-[#121417] dark:text-white">{camp.frequency}x</span>
                </div>
              </div>

              {/* Caja de Diagnóstico del Algoritmo */}
              <div className="p-4 rounded-[20px] bg-white dark:bg-[#1A1E24] border border-[#E2E5EB] dark:border-[#262C36] space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-bold text-[#121417] dark:text-white">
                    {camp.algorithmInsight.issue}
                  </span>
                </div>

                <p className="text-xs text-[#525866] dark:text-[#A0A6B2] leading-relaxed">
                  {camp.algorithmInsight.metaAlgorithmContext}
                </p>

                <div className="pt-2 border-t border-[#E2E5EB]/60 dark:border-[#262C36] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-[#121417] dark:text-white">
                    <span className="font-bold text-amber-600 dark:text-amber-400">Recomendación: </span>
                    <span>{camp.algorithmInsight.recommendation}</span>
                    {camp.algorithmInsight.estimatedSaving && (
                      <span className="ml-2 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                        {camp.algorithmInsight.estimatedSaving}
                      </span>
                    )}
                  </div>

                  {successMsg ? (
                    <div className="text-xs text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/40 px-3.5 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{successMsg}</span>
                    </div>
                  ) : errorMsg ? (
                    <div className="flex items-center gap-2">
                      <div className="text-xs text-red-700 dark:text-red-300 font-medium flex items-center gap-1.5 bg-red-50 dark:bg-red-950/40 px-3 py-1.5 rounded-full border border-red-200 dark:border-red-900/50">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>{errorMsg}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleApplyAction(camp)}
                        disabled={isActionBusy}
                        className="btn-black-gold rounded-full px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-orvion"
                      >
                        <Zap className="w-3 h-3 text-amber-400" />
                        <span>Reintentar</span>
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleApplyAction(camp)}
                      disabled={isActionBusy}
                      className="btn-black-gold rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-orvion disabled:opacity-50"
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

      {/* Reglas y Mejores Prácticas del Algoritmo de Meta en Cápsula Orvion */}
      {rules.length > 0 && (
        <details className="group rounded-[28px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
          <summary className="px-6 py-4 text-sm font-extrabold text-[#121417] dark:text-white cursor-pointer select-none">
            Buenas prácticas de Meta (Advantage+)
          </summary>
          <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {rules.map((rule, idx) => (
              <div
                key={idx}
                className="p-4 rounded-[20px] bg-[#F8F9FB] dark:bg-[#161A20] border border-[#E2E5EB]/80 dark:border-[#262C36] space-y-2"
              >
                <h4 className="text-xs font-bold text-[#121417] dark:text-white">{rule.rule}</h4>
                <p className="text-xs text-[#525866] dark:text-[#A0A6B2] leading-relaxed">{rule.description}</p>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
