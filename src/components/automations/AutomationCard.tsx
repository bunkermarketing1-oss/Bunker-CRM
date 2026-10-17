"use client";

import React from "react";
import {
  Zap,
  Moon,
  CheckCircle2,
  Clock,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import type { AutomationRuleDto } from "@/types/automations";
import {
  ACTION_TYPE,
  TRIGGER_EVENT_LABEL,
  ACTION_TYPE_LABEL,
  type TriggerEventType,
  type ActionTypeValue,
} from "@/lib/constants/automations";

interface AutomationCardProps {
  rule: AutomationRuleDto;
  onToggle: (id: string, current: boolean) => void;
  disabled?: boolean;
}

export function AutomationCard({ rule, onToggle, disabled }: AutomationCardProps) {
  // Determinar icono según el tipo de acción
  const getIcon = () => {
    switch (rule.actionType) {
      case ACTION_TYPE.AI_OUT_OF_HOURS_SMS:
        return <Moon className={`w-4 h-4 ${rule.isActive ? "text-indigo-600" : "text-[#82807C]"}`} />;
      case ACTION_TYPE.IMMEDIATE_QUALIFICATION_SMS:
        return <Sparkles className={`w-4 h-4 ${rule.isActive ? "text-[#D97757]" : "text-[#82807C]"}`} />;
      case ACTION_TYPE.ONBOARDING_DEAL_WON:
        return <CheckCircle2 className={`w-4 h-4 ${rule.isActive ? "text-emerald-600" : "text-[#82807C]"}`} />;
      case ACTION_TYPE.REACTIVATE_STALE_LEAD:
        return <Clock className={`w-4 h-4 ${rule.isActive ? "text-amber-600" : "text-[#82807C]"}`} />;
      default:
        return <Zap className={`w-4 h-4 ${rule.isActive ? "text-[#D97757]" : "text-[#82807C]"}`} />;
    }
  };

  // Extraer detalles de la acción para vista previa
  let actionDetails: string | null = null;
  if (rule.actionPayload) {
    try {
      const parsed = JSON.parse(rule.actionPayload);
      if (parsed.messageTemplate) {
        actionDetails = `SMS: "${parsed.messageTemplate.slice(0, 110)}..."`;
      } else if (Array.isArray(parsed.tasks)) {
        actionDetails = `${parsed.tasks.length} tareas: ${parsed.tasks.slice(0, 2).join(", ")}...`;
      } else if (parsed.title) {
        actionDetails = `Tarea: ${parsed.title}`;
      }
    } catch {
      // Ignorar fallback
    }
  }

  const triggerLabel =
    TRIGGER_EVENT_LABEL[rule.triggerEvent as TriggerEventType] || rule.triggerEvent;
  const actionLabel =
    ACTION_TYPE_LABEL[rule.actionType as ActionTypeValue] || rule.actionType;

  const formatDate = (isoString: string | null) => {
    if (!isoString) return "Nunca ejecutada";
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString("es-ES", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "Fecha desconocida";
    }
  };

  return (
    <div
      className={`p-5 rounded-2xl bg-white border transition-all flex flex-col justify-between space-y-4 shadow-sm hover:shadow-md ${
        rule.isActive
          ? "border-[#E8E6DF] hover:border-[#D1CFCA]"
          : "border-[#ECEBE6] opacity-75 bg-[#FDFCFB]"
      }`}
    >
      <div>
        {/* Header con Título y Switch */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <div
              className={`p-2 rounded-xl mt-0.5 ${
                rule.isActive ? "bg-[#FAF9F5] border border-[#E8E6DF]" : "bg-gray-100"
              }`}
            >
              {getIcon()}
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base text-[#1F1E1D]">
                {rule.name}
              </h3>
              <p className="text-[11px] text-[#82807C] mt-0.5">
                {rule.triggerEvent === "lead_created"
                  ? "⚡ Se activa al recibir un nuevo lead (Meta / Web)"
                  : rule.triggerEvent === "deal_won"
                  ? "🎉 Se activa al cerrar un negocio ganado"
                  : rule.triggerEvent === "stage_changed"
                  ? "📋 Se activa al avanzar una propuesta en pipeline"
                  : "⏰ Se activa por inactividad comercial"}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={disabled}
            onClick={() => onToggle(rule.id, rule.isActive)}
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 flex-shrink-0 cursor-pointer disabled:cursor-not-allowed ${
              rule.isActive ? "bg-[#D97757]" : "bg-[#D5D3CC]"
            }`}
            title={rule.isActive ? "Pausar regla" : "Activar regla"}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                rule.isActive ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Bloque de disparador y acción */}
        <div className="mt-4 p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-xs space-y-2.5">
          <div className="text-[#6B6966]">
            <strong className="text-[#1F1E1D] font-medium">Disparador:</strong>{" "}
            <span>{triggerLabel}</span>
          </div>

          <div className="text-[#6B6966] flex items-start gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 text-[#D97757] flex-shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#1F1E1D] font-medium">Acción:</strong>{" "}
              <span>{actionLabel}</span>
              {actionDetails && (
                <p className="mt-1 text-[11px] text-[#82807C] italic bg-white/70 p-1.5 rounded border border-[#EFECE6]">
                  {actionDetails}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer con métricas reales */}
      <div className="pt-3 border-t border-[#F0EFEA] flex items-center justify-between text-xs text-[#82807C]">
        <div className="flex items-center gap-2">
          <span className="font-mono font-medium text-[#1F1E1D]">
            {rule.executionCount}
          </span>
          <span>{rule.executionCount === 1 ? "ejecución" : "ejecuciones"}</span>
          <span className="text-[#D5D3CC]">•</span>
          <span className="text-[11px] text-[#82807C] hidden sm:inline">
            Última: {formatDate(rule.lastRunAt)}
          </span>
        </div>

        <span
          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
            rule.isActive
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-gray-100 text-gray-600 border-gray-200"
          }`}
        >
          {rule.isActive ? "ACTIVA" : "PAUSADA"}
        </span>
      </div>
    </div>
  );
}
