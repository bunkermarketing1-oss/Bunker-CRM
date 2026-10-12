"use client";

import React from "react";
import { BarChart3, TrendingUp, DollarSign, Users, Award, Target, ArrowUpRight } from "lucide-react";

export default function ReportsPage() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          Reportes Comerciales & Retorno de Inversión
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Métricas de desempeño para la reunión ejecutiva con clientes e inversionistas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-[#0c111e] border border-[#1b2538] space-y-2">
          <div className="text-xs font-semibold text-gray-400 flex items-center justify-between">
            <span>CAC Promedio (Costo Adquisición)</span>
            <Target className="w-4 h-4 text-bunker-400" />
          </div>
          <div className="text-2xl font-black text-white">$1,850 <span className="text-xs text-gray-400">MXN</span></div>
          <div className="text-[11px] text-emerald-400 font-medium">▼ 18% optimizado mediante scoring con IA</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0c111e] border border-[#1b2538] space-y-2">
          <div className="text-xs font-semibold text-gray-400 flex items-center justify-between">
            <span>Ticket Promedio de Cierre</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">$58,000 <span className="text-xs text-gray-400">MXN</span></div>
          <div className="text-[11px] text-emerald-400 font-medium">▲ 24% respecto al mes anterior</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0c111e] border border-[#1b2538] space-y-2">
          <div className="text-xs font-semibold text-gray-400 flex items-center justify-between">
            <span>Tiempo de Respuesta Comercial</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">4.2 <span className="text-xs text-gray-400">minutos</span></div>
          <div className="text-[11px] text-emerald-400 font-medium">Automatizado con SMS de primer contacto</div>
        </div>
      </div>

      {/* Attribution Channels Breakdown */}
      <div className="p-6 rounded-2xl bg-[#0c111e] border border-[#1b2538] space-y-4">
        <h2 className="text-sm font-bold text-white">Desglose de Conversión por Canal de Captación</h2>
        <div className="space-y-3">
          {[
            { channel: "Meta Ads (Instagram & Facebook)", share: 48, leads: 58, revenue: "$280,000 MXN", color: "bg-bunker-500" },
            { channel: "Google Search & Display Ads", share: 32, leads: 39, revenue: "$195,000 MXN", color: "bg-indigo-500" },
            { channel: "Recomendaciones Directas (Referrals)", share: 15, leads: 18, revenue: "$140,000 MXN", color: "bg-emerald-500" },
            { channel: "TikTok Ads & Orgánico", share: 5, leads: 6, revenue: "$32,000 MXN", color: "bg-pink-500" },
          ].map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-white">{item.channel}</span>
                <span className="text-gray-300 font-mono">{item.revenue} ({item.share}%)</span>
              </div>
              <div className="w-full h-2 rounded-full bg-[#141c2c] overflow-hidden">
                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.share}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
