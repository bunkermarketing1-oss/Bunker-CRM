/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CheckSquare,
  FileText,
  KanbanSquare,
  LineChart,
  MessageSquare,
  Plug,
  UserCheck,
  Users,
} from "lucide-react";
import { SocialNetworkIcon } from "@/components/common/SocialNetworkIcon";
import { initialsOf } from "@/lib/greeting";
import { formatCompactMoney, formatNumber } from "@/lib/format";
import type { DashboardClientCard as DashboardClientCardType } from "@/types/dashboard";

interface ClientDashboardCardProps {
  client: DashboardClientCardType;
}

export default function ClientDashboardCard({ client }: ClientDashboardCardProps) {
  const [imageError, setImageError] = useState(false);
  const initials = initialsOf(client.name, "CL");

  return (
    <div className="bg-white rounded-3xl border border-[#EAECF0] hover:border-amber-400/70 p-5 shadow-2xs hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
      <div>
        {/* Cabecera de la tarjeta: Logo, nombre, estado y flecha de acceso rápido */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#F2F4F7]">
          <div className="flex items-center gap-3.5 min-w-0">
            {client.logoUrl && !imageError ? (
              <img
                src={client.logoUrl}
                alt={client.name}
                onError={() => setImageError(true)}
                className="w-14 h-14 rounded-2xl object-cover border border-[#EAECF0] shrink-0 shadow-2xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/15 to-amber-600/30 text-amber-800 font-bold text-base flex items-center justify-center border border-amber-200 shrink-0 shadow-2xs">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard?clientId=${client.id}`}
                  className="font-bold text-[#101828] text-base hover:text-amber-600 truncate transition-colors"
                >
                  {client.name}
                </Link>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Activo
                </span>
              </div>
              <p className="text-xs text-[#667085] truncate mt-0.5 font-medium">
                {client.companyName && client.companyName !== client.name ? `${client.companyName} · ` : ""}
                {client.industry || "General"}
              </p>
            </div>
          </div>

          {/* Flecha de navegación al panel individual de la marca */}
          <Link
            href={`/dashboard?clientId=${client.id}`}
            title={`Abrir panel individual de ${client.name}`}
            className="w-9 h-9 rounded-xl bg-[#F8F9FA] hover:bg-[#0F172A] border border-[#EAECF0] hover:border-[#0F172A] flex items-center justify-center text-[#667085] hover:text-amber-400 shrink-0 transition-all shadow-2xs group-hover:scale-105"
          >
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Ficha técnica: 3 mini-bloques de métricas en tiempo real */}
        <div className="grid grid-cols-3 gap-2 py-4 border-b border-[#F2F4F7]">
          <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#EAECF0]/60">
            <div className="flex items-center gap-1.5 text-xs text-[#667085]">
              <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <span>Leads</span>
            </div>
            <div className="text-base font-bold text-[#101828] mt-1">
              {formatNumber(client.leadsCount)}
            </div>
            <div className="text-[10px] text-[#98A2B3] truncate">
              {client.leadsThisWeekCount > 0 ? `+${formatNumber(client.leadsThisWeekCount)} 7d` : "Sin nuevos"}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#EAECF0]/60">
            <div className="flex items-center gap-1.5 text-xs text-[#667085]">
              <KanbanSquare className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Deals</span>
            </div>
            <div className="text-base font-bold text-[#101828] mt-1">
              {formatNumber(client.openOpportunitiesCount)}
            </div>
            <div className="text-[10px] text-[#98A2B3] truncate">
              {client.wonRevenue > 0 ? formatCompactMoney(client.wonRevenue) : "En pipeline"}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#EAECF0]/60">
            <div className="flex items-center gap-1.5 text-xs text-[#667085]">
              <CheckSquare className="w-3.5 h-3.5 text-purple-600 shrink-0" />
              <span>Tareas</span>
            </div>
            <div className="text-base font-bold text-[#101828] mt-1">
              {formatNumber(client.pendingTasksCount)}
            </div>
            <div className="text-[10px] text-[#98A2B3] truncate">
              Pendientes
            </div>
          </div>
        </div>

        {/* Ficha técnica: Información operativa y canales integrados */}
        <div className="py-3.5 space-y-2.5 text-xs">
          <div className="flex items-center justify-between text-[#475467]">
            <span className="flex items-center gap-1.5 text-[#667085]">
              <UserCheck className="w-3.5 h-3.5 text-slate-400" />
              Brand Manager:
            </span>
            <span className="font-semibold text-[#101828]">
              {client.brandManagerName || "Dirección Bunker"}
            </span>
          </div>

          <div className="flex items-center justify-between text-[#475467]">
            <span className="flex items-center gap-1.5 text-[#667085]">
              <Plug className="w-3.5 h-3.5 text-slate-400" />
              Canales activos:
            </span>
            <div className="flex items-center gap-1">
              {client.connectedAccounts.length > 0 ? (
                client.connectedAccounts.slice(0, 4).map((acc) => (
                  <SocialNetworkIcon
                    key={acc.id}
                    type={acc.accountType || "meta"}
                    size="xs"
                    className="shadow-2xs"
                  />
                ))
              ) : (
                <span className="text-[11px] text-[#98A2B3]">Sin canales</span>
              )}
              {client.connectedAccounts.length > 4 && (
                <span className="text-[10px] text-[#667085] font-medium ml-0.5">
                  +{client.connectedAccounts.length - 4}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Acciones de la tarjeta: Botón principal y accesos directos */}
      <div className="pt-3 border-t border-[#F2F4F7] space-y-2">
        <Link
          href={`/dashboard?clientId=${client.id}`}
          className="w-full h-10 px-4 rounded-xl bg-[#0F172A] hover:bg-slate-800 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors group-hover:bg-[#0F172A]"
        >
          <span>Abrir Panel Individual</span>
          <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
        </Link>

        <div className="flex items-center justify-between pt-1 text-[11px] font-medium text-[#667085]">
          <Link
            href={`/inbox?clientId=${client.id}`}
            className="hover:text-[#101828] flex items-center gap-1 transition-colors"
          >
            <MessageSquare className="w-3 h-3 text-slate-400" />
            <span>Bandeja</span>
          </Link>
          <Link
            href={`/crm/clients/${client.id}`}
            className="hover:text-[#101828] flex items-center gap-1 transition-colors"
          >
            <FileText className="w-3 h-3 text-slate-400" />
            <span>Ficha 360°</span>
          </Link>
          <Link
            href={`/campaigns?clientId=${client.id}`}
            className="hover:text-[#101828] flex items-center gap-1 transition-colors"
          >
            <LineChart className="w-3 h-3 text-slate-400" />
            <span>Campañas</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
