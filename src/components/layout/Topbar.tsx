"use client";

import React, { useState } from "react";
import { Search, Shield, ChevronDown, User, Plus } from "lucide-react";
import Link from "next/link";

interface TopbarProps {
  currentRole: string;
  onRoleChange: (role: string) => void;
  onOpenAiModal: () => void;
}

export default function Topbar({ currentRole, onRoleChange, onOpenAiModal }: TopbarProps) {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [lang, setLang] = useState("Español");

  return (
    <header className="h-16 bg-[#F6F5F2]/95 backdrop-blur-md border-b border-[#ECEAE3] fixed top-0 right-0 left-64 z-20 px-8 flex items-center justify-between">
      {/* Left: Friendly Greeting (Clean without duplicate logo) */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-bold text-[#141414] tracking-tight flex items-center gap-2">
          <span className="text-lg">👋</span>
          <span>Buenos días, Bunker Agency !</span>
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

      {/* Right: Actions matching luxury reference design */}
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

        {/* Role Switcher Pill */}
        <div className="relative pl-1">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white border border-[#ECEAE3] text-xs font-medium text-[#141414] hover:bg-[#FAF9F5] shadow-xs"
          >
            <div className="w-5 h-5 rounded-full bg-[#141414] text-[#FAF8F3] text-[9px] font-bold flex items-center justify-center border border-[#D4AF37]/40">
              BA
            </div>
            <span className="capitalize">{currentRole === "admin" ? "Admin" : currentRole}</span>
            <ChevronDown className="w-3 h-3 text-[#8C887E]" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 top-11 w-48 bg-white border border-[#ECEAE3] rounded-2xl p-1.5 shadow-xl z-50">
              {["admin", "sales_rep", "marketing_specialist"].map((role) => (
                <button
                  key={role}
                  onClick={() => {
                    onRoleChange(role);
                    setShowRoleMenu(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                    currentRole === role ? "bg-[#FAF0D7] text-[#9A7320]" : "text-[#6B6861] hover:bg-[#FAF9F5]"
                  }`}
                >
                  {role === "admin" ? "Administrador" : role === "sales_rep" ? "Ejecutivo Comercial" : "Especialista Pautas"}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
