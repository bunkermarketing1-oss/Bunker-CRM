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
      {/* Editorial Header Banner */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E8E6DF]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 text-[10px] font-semibold rounded-full bg-[#FBF1ED] text-[#C15F3C] border border-[#F3D6CB]">
              OPERATIVO EN PRODUCCIÓN
            </span>
            <span className="text-[#9C9890] text-xs">· Bunker Agency v1.0</span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-[#1F1E1D] tracking-tight">
            Panel de Control Comercial & Marketing
          </h1>
          <p className="text-xs text-[#716F6A] mt-1.5 max-w-2xl leading-relaxed">
            Supervisión integral de prospectos, pipeline comercial, optimización de pautas con IA y actividades automáticas.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchDashboard}
            className="px-3.5 py-2 rounded-xl bg-[#FFFFFF] border border-[#E8E6DF] text-[#716F6A] hover:text-[#1F1E1D] hover:bg-[#FAF8F2] transition-all text-xs font-medium flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#D97757]" : ""}`} />
            <span>Actualizar</span>
          </button>
          <Link
            href="/crm/leads"
            className="px-4 py-2 rounded-xl bg-[#D97757] hover:bg-[#C15F3C] text-white transition-all text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Lead</span>
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm hover:border-[#DDD9CF] transition-all">
          <div className="flex items-center justify-between text-[#716F6A] mb-3">
            <span className="text-xs font-medium">Prospectos / Leads</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF9F5] border border-[#E8E6DF] flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-[#D97757]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#1F1E1D] tracking-tight">{metrics.totalLeads}</div>
          <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1 mt-1.5">
            <TrendingUp className="w-3 h-3" />
            <span>Captación activa multicanal</span>
          </div>
        </div>

        {/* Active Clients */}
        <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm hover:border-[#DDD9CF] transition-all">
          <div className="flex items-center justify-between text-[#716F6A] mb-3">
            <span className="text-xs font-medium">Clientes Activos</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF9F5] border border-[#E8E6DF] flex items-center justify-center">
              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#1F1E1D] tracking-tight">{metrics.activeClients}</div>
          <div className="text-[11px] text-[#716F6A] mt-1.5">
            Cuentas gestionadas por la agencia
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm hover:border-[#DDD9CF] transition-all">
          <div className="flex items-center justify-between text-[#716F6A] mb-3">
            <span className="text-xs font-medium">Valor en Pipeline</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF9F5] border border-[#E8E6DF] flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-[#C15F3C]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#1F1E1D] tracking-tight">
            ${metrics.totalPipelineValue.toLocaleString()} <span className="text-xs font-normal text-[#9C9890]">MXN</span>
          </div>
          <div className="text-[11px] text-[#C15F3C] mt-1.5 font-medium">
            {metrics.openDealsCount} oportunidades abiertas
          </div>
        </div>

        {/* Conversion Rate */}
        <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm hover:border-[#DDD9CF] transition-all">
          <div className="flex items-center justify-between text-[#716F6A] mb-3">
            <span className="text-xs font-medium">Tasa de Conversión</span>
            <div className="w-7 h-7 rounded-lg bg-[#FAF9F5] border border-[#E8E6DF] flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#1F1E1D] tracking-tight">{metrics.conversionRate}%</div>
          <div className="text-[11px] text-[#716F6A] mt-1.5">
            ${metrics.wonRevenue.toLocaleString()} MXN ganados
          </div>
        </div>
      </div>

      {/* Secondary Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E8E6DF] flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-[#716F6A]">Tareas Pendientes</div>
            <div className="text-base font-bold text-[#1F1E1D]">{metrics.pendingTasks}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E8E6DF] flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-[#716F6A]">Cuentas Conectadas</div>
            <div className="text-base font-bold text-[#1F1E1D]">
              {metrics.connectedIntegrations} <span className="text-xs text-[#9C9890]">/ {metrics.totalIntegrations}</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E8E6DF] flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-pink-50 border border-pink-100 flex items-center justify-center text-pink-600">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-[#716F6A]">Posts Programados</div>
            <div className="text-base font-bold text-[#1F1E1D]">{metrics.scheduledPosts}</div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-[#FFFFFF] border border-[#E8E6DF] flex items-center gap-3 shadow-sm">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-[#716F6A]">SMS Enviados</div>
            <div className="text-base font-bold text-[#1F1E1D]">{metrics.totalSmsSent}</div>
          </div>
        </div>
      </div>

      {/* Main Section: Recent Leads Table & Integrations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Leads (2 cols) */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E6DF]">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#1F1E1D]">Prospectos Recientes en Embudo</h2>
              <span className="text-[10px] font-semibold bg-[#FBF1ED] text-[#C15F3C] px-2 py-0.5 rounded-full border border-[#F3D6CB]">
                En vivo
              </span>
            </div>
            <Link
              href="/crm/leads"
              className="text-xs text-[#D97757] hover:text-[#C15F3C] flex items-center gap-1 font-semibold"
            >
              Ver todos
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#E8E6DF] text-[#716F6A] font-semibold">
                  <th className="pb-3 font-medium">Nombre / Empresa</th>
                  <th className="pb-3 font-medium">Origen</th>
                  <th className="pb-3 font-medium">Score IA</th>
                  <th className="pb-3 font-medium">Estado</th>
                  <th className="pb-3 text-right font-medium">Valor Estimado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EEE6]">
                {data?.recentLeads?.length > 0 ? (
                  data.recentLeads.map((lead: any) => (
                    <tr key={lead.id} className="hover:bg-[#FAF9F5] transition-colors">
                      <td className="py-3.5">
                        <div className="font-semibold text-[#1F1E1D]">{lead.name}</div>
                        <div className="text-[11px] text-[#716F6A]">{lead.companyName || "Particular"}</div>
                      </td>
                      <td className="py-3.5">
                        <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-[#F3F1EB] text-[#716F6A] border border-[#E8E6DF]">
                          {lead.source.replace("_", " ").toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {lead.qualification}/100
                        </span>
                      </td>
                      <td className="py-3.5">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                          lead.status === "qualified" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                          lead.status === "contacted" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                          lead.status === "converted" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                          "bg-stone-100 text-stone-700 border border-stone-200"
                        }`}>
                          {lead.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 text-right font-bold text-[#1F1E1D]">
                        ${lead.estimatedValue?.toLocaleString() || 0} MXN
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-[#9C9890]">
                      No hay prospectos registrados aún.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Integration Status (1 col) */}
        <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8E6DF]">
            <h2 className="text-sm font-bold text-[#1F1E1D]">Estado de Integraciones</h2>
            <Link
              href="/marketing/integrations"
              className="text-xs text-[#D97757] hover:text-[#C15F3C] flex items-center gap-1 font-semibold"
            >
              Gestionar
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            {data?.integrations?.map((it: any) => (
              <div key={it.id} className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] flex items-center justify-between">
                <div>
                  <div className="font-semibold text-[#1F1E1D] text-xs">{it.name}</div>
                  <div className="text-[10px] text-[#716F6A] truncate max-w-[170px]">
                    {it.status === "connected" ? "Sincronizado correctamente" : it.errorMessage || "Requiere credenciales"}
                  </div>
                </div>

                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${
                  it.status === "connected"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }`}>
                  {it.status === "connected" ? "CONECTADO" : "PENDIENTE"}
                </span>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-xl bg-[#FBF1ED] border border-[#F3D6CB] text-xs text-[#1F1E1D]">
            <div className="font-semibold text-[#C15F3C] flex items-center gap-1.5 mb-1">
              <Sparkles className="w-3.5 h-3.5 text-[#D97757]" />
              Módulo Agéntico Bunker AI
            </div>
            <p className="text-[11px] text-[#716F6A] leading-relaxed">
              Supervisión de pautas publicitarias e informes de retorno de inversión para clientes.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-[#E8E6DF]">
          <h2 className="text-sm font-bold text-[#1F1E1D]">Bitácora de Actividades Comerciales</h2>
          <Link
            href="/crm/activities"
            className="text-xs text-[#D97757] hover:text-[#C15F3C] font-semibold"
          >
            Ver todas
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data?.recentActivities?.map((act: any) => (
            <div key={act.id} className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] flex items-start gap-3">
              <div className="w-7 h-7 rounded-lg bg-[#FFFFFF] border border-[#E8E6DF] flex items-center justify-center text-[#D97757] mt-0.5 flex-shrink-0 shadow-sm">
                <PhoneCall className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[#1F1E1D] text-xs truncate">{act.title}</div>
                <p className="text-[11px] text-[#716F6A] line-clamp-1">{act.description}</p>
                <div className="text-[10px] text-[#9C9890] mt-1">
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
