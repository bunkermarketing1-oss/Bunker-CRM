"use client";

import React from "react";
import { AlertCircle, AlertTriangle, Building2, CheckCircle2, Key, MinusCircle, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Panel from "@/components/ui/Panel";
import { useSettings } from "@/hooks/useSettings";
import { ENV_GROUP_LABEL, type EnvGroup } from "@/lib/constants/environment";
import { formatNumber } from "@/lib/format";
import type { EnvVarStatus } from "@/types/settings";

const GROUP_ORDER: EnvGroup[] = ["core", "integrations", "messaging"];

export default function SettingsPage() {
  const { settings, loading, error } = useSettings();
  const missingRequired = settings?.environment.filter((v) => v.required && !v.isSet) ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        section="Administración"
        title="Configuración de la Agencia & Servidor"
        description="Información de tu agencia y estado de conexión con los servicios del sistema. Por seguridad, las claves secretas nunca se muestran en pantalla."
      />

      {error && (
        <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading && !settings && <div className="h-64 rounded-3xl bg-white border border-[#ECEAE3] animate-pulse" />}

      {settings && (
        <>
          {missingRequired.length > 0 ? (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>
                Faltan claves obligatorias en el servidor: <strong className="font-mono">{missingRequired.map((v) => v.name).join(", ")}</strong>.
                Solicita al administrador técnico configurarlas en el panel del servidor para habilitar todas las funciones.
              </span>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 flex-shrink-0" />
              Todos los servicios y claves obligatorias del servidor están configurados correctamente.
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
            <Panel icon={Building2} title="Datos de la Agencia">
              <dl className="space-y-3 text-xs">
                <Row label="Nombre Comercial" value={settings.organization.name} />
                <Row label="Código de Agencia" value={settings.organization.slug} mono />
                <Row label="Plan de Suscripción" value={settings.organization.plan} mono />
                <Row label="Clientes Registrados" value={formatNumber(settings.organization.clients)} />
                <Row label="Usuarios Administradores" value={formatNumber(settings.organization.adminUsers)} />
                <Row label="Usuarios de Clientes" value={formatNumber(settings.organization.clientPortalUsers)} />
                {settings.appUrl && <Row label="Enlace del CRM" value={settings.appUrl} mono />}
              </dl>
            </Panel>

            <Panel icon={Key} title="Servicios & Conexiones del Servidor" className="xl:col-span-2">
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
        </>
      )}
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <dt className="text-[#8C887E]">{label}</dt>
      <dd className={`text-right text-[#141414] font-semibold break-all ${mono ? "font-mono text-[11px]" : ""}`}>{value}</dd>
    </div>
  );
}

function EnvGroupList({ title, vars }: { title: string; vars: EnvVarStatus[] }) {
  const setCount = vars.filter((v) => v.isSet).length;
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-[#8C887E]">{title}</h3>
        <span className="text-[11px] text-[#8C887E]">
          {setCount}/{vars.length} definidas
        </span>
      </div>
      <ul className="divide-y divide-[#F4F3EE] dark:divide-[#2E2E34] border border-[#ECEAE3] rounded-2xl overflow-hidden">
        {vars.map((v) => (
          <li key={v.name} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
            <div className="min-w-0">
              <div className="font-mono text-[11px] font-semibold text-[#141414] break-all">{v.name}</div>
              <div className="text-[11px] text-[#8C887E]">{v.description}</div>
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
      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 flex-shrink-0">
        <CheckCircle2 className="w-3.5 h-3.5" /> Definida
      </span>
    );
  }
  if (required) {
    return (
      <span className="flex items-center gap-1 text-[10px] font-bold text-red-700 dark:text-red-300 flex-shrink-0">
        <AlertTriangle className="w-3.5 h-3.5" /> Falta
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-[10px] font-bold text-[#8C887E] flex-shrink-0">
      <MinusCircle className="w-3.5 h-3.5" /> Opcional
    </span>
  );
}
