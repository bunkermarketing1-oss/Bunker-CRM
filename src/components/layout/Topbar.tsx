"use client";

import React, { useState } from "react";
import { Search, Bell, Shield, User, ChevronDown, Plus, Sparkles } from "lucide-react";
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
      {/* Left: Friendly Greeting (Exact match to reference) */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-bold text-[#141414] tracking-tight flex items-center gap-2">
          <span>👋</span>
          <span>Buenos días, Bunker Agency !</span>
        </h1>
      </div>

      {/* Right: Actions matching reference (Language dropdown + [ + ] + "+ Add person" black-gold button) */}
      <div className="flex items-center gap-3">
        {/* Language / Region Pill */}
        <div className="relative">
          <button
            onClick={() => setLang(lang === "Español" ? "English" : "Español")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white border border-[#ECEAE3] text-xs font-medium text-[#141414] hover:bg-[#FAF9F5] transition-colors shadow-xs"
          >
            <span>{lang}</span>
            <ChevronDown className="w-3 h-3 text-[#8C887E]" />
          </button>
        </div>

        {/* Square Black-Gold Plus Button (Exact match) */}
        <Link
          href="/crm/tasks"
          className="w-8 h-8 rounded-2xl btn-black-gold flex items-center justify-center text-[#E5C158] hover:text-white"
          title="Nueva Tarea Rápida"
        >
          <Plus className="w-4 h-4" />
        </Link>

        {/* Primary Black-Gold Button: + Registrar Lead (Exact match to "+ Add person") */}
        <Link
          href="/crm/leads"
          className="btn-black-gold rounded-2xl px-4 py-2 text-xs font-semibold flex items-center gap-2"
        >
          <User className="w-3.5 h-3.5 text-[#E5C158]" />
          <span>+ Registrar Lead</span>
        </Link>

        {/* Role Switcher Pill */}
        <div className="relative pl-2 border-l border-[#ECEAE3]">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-white border border-[#ECEAE3] text-xs font-medium text-[#141414] hover:bg-[#FAF9F5] shadow-xs"
          >
            <Shield className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="capitalize">{currentRole === "admin" ? "Admin" : currentRole}</span>
            <ChevronDown className="w-3 h-3 text-[#8C887E]" />
          </button>

          {showRoleMenu && (
            <div className="absolute right-0 top-10 w-48 bg-white border border-[#ECEAE3] rounded-2xl p-1.5 shadow-xl z-50">
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
