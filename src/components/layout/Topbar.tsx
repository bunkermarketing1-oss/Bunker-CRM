"use client";

import React, { useState } from "react";
import { Search, ChevronDown, User, LogOut, Shield, Building2, Sun, Moon, Globe } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";

interface TopbarProps {
  onOpenAiModal?: () => void;
}

export default function Topbar({ onOpenAiModal }: TopbarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Format server-verified role label for the only two consolidated roles: ADMIN and CLIENT
  const isClient = user?.isClientUser || user?.role === "CLIENT";
  const roleBadge = isClient
    ? {
        label: language === "es" ? "Portal Cliente" : "Client Portal",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
      }
    : {
        label: language === "es" ? "Administrador Bunker" : "Bunker Admin",
        color: "bg-[#141414] text-[#E5C158] border-[#D4AF37]/40 dark:bg-[#1a1918] dark:text-[#E5C158] dark:border-[#D4AF37]/60",
      };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : isClient
    ? "CL"
    : "BA";

  const firstName = user?.name ? user.name.split(" ")[0] : isClient ? "Cliente" : "Bunker";
  const greeting = t("greeting.morning", "Buenos días");

  return (
    <header className="h-16 bg-[#F6F5F2]/95 dark:bg-[#121212]/95 backdrop-blur-md border-b border-[#ECEAE3] dark:border-[#262626] fixed top-0 right-0 left-64 z-20 px-8 flex items-center justify-between transition-colors">
      {/* Left: Friendly Personalized Greeting */}
      <div className="flex items-center gap-3">
        <h1 className="text-base font-bold text-[#141414] dark:text-[#FAF8F3] tracking-tight flex items-center gap-2">
          <span className="text-lg">👋</span>
          <span>
            {greeting}, {firstName}!
          </span>
          {isClient && user?.clientName && (
            <span className="ml-2 text-xs font-normal text-[#8C887E] dark:text-[#A09B90] bg-white dark:bg-[#1e1e1e] px-2.5 py-0.5 rounded-full border border-[#ECEAE3] dark:border-[#333]">
              {user.clientName}
            </span>
          )}
        </h1>
      </div>

      {/* Center: Global Quick Search Input */}
      <div className="hidden md:flex items-center w-80 lg:w-96">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-[#8C887E] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={t("topbar.search_placeholder", "Buscar prospectos, empresas, teléfonos...")}
            className="w-full bg-white dark:bg-[#1a1a1a] border border-[#ECEAE3] dark:border-[#333] rounded-2xl pl-9 pr-8 py-1.5 text-xs text-[#141414] dark:text-[#FAF8F3] placeholder-[#8C887E] focus:outline-none focus:border-[#D4AF37]/70 transition-all shadow-xs"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-[#8C887E] bg-[#F4F3EE] dark:bg-[#262626] px-1.5 py-0.5 rounded border border-[#ECEAE3] dark:border-[#3a3a3a]">
            ⌘K
          </span>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2.5">
        {/* Sun / Moon Theme Toggle */}
        <button
          onClick={toggleTheme}
          title={theme === "dark" ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
          aria-label="Toggle theme"
          className="w-9 h-9 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#ECEAE3] dark:border-[#333] flex items-center justify-center text-[#141414] dark:text-[#FAF8F3] hover:bg-[#FAF9F5] dark:hover:bg-[#252525] transition-colors shadow-xs"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4 text-[#E5C158] transition-transform hover:rotate-45" />
          ) : (
            <Moon className="w-4 h-4 text-[#8C887E] transition-transform hover:-rotate-12" />
          )}
        </button>

        {/* Language Pill (Bilingual ES / EN) */}
        <button
          onClick={toggleLanguage}
          title={language === "es" ? "Switch to English" : "Cambiar a Español"}
          aria-label="Toggle language"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#ECEAE3] dark:border-[#333] text-xs font-medium text-[#141414] dark:text-[#FAF8F3] hover:bg-[#FAF9F5] dark:hover:bg-[#252525] transition-colors shadow-xs"
        >
          <Globe className="w-3.5 h-3.5 text-[#8C887E]" />
          <span>{language === "es" ? "Español" : "English"}</span>
          <ChevronDown className="w-3 h-3 text-[#8C887E]" />
        </button>

        {/* Primary Black-Gold Button: + Registrar Lead */}
        <Link
          href="/crm/leads"
          className="btn-black-gold rounded-2xl px-4 py-2 text-xs font-semibold flex items-center gap-2 shadow-xs"
        >
          <User className="w-3.5 h-3.5 text-[#E5C158]" />
          <span>{t("topbar.register_lead", "+ Registrar Lead")}</span>
        </Link>

        {/* User Profile Pill (Server Verified - No Client Role Spoofing) */}
        <div className="relative pl-1">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white dark:bg-[#1a1a1a] border border-[#ECEAE3] dark:border-[#333] text-xs font-medium text-[#141414] dark:text-[#FAF8F3] hover:bg-[#FAF9F5] dark:hover:bg-[#252525] shadow-xs"
          >
            <div className="w-6 h-6 rounded-full bg-[#141414] text-[#FAF8F3] text-[10px] font-bold flex items-center justify-center border border-[#D4AF37]/40 shadow-xs">
              {initials}
            </div>
            <div className="flex flex-col text-left leading-tight hidden sm:flex">
              <span className="font-semibold text-xs text-[#141414] dark:text-[#FAF8F3]">
                {user?.name || "Cargando..."}
              </span>
              <span className="text-[10px] text-[#8C887E] capitalize">
                {roleBadge.label}
              </span>
            </div>
            <ChevronDown className="w-3 h-3 text-[#8C887E] ml-0.5" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-12 w-64 bg-white dark:bg-[#1a1a1a] border border-[#ECEAE3] dark:border-[#333] rounded-3xl p-3 shadow-2xl z-50 animate-in fade-in slide-in-from-top-1">
              {/* User Metadata */}
              <div className="p-2.5 bg-[#FAF9F5] dark:bg-[#242424] rounded-2xl border border-[#ECEAE3] dark:border-[#333] mb-2">
                <p className="text-xs font-bold text-[#141414] dark:text-[#FAF8F3] truncate">{user?.name}</p>
                <p className="text-[11px] text-[#8C887E] truncate">{user?.email}</p>
                <div className="mt-2 pt-2 border-t border-[#ECEAE3] dark:border-[#333] flex items-center justify-between text-[10px]">
                  <span className="flex items-center gap-1 text-[#666] dark:text-[#aaa]">
                    <Building2 className="w-3 h-3 text-[#8C887E]" />
                    <span className="truncate max-w-[110px]">
                      {isClient ? user?.clientName || "Mi Empresa" : user?.organizationName || "Bunker Agency"}
                    </span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold border ${roleBadge.color}`}>
                    {roleBadge.label}
                  </span>
                </div>
              </div>

              {/* Security info note */}
              <div className="px-2 py-1 text-[10px] text-[#8C887E] flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-[#2E7D32]" />
                <span>{t("topbar.verified_perms", "Permisos verificados por servidor")}</span>
              </div>

              {/* Logout Option */}
              <div className="mt-2 pt-2 border-t border-[#ECEAE3] dark:border-[#333]">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                  <span>{t("topbar.logout", "Cerrar Sesión")}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
