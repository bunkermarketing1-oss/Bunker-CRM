"use client";

import React, { useState } from "react";
import { Workflow, Sparkles, CheckCircle, Zap, ArrowRight, ShieldCheck, Plus } from "lucide-react";

export default function AutomationsPage() {
  const [rules, setRules] = useState([
    {
      id: "1",
      name: "Calificación y SMS Inmediato al Captar Lead",
      trigger: "Lead captado desde Meta Ads o Google Ads",
      action: "Ejecutar Bunker AI para calificar y despachar SMS de bienvenida en < 60s",
      active: true,
      executions: 142,
    },
    {
      id: "2",
      name: "Creación de Tarea al Pasar a Propuesta Enviada",
      trigger: "Oportunidad movida a etapa 'Propuesta Enviada'",
      action: "Crear tarea de llamada de seguimiento a las 48 horas para el ejecutivo",
      active: true,
      executions: 38,
    },
    {
      id: "3",
      name: "Onboarding Automático al Cerrar Negocio",
      trigger: "Oportunidad marcada como 'Cerrado Ganado'",
      action: "Convertir en Cliente Activo y generar checklist de campaña publicitaria",
      active: true,
      executions: 19,
    },
    {
      id: "4",
      name: "Reactivación de Prospectos Estancados",
      trigger: "Sin actividad registrada durante 14 días",
      action: "Notificar al asesor comercial y sugerir plantilla de reactivación con IA",
      active: false,
      executions: 7,
    },
  ]);

  const toggleRule = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !r.active } : r))
    );
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
          <h1 className="text-2xl font-serif font-normal text-[#1F1E1D] tracking-tight">
            Automatizaciones & Flujos de Trabajo
          </h1>
          <p className="text-xs text-[#6B6966] mt-0.5">
            Reglas de negocio inteligentes para acelerar la conversión y reducir tiempos de respuesta.
          </p>
        </div>

        <button
          onClick={() => alert("En esta versión MVP las 4 reglas principales están pre-configuradas y activas.")}
          className="px-4 py-2 rounded-xl bg-[#D97757] hover:bg-[#C86747] text-white text-xs font-medium flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Automatización</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="p-5 rounded-2xl bg-white border border-[#E8E6DF] hover:border-[#D1CFCA] transition-all flex flex-col justify-between space-y-4 shadow-sm"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-serif font-normal text-base text-[#1F1E1D] flex items-center gap-2">
                  <Zap className={`w-4 h-4 ${rule.active ? "text-[#D97757]" : "text-[#82807C]"}`} />
                  {rule.name}
                </h3>

                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 flex-shrink-0 ${
                    rule.active ? "bg-[#D97757]" : "bg-[#E8E6DF]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      rule.active ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              <div className="mt-4 p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-xs space-y-2">
                <div className="text-[#6B6966]">
                  <strong className="text-[#1F1E1D]">Disparador:</strong> {rule.trigger}
                </div>
                <div className="text-[#6B6966] flex items-start gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-[#D97757] flex-shrink-0 mt-0.5" />
                  <span>
                    <strong className="text-[#1F1E1D]">Acción:</strong> {rule.action}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#F0EFEA] flex items-center justify-between text-xs text-[#82807C]">
              <span className="font-mono">{rule.executions} ejecuciones</span>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                rule.active
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-gray-50 text-gray-700 border-gray-200"
              }`}>
                {rule.active ? "ACTIVA" : "PAUSADA"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
