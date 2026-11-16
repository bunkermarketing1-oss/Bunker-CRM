"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Zap,
  Info,
  Building2,
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

const DEMO_CAMPAIGNS: OptimizerCampaign[] = [
  {
    id: "camp-demo-1",
    clientName: "Constructora Bolívar",
    campaignName: "Lanzamiento Reserva Campestre - Meta Lead Ads Advantage+",
    objective: "Generación de Clientes Potenciales",
    status: "active",
    health: "warning",
    budgetDaily: 85,
    spentTotal: 1850,
    leadsGenerated: 142,
    costPerLead: 13.02,
    targetCpl: 9.5,
    frequency: 3.82,
    algorithmInsight: {
      issue: "Fatiga Temprana de Creativos y Saturación de Frecuencia",
      metaAlgorithmContext: "La frecuencia superó 3.8 en audiencia abierta de 450K personas. El algoritmo de subasta penaliza el CTR estimado y eleva el CPM un +34%.",
      recommendation: "Inyectar 2 nuevos creativos en formato Reels con gancho testimonial y renovar la copia antes de 48 horas.",
      actionLabel: "Pausar Creativo Fatigado & Rebalancear Presupuesto",
      actionType: "pause_fatigued",
      estimatedSaving: "-24% CPL proyectado",
      estimatedImpact: "+35 leads adicionales por semana",
    },
  },
  {
    id: "camp-demo-2",
    clientName: "Inmobiliaria Andina",
    campaignName: "Departamentos de Inversión Centro Histórico - Google Search & Meta",
    objective: "Conversiones & Formularios",
    status: "active",
    health: "success",
    budgetDaily: 120,
    spentTotal: 3450,
    leadsGenerated: 395,
    costPerLead: 8.73,
    targetCpl: 12.0,
    frequency: 1.84,
    algorithmInsight: {
      issue: "Ventana de Rendimiento Excepcional en Fase de Escalado",
      metaAlgorithmContext: "El costo por lead está 27% por debajo del objetivo con tasa de conversión de landing en 22.4%. Señal óptima para escalamiento horizontal.",
      recommendation: "Aumentar presupuesto diario un +15% sin reiniciar la fase de aprendizaje de Meta (manteniendo Advantage+ activo).",
      actionLabel: "Escalar Presupuesto +15% Automáticamente",
      actionType: "scale_budget",
      estimatedSaving: "CPL se mantiene bajo $9.50 USD",
      estimatedImpact: "+80 leads proyectados al mes",
    },
  },
  {
    id: "camp-demo-3",
    clientName: "Automotriz del Valle",
    campaignName: "Test Drive Flota SUV Híbridas 2026 - Instant Forms WhatsApp",
    objective: "Mensajes Inbound",
    status: "active",
    health: "danger",
    budgetDaily: 60,
    spentTotal: 960,
    leadsGenerated: 41,
    costPerLead: 23.41,
    targetCpl: 14.0,
    frequency: 2.15,
    algorithmInsight: {
      issue: "Desconexión entre Oferta de Formulario y Calificación de Leads",
      metaAlgorithmContext: "El 65% de los leads no contestan en menos de 2 horas. La caída en SLA de respuesta incrementa el costo de adquisición de Meta y desmotiva al algoritmo.",
      recommendation: "Activar webhook de notificación instantánea en WhatsApp y filtrar prospectos por rango de ingreso mínimo.",
      actionLabel: "Activar Disparador Instantáneo & Filtro de Ingresos",
      actionType: "enable_qualification",
      estimatedSaving: "-42% gasto en leads no calificados",
      estimatedImpact: "Tasa de contacto sube de 35% a 88%",
    },
  },
  {
    id: "camp-demo-4",
    clientName: "Clínica Especialistas Orales",
    campaignName: "Diseño de Sonrisa Digital & Ortodoncia Invisible",
    objective: "Generación de Prospectos",
    status: "active",
    health: "warning",
    budgetDaily: 45,
    spentTotal: 630,
    leadsGenerated: 58,
    costPerLead: 10.86,
    targetCpl: 8.0,
    frequency: 2.9,
    algorithmInsight: {
      issue: "Solapamiento de Audiencias Locales (Audience Overlap)",
      metaAlgorithmContext: "Dos conjuntos de anuncios compiten en la misma subasta geográfica para un radio de 10 km. Canibalización estimada del 22%.",
      recommendation: "Consolidar ambos conjuntos en un solo adset Advantage+ con exclusión mutua de prospectos ya contactados.",
      actionLabel: "Consolidar Conjuntos en Advantage+ CBO",
      actionType: "consolidate_adsets",
      estimatedSaving: "-$180 USD/semana en subasta cruzada",
      estimatedImpact: "Mejora del 18% en velocidad de entrega",
    },
  },
];

const DEMO_RULES: MetaAlgorithmRule[] = [
  {
    rule: "Regla del 20% en Escalado de Presupuesto",
    description: "Nunca incrementes el presupuesto más del 20% en un período de 24 horas. Los incrementos mayores reinician la fase de aprendizaje de Meta y disparan temporalmente el CPL.",
  },
  {
    rule: "Ventana de Calificación de 50 Conversiones",
    description: "Meta requiere al menos 50 conversiones por semana por conjunto de anuncios para que su red neuronal optimice el público con alta precisión.",
  },
  {
    rule: "Penalización por Frecuencia Mayor a 3.5x",
    description: "Cuando la misma persona ve el anuncio más de 3 veces sin interactuar, el algoritmo incrementa el CPM un 30% a 50%. Renueva creativos periódicamente.",
  },
];

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
  const [isDemoMode, setIsDemoMode] = useState(false);

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

  // Si no hay campañas en la base de datos o falló, activar visualización demostrativa para clientes
  const isAutoDemoFallback = !loading && campaigns.length === 0 && !isDemoMode;

  const activeCampaigns = useMemo(() => {
    if (isDemoMode || isAutoDemoFallback) return DEMO_CAMPAIGNS;
    return campaigns;
  }, [isDemoMode, isAutoDemoFallback, campaigns]);

  const activeRules = useMemo(() => {
    if (isDemoMode || isAutoDemoFallback) return DEMO_RULES;
    return rules.length > 0 ? rules : DEMO_RULES;
  }, [isDemoMode, isAutoDemoFallback, rules]);

  const filteredCampaigns = useMemo(() => {
    if (healthFilter === "all") return activeCampaigns;
    if (healthFilter === "attention") {
      return activeCampaigns.filter((c) => c.health === "warning" || c.health === "danger");
    }
    return activeCampaigns.filter((c) => c.health === "success");
  }, [activeCampaigns, healthFilter]);

  const warningCount = activeCampaigns.filter((c) => c.health === "warning" || c.health === "danger").length;
  const successCount = activeCampaigns.filter((c) => c.health === "success").length;

  const handleApplyAction = async (campaign: OptimizerCampaign) => {
    const actionKey = `${campaign.id}-${campaign.algorithmInsight.actionType}`;
    setActionLoading(actionKey);
    setActionError((prev) => ({ ...prev, [campaign.id]: "" }));

    if (isDemoMode || isAutoDemoFallback) {
      // Simulación inmediata para pitch y presentación ante clientes
      await new Promise((r) => setTimeout(r, 600));
      setActionSuccess((prev) => ({
        ...prev,
        [campaign.id]: `Acción aplicada exitosamente: ${campaign.algorithmInsight.actionLabel}. CPL proyectado actualizado.`,
      }));
      setActionLoading(null);
      return;
    }

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
      {/* Cabecera Estilo Cápsula Orvion con Paleta Dorado y Negro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="orvion-badge-gold text-[10px]">
              Inteligencia Algorítmica & Meta Ads
            </span>
            {isDemoMode || isAutoDemoFallback ? (
              <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-700/50 flex items-center gap-1.5 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-current" />
                {isAutoDemoFallback ? "Auditoría de Demostración Activa" : "Modo Demostrativo Activo"}
              </span>
            ) : activeClient ? (
              <span className="text-[11px] font-semibold text-[#121417] dark:text-white bg-white dark:bg-[#121417] px-3 py-1 rounded-full border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
                Marca: <strong>{activeClient.name}</strong>
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[#8C929D] bg-white dark:bg-[#121417] px-3 py-1 rounded-full border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
                Todas las Marcas de la Agencia
              </span>
            )}
          </div>

          <h1 className="text-3xl font-extrabold text-[#121417] dark:text-white tracking-tight leading-tight flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-amber-400 shrink-0" />
            <span>Optimizador de Algoritmo Meta & Advantage+</span>
          </h1>
          <p className="text-xs text-[#8C929D] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs animate-pulse" />
            <span>
              Auditoría predictiva en tiempo real sobre subasta, fatiga de anuncios, saturación y escalamiento de campañas de pauta.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Switch Modo Demo Interactivo */}
          <button
            type="button"
            onClick={() => setIsDemoMode((prev) => !prev)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-orvion cursor-pointer border ${
              isDemoMode
                ? "bg-amber-400 text-[#121417] border-amber-500 shadow-amber-400/20"
                : "bg-white dark:bg-[#121417] text-[#8C929D] border-[#E2E5EB] dark:border-[#1F242D] hover:text-[#121417] dark:hover:text-white"
            }`}
            title="Ver auditorías algorítmicas de demostración"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isDemoMode ? "text-[#121417] fill-current" : "text-amber-500"}`} />
            <span>{isDemoMode ? "⚡ Modo Demo Activo" : "Modo Demo"}</span>
          </button>

          <button
            type="button"
            onClick={fetchOptimizations}
            className="w-10 h-10 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] flex items-center justify-center text-[#121417] dark:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] shadow-orvion transition-all cursor-pointer"
            title="Refrescar auditoría"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Banner Informativo si aplica Auto-Demo */}
      {isAutoDemoFallback && (
        <div className="p-4 rounded-[28px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs font-medium text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-orvion">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Diagnóstico de Demostración Activo:</strong> Mostrando auditorías de aprendizaje profundo de Meta Advantage+ preconfiguradas para presentación comercial ante clientes.
            </span>
          </div>
          <button
            type="button"
            onClick={fetchOptimizations}
            className="px-3.5 py-1 rounded-full bg-white dark:bg-[#1E2229] border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all cursor-pointer shadow-2xs shrink-0"
          >
            Reintentar Servidor
          </button>
        </div>
      )}

      {/* Filtros de Estado en Cápsulas Orvion */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setHealthFilter("all")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 shadow-orvion cursor-pointer ${
            healthFilter === "all"
              ? "bg-[#121417] text-white dark:bg-amber-400 dark:text-[#121417]"
              : "bg-white dark:bg-[#121417] text-[#8C929D] hover:text-[#121417] dark:hover:text-white border border-[#E2E5EB] dark:border-[#1F242D]"
          }`}
        >
          Todas las Campañas ({activeCampaigns.length})
        </button>

        <button
          type="button"
          onClick={() => setHealthFilter("attention")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 shadow-orvion cursor-pointer ${
            healthFilter === "attention"
              ? "bg-[#121417] text-white dark:bg-amber-400 dark:text-[#121417]"
              : "bg-white dark:bg-[#121417] text-[#8C929D] hover:text-[#121417] dark:hover:text-white border border-[#E2E5EB] dark:border-[#1F242D]"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400" />
          <span>Requieren Atención ({warningCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setHealthFilter("success")}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 shadow-orvion cursor-pointer ${
            healthFilter === "success"
              ? "bg-[#121417] text-white dark:bg-amber-400 dark:text-[#121417]"
              : "bg-white dark:bg-[#121417] text-[#8C929D] hover:text-[#121417] dark:hover:text-white border border-[#E2E5EB] dark:border-[#1F242D]"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>Alto Rendimiento ({successCount})</span>
        </button>
      </div>

      {error && !isDemoMode && !isAutoDemoFallback && (
        <div className="p-4 rounded-[22px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs text-red-800 dark:text-red-300 shadow-orvion">
          {error}
        </div>
      )}

      {/* Lista de Campañas y Diagnósticos Algorítmicos */}
      <div className="space-y-4">
        {filteredCampaigns.map((camp) => {
          const isWarning = camp.health === "warning";
          const isDanger = camp.health === "danger";

          const badgeCls = isDanger
            ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50"
            : isWarning
            ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border-amber-200 dark:border-amber-900/50"
            : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50";

          const actionKey = `${camp.id}-${camp.algorithmInsight.actionType}`;
          const isActionBusy = actionLoading === actionKey;
          const successMsg = actionSuccess[camp.id];
          const errorMsg = actionError[camp.id];

          return (
            <div
              key={camp.id}
              className="p-6 rounded-[28px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] hover:border-amber-400/40 transition-all shadow-orvion space-y-4"
            >
              {/* Header de Campaña */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-900/40 uppercase tracking-wide">
                      {camp.clientName}
                    </span>
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${badgeCls}`}>
                      {isDanger ? "⚠️ Crítico / Fuga" : isWarning ? "⚡ Atención / Fatiga" : "✓ Óptimo / Escalar"}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-[#121417] dark:text-white mt-1.5">
                    {camp.campaignName}
                  </h3>
                </div>

                <div className="flex items-center gap-3 text-xs text-[#8C929D] shrink-0">
                  <div>
                    <span className="text-[10px] block text-[#8C929D] font-mono">Objetivo</span>
                    <span className="font-bold text-[#121417] dark:text-white">{camp.objective}</span>
                  </div>
                </div>
              </div>

              {/* Métricas Principales en Cápsula */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 bg-[#F8F9FB] dark:bg-[#161A20] rounded-[20px] border border-[#E2E5EB]/80 dark:border-[#262C36] text-xs">
                <div>
                  <span className="text-[10px] text-[#8C929D] block font-mono">Presupuesto Diario</span>
                  <span className="font-extrabold text-[#121417] dark:text-white">${camp.budgetDaily} USD/día</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8C929D] block font-mono">Invertido Total</span>
                  <span className="font-extrabold text-[#121417] dark:text-white">${camp.spentTotal.toLocaleString()} USD</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8C929D] block font-mono">Leads Generados</span>
                  <span className="font-extrabold text-[#121417] dark:text-white">{camp.leadsGenerated} prospectos</span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8C929D] block font-mono">Costo / Lead (CPL)</span>
                  <span
                    className={`font-extrabold ${
                      camp.costPerLead > camp.targetCpl ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                    }`}
                  >
                    ${camp.costPerLead} USD{" "}
                    <span className="text-[10px] text-[#8C929D] font-normal">(Meta: ${camp.targetCpl})</span>
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-[#8C929D] block font-mono">Frecuencia de Anuncio</span>
                  <span className="font-extrabold text-[#121417] dark:text-white">{camp.frequency}x</span>
                </div>
              </div>

              {/* Caja de Diagnóstico del Algoritmo */}
              <div className="p-4 rounded-[20px] bg-white dark:bg-[#1A1E24] border border-[#E2E5EB] dark:border-[#262C36] space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs font-bold text-[#121417] dark:text-white">
                    Diagnóstico: {camp.algorithmInsight.issue}
                  </span>
                </div>

                <p className="text-xs text-[#525866] dark:text-[#A0A6B2] leading-relaxed">
                  {camp.algorithmInsight.metaAlgorithmContext}
                </p>

                <div className="pt-2 border-t border-[#E2E5EB]/60 dark:border-[#262C36] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="text-xs text-[#121417] dark:text-white">
                    <span className="font-bold text-amber-600 dark:text-amber-400">Recomendación IA: </span>
                    <span>{camp.algorithmInsight.recommendation}</span>
                    {camp.algorithmInsight.estimatedSaving && (
                      <span className="ml-2 font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
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
      <div className="p-6 rounded-[28px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion space-y-4">
        <div className="flex items-center gap-2 text-sm font-extrabold text-[#121417] dark:text-white">
          <Info className="w-4 h-4 text-amber-500" />
          <span>Reglas & Mejores Prácticas del Algoritmo de Meta (Advantage+)</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {activeRules.map((rule, idx) => (
            <div
              key={idx}
              className="p-4 rounded-[20px] bg-[#F8F9FB] dark:bg-[#161A20] border border-[#E2E5EB]/80 dark:border-[#262C36] space-y-2"
            >
              <h4 className="text-xs font-bold text-[#121417] dark:text-white flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>{rule.rule}</span>
              </h4>
              <p className="text-xs text-[#525866] dark:text-[#A0A6B2] leading-relaxed">
                {rule.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
