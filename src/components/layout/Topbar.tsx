"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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

function getBreadcrumbs(pathname: string) {
  if (pathname.startsWith("/crm/leads")) {
    if (pathname !== "/crm/leads") {
      return [
        { label: "CRM Comercial", href: "/crm/leads" },
        { label: "Prospectos", href: "/crm/leads" },
        { label: "Expediente", href: null },
      ];
    }
    return [
      { label: "CRM Comercial", href: "/crm/leads" },
      { label: "Prospectos", href: null },
    ];
  }
  if (pathname.startsWith("/crm/pipeline")) {
    return [
      { label: "CRM Comercial", href: "/crm/pipeline" },
      { label: "Pipeline", href: null },
    ];
  }
  if (pathname.startsWith("/crm/activities")) {
    return [
      { label: "CRM Comercial", href: "/crm/activities" },
      { label: "Actividades", href: null },
    ];
  }
  if (pathname.startsWith("/campaigns")) {
    return [
      { label: "Marketing", href: "/campaigns" },
      { label: "Campañas", href: null },
    ];
  }
  if (pathname.startsWith("/marketing/integrations")) {
    return [
      { label: "Configuración", href: "/marketing/integrations" },
      { label: "Integraciones", href: null },
    ];
  }
  if (pathname.startsWith("/marketing/social")) {
    return [
      { label: "Marketing", href: "/marketing/social" },
      { label: "Social Media", href: null },
    ];
  }
  if (pathname.startsWith("/analytics")) {
    return [
      { label: "Reportes", href: "/analytics" },
      { label: "Analítica", href: null },
    ];
  }
  if (pathname.startsWith("/dashboard")) {
    return [
      { label: "Bunker CRM", href: "/dashboard" },
      { label: "Dashboard", href: null },
    ];
  }
  return [
    { label: "Bunker CRM", href: "/dashboard" },
    { label: "Inicio", href: null },
  ];
}

export default function Topbar({ onOpenMenu, onOpenSearch }: TopbarProps) {
  const pathname = usePathname();
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
        color: "bg-amber-50 text-amber-800 border-amber-300/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700",
      };

  const accountName = isClient ? user?.clientName || "Mi Empresa" : user?.organizationName || "Bunker Agency";
  const breadcrumbs = getBreadcrumbs(pathname || "/");

  return (
    <header className="h-16 bg-white/95 dark:bg-[#0c0d12]/95 backdrop-blur-md border-b border-[#EAECF0] dark:border-slate-800 fixed top-0 right-0 left-0 lg:left-64 z-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir menú"
          className="lg:hidden w-9 h-9 rounded-2xl bg-[#F8F9FA] dark:bg-slate-900 border border-[#EAECF0] dark:border-slate-800 flex items-center justify-center text-[#101828] dark:text-slate-100 flex-shrink-0"
        >
          <Menu className="w-4 h-4" />
        </button>

        {/* Miga de pan en el Header (Topbar) */}
        <nav aria-label="Miga de pan" className="flex items-center gap-2 text-xs sm:text-sm">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <React.Fragment key={crumb.label + idx}>
                {idx > 0 && (
                  <span className="text-[#98A2B3] dark:text-slate-600 font-light select-none">/</span>
                )}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="text-[#667085] dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 font-normal transition-colors truncate max-w-[150px]"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={`truncate max-w-[180px] ${
                      isLast
                        ? "font-semibold text-[#101828] dark:text-amber-400"
                        : "text-[#667085] dark:text-slate-400 font-normal"
                    }`}
                  >
                    {crumb.label}
                  </span>
                )}
              </React.Fragment>
            );
          })}
        </nav>

        {isClient && user?.clientName && (
          <span className="hidden xl:inline text-xs font-semibold text-amber-900 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
            {user.clientName}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenSearch}
        className="hidden md:flex items-center gap-2.5 w-72 lg:w-96 bg-[#F8F9FA] border border-[#EAECF0] rounded-2xl pl-3.5 pr-2 py-1.5 text-xs text-[#98A2B3] hover:border-amber-400 hover:shadow-[0_0_10px_rgba(245,158,11,0.15)] transition-all"
      >
        <Search className="w-3.5 h-3.5 text-[#98A2B3]" />
        <span className="flex-1 text-left truncate">{t("topbar.search_placeholder", "Buscar prospectos, empresas, teléfonos...")}</span>
        <kbd className="text-[10px] font-mono bg-white px-1.5 py-0.5 rounded border border-[#EAECF0] text-[#475467]">{isMac ? "⌘K" : "Ctrl K"}</kbd>
      </button>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Buscar"
          className="md:hidden w-9 h-9 rounded-2xl bg-white border border-[#EAECF0] flex items-center justify-center text-[#101828]"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? t("topbar.light_mode", "Modo Claro") : t("topbar.dark_mode", "Modo Oscuro")}
          aria-label="Cambiar tema"
          className="w-9 h-9 rounded-2xl bg-white border border-[#EAECF0] flex items-center justify-center hover:bg-[#F8F9FA] transition-colors"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-[#667085]" />}
        </button>

        <button
          type="button"
          onClick={toggleLanguage}
          title={language === "es" ? "Switch to English" : "Cambiar a Español"}
          aria-label="Cambiar idioma"
          className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-2xl bg-white border border-[#EAECF0] text-xs font-semibold text-[#101828] hover:bg-[#F8F9FA] transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-[#667085]" />
          <span className="uppercase">{language}</span>
        </button>

        <Link
          href={ROUTES.LEADS}
          className="btn-black-gold rounded-2xl h-9 px-3 sm:px-4 text-xs font-semibold flex items-center gap-1.5"
          aria-label={t("topbar.register_lead", "+ Registrar Lead")}
        >
          <Plus className="w-3.5 h-3.5 text-amber-400" />
          <span className="hidden lg:inline">{t("topbar.register_lead", "+ Registrar Lead").replace(/^\+\s*/, "")}</span>
        </Link>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu((open) => !open)}
            aria-expanded={showUserMenu}
            aria-label="Menú de usuario"
            className="flex items-center gap-2 h-9 pl-1 pr-2 sm:pr-3 rounded-2xl bg-white border border-[#EAECF0] text-xs font-medium text-[#101828] hover:bg-[#F8F9FA]"
          >
            <span className="w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 text-[10px] font-bold flex items-center justify-center shadow-xs">
              {initialsOf(user?.name, isClient ? "CL" : "BA")}
            </span>
            <span className="hidden xl:flex flex-col text-left leading-tight">
              <span className="font-semibold text-xs text-[#101828]">{user?.name || "Cargando..."}</span>
              <span className="text-[10px] text-[#667085]">{roleBadge.label}</span>
            </span>
            <ChevronDown className="hidden sm:block w-3 h-3 text-[#667085]" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-11 w-64 bg-white border border-[#EAECF0] rounded-3xl p-3 shadow-2xl z-50">
              <div className="p-2.5 bg-[#F8F9FA] rounded-2xl border border-[#EAECF0] mb-2">
                <p className="text-xs font-bold text-[#101828] truncate">{user?.name}</p>
                <p className="text-[11px] text-[#667085] truncate">{user?.email}</p>
                <div className="mt-2 pt-2 border-t border-[#EAECF0] flex items-center justify-between gap-2 text-[10px]">
                  <span className="flex items-center gap-1 text-[#475467] min-w-0">
                    <Building2 className="w-3 h-3 text-[#667085] flex-shrink-0" />
                    <span className="truncate">{accountName}</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-semibold border whitespace-nowrap ${roleBadge.color}`}>{roleBadge.label}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleLanguage}
                className="sm:hidden w-full text-left px-3 py-2 rounded-xl text-xs font-medium text-[#101828] hover:bg-[#F8F9FA] flex items-center gap-2"
              >
                <Globe className="w-3.5 h-3.5 text-[#667085]" />
                {language === "es" ? "Switch to English" : "Cambiar a Español"}
              </button>

              <div className="px-3 py-1.5 text-[10px] text-[#667085] flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>{t("topbar.verified_perms", "Permisos verificados por servidor")}</span>
              </div>

              <div className="mt-1 pt-2 border-t border-[#EAECF0]">
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
