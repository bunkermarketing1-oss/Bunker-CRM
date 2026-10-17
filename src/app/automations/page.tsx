"use client";

import React, { useState } from "react";
import {
  Workflow,
  Sparkles,
  RefreshCw,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
} from "lucide-react";
import { useAutomations } from "@/hooks/useAutomations";
import { AutomationCard } from "@/components/automations/AutomationCard";
import type { StaleLeadsCheckResult } from "@/types/automations";

export default function AutomationsPage() {
  const {
    rules,
    loading,
    error,
    refreshRules,
    toggleRule,
    runStaleCheck,
    runningCheck,
  } = useAutomations();

  const [scanResult, setScanResult] = useState<StaleLeadsCheckResult | null>(null);

  const handleRunScan = async () => {
    const result = await runStaleCheck();
    if (result) {
      setScanResult(result);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E6DF]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#82807C] mb-1">
            <span>Operaciones</span>
            <span>/</span>
            <span className="text-[#1F1E1D] font-medium">Automatizaciones</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1F1E1D] tracking-tight">
            Motor de Automatizaciones & Flujos de Venta
          </h1>
          <p className="text-xs text-[#6B6966] mt-0.5">
            Reglas de negocio inteligentes para acelerar la conversión comercial, responder 24/7 con IA y reactivar leads.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRunScan}
            disabled={runningCheck || loading}
            className="px-3.5 py-2 text-xs font-medium rounded-xl border border-[#E8E6DF] bg-white hover:bg-[#FAF9F5] text-[#1F1E1D] transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            title="Escanear leads sin actividad por más de 14 días y generar tareas de reactivación"
          >
            <Clock className={`w-3.5 h-3.5 text-amber-600 ${runningCheck ? "animate-spin" : ""}`} />
            <span>{runningCheck ? "Escaneando..." : "Escanear Leads Estancados"}</span>
          </button>

          <button
            type="button"
            onClick={() => refreshRules()}
            disabled={loading}
            className="p-2 text-xs font-medium rounded-xl border border-[#E8E6DF] bg-white hover:bg-[#FAF9F5] text-[#1F1E1D] transition-colors shadow-sm"
            title="Actualizar reglas"
          >
            <RefreshCw className={`w-4 h-4 text-[#82807C] ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Banner de resultado de escaneo si se ejecutó */}
      {scanResult && (
        <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 flex items-start justify-between gap-3 text-xs animate-in slide-in-from-top-2">
          <div className="flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <strong className="font-semibold">Escaneo de prospectos completado con éxito:</strong>
              <p className="mt-0.5 text-amber-800">
                Se analizaron {scanResult.leadsAnalyzed} prospectos abiertos. Se identificaron {scanResult.staleLeadsFound} estancados (+14 días) y se crearon{" "}
                <span className="font-semibold text-amber-950">{scanResult.tasksCreated} tareas de reactivación</span> con plantilla comercial sugerida.
              </p>
            </div>
          </div>
          <button
            onClick={() => setScanResult(null)}
            className="text-amber-700 hover:text-amber-900 font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error banner si falló el fetch */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-center gap-3 text-xs">
          <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Estado de carga */}
      {loading && rules.length === 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-white border border-[#E8E6DF] animate-pulse space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="h-5 bg-gray-200 rounded w-1/2" />
                <div className="w-10 h-5 bg-gray-200 rounded-full" />
              </div>
              <div className="h-16 bg-gray-100 rounded-xl" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : (
        /* Grid de reglas activas y configuradas */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {rules.map((rule) => (
            <AutomationCard
              key={rule.id}
              rule={rule}
              onToggle={toggleRule}
              disabled={loading}
            />
          ))}
        </div>
      )}

      {/* Pie explicativo de la arquitectura */}
      <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#6B6966]">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#D97757] flex-shrink-0" />
          <span>
            Las reglas se ejecutan automáticamente en tiempo real al ingresar leads desde Meta Ads, al mover acuerdos en el pipeline o fuera de horario.
          </span>
        </div>
        <span className="font-mono text-[11px] text-[#82807C] flex-shrink-0">
          Base: Supabase Postgres
        </span>
      </div>
    </div>
  );
}
