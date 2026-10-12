"use client";

import React, { useState } from "react";
import { Search, Bell, Shield, User, HelpCircle, CheckCircle2 } from "lucide-react";

interface TopbarProps {
  currentRole: string;
  onRoleChange: (role: string) => void;
  onOpenAiModal: () => void;
}

export default function Topbar({ currentRole, onRoleChange, onOpenAiModal }: TopbarProps) {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  const roles = [
    { id: "admin", name: "Administrador", desc: "Acceso total y configuración" },
    { id: "sales_rep", name: "Ejecutivo Comercial", desc: "Leads, pipeline y contactos" },
    { id: "marketing_specialist", name: "Especialista Marketing", desc: "Publicaciones y campañas" },
    { id: "analyst", name: "Analista", desc: "Reportes y métricas de rendimiento" },
  ];

  return (
    <header className="h-16 bg-[#FAF9F5]/90 backdrop-blur-md border-b border-[#E8E6DF] fixed top-0 right-0 left-64 z-20 px-8 flex items-center justify-between">
      {/* Search Input */}
      <div className="flex items-center gap-3 w-80">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-[#9C9890] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar prospectos, clientes, negocios..."
            className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#1F1E1D] placeholder-[#9C9890] focus:outline-none focus:border-[#D97757] transition-colors shadow-sm"
          />
        </div>
      </div>

      {/* Center Demo Badge */}
      <div className="relative">
        <div
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FBF1ED] border border-[#F3D6CB] text-[#C15F3C] text-xs font-medium cursor-pointer hover:bg-[#F8E5DC] transition-all select-none"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#D97757] animate-pulse"></span>
          <span>Modo Demostración</span>
          <HelpCircle className="w-3.5 h-3.5 text-[#D97757]" />
        </div>

        {showInfo && (
          <div className="absolute top-9 left-1/2 -translate-x-1/2 w-80 bg-[#FFFFFF] border border-[#E8E6DF] rounded-2xl p-4 text-xs text-[#716F6A] shadow-xl z-50">
            <div className="font-semibold text-[#1F1E1D] mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Datos de Prueba para Cliente
            </div>
            <p className="text-[11px] text-[#716F6A] leading-relaxed mb-2">
              Los registros marcados con etiqueta <span className="text-[#C15F3C] font-semibold">[DEMO]</span> son datos estructurados para la presentación. Cualquier registro nuevo que agregues se guardará de forma real en Supabase PostgreSQL.
            </p>
          </div>
        )}
      </div>

      {/* Right User & Role Selector */}
      <div className="flex items-center gap-3">
        {/* Role Selector */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#E8E6DF] text-xs font-medium text-[#1F1E1D] hover:bg-[#FAF8F2] transition-colors shadow-sm"
          >
            <Shield className="w-3.5 h-3.5 text-[#D97757]" />
            <span className="capitalize">{roles.find((r) => r.id === currentRole)?.name || currentRole}</span>
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 top-10 w-56 bg-[#FFFFFF] border border-[#E8E6DF] rounded-2xl p-1.5 shadow-xl z-50">
              <div className="px-2.5 py-1 text-[10px] font-semibold text-[#9C9890] uppercase tracking-wider">
                Simular Rol
              </div>
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    onRoleChange(r.id);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors ${
                    currentRole === r.id ? "bg-[#FBF1ED] text-[#C15F3C] font-semibold" : "text-[#716F6A] hover:bg-[#FAF8F2]"
                  }`}
                >
                  <div className="font-medium text-[#1F1E1D]">{r.name}</div>
                  <div className="text-[10px] text-[#9C9890]">{r.desc}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button className="w-8 h-8 rounded-xl bg-[#FFFFFF] border border-[#E8E6DF] flex items-center justify-center text-[#716F6A] hover:text-[#1F1E1D] hover:bg-[#FAF8F2] transition-colors relative shadow-sm">
          <Bell className="w-3.5 h-3.5" />
          <span className="w-1.5 h-1.5 rounded-full bg-[#D97757] absolute top-2 right-2"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#E8E6DF]">
          <div className="w-7 h-7 rounded-full bg-[#FBF1ED] border border-[#F3D6CB] flex items-center justify-center font-bold text-[#D97757] text-xs">
            BA
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-[#1F1E1D] leading-tight">Bunker Agency</div>
            <div className="text-[10px] text-[#9C9890]">admin@bunkermarketing.io</div>
          </div>
        </div>
      </div>
    </header>
  );
}
