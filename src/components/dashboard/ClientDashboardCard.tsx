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
    <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] hover:border-[#121417]/40 dark:hover:border-white/30 p-6 shadow-orvion hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
      <div>
        {/* Cabecera de la tarjeta: Logo, nombre, estado y cápsula de navegación */}
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-[#F2F4F7] dark:border-[#1F242D]">
          <div className="flex items-center gap-3.5 min-w-0">
            {client.logoUrl && !imageError ? (
              <img
                src={client.logoUrl}
                alt={client.name}
                onError={() => setImageError(true)}
                className="w-14 h-14 rounded-2xl object-cover border border-[#E2E5EB] dark:border-[#2A2E37] shrink-0 shadow-2xs"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-[#F3F4F7] dark:bg-[#1E2229] text-[#121417] dark:text-white font-bold text-base flex items-center justify-center border border-[#E2E5EB] dark:border-[#2A2E37] shrink-0 shadow-2xs">
                {initials}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  href={`/dashboard?clientId=${client.id}`}
                  className="font-bold text-[#121417] dark:text-white text-base hover:opacity-80 truncate transition-opacity"
                >
                  {client.name}
                </Link>
                <span className="orvion-badge-lime text-[10px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#121417] animate-pulse" />
                  Activo
                </span>
              </div>
              <p className="text-xs text-[#8C929D] truncate mt-1 font-medium">
                {client.companyName && client.companyName !== client.name ? `${client.companyName} · ` : ""}
                {client.industry || "General"}
              </p>
            </div>
          </div>

          {/* Botón circular de acceso directo */}
          <Link
            href={`/dashboard?clientId=${client.id}`}
            title={`Abrir panel individual de ${client.name}`}
            className="w-9 h-9 rounded-full bg-[#F3F4F7] dark:bg-[#1E2229] hover:bg-[#121417] dark:hover:bg-white text-[#121417] hover:text-[#D4F933] dark:text-white dark:hover:text-[#121417] flex items-center justify-center shrink-0 transition-all shadow-2xs group-hover:scale-105"
          >
            <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>

        {/* Ficha técnica: 3 mini-bloques de métricas en cápsulas redondeadas */}
        <div className="grid grid-cols-3 gap-2.5 py-4 border-b border-[#F2F4F7] dark:border-[#1F242D]">
          <div className="p-3 rounded-2xl bg-[#F8F9FA] dark:bg-[#181B22] border border-[#E2E5EB]/60 dark:border-[#242A35]">
            <div className="flex items-center gap-1.5 text-xs text-[#8C929D]">
              <Users className="w-3.5 h-3.5 text-[#121417] dark:text-[#D4F933] shrink-0" />
              <span>Prospectos</span>
            </div>
            <div className="text-base font-extrabold text-[#121417] dark:text-white mt-1">
              {formatNumber(client.leadsCount)}
            </div>
            <div className="text-[10px] text-[#8C929D] truncate font-medium mt-0.5">
              {client.leadsThisWeekCount > 0 ? `+${formatNumber(client.leadsThisWeekCount)} 7d` : "Sin nuevos"}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F8F9FA] dark:bg-[#181B22] border border-[#E2E5EB]/60 dark:border-[#242A35]">
            <div className="flex items-center gap-1.5 text-xs text-[#8C929D]">
              <KanbanSquare className="w-3.5 h-3.5 text-[#121417] dark:text-[#D4F933] shrink-0" />
              <span>Ventas</span>
            </div>
            <div className="text-base font-extrabold text-[#121417] dark:text-white mt-1">
              {formatNumber(client.openOpportunitiesCount)}
            </div>
            <div className="text-[10px] text-[#8C929D] truncate font-medium mt-0.5">
              {client.wonRevenue > 0 ? formatCompactMoney(client.wonRevenue) : "En proceso"}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F8F9FA] dark:bg-[#181B22] border border-[#E2E5EB]/60 dark:border-[#242A35]">
            <div className="flex items-center gap-1.5 text-xs text-[#8C929D]">
              <CheckSquare className="w-3.5 h-3.5 text-[#121417] dark:text-[#D4F933] shrink-0" />
              <span>Tareas</span>
            </div>
            <div className="text-base font-extrabold text-[#121417] dark:text-white mt-1">
              {formatNumber(client.pendingTasksCount)}
            </div>
            <div className="text-[10px] text-[#8C929D] truncate font-medium mt-0.5">
              Pendientes
            </div>
          </div>
        </div>

        {/* Ficha técnica: Brand Manager y conexiones activas */}
        <div className="py-3.5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-[#475467] dark:text-[#94A3B8]">
            <span className="flex items-center gap-1.5 text-[#8C929D]">
              <UserCheck className="w-3.5 h-3.5 text-[#8C929D]" />
              Brand Manager:
            </span>
            <span className="font-semibold text-[#121417] dark:text-white">
              {client.brandManagerName || "Dirección Bunker"}
            </span>
          </div>

          <div className="flex items-center justify-between text-[#475467] dark:text-[#94A3B8]">
            <span className="flex items-center gap-1.5 text-[#8C929D]">
              <Plug className="w-3.5 h-3.5 text-[#8C929D]" />
              Conexiones:
            </span>
            <div className="flex items-center gap-1">
              {client.connectedAccounts.length > 0 ? (
                client.connectedAccounts.slice(0, 4).map((acc) => (
                  <SocialNetworkIcon
                    key={acc.id}
                    type={acc.accountType || "meta"}
                    size="xs"
                    className="shadow-2xs rounded-full"
                  />
                ))
              ) : (
                <span className="text-[11px] text-[#8C929D]">Sin conexiones</span>
              )}
              {client.connectedAccounts.length > 4 && (
                <span className="text-[10px] text-[#8C929D] font-medium ml-0.5">
                  +{client.connectedAccounts.length - 4}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Botón principal y accesos directos en cápsula */}
      <div className="pt-3 border-t border-[#F2F4F7] dark:border-[#1F242D] space-y-2.5">
        <Link
          href={`/dashboard?clientId=${client.id}`}
          className="w-full h-11 px-5 rounded-full bg-[#121417] hover:bg-[#1E2229] dark:bg-white dark:hover:bg-[#F3F4F7] text-white dark:text-[#121417] text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-all group-hover:scale-[1.01]"
        >
          <span>Abrir Panel de Control</span>
          <ArrowRight className="w-4 h-4 text-[#D4F933] dark:text-[#121417] group-hover:translate-x-1 transition-transform" />
        </Link>

        <div className="flex items-center justify-between pt-0.5">
          <Link
            href={`/inbox?clientId=${client.id}`}
            className="px-3 py-1 rounded-full bg-[#F3F4F7] dark:bg-[#1E2229] hover:bg-[#E2E5EB] dark:hover:bg-[#2A2E37] text-[11px] font-semibold text-[#475467] dark:text-[#CBD5E1] flex items-center gap-1.5 transition-colors"
          >
            <MessageSquare className="w-3 h-3 text-[#8C929D]" />
            <span>Bandeja</span>
          </Link>
          <Link
            href={`/crm/clients/${client.id}`}
            className="px-3 py-1 rounded-full bg-[#F3F4F7] dark:bg-[#1E2229] hover:bg-[#E2E5EB] dark:hover:bg-[#2A2E37] text-[11px] font-semibold text-[#475467] dark:text-[#CBD5E1] flex items-center gap-1.5 transition-colors"
          >
            <FileText className="w-3 h-3 text-[#8C929D]" />
            <span>Ficha</span>
          </Link>
          <Link
            href={`/campaigns?clientId=${client.id}`}
            className="px-3 py-1 rounded-full bg-[#F3F4F7] dark:bg-[#1E2229] hover:bg-[#E2E5EB] dark:hover:bg-[#2A2E37] text-[11px] font-semibold text-[#475467] dark:text-[#CBD5E1] flex items-center gap-1.5 transition-colors"
          >
            <LineChart className="w-3 h-3 text-[#8C929D]" />
            <span>Campañas</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
