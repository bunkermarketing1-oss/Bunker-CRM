"use client";

import React, { useState } from "react";
import { Workflow, Sparkles, CheckCircle, Zap, ArrowRight, ShieldCheck, Plus } from "lucide-react";

export default function AutomationsPage() {
  const [rules, setRules] = useState([
    {
      id: "1",
      name: "Calificación y SMS Inmediato al Captar Lead",
      trigger: "Lead creado desde Meta Ads o Google Ads",
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Workflow className="w-5 h-5 text-bunker-400" />
            Automatizaciones & Flujos Comerciales
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Reglas de negocio inteligentes para acelerar la conversión y reducir tiempos de respuesta.
          </p>
        </div>

        <button
          onClick={() => alert("En esta versión MVP las reglas principales están pre-configuradas.")}
          className="px-4 py-2.5 rounded-xl bg-bunker-600 hover:bg-bunker-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-bunker-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Regla de Automatización</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {rules.map((rule) => (
          <div
            key={rule.id}
            className="p-5 rounded-2xl bg-[#0c111e] border border-[#1b2538] hover:border-[#263754] transition-all flex flex-col justify-between space-y-4 shadow-md"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Zap className={`w-4 h-4 ${rule.active ? "text-amber-400" : "text-gray-500"}`} />
                  {rule.name}
                </h3>

                <button
                  onClick={() => toggleRule(rule.id)}
                  className={`w-10 h-5 rounded-full transition-colors relative flex items-center px-0.5 ${
                    rule.active ? "bg-bunker-600" : "bg-[#1d273b]"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      rule.active ? "translate-x-5" : "translate-x-0"
                    }`}
                  ></div>
                </button>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-[#080d16] border border-[#182338] text-[11px] space-y-2">
                <div className="text-gray-400">
                  <strong className="text-gray-300">Disparador:</strong> {rule.trigger}
                </div>
                <div className="text-bunker-300 flex items-center gap-1.5 pt-1 border-t border-[#162033]">
                  <ArrowRight className="w-3.5 h-3.5 text-bunker-400 flex-shrink-0" />
                  <span>{rule.action}</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#172238] flex items-center justify-between text-[11px] text-gray-500">
              <span>{rule.executions} ejecuciones registradas</span>
              <span className={`font-semibold ${rule.active ? "text-emerald-400" : "text-gray-500"}`}>
                {rule.active ? "● ACTIVO" : "○ PAUSADO"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
