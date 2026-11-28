"use client";

import React, { Suspense } from "react";
import Link from "next/link";
import { useActiveClientId } from "@/hooks/useActiveClientId";
import { Users, Radio, ShieldCheck, RefreshCw } from "lucide-react";
import { UsersManagementPanel } from "@/components/settings/UsersManagementPanel";
import { ROUTES } from "@/lib/constants/routes";

export default function TeamUsersPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-semibold text-[#8C929D] flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
          <span>Cargando directorio de equipo...</span>
        </div>
      }
    >
      <TeamUsersContent />
    </Suspense>
  );
}

function TeamUsersContent() {
  const activeClientId = useActiveClientId();
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Cabecera Estilo Cápsula Orvion */}
      <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] p-6 shadow-orvion">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="orvion-badge-gold">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                <span>Gestión de Equipo & Accesos</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F8F9FA] dark:bg-[#1A1D24] text-[#8C929D] border border-[#E2E5EB] dark:border-[#242A35]">
                Roles: Asesores · Directores · Admins
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#121417] dark:text-white tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-amber-500 shrink-0" />
              <span>Directorio de Asesores & Usuarios</span>
            </h1>
            <p className="text-xs text-[#8C929D] font-medium max-w-2xl leading-relaxed">
              Alta de nuevos asesores comerciales, asignación de empresas cliente, configuración de roles de acceso y generación de credenciales seguras.
            </p>
          </div>

          {/* Navegación rápida entre Supervisión en Vivo y Directorio */}
          <div className="flex items-center gap-2 p-1.5 bg-[#F8F9FA] dark:bg-[#1A1D24] rounded-full border border-[#E2E5EB] dark:border-[#242A35] self-start lg:self-center shadow-2xs">
            <Link
              href={activeClientId ? `${ROUTES.TEAM_LIVE}?clientId=${encodeURIComponent(activeClientId)}` : ROUTES.TEAM_LIVE}
              className="px-4 py-2 rounded-full text-xs font-semibold text-[#8C929D] hover:text-[#121417] dark:hover:text-white flex items-center gap-1.5 transition-all"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Supervisión en Vivo</span>
            </Link>
            <div className="px-4 py-2 rounded-full text-xs font-extrabold bg-[#121417] dark:bg-white text-white dark:text-[#121417] shadow-orvion flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              <span>Directorio de Usuarios</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel Principal de Gestión de Usuarios */}
      <UsersManagementPanel />
    </div>
  );
}
