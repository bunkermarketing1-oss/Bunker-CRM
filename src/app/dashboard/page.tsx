"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserCheck,
  TrendingUp,
  DollarSign,
  PhoneCall,
  CheckCircle2,
  Share2,
  MessageSquare,
  Calendar,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Plus,
} from "lucide-react";

export default function DashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/dashboard");
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const metrics = data?.metrics || {
    totalLeads: 0,
    activeClients: 0,
    openDealsCount: 0,
    wonDealsCount: 0,
    totalPipelineValue: 0,
    wonRevenue: 0,
    conversionRate: 0,
    pendingTasks: 0,
    totalSmsSent: 0,
    scheduledPosts: 0,
    connectedIntegrations: 0,
    totalIntegrations: 4,
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0d1424] via-[#0f172a] to-[#131b2e] border border-[#1e2a44] shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-bunker-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-bunker-500/20 text-bunker-300 border border-bunker-500/30">
              OPERATIVO EN PRODUCCIÓN
            </span>
            <span className="text-gray-400 text-xs">| Bunker Agency v1.0 MVP</span>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Panel de Control Comercial & Marketing
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Supervisión integral de leads, pipeline comercial, integraciones API y actividades automáticas.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchDashboard}
            className="p-2.5 rounded-xl bg-[#141d30] border border-[#23314d] text-gray-300 hover:text-white transition-all text-xs font-semibold flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </button>
          <Link
            href="/crm/leads"
            className="px-4 py-2.5 rounded-xl bg-bunker-600 hover:bg-bunker-500 text-white transition-all text-xs font-semibold flex items-center gap-2 shadow-lg shadow-bunker-600/25"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Lead</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="p-5 rounded-xl bg-[#0c111e] border border-[#1b2538] hover:border-[#27354f] transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium">Prospectos / Leads</span>
            <Users className="w-4 h-4 text-bunker-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics.totalLeads}</div>
          <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-1.5 font-medium">
            <TrendingUp className="w-3 h-3" />
            <span>Captación activa en canales</span>
          </div>
        </div>

        {/* Active Clients */}
        <div className="p-5 rounded-xl bg-[#0c111e] border border-[#1b2538] hover:border-[#27354f] transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium">Clientes Activos</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics.activeClients}</div>
          <div className="text-[11px] text-gray-400 mt-1.5">
            Cuentas gestionadas por la agencia
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="p-5 rounded-xl bg-[#0c111e] border border-[#1b2538] hover:border-[#27354f] transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium">Valor en Pipeline</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white">
            ${metrics.totalPipelineValue.toLocaleString()} <span className="text-xs font-normal text-gray-400">MXN</span>
          </div>
          <div className="text-[11px] text-amber-400 mt-1.5 font-medium">
            {metrics.openDealsCount} oportunidades abiertas
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="p-5 rounded-xl bg-[#0c111e] border border-[#1b2538] hover:border-[#27354f] transition-all">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium">Tasa de Conversión</span>
            <TrendingUp className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{metrics.conversionRate}%</div>
          <div className="text-[11px] text-gray-400 mt-1.5">
            ${metrics.wonRevenue.toLocaleString()} MXN cerrados ganados
          </div>
        </div>
      </div>

      {/* Secondary Operational Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Pending Tasks */}
        <div className="p-4 rounded-xl bg-[#090e18] border border-[#162033] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-400">Tareas Pendientes</div>
            <div className="text-lg font-bold text-white">{metrics.pendingTasks}</div>
          </div>
        </div>

        {/* Connected Accounts */}
        <div className="p-4 rounded-xl bg-[#090e18] border border-[#162033] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-400">Cuentas Conectadas</div>
            <div className="text-lg font-bold text-white">
              {metrics.connectedIntegrations} <span className="text-xs text-gray-500">/ {metrics.totalIntegrations}</span>
            </div>
          </div>
        </div>

        {/* Scheduled Posts */}
        <div className="p-4 rounded-xl bg-[#090e18] border border-[#162033] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-400">Posts Programados</div>
            <div className="text-lg font-bold text-white">{metrics.scheduledPosts}</div>
          </div>
        </div>

        {/* SMS Sent */}
        <div className="p-4 rounded-xl bg-[#090e18] border border-[#162033] flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-gray-400">SMS Enviados</div>
            <div className="text-lg font-bold text-white">{metrics.totalSmsSent}</div>
          </div>
        </div>
      </div>

      {/* Main Section: Recent Leads & Real Integration Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leads (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0c111e] border border-[#1b2538] space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">Prospectos Recientes en Embudo</h2>
              <span className="text-[10px] font-semibold bg-bunker-500/20 text-bunker-300 px-2 py-0.5 rounded-full">
                En vivo
              </span>
            </div>
            <Link
              href="/crm/leads"
              className="text-xs text-bunker-400 hover:text-bunker-300 flex items-center gap-1 font-semibold"
            >
              Ver todos los leads
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#1b2538] text-gray-400 font-semibold">
                  <th className="pb-3">Nombre / Empresa</th>
                  <th className="pb-3">Origen</th>
                  <th className="pb-3">Score IA</th>
                  <th className="pb-3">Estado</th>
                  <th className="pb-3 text-right">Valor Estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#162033]">
                {data?.recentLeads?.length > 0 ? (
                  data.recentLeads.map((lead: any) => (
                    <tr key={lead.id} className="hover:bg-[#111827]/50 transition-colors">
                      <td className="py-3">
                        <div className="font-semibold text-white">{lead.name}</div>
                        <div className="text-[11px] text-gray-400">{lead.companyName || "Particular"}</div>
                      </td>
                      <td className="py-3">
                        <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#162033] text-gray-300">
                          {lead.source.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          {lead.qualification}/100
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          lead.status === "qualified" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                          lead.status === "contacted" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                          lead.status === "converted" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                          "bg-gray-500/10 text-gray-300 border border-gray-500/20"
                        }`}>
                          {lead.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold text-white">
                        ${lead.estimatedValue?.toLocaleString() || 0} MXN
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-gray-500">
                      No hay prospectos registrados aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Integration Status (1 col) */}
        <div className="p-5 rounded-2xl bg-[#0c111e] border border-[#1b2538] space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Estado de Integraciones</h2>
            <Link
              href="/marketing/integrations"
              className="text-xs text-bunker-400 hover:text-bunker-300 flex items-center gap-1 font-semibold"
            >
              Gestionar
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.integrations?.map((it: any) => (
              <div key={it.id} className="p-3 rounded-xl bg-[#090d16] border border-[#19243a] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-white text-xs">{it.name}</div>
                  <div className="text-[10px] text-gray-400 truncate max-w-[180px]">
                    {it.status === "connected" ? "Sincronizado correctamente" : it.errorMessage || "Requiere credenciales"}
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  it.status === "connected"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                }`}>
                  {it.status === "connected" ? "CONECTADO" : "PENDIENTE"}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-bunker-950/40 border border-bunker-500/20 text-xs text-bunker-200">
            <div className="font-semibold text-white flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-bunker-400" />
              Módulo Agéntico Bunker AI
            </div>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              Preparado para análisis autónomo de pautas publicitarias e informes para el cliente.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activities Feed */}
      <div className="p-5 rounded-2xl bg-[#0c111e] border border-[#1b2538] space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">Bitácora de Actividades Comerciales</h2>
          <Link
            href="/crm/activities"
            className="text-xs text-bunker-400 hover:text-bunker-300 font-semibold"
          >
            Ver todas
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data?.recentActivities?.map((act: any) => (
            <div key={act.id} className="p-3 rounded-xl bg-[#090d16] border border-[#19243a] flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-bunker-500/10 border border-bunker-500/20 flex items-center justify-center text-bunker-400 mt-0.5 flex-shrink-0">
                <PhoneCall className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white text-xs truncate">{act.title}</div>
                <p className="text-[11px] text-gray-400 line-clamp-1">{act.description}</p>
                <div className="text-[10px] text-gray-500 mt-1">
                  {act.client?.name || act.lead?.name || "Sin entidad"} · {new Date(act.performedAt).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
