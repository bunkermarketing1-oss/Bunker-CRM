"use client";

import React from "react";
import { Settings, Shield, Server, Key, Users, CheckCircle2, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const envVars = [
    { name: "DATABASE_URL", desc: "Conexión a SQLite persistente o PostgreSQL en Dokploy", status: true },
    { name: "NEXT_PUBLIC_APP_URL", desc: "URL pública de producción (http://crm.179.236.72.72.sslip.io)", status: true },
    { name: "NEXTAUTH_SECRET", desc: "Firma de tokens de sesión y seguridad", status: true },
    { name: "TWILIO_ACCOUNT_SID", desc: "Proveedor oficial de mensajería SMS", status: false },
    { name: "META_APP_ID", desc: "API oficial de Meta for Business", status: false },
    { name: "GOOGLE_ADS_DEVELOPER_TOKEN", desc: "API oficial de Google Ads", status: false },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-400" />
          Configuración de la Agencia & Entorno
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Parámetros operativos de Bunker Agency, roles de acceso y conexión con Dokploy.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Host Info */}
        <div className="p-5 rounded-2xl bg-[#0c111e] border border-[#1b2538] space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-400" />
            Servidor de Producción (Dokploy)
          </h2>

          <div className="space-y-2.5 text-xs text-gray-300">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#080d16] border border-[#162033]">
              <span className="text-gray-400">Panel de Control:</span>
              <span className="font-mono text-white">http://179.236.72.72:3000/</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#080d16] border border-[#162033]">
              <span className="text-gray-400">Dominio Wildcard SSL:</span>
              <span className="font-mono text-emerald-400">http://crm.179.236.72.72.sslip.io</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#080d16] border border-[#162033]">
              <span className="text-gray-400">Motor de Compilación:</span>
              <span className="font-mono text-white">Nixpacks (Next.js Standalone)</span>
            </div>
          </div>
        </div>

        {/* Environment Variables Checklist */}
        <div className="p-5 rounded-2xl bg-[#0c111e] border border-[#1b2538] space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Key className="w-4 h-4 text-bunker-400" />
            Variables de Entorno (.env)
          </h2>

          <div className="space-y-2 text-xs">
            {envVars.map((v) => (
              <div key={v.name} className="flex items-center justify-between p-2 rounded-lg bg-[#080d16] border border-[#162033]">
                <div>
                  <div className="font-mono font-semibold text-white text-[11px]">{v.name}</div>
                  <div className="text-[10px] text-gray-400">{v.desc}</div>
                </div>
                {v.status ? (
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    ACTIVO
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    PENDIENTE
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
