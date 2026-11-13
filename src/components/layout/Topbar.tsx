"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ChevronDown, Globe, LogOut, Menu, Moon, Plus, Search, Shield, Sun } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useLanguage } from "@/context/LanguageContext";
import { ROUTES } from "@/lib/constants/routes";
import { AttendanceCheckInButton } from "@/components/layout/AttendanceCheckInButton";
import { greetingKeyFor, initialsOf, type GreetingKey } from "@/lib/greeting";

interface TopbarProps {
  onOpenMenu: () => void;
  onOpenSearch: () => void;
}

function getBreadcrumbs(pathname: string) {
  if (pathname.startsWith("/inbox")) {
    return [
      { label: "Comunicaciones", href: "/inbox" },
      { label: "Bandeja de Entrada", href: null },
    ];
  }
  if (pathname.startsWith("/messaging/calls")) {
    return [
      { label: "Comunicaciones", href: "/messaging/calls" },
      { label: "Central Telefónica", href: null },
    ];
  }
  if (pathname.startsWith("/messaging/sms")) {
    return [
      { label: "Comunicaciones", href: "/messaging/sms" },
      { label: "Mensajes SMS", href: null },
    ];
  }
  if (pathname.startsWith("/team/live")) {
    return [
      { label: "Comunicaciones", href: "/team/live" },
      { label: "Equipo de Ventas", href: null },
    ];
  }
  if (pathname.startsWith("/crm/clients")) {
    if (pathname !== "/crm/clients") {
      return [
        { label: "Operaciones", href: "/crm/clients" },
        { label: "Empresas", href: "/crm/clients" },
        { label: "Ficha de Empresa", href: null },
      ];
    }
    return [
      { label: "Operaciones", href: "/crm/clients" },
      { label: "Empresas", href: null },
    ];
  }
  if (pathname.startsWith("/crm/leads")) {
    if (pathname !== "/crm/leads") {
      return [
        { label: "Operaciones", href: "/crm/leads" },
        { label: "Prospectos", href: "/crm/leads" },
        { label: "Detalle", href: null },
      ];
    }
    return [
      { label: "Operaciones", href: "/crm/leads" },
      { label: "Prospectos", href: null },
    ];
  }
  if (pathname.startsWith("/crm/pipeline")) {
    return [
      { label: "Operaciones", href: "/crm/pipeline" },
      { label: "Pipeline", href: null },
    ];
  }
  if (pathname.startsWith("/crm/activities")) {
    return [
      { label: "Operaciones", href: "/crm/activities" },
      { label: "Actividades", href: null },
    ];
  }
  if (pathname.startsWith("/crm/tasks")) {
    return [
      { label: "Operaciones", href: "/crm/tasks" },
      { label: "Tareas", href: null },
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
      { label: "Marketing", href: "/marketing/integrations" },
      { label: "Conexiones", href: null },
    ];
  }
  if (pathname.startsWith("/reports")) {
    return [
      { label: "Marketing", href: "/reports" },
      { label: "Reportes", href: null },
    ];
  }
  if (pathname.startsWith("/settings")) {
    return [
      { label: "Administración", href: "/settings" },
      { label: "Configuración", href: null },
    ];
  }
  if (pathname.startsWith("/dashboard")) {
    return [
      { label: "Bunker Agency", href: "/dashboard" },
      { label: "Inicio", href: null },
    ];
  }
  return [
    { label: "Bunker Agency", href: "/dashboard" },
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
    <header className="h-16 bg-white/95 dark:bg-[#121417]/95 backdrop-blur-md border-b border-[#E2E5EB] dark:border-[#1F242D] fixed top-0 right-0 left-0 lg:left-64 z-20 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-3 transition-colors">
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMenu}
          aria-label="Abrir menú"
          className="lg:hidden w-9 h-9 rounded-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] flex items-center justify-center text-[#121417] dark:text-white flex-shrink-0"
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
                  <span className="text-[#8C929D] dark:text-[#64748B] font-light select-none">/</span>
                )}
                {crumb.href && !isLast ? (
                  <Link
                    href={crumb.href}
                    className="text-[#8C929D] hover:text-[#121417] dark:hover:text-white font-medium transition-colors truncate max-w-[150px]"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span
                    className={`truncate max-w-[180px] ${
                      isLast
                        ? "font-bold text-[#121417] dark:text-white"
                        : "text-[#8C929D] font-medium"
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
          <span className="hidden xl:inline orvion-badge-lime text-[11px]">
            {user.clientName}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onOpenSearch}
        className="hidden md:flex items-center gap-2.5 w-72 lg:w-96 bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full pl-4 pr-2 py-1.5 text-xs text-[#8C929D] hover:border-[#121417] dark:hover:border-white transition-all shadow-2xs"
      >
        <Search className="w-3.5 h-3.5 text-[#8C929D]" />
        <span className="flex-1 text-left truncate">{t("topbar.search_placeholder", "Buscar prospectos, empresas, teléfonos...")}</span>
        <kbd className="text-[10px] font-mono bg-white dark:bg-[#121417] px-2 py-0.5 rounded-full border border-[#E2E5EB] dark:border-[#2A2E37] text-[#475467] dark:text-[#94A3B8]">{isMac ? "⌘K" : "Ctrl K"}</kbd>
      </button>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Buscar"
          className="md:hidden w-9 h-9 rounded-full bg-white dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] flex items-center justify-center text-[#121417] dark:text-white"
        >
          <Search className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={toggleTheme}
          title={theme === "dark" ? t("topbar.light_mode", "Modo Claro") : t("topbar.dark_mode", "Modo Oscuro")}
          aria-label="Cambiar tema"
          className="w-9 h-9 rounded-full bg-white dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] flex items-center justify-center hover:bg-[#F8F9FA] dark:hover:bg-[#202530] transition-colors"
        >
          {theme === "dark" ? <Sun className="w-4 h-4 text-[#D4F933]" /> : <Moon className="w-4 h-4 text-[#667085]" />}
        </button>

        <button
          type="button"
          onClick={toggleLanguage}
          title={language === "es" ? "Switch to English" : "Cambiar a Español"}
          aria-label="Cambiar idioma"
          className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-full bg-white dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] text-xs font-semibold text-[#121417] dark:text-white hover:bg-[#F8F9FA] dark:hover:bg-[#202530] transition-colors"
        >
          <Globe className="w-3.5 h-3.5 text-[#8C929D]" />
          <span className="uppercase">{language}</span>
        </button>

        <Link
          href={ROUTES.LEADS}
          className="rounded-full h-9 px-4 bg-[#121417] hover:bg-[#1E2229] dark:bg-white dark:hover:bg-[#F3F4F7] text-white dark:text-[#121417] text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all hover:scale-105"
          aria-label={t("topbar.register_lead", "+ Registrar Lead")}
        >
          <Plus className="w-3.5 h-3.5 text-[#D4F933] dark:text-[#121417]" />
          <span className="hidden lg:inline">{t("topbar.register_lead", "+ Registrar Lead").replace(/^\+\s*/, "")}</span>
        </Link>

        <AttendanceCheckInButton />

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setShowUserMenu((open) => !open)}
            aria-expanded={showUserMenu}
            aria-label="Menú de usuario"
            className="flex items-center gap-2 h-9 pl-1 pr-2 sm:pr-3 rounded-full bg-white dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] text-xs font-medium text-[#121417] dark:text-white hover:bg-[#F8F9FA] dark:hover:bg-[#202530] transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-[#121417] dark:bg-white text-white dark:text-[#121417] text-[10px] font-black flex items-center justify-center shadow-xs">
              {initialsOf(user?.name, isClient ? "CL" : "BA")}
            </span>
            <span className="hidden xl:flex flex-col text-left leading-tight">
              <span className="font-bold text-xs text-[#121417] dark:text-white">{user?.name || "Cargando..."}</span>
              <span className="text-[10px] text-[#8C929D] font-medium">{roleBadge.label}</span>
            </span>
            <ChevronDown className="hidden sm:block w-3 h-3 text-[#8C929D]" />
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-11 w-64 bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] rounded-[24px] p-3 shadow-orvion z-50">
              <div className="p-3 bg-[#F8F9FA] dark:bg-[#1A1D24] rounded-2xl border border-[#E2E5EB] dark:border-[#2A2E37] mb-2">
                <p className="text-xs font-extrabold text-[#121417] dark:text-white truncate">{user?.name}</p>
                <p className="text-[11px] text-[#8C929D] truncate font-medium">{user?.email}</p>
                <div className="mt-2 pt-2 border-t border-[#E2E5EB] dark:border-[#2A2E37] flex items-center justify-between gap-2 text-[10px]">
                  <span className="flex items-center gap-1 text-[#475467] dark:text-[#94A3B8] min-w-0">
                    <Building2 className="w-3 h-3 text-[#8C929D] flex-shrink-0" />
                    <span className="truncate">{accountName}</span>
                  </span>
                  <span className={`px-2 py-0.5 rounded-full font-bold border whitespace-nowrap ${roleBadge.color}`}>{roleBadge.label}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={toggleLanguage}
                className="sm:hidden w-full text-left px-3 py-2 rounded-full text-xs font-semibold text-[#121417] dark:text-white hover:bg-[#F8F9FA] dark:hover:bg-[#1E2229] flex items-center gap-2"
              >
                <Globe className="w-3.5 h-3.5 text-[#8C929D]" />
                {language === "es" ? "Switch to English" : "Cambiar a Español"}
              </button>

              <div className="px-3 py-1.5 text-[10px] text-[#8C929D] font-medium flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-emerald-600" />
                <span>{t("topbar.verified_perms", "Permisos verificados por servidor")}</span>
              </div>

              <div className="mt-1 pt-2 border-t border-[#E2E5EB] dark:border-[#1F242D]">
                <button
                  type="button"
                  onClick={() => {
                    setShowUserMenu(false);
                    logout();
                  }}
                  className="w-full text-left px-3.5 py-2 rounded-full text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center gap-2 transition-colors"
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
