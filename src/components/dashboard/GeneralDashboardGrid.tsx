"use client";

import React, { useMemo, useState } from "react";
import { Building2, KanbanSquare, Plug, Search, Sparkles, Users } from "lucide-react";
import StatCard from "@/components/ui/StatCard";
import EmptyState from "@/components/ui/EmptyState";
import ClientDashboardCard from "@/components/dashboard/ClientDashboardCard";
import { formatCompactMoney, formatNumber } from "@/lib/format";
import type { DashboardClientCard as DashboardClientCardType, DashboardMetrics } from "@/types/dashboard";

interface GeneralDashboardGridProps {
  clientCards: DashboardClientCardType[];
  metrics: DashboardMetrics;
  searchTerm: string;
  onSearchChange: (value: string) => void;
}

type FilterTab = "all" | "active_leads" | "open_deals";

export default function GeneralDashboardGrid({
  clientCards,
  metrics,
  searchTerm,
  onSearchChange,
}: GeneralDashboardGridProps) {
  const [filterTab, setFilterTab] = useState<FilterTab>("all");

  // Filtrado de tarjetas por cliente y pestaña
  const filteredClientCards = useMemo(() => {
    let list = clientCards;

    if (filterTab === "active_leads") {
      list = list.filter((c) => c.leadsThisWeekCount > 0 || c.leadsCount > 0);
    } else if (filterTab === "open_deals") {
      list = list.filter((c) => c.openOpportunitiesCount > 0);
    }

    if (!searchTerm.trim()) return list;
    const term = searchTerm.toLowerCase().trim();
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.companyName && c.companyName.toLowerCase().includes(term)) ||
        (c.industry && c.industry.toLowerCase().includes(term))
    );
  }, [clientCards, searchTerm, filterTab]);

  // Total de canales conectados entre todos los clientes
  const totalConnectedAccounts = useMemo(() => {
    return clientCards.reduce((acc, c) => acc + (c.connectedAccounts?.length || 0), 0);
  }, [clientCards]);

  return (
    <div className="space-y-6">
      {/* 4 Tarjetas Métricas Superiores Estilo Cápsula Orvion */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          emphasis
          icon={Building2}
          label="Empresas registradas"
          subPeriod="Directorio activo"
          value={formatNumber(clientCards.length || metrics.activeClients || 0)}
          hint="Empresas y marcas bajo gestión"
          badgeText="Directorio"
          badgeVariant="lime"
        />
        <StatCard
          icon={Users}
          label="Prospectos totales"
          subPeriod="Últimos 7 días"
          value={formatNumber(metrics.totalLeads)}
          hint={
            metrics.leadsThisWeek > 0
              ? `+${formatNumber(metrics.leadsThisWeek)} captados esta semana`
              : "Sin nuevos esta semana"
          }
          badgeText={metrics.leadsThisWeek > 0 ? `+${metrics.leadsThisWeek}` : "Al día"}
          badgeVariant="lime"
        />
        <StatCard
          icon={KanbanSquare}
          label="Ventas en curso"
          subPeriod="Pipeline comercial"
          value={formatCompactMoney(metrics.openPipelineValue)}
          hint={`${formatNumber(metrics.openDealsCount)} oportunidades abiertas`}
          badgeText="Pipeline"
          badgeVariant="dark"
        />
        <StatCard
          icon={Plug}
          label="Conexiones multicanal"
          subPeriod="APIs en tiempo real"
          value={formatNumber(totalConnectedAccounts)}
          hint="Meta Ads, Instagram, Messenger y SMS"
          badgeText="100% online"
          badgeVariant="lime"
        />
      </div>

      {/* Barra de Filtros y Búsqueda en Cápsula Flotante */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-2 bg-white dark:bg-[#121417] rounded-full border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
        {/* Pestañas de filtro rápido en cápsula */}
        <div className="flex items-center gap-1.5 overflow-x-auto pl-2">
          <button
            type="button"
            onClick={() => setFilterTab("all")}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              filterTab === "all"
                ? "bg-[#121417] dark:bg-white text-white dark:text-[#121417] shadow-xs"
                : "bg-transparent text-[#667085] hover:text-[#121417] dark:text-[#94A3B8] dark:hover:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229]"
            }`}
          >
            Todas ({clientCards.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("active_leads")}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              filterTab === "active_leads"
                ? "bg-[#121417] dark:bg-white text-white dark:text-[#121417] shadow-xs"
                : "bg-transparent text-[#667085] hover:text-[#121417] dark:text-[#94A3B8] dark:hover:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229]"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D4F933]" />
            Con prospectos
          </button>
          <button
            type="button"
            onClick={() => setFilterTab("open_deals")}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              filterTab === "open_deals"
                ? "bg-[#121417] dark:bg-white text-white dark:text-[#121417] shadow-xs"
                : "bg-transparent text-[#667085] hover:text-[#121417] dark:text-[#94A3B8] dark:hover:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229]"
            }`}
          >
            Con ventas
          </button>
        </div>

        {/* Buscador cápsula con contador */}
        <div className="flex items-center gap-2 pr-1">
          <div className="relative flex-1 sm:w-72">
            <Search className="w-4 h-4 text-[#8C929D] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por marca o industria..."
              className="w-full pl-9 pr-4 py-2 bg-[#F8F9FA] dark:bg-[#1A1D24] text-xs text-[#121417] dark:text-white placeholder:text-[#8C929D] rounded-full focus:outline-hidden border border-transparent focus:border-[#E2E5EB] dark:focus:border-[#2A2E37] transition-all"
            />
          </div>
          <span className="hidden sm:inline-flex px-3 py-1.5 rounded-full text-[11px] font-semibold bg-[#F3F4F7] dark:bg-[#1E2229] text-[#121417] dark:text-white shrink-0">
            {filteredClientCards.length} {filteredClientCards.length === 1 ? "marca" : "marcas"}
          </span>
        </div>
      </div>

      {/* Grid de Tarjetas de Marcas Estilo Orvion */}
      {filteredClientCards.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-stretch">
          {filteredClientCards.map((client) => (
            <ClientDashboardCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Building2}
          title="No se encontraron marcas"
          description="Prueba con otro término de búsqueda o registra una nueva empresa en el CRM."
        />
      )}
    </div>
  );
}
