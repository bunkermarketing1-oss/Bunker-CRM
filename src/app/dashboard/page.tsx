"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useClientOptions } from "@/hooks/useClientOptions";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  ChevronRight,
  Inbox,
  LayoutGrid,
  LineChart,
  Plus,
  Users,
} from "lucide-react";
import GeneralDashboardGrid from "@/components/dashboard/GeneralDashboardGrid";
import IndividualBrandDashboard from "@/components/dashboard/IndividualBrandDashboard";
import { useDashboard } from "@/hooks/useDashboard";
import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/lib/constants/routes";

function DashboardPageContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams?.get("clientId") || undefined;
  const { dashboard, loading, error } = useDashboard(clientId);
  const { user } = useAuth();
  const clients = useClientOptions();
  const activeClient = clientId && clientId !== "all" ? clients.find((c) => c.id === clientId) : null;
  const [now] = useState(() => new Date());
  const [searchTerm, setSearchTerm] = useState("");
  const isClient = Boolean(user?.isClientUser);
  const metrics = dashboard?.metrics;

  const today = new Intl.DateTimeFormat("es-CO", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(now);
  const formattedToday = `${today.charAt(0).toUpperCase()}${today.slice(1)}`;

  return (
    <div className="space-y-6">
      {/* 1. Barra Flotante Superior Estilo Cápsula Orvion */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Píldoras de Navegación Rápida */}
        <div className="bg-white dark:bg-[#121417] p-1.5 rounded-full border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion inline-flex items-center gap-1 overflow-x-auto">
          <Link
            href={ROUTES.DASHBOARD}
            className="px-4 py-2 rounded-full text-xs font-bold bg-[#121417] dark:bg-white text-white dark:text-[#121417] shadow-xs flex items-center gap-1.5 transition-all"
          >
            <LayoutGrid className="w-3.5 h-3.5 text-amber-500" />
            <span>Dashboard</span>
          </Link>
          <Link
            href={ROUTES.REPORTS}
            className="px-4 py-2 rounded-full text-xs font-semibold text-[#667085] hover:text-[#121417] dark:text-[#94A3B8] dark:hover:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] flex items-center gap-1.5 transition-all"
          >
            <LineChart className="w-3.5 h-3.5" />
            <span>Métricas</span>
          </Link>
          <Link
            href={ROUTES.INBOX}
            className="px-4 py-2 rounded-full text-xs font-semibold text-[#667085] hover:text-[#121417] dark:text-[#94A3B8] dark:hover:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] flex items-center gap-1.5 transition-all"
          >
            <Inbox className="w-3.5 h-3.5" />
            <span>Bandeja</span>
          </Link>
          <Link
            href={ROUTES.LEADS}
            className="px-4 py-2 rounded-full text-xs font-semibold text-[#667085] hover:text-[#121417] dark:text-[#94A3B8] dark:hover:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] flex items-center gap-1.5 transition-all"
          >
            <Users className="w-3.5 h-3.5" />
            <span>Prospectos</span>
          </Link>
        </div>

        {/* Cápsula de Fecha y Botón de Acción Rápida */}
        <div className="flex items-center gap-2">
          <div className="bg-white dark:bg-[#121417] px-3.5 py-2 rounded-full border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion flex items-center gap-2 text-xs font-semibold text-[#121417] dark:text-white">
            <Calendar className="w-3.5 h-3.5 text-[#8C929D]" />
            <span>{formattedToday}</span>
          </div>

          {!isClient && (
            <Link
              href={ROUTES.CLIENTS}
              className="px-4 py-2 rounded-full bg-[#121417] hover:bg-[#1E2229] dark:bg-white dark:hover:bg-[#F3F4F7] text-white dark:text-[#121417] text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all hover:scale-105"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Nueva Empresa</span>
            </Link>
          )}
        </div>
      </div>

      {/* 2. Banner de Título Heroico Estilo Orvion */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-2">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs text-[#8C929D] font-medium">
            <span>Bunker CRM</span>
            <ChevronRight className="w-3 h-3" />
            <span className="font-semibold text-[#121417] dark:text-white">
              {activeClient ? activeClient.name : isClient ? user?.clientName ?? "Tu Empresa" : "Directorio General"}
            </span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#121417] dark:text-white tracking-tight leading-tight">
            {activeClient
              ? `Panel de ${activeClient.name}`
              : isClient
              ? `Resumen de ${user?.clientName ?? "tu empresa"}`
              : "Rendimiento General de Empresas"}
          </h1>

          <p className="text-xs text-[#8C929D] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs animate-pulse" />
            <span>
              {activeClient
                ? "Métricas en tiempo real, canales integrados y estado de captación"
                : isClient
                ? "Estado operativo, canales conectados y prospectos recientes"
                : "Monitoreo centralizado multimarca, volumen comercial y conexiones activas"}
            </span>
          </p>
        </div>

        {/* Acciones en cápsulas secundarias */}
        {activeClient && !isClient && (
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={ROUTES.DASHBOARD}
              className="px-4 py-2 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] text-xs font-semibold text-[#121417] dark:text-white shadow-orvion flex items-center gap-1.5 transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#8C929D]" />
              <span>Volver a todas</span>
            </Link>
            <Link
              href={`/inbox?clientId=${activeClient.id}`}
              className="px-4 py-2 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] text-xs font-semibold text-[#121417] dark:text-white shadow-orvion flex items-center gap-1.5 transition-all"
            >
              <Inbox className="w-3.5 h-3.5 text-[#8C929D]" />
              <span>Bandeja</span>
            </Link>
            <Link
              href={`/crm/clients/${activeClient.id}`}
              className="px-4 py-2 rounded-full bg-[#121417] hover:bg-[#1E2229] text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all hover:scale-105"
            >
              <Building2 className="w-3.5 h-3.5 text-amber-400" />
              <span>Ficha CRM</span>
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-[28px] bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-xs text-red-700 dark:text-red-400 flex items-center gap-2.5 shadow-orvion">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading && !dashboard ? (
        <DashboardSkeleton />
      ) : dashboard && metrics ? (
        <>
          {!activeClient && !isClient ? (
            <GeneralDashboardGrid
              clientCards={dashboard.clientCards || []}
              metrics={metrics}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          ) : (
            <IndividualBrandDashboard
              metrics={metrics}
              dashboard={dashboard}
              activeClientId={activeClient?.id}
              isClient={isClient}
              now={now}
            />
          )}
        </>
      ) : null}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardPageContent />
    </Suspense>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-busy="true" aria-label="Cargando panel">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-40 rounded-[28px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion" />
        ))}
      </div>
      <div className="h-14 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-80 rounded-[28px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion" />
        ))}
      </div>
    </div>
  );
}
