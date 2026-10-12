"use client";

import React from "react";
import { Settings, Shield, Server, Key, Users, CheckCircle2, AlertTriangle } from "lucide-react";

export default function SettingsPage() {
  const envVars = [
    { name: "DATABASE_URL", desc: "Conexión a PostgreSQL en Supabase Cloud", status: true },
    { name: "NEXT_PUBLIC_APP_URL", desc: "URL pública de producción (http://crm.179.236.72.72.sslip.io)", status: true },
    { name: "NEXT_PUBLIC_SUPABASE_URL", desc: "Endpoint de API Supabase", status: true },
    { name: "NEXTAUTH_SECRET", desc: "Firma de tokens de sesión y seguridad", status: true },
    { name: "TWILIO_ACCOUNT_SID", desc: "Proveedor oficial de mensajería SMS", status: false },
    { name: "META_APP_ID", desc: "API oficial de Meta for Business", status: false },
    { name: "GOOGLE_ADS_DEVELOPER_TOKEN", desc: "API oficial de Google Ads", status: false },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E6DF]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#82807C] mb-1">
            <span>Sistema</span>
            <span>/</span>
            <span className="text-[#1F1E1D] font-medium">Configuración</span>
          </div>
          <h1 className="text-2xl font-serif font-normal text-[#1F1E1D] tracking-tight">
            Configuración de la Agencia & Entorno
          </h1>
          <p className="text-xs text-[#6B6966] mt-0.5">
            Parámetros operativos de Bunker Agency, roles de acceso y conexión de producción en Dokploy.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Host Info */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8E6DF] space-y-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1F1E1D] flex items-center gap-2">
            <Server className="w-4 h-4 text-emerald-600" />
            Servidor de Producción (Dokploy)
          </h2>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF]">
              <span className="text-[#6B6966]">Panel de Control Dokploy:</span>
              <span className="font-mono text-[#1F1E1D]">http://179.236.72.72:3000/</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF]">
              <span className="text-[#6B6966]">Dominio Público de Producción:</span>
              <span className="font-mono text-emerald-800 font-medium">http://crm.179.236.72.72.sslip.io</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF]">
              <span className="text-[#6B6966]">Base de Datos:</span>
              <span className="font-mono text-[#1F1E1D]">Supabase PostgreSQL (Pooler US-East-1)</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF]">
              <span className="text-[#6B6966]">Motor de Compilación:</span>
              <span className="font-mono text-[#1F1E1D]">Nixpacks (Next.js Standalone 0.0.0.0:3000)</span>
            </div>
          </div>
        </div>

        {/* Environment Variables Checklist */}
        <div className="p-5 rounded-2xl bg-white border border-[#E8E6DF] space-y-4 shadow-sm">
          <h2 className="text-sm font-semibold text-[#1F1E1D] flex items-center gap-2">
            <Key className="w-4 h-4 text-[#D97757]" />
            Variables de Entorno (.env)
          </h2>

          <div className="space-y-2 text-xs">
            {envVars.map((v) => (
              <div key={v.name} className="flex items-center justify-between p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF]">
                <div>
                  <div className="font-mono font-medium text-[#1F1E1D] text-[11px]">{v.name}</div>
                  <div className="text-[10px] text-[#82807C]">{v.desc}</div>
                </div>
                {v.status ? (
                  <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    ACTIVO
                  </span>
                ) : (
                  <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
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
