"use client";

import React from "react";
import { BarChart3, TrendingUp, DollarSign, Users, Award, Target, ArrowUpRight } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E6DF]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#82807C] mb-1">
            <span>Analítica</span>
            <span>/</span>
            <span className="text-[#1F1E1D] font-medium">Reportes</span>
          </div>
          <h1 className="text-2xl font-serif font-normal text-[#1F1E1D] tracking-tight">
            Reportes Comerciales & Retorno de Inversión
          </h1>
          <p className="text-xs text-[#6B6966] mt-0.5">
            Métricas clave de adquisición de clientes, tickets de venta y desempeño atribuible a pautas digitales.
          </p>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] font-medium flex items-center gap-2">
        <span className="font-bold uppercase tracking-wide">Datos de ejemplo</span>
        <span>
          Las cifras de este reporte (CAC, ticket promedio e ingresos por canal, en USD) son valores ilustrativos fijos y aún no se calculan a partir de los registros del CRM.
        </span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-[#E8E6DF] space-y-2 shadow-sm">
          <div className="text-xs font-medium text-[#6B6966] flex items-center justify-between">
            <span>CAC Promedio (Costo Adquisición)</span>
            <Target className="w-4 h-4 text-[#D97757]" />
          </div>
          <div className="text-3xl font-serif font-normal text-[#1F1E1D]">
            $120 <span className="text-xs font-sans text-[#82807C]">USD</span>
          </div>
          <div className="text-xs text-emerald-800 font-medium flex items-center gap-1">
            <span>▼ 18% optimizado mediante scoring con IA</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E8E6DF] space-y-2 shadow-sm">
          <div className="text-xs font-medium text-[#6B6966] flex items-center justify-between">
            <span>Ticket Promedio de Cierre</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-serif font-normal text-[#1F1E1D]">
            $3,500 <span className="text-xs font-sans text-[#82807C]">USD</span>
          </div>
          <div className="text-xs text-emerald-800 font-medium flex items-center gap-1">
            <span>▲ 24% respecto al mes anterior</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-[#E8E6DF] space-y-2 shadow-sm">
          <div className="text-xs font-medium text-[#6B6966] flex items-center justify-between">
            <span>Tiempo de Respuesta Comercial</span>
            <TrendingUp className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-3xl font-serif font-normal text-[#1F1E1D]">
            4.2 <span className="text-xs font-sans text-[#82807C]">minutos</span>
          </div>
          <div className="text-xs text-emerald-800 font-medium flex items-center gap-1">
            <span>Automatizado con SMS de primer contacto</span>
          </div>
        </div>
      </div>

      {/* Attribution Channels Breakdown */}
      <div className="p-6 rounded-2xl bg-white border border-[#E8E6DF] space-y-5 shadow-sm">
        <h2 className="text-base font-serif font-normal text-[#1F1E1D]">
          Desglose de Conversión por Canal de Captación
        </h2>
        <div className="space-y-4">
          {[
            { channel: "Meta Ads (Instagram & Facebook)", share: 48, leads: 58, revenue: "$18,500 USD", color: "bg-[#D97757]" },
            { channel: "Google Search & Display Ads", share: 32, leads: 39, revenue: "$12,800 USD", color: "bg-blue-600" },
            { channel: "Recomendaciones Directas (Referrals)", share: 15, leads: 18, revenue: "$9,200 USD", color: "bg-emerald-600" },
            { channel: "TikTok Ads & Orgánico", share: 5, leads: 6, revenue: "$2,100 USD", color: "bg-purple-600" },
          ].map((item, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#1F1E1D]">{item.channel}</span>
                <span className="text-[#6B6966] font-mono">{item.revenue} ({item.share}%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#FAF9F5] border border-[#E8E6DF] overflow-hidden">
                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.share}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
