"use client";

import React, { useMemo } from "react";
import { Building2, KanbanSquare, Plug, Search, Users } from "lucide-react";
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

export default function GeneralDashboardGrid({
  clientCards,
  metrics,
  searchTerm,
  onSearchChange,
}: GeneralDashboardGridProps) {
  // Filtrado de tarjetas por cliente
  const filteredClientCards = useMemo(() => {
    if (!searchTerm.trim()) return clientCards;
    const term = searchTerm.toLowerCase().trim();
    return clientCards.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.companyName && c.companyName.toLowerCase().includes(term)) ||
        (c.industry && c.industry.toLowerCase().includes(term))
    );
  }, [clientCards, searchTerm]);

  // Total de canales conectados entre todos los clientes
  const totalConnectedAccounts = useMemo(() => {
    return clientCards.reduce((acc, c) => acc + (c.connectedAccounts?.length || 0), 0);
  }, [clientCards]);

  return (
    <div className="space-y-6">
      {/* Tira resumen general de la agencia */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          emphasis
          icon={Building2}
          label="Empresas y marcas"
          value={formatNumber(clientCards.length || metrics.activeClients || 0)}
          hint="Marcas activas registradas"
        />
        <StatCard
          icon={Users}
          label="Leads totales"
          value={formatNumber(metrics.totalLeads)}
          hint={
            metrics.leadsThisWeek > 0
              ? `+${formatNumber(metrics.leadsThisWeek)} captados en 7 días`
              : "Sin nuevos esta semana"
          }
        />
        <StatCard
          icon={KanbanSquare}
          label="Pipeline abierto"
          value={formatCompactMoney(metrics.openPipelineValue)}
          hint={`${formatNumber(metrics.openDealsCount)} negocios en curso`}
        />
        <StatCard
          icon={Plug}
          label="Canales conectados"
          value={formatNumber(totalConnectedAccounts)}
          hint="Meta Ads, Instagram, Messenger y SMS"
        />
      </div>

      {/* Barra de Búsqueda de Clientes / Marcas */}
      <div className="flex flex-col sm:row items-stretch sm:items-center justify-between gap-3 p-1.5 bg-white rounded-2xl border border-[#EAECF0] shadow-2xs">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar marca por nombre, empresa o industria..."
            className="w-full pl-9 pr-4 py-2 bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-hidden"
          />
        </div>
        <div className="text-xs text-[#667085] px-3 font-medium">
          Mostrando {filteredClientCards.length} de {clientCards.length} marcas
        </div>
      </div>

      {/* Grid de Tarjetas de Clientes con Logo y Ficha Técnica */}
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
