"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Building2, ChevronDown, Globe, LogOut, Menu, Moon, Plus, Search, Shield, Sun } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { ROUTES } from "@/lib/constants/routes";
import { greetingKeyFor, initialsOf, type GreetingKey } from "@/lib/greeting";

interface TopbarProps {
  onOpenMenu: () => void;
  onOpenSearch: () => void;
}

export default function Topbar({ onOpenMenu, onOpenSearch }: TopbarProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { language, toggleLanguage, t } = useLanguage();
  const [showUserMenu, setShowUserMenu] = useState(false);
  // La hora depende del navegador: se calcula tras montar para no romper la hidratación.
  const [greetingKey, setGreetingKey] = useState<GreetingKey | null>(null);
  const [isMac, setIsMac] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setGreetingKey(greetingKeyFor(new Date()));
    setIsMac(/Mac|iPhone|iPad/.test(navigator.platform));
  }, []);

  useEffect(() => {
    if (!showUserMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setShowUserMenu(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showUserMenu]);

  const isClient = Boolean(user?.isClientUser);
  const roleBadge = isClient
    ? {
        label: language === "es" ? "Portal Cliente" : "Client Portal",
        color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
      }
    : {
        label: language === "es" ? "Administrador Bunker" : "Bunker Admin",
        color: "bg-[#141414] text-[#E5C158] border-[#D4AF37]/40 dark:bg-[#1a1918] dark:border-[#D4AF37]/60",
      };

  const firstName = user?.name?.split(" ")[0] ?? (isClient ? "Cliente" : "Bunker");
  const accountName = isClient ? user?.clientName || "Mi Empresa" : user?.organizationName || "Bunker Agency";

  return (
    <header className="h-16 bg-[#F6F5F2]/95 backdrop-blur-md border-b border-[#ECEAE3] fixed top-0 right-0 left-0 lg:left-64 z-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 transition-colors">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir menú"
          className="lg:hidden w-9 h-9 rounded-2xl bg-white border border-[#ECEAE3] flex items-center justify-center text-[#141414] flex-shrink-0"
        >
          <Menu className="w-4 h-4" />
        </button>
        <p className="text-sm sm:text-base font-bold text-[#141414] tracking-tight truncate">
          {greetingKey ? `${t(greetingKey)}, ${firstName}` : firstName}
        </p>
        {isClient && user?.clientName && (
          <span className="hidden xl:inline text-xs font-normal text-[#8C887E] bg-white px-2.5 py-0.5 rounded-full border border-[#ECEAE3]">
            {user.clientName}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenSearch}
        className="hidden md:flex items-center gap-2.5 w-72 lg:w-96 bg-white border border-[#ECEAE3] rounded-2xl pl-3.5 pr-2 py-1.5 text-xs text-[#8C887E] hover:border-[#D4AF37]/60 transition-colors"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="flex-1 text-left truncate">{t("topbar.search_placeholder", "Buscar prospectos, empresas, teléfonos...")}</span>
        <kbd className="text-[10px] font-mono bg-[#F4F3EE] px-1.5 py-0.5 rounded border border-[#ECEAE3]">{isMac ? "⌘K" : "Ctrl K"}</kbd>
      </button>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Buscar"
          className="md:hidden w-9 h-9 rounded-2xl bg-white border border-[#ECEAE3] flex items-center justify-center text-[#141414]"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? t("topbar.light_mode", "Modo Claro") : t("topbar.dark_mode", "Modo Oscuro")}
          aria-label="Cambiar tema"
          className="w-9 h-9 rounded-2xl bg-white border border-[#ECEAE3] flex items-center justify-center hover:bg-[#FAF9F5] transition-colors"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-[#E5C158]" /> : <Moon className="w-4 h-4 text-[#8C887E]" />}
        </button>

        <button
          type="button"
          onClick={toggleLanguage}
          title={language === "es" ? "Switch to English" : "Cambiar a Español"}
          aria-label="Cambiar idioma"
          className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-2xl bg-white border border-[#ECEAE3] text-xs font-semibold text-[#141414] hover:bg-[#FAF9F5] transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-[#8C887E]" />
          <span className="uppercase">{language}</span>
        </button>

        <Link
          href={ROUTES.LEADS}
          className="btn-black-gold rounded-2xl h-9 px-3 sm:px-4 text-xs font-semibold flex items-center gap-1.5"
          aria-label={t("topbar.register_lead", "+ Registrar Lead")}
        >
          <Plus className="w-3.5 h-3.5 text-[#E5C158]" />
          <span className="hidden lg:inline">{t("topbar.register_lead", "+ Registrar Lead").replace(/^\+\s*/, "")}</span>
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu((open) => !open)}
            aria-expanded={showUserMenu}
            aria-label="Menú de usuario"
            className="flex items-center gap-2 h-9 pl-1 pr-2 sm:pr-3 rounded-2xl bg-white border border-[#ECEAE3] text-xs font-medium text-[#141414] hover:bg-[#FAF9F5]"
          >
            <span className="w-7 h-7 rounded-full bg-[#141414] text-[#FAF8F3] text-[10px] font-bold flex items-center justify-center border border-[#D4AF37]/40">
              {initialsOf(user?.name, isClient ? "CL" : "BA")}
            </span>
            <span className="hidden xl:flex flex-col text-left leading-tight">
              <span className="font-semibold text-xs text-[#141414]">{user?.name || "Cargando..."}</span>
              <span className="text-[10px] text-[#8C887E]">{roleBadge.label}</span>
            </span>
            <ChevronDown className="hidden sm:block w-3 h-3 text-[#8C887E]" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-11 w-64 bg-white border border-[#ECEAE3] rounded-3xl p-3 shadow-2xl z-50">
              <div className="p-2.5 bg-[#FAF9F5] rounded-2xl border border-[#ECEAE3] mb-2">
                <p className="text-xs font-bold text-[#141414] truncate">{user?.name}</p>
                <p className="text-[11px] text-[#8C887E] truncate">{user?.email}</p>
                <div className="mt-2 pt-2 border-t border-[#ECEAE3] flex items-center justify-between gap-2 text-[10px]">
                  <span className="flex items-center gap-1 text-[#6B6861] min-w-0">
                    <Building2 className="w-3 h-3 text-[#8C887E] flex-shrink-0" />
                    <span className="truncate">{accountName}</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold border whitespace-nowrap ${roleBadge.color}`}>{roleBadge.label}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleLanguage}
                className="sm:hidden w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#141414] hover:bg-[#FAF9F5] flex items-center gap-2"
              >
                <Globe className="w-3.5 h-3.5 text-[#8C887E]" />
                {language === "es" ? "Switch to English" : "Cambiar a Español"}
              </button>

              <div className="px-3 py-1.5 text-[10px] text-[#8C887E] flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>{t("topbar.verified_perms", "Permisos verificados por servidor")}</span>
              </div>

              <div className="mt-1 pt-2 border-t border-[#ECEAE3]">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
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
