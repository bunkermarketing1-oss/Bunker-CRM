"use client";

import React, { useState } from "react";
import { Search, ChevronDown, User, LogOut, Shield, Building2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

interface TopbarProps {
  onOpenAiModal?: () => void;
}

export default function Topbar({ onOpenAiModal }: TopbarProps) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [lang, setLang] = useState("Español");

  // Format server-verified role label
  const getRoleBadge = (role?: string) => {
    switch (role) {
      case "admin":
        return { label: "Administrador", color: "bg-[#141414] text-[#E5C158] border-[#D4AF37]/40" };
      case "sales_rep":
        return { label: "Comercial / Ventas", color: "bg-[#F3EFE6] text-[#7A6126] border-[#ECEAE3]" };
      case "marketing_specialist":
        return { label: "Marketing & Pauta", color: "bg-[#EEF2F6] text-[#2563EB] border-[#DBEAFE]" };
      case "analyst":
        return { label: "Analista", color: "bg-[#F0FDF4] text-[#16A34A] border-[#DCFCE7]" };
      default:
        return { label: "Miembro", color: "bg-[#FAF9F5] text-[#555] border-[#ECEAE3]" };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "BA";

  return (
    <header className="h-16 bg-[#F6F5F2]/95 backdrop-blur-md border-b border-[#ECEAE3] fixed top-0 right-0 left-64 z-20 px-8 flex items-center justify-between">
      {/* Left: Friendly Personalized Greeting */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-bold text-[#141414] tracking-tight flex items-center gap-2">
          <span className="text-lg">👋</span>
          <span>
            Buenos días, {user?.name ? user.name.split(" ")[0] : "Bunker Agency"} !
          </span>
        </h1>
      </div>

      {/* Center: Global Quick Search Input */}
      <div className="hidden md:flex items-center w-80 lg:w-96">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-[#8C887E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar prospectos, empresas, teléfonos..."
            className="w-full bg-white border border-[#ECEAE3] rounded-2xl pl-9 pr-8 py-1.5 text-xs text-[#141414] placeholder-[#8C887E] focus:outline-none focus:border-[#D4AF37]/70 transition-all shadow-xs"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#8C887E] bg-[#F4F3EE] px-1.5 py-0.5 rounded border border-[#ECEAE3]">
            ⌘K
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Language Pill */}
        <button
          onClick={() => setLang(lang === "Español" ? "English" : "Español")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white border border-[#ECEAE3] text-xs font-medium text-[#141414] hover:bg-[#FAF9F5] transition-colors shadow-xs"
        >
          <span>{lang}</span>
          <ChevronDown className="w-3 h-3 text-[#8C887E]" />
        </button>

        {/* Primary Black-Gold Button: + Registrar Lead */}
        <Link
          href="/crm/leads"
          className="btn-black-gold rounded-2xl px-4 py-2 text-xs font-semibold flex items-center gap-2 shadow-xs"
        >
          <User className="w-3.5 h-3.5 text-[#E5C158]" />
          <span>+ Registrar Lead</span>
        </Link>

        {/* User Profile Pill (Server Verified - No Client Role Spoofing) */}
        <div className="relative pl-1">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white border border-[#ECEAE3] text-xs font-medium text-[#141414] hover:bg-[#FAF9F5] shadow-xs"
          >
            <div className="w-6 h-6 rounded-full bg-[#141414] text-[#FAF8F3] text-[10px] font-bold flex items-center justify-center border border-[#D4AF37]/40 shadow-xs">
              {initials}
            </div>
            <div className="flex flex-col text-left leading-tight hidden sm:flex">
              <span className="font-semibold text-xs text-[#141414]">
                {user?.name || "Cargando..."}
              </span>
              <span className="text-[10px] text-[#8C887E] capitalize">
                {roleInfo.label}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-[#8C887E] ml-0.5" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-12 w-64 bg-white border border-[#ECEAE3] rounded-3xl p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1">
              {/* User Metadata */}
              <div className="p-2.5 bg-[#FAF9F5] rounded-2xl border border-[#ECEAE3] mb-2">
                <p className="text-xs font-bold text-[#141414] truncate">{user?.name}</p>
                <p className="text-[11px] text-[#8C887E] truncate">{user?.email}</p>
                <div className="mt-2 pt-2 border-t border-[#ECEAE3] flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1 text-[#666]">
                    <Building2 className="w-3 h-3 text-[#8C887E]" />
                    <span>{user?.organizationName || "Bunker Agency"}</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold border ${roleInfo.color}`}>
                    {roleInfo.label}
                  </span>
                </div>
              </div>

              {/* Security info note */}
              <div className="px-2 py-1 text-[10px] text-[#8C887E] flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-[#2E7D32]" />
                <span>Permisos verificados por servidor</span>
              </div>

              {/* Logout Option */}
              <div className="mt-2 pt-2 border-t border-[#ECEAE3]">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-600" />
                  <span>Cerrar Sesión</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
