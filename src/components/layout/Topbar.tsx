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
    <header className="h-16 bg-[#090d16]/90 backdrop-blur-md border-b border-[#1a2333] fixed top-0 right-0 left-64 z-20 px-6 flex items-center justify-between">
      {/* Search Input */}
      <div className="flex items-center gap-3 w-80">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar leads, clientes, negocios..."
            className="w-full bg-[#0e1422] border border-[#1e293b] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bunker-500 transition-colors"
          />
        </div>
      </div>

      {/* Center Demo Data Badge */}
      <div className="relative">
        <div
          onClick={() => setShowInfo(!showInfo)}
          className="flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium cursor-pointer hover:bg-amber-500/20 transition-all select-none"
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
          <span>Modo Demostración Activo</span>
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
        </div>

        {showInfo && (
          <div className="absolute top-9 left-1/2 -translate-x-1/2 w-80 bg-[#0d1322] border border-[#23314d] rounded-xl p-3.5 text-xs text-gray-300 shadow-2xl z-50">
            <div className="font-bold text-white mb-1 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Datos de Prueba para Cliente
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed mb-2">
              Los registros marcados con etiqueta <span className="text-amber-400 font-semibold">[DEMO]</span> son datos estructurados para la presentación del jueves. Cualquier registro nuevo que agregues se guardará de forma real y persistente.
            </p>
            <div className="text-[10px] text-gray-500 font-mono">
              Persistencia: SQLite / PostgreSQL en Dokploy
            </div>
          </div>
        )}
      </div>

      {/* Right User & Role Selector */}
      <div className="flex items-center gap-4">
        {/* Role Selector */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0e1422] border border-[#1e293b] text-xs text-gray-300 hover:text-white transition-colors"
          >
            <Shield className="w-3.5 h-3.5 text-bunker-400" />
            <span className="capitalize">{roles.find((r) => r.id === currentRole)?.name || currentRole}</span>
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 top-10 w-56 bg-[#0e1422] border border-[#1e293b] rounded-xl p-1.5 shadow-xl z-50">
              <div className="px-2 py-1 text-[10px] font-bold text-gray-500 uppercase">
                Simular Rol de Usuario
              </div>
              {roles.map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    onRoleChange(r.id);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-colors ${
                    currentRole === r.id ? "bg-bunker-600 text-white font-semibold" : "text-gray-300 hover:bg-[#151f33]"
                  }`}
                >
                  <div className="font-medium">{r.name}</div>
                  <div className="text-[10px] opacity-75">{r.desc}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications */}
        <button className="w-8 h-8 rounded-lg bg-[#0e1422] border border-[#1e293b] flex items-center justify-center text-gray-400 hover:text-white transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="w-2 h-2 rounded-full bg-bunker-500 absolute top-1.5 right-1.5"></span>
        </button>

        {/* User Profile */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#1e293b]">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-bunker-600 to-indigo-500 flex items-center justify-center font-bold text-white text-xs">
            BA
          </div>
          <div className="hidden sm:block text-left">
            <div className="text-xs font-semibold text-white leading-tight">Bunker Agency</div>
            <div className="text-[10px] text-gray-400">admin@bunkermarketing.io</div>
          </div>
        </div>
      </div>
    </header>
  );
}
