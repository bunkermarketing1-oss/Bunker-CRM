"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  CheckCircle2,
  Key,
  MinusCircle,
  ShieldCheck,
  Users,
  RefreshCw,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import { useSettings } from "@/hooks/useSettings";
import { useAuth } from "@/context/AuthContext";
import { UsersManagementPanel } from "@/components/settings/UsersManagementPanel";
import { ENV_GROUP_LABEL, type EnvGroup } from "@/lib/constants/environment";
import { formatNumber } from "@/lib/format";
import type { EnvVarStatus } from "@/types/settings";

const GROUP_ORDER: EnvGroup[] = ["core", "integrations", "messaging"];

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-xs font-semibold text-[#8C929D] flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
          <span>Cargando configuración...</span>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const isAdmin = user?.role === "ADMIN" && !user?.isClientUser;

  const defaultTab = isAdmin
    ? (tabParam === "agency" || tabParam === "server" ? tabParam : "users")
    : "agency";

  const [activeTab, setActiveTab] = useState<"users" | "agency" | "server">(defaultTab);

  const { settings, loading, error } = useSettings();
  const missingRequired = settings?.environment.filter((v) => v.required && !v.isSet) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        section="Administración"
        title="Configuración"
        description="Administra los usuarios, el equipo comercial y los datos de tu agencia."
      />

      {/* Selector de pestañas estilo Cápsula Orvion */}
      <div className="flex items-center gap-1.5 p-1.5 bg-white dark:bg-[#121417] rounded-full border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion w-fit">
        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab("users")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "users"
                ? "bg-[#121417] text-white dark:bg-white dark:text-[#121417] shadow-xs"
                : "text-[#8C929D] hover:text-[#121417] dark:hover:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229]"
            }`}
          >
            <Users className="w-3.5 h-3.5 text-amber-500" />
            <span>Equipo y Usuarios</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab("agency")}
          className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "agency"
              ? "bg-[#121417] text-white dark:bg-white dark:text-[#121417] shadow-xs"
              : "text-[#8C929D] hover:text-[#121417] dark:hover:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229]"
          }`}
        >
          <Building2 className="w-3.5 h-3.5 text-amber-500" />
          <span>Datos de la Agencia</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab("server")}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === "server"
                ? "bg-[#121417] text-white dark:bg-white dark:text-[#121417] shadow-xs"
                : "text-[#8C929D] hover:text-[#121417] dark:hover:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229]"
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-500" />
            <span>Servicios del Servidor</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-[28px] bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-xs font-semibold text-red-700 dark:text-red-300 flex items-center gap-2.5 shadow-orvion">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* PESTAÑA: EQUIPO Y USUARIOS (CENTRALIZADO) */}
      {activeTab === "users" && isAdmin && <UsersManagementPanel />}

      {/* PESTAÑA: DATOS DE LA AGENCIA */}
      {activeTab === "agency" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          <Panel icon={Building2} title="Información de la Cuenta">
            <dl className="space-y-3.5 text-xs">
              <Row label="Tu Nombre" value={user?.name || "Sin registrar"} />
              <Row label="Tu Correo" value={user?.email || "Sin registrar"} />
              <Row label="Rol de Acceso" value={isAdmin ? "Administrador / CEO" : user?.role || "Usuario"} />
              <Row label="Organización" value={user?.organizationName || "Bunker Agency"} />
            </dl>
          </Panel>

          {settings && (
            <Panel icon={Building2} title="Datos de la Agencia">
              <dl className="space-y-3.5 text-xs">
                <Row label="Nombre Comercial" value={settings.organization.name} />
                <Row label="Identificador" value={settings.organization.slug} mono />
                <Row label="Plan Activo" value={settings.organization.plan} mono />
                <Row label="Empresas Registradas" value={formatNumber(settings.organization.clients)} />
                <Row label="Usuarios en Plataforma" value={formatNumber(settings.organization.adminUsers + settings.organization.clientPortalUsers)} />
                {settings.appUrl && <Row label="Enlace del CRM" value={settings.appUrl} mono />}
              </dl>
            </Panel>
          )}
        </div>
      )}

      {/* PESTAÑA: SERVICIOS Y CONEXIONES DEL SERVIDOR */}
      {activeTab === "server" && isAdmin && (
        <>
          {loading && !settings ? (
            <div className="h-64 rounded-3xl bg-white border border-[#EAECF0] animate-pulse" />
          ) : settings ? (
            <div className="space-y-6">
              {missingRequired.length > 0 ? (
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    Faltan claves obligatorias en el servidor: <strong className="font-mono">{missingRequired.map((v) => v.name).join(", ")}</strong>.
                    Solicita al administrador técnico configurarlas en el panel del servidor para habilitar todas las funciones.
                  </span>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>Todos los servicios y claves obligatorias del servidor están configurados correctamente.</span>
                </div>
              )}

              <Panel icon={Key} title="Servicios y Conexiones del Servidor">
                <div className="space-y-6">
                  {GROUP_ORDER.map((group) => (
                    <EnvGroupList
                      key={group}
                      title={ENV_GROUP_LABEL[group]}
                      vars={settings.environment.filter((v) => v.group === group)}
                    />
                  ))}
                </div>
              </Panel>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-[#667085]">{label}</dt>
      <dd className={`text-right text-[#101828] font-semibold break-all ${mono ? "font-mono text-[11px]" : ""}`}>{value}</dd>
    </div>
  );
}

function EnvGroupList({ title, vars }: { title: string; vars: EnvVarStatus[] }) {
  const setCount = vars.filter((v) => v.isSet).length;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#667085]">{title}</h3>
        <span className="text-[11px] text-[#667085]">
          {setCount}/{vars.length} definidas
        </span>
      </div>
      <ul className="divide-y divide-[#EAECF0] border border-[#EAECF0] rounded-2xl overflow-hidden">
        {vars.map((v) => (
          <li key={v.name} className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-white">
            <div className="min-w-0">
              <div className="font-mono text-[11px] font-semibold text-[#101828] break-all">{v.name}</div>
              <div className="text-[11px] text-[#667085]">{v.description}</div>
            </div>
            <EnvStatusBadge isSet={v.isSet} required={v.required} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function EnvStatusBadge({ isSet, required }: { isSet: boolean; required: boolean }) {
  if (isSet) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5" /> Definida
      </span>
    );
  }
  if (required) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 shrink-0">
        <AlertTriangle className="w-3.5 h-3.5" /> Falta
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-[#667085] shrink-0">
      <MinusCircle className="w-3.5 h-3.5" /> Opcional
    </span>
  );
}
