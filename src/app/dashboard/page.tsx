"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useClientOptions } from "@/hooks/useClientOptions";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  LineChart,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
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

  const today = new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(now);
  const formattedToday = `${today.charAt(0).toUpperCase()}${today.slice(1)}`;

  return (
    <div className="space-y-6">
      {/* Cabecera dinámica: Panel individual de marca vs Dashboard General de empresas */}
      {activeClient && !isClient ? (
        <div className="space-y-3">
          <Link
            href={ROUTES.DASHBOARD}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#EAECF0] hover:bg-[#F8F9FA] text-xs font-semibold text-[#344054] shadow-2xs transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#667085]" />
            <span>Volver a todas las marcas</span>
          </Link>
          <PageHeader
            section={`Marca: ${activeClient.name}`}
            title={`Panel de ${activeClient.name}`}
            description={`${formattedToday} · Métricas y fichas técnicas en tiempo real`}
            actions={
              <>
                <Link
                  href={`/inbox?clientId=${activeClient.id}`}
                  className="h-9 px-3.5 rounded-2xl bg-white border border-[#EAECF0] text-xs font-semibold text-[#101828] flex items-center gap-1.5 hover:bg-[#F8F9FA]"
                >
                  Bandeja omnicanal
                </Link>
                <Link
                  href={`/crm/clients/${activeClient.id}`}
                  className="btn-black-gold h-9 px-3.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5"
                >
                  Ficha comercial 360°
                </Link>
              </>
            }
          />
        </div>
      ) : (
        <PageHeader
          section={isClient ? "Portal" : "Directorio de Marcas"}
          title={isClient ? `Resumen de ${user?.clientName ?? "tu empresa"}` : "Dashboard General de Empresas"}
          description={
            isClient
              ? `${formattedToday} · Estado de tu cuenta y prospectos`
              : `${formattedToday} · Selecciona cualquier marca para abrir su panel individual de control`
          }
          actions={
            !isClient ? (
              <>
                <Link
                  href={ROUTES.CLIENTS}
                  className="h-9 px-3.5 rounded-2xl bg-white border border-[#EAECF0] text-xs font-semibold text-[#101828] flex items-center gap-1.5 hover:bg-[#F8F9FA]"
                >
                  <Building2 className="w-3.5 h-3.5 text-[#667085]" />
                  Gestionar clientes
                </Link>
                <Link
                  href={ROUTES.REPORTS}
                  className="btn-black-gold h-9 px-3.5 rounded-2xl text-xs font-semibold flex items-center gap-1.5"
                >
                  <LineChart className="w-3.5 h-3.5 text-amber-400" />
                  Ver reportes
                </Link>
              </>
            ) : null
          }
        />
      )}

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
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
          <div key={i} className="h-36 rounded-3xl bg-white border border-[#EAECF0]" />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-72 rounded-3xl bg-white border border-[#EAECF0]" />
        ))}
      </div>
    </div>
  );
}
