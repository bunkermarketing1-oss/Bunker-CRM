"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  KanbanSquare,
  Sparkles,
  Activity,
  CheckSquare,
  Building2,
  Settings,
  Share2,
  Plug,
  Shield,
  ChevronDown,
  AlertCircle,
  X,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

interface SidebarProps {
  onOpenAiModal?: () => void;
}

export default function Sidebar({ onOpenAiModal }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { language, t } = useLanguage();
  const [constructionNotice, setConstructionNotice] = useState<string | null>(null);

  const isClient = user?.isClientUser || user?.role === "CLIENT";

  // Navigation specifically for CLIENT portal users
  const clientNav = [
    { label: language === "es" ? "Inicio Comercial" : "Commercial Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: language === "es" ? "Mis Leads" : "My Leads", href: "/crm/leads", icon: Users },
    { label: language === "es" ? "Mi Empresa & Contactos" : "My Company & Contacts", href: "/crm/clients", icon: Building2 },
    { label: language === "es" ? "Pipeline Comercial" : "Sales Pipeline", href: "/crm/pipeline", icon: KanbanSquare },
    { label: language === "es" ? "Actividades & Llamadas" : "Activities & Calls", href: "/crm/activities", icon: Activity },
    { label: language === "es" ? "Tareas Pendientes" : "Pending Tasks", href: "/crm/tasks", icon: CheckSquare },
  ];

  // Navigation for ADMIN internal Bunker Agency staff
  const adminCommercialNav = [
    { label: language === "es" ? "Dashboard General" : "Main Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: language === "es" ? "Clientes & Cuentas" : "Clients & Accounts", href: "/crm/clients", icon: UserCheck },
    { label: language === "es" ? "Leads y Prospectos" : "Leads & Prospects", href: "/crm/leads", icon: Users },
    { label: language === "es" ? "Pipeline de Ventas" : "Sales Pipeline", href: "/crm/pipeline", icon: KanbanSquare },
    { label: language === "es" ? "Actividades y Llamadas" : "Activities & Calls", href: "/crm/activities", icon: Activity },
    { label: language === "es" ? "Tareas y Seguimiento" : "Tasks & Tracking", href: "/crm/tasks", icon: CheckSquare },
  ];

  const adminMarketingNav = [
    { label: language === "es" ? "Pautas & Meta Ads (IA)" : "Ads & Meta Ads (AI)", href: "/marketing/ai-optimizer", icon: Sparkles },
    { label: language === "es" ? "Publicaciones Sociales" : "Social Posts", href: "/marketing/posts", icon: Share2 },
    { label: language === "es" ? "Integraciones Oficiales" : "Integrations Hub", href: "/marketing/integrations", icon: Plug },
  ];

  const handleSimulatedClick = (e: React.MouseEvent, label: string) => {
    e.preventDefault();
    setConstructionNotice(label);
    setTimeout(() => setConstructionNotice(null), 3500);
  };

  const userInitials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : isClient
    ? "CL"
    : "BA";

  return (
    <>
      <aside className="w-64 bg-[#F0EFEA] dark:bg-[#161616] border-r border-[#ECEAE3] dark:border-[#262626] flex flex-col h-screen fixed left-0 top-0 z-30 select-none p-4 transition-colors">
        {/* Brand Header with Official Bunker Logo */}
        <div className="flex items-center justify-between px-2 pt-1 pb-3 mb-1">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <img
              src="/bunker-logo.png"
              alt="Bunker"
              className="h-6 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#9A7320] bg-[#FAF0D7] dark:bg-[#2e2615] dark:text-[#E5C158] border border-[#F2E5C4] dark:border-[#473a1e] px-1.5 py-0.5 rounded-md uppercase">
              {isClient ? "PORTAL" : "CRM"}
            </span>
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-[#202020] rounded-2xl border border-[#ECEAE3] dark:border-[#2f2f2f] p-2.5 flex items-center justify-between shadow-xs mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#141414] text-[#FAF8F3] border border-[#D4AF37]/50 flex items-center justify-center font-bold text-xs flex-shrink-0">
              {userInitials}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[#8C887E] font-medium leading-none mb-0.5">
                {isClient ? (language === "es" ? "Portal Cliente" : "Client Portal") : "Admin Bunker"}
              </div>
              <div className="text-xs font-bold text-[#141414] dark:text-[#FAF8F3] truncate leading-tight">
                {isClient ? user?.clientName || "Mi Empresa" : user?.organizationName || "Bunker Agency"}
              </div>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C887E] flex-shrink-0" />
        </div>

        {/* Navigation Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-1">
          {/* CLIENT PORTAL VIEW */}
          {isClient ? (
            <div className="space-y-1">
              <div className="px-3 text-[10px] font-bold tracking-wider text-[#8C887E] uppercase mb-1 flex items-center justify-between">
                <span>{language === "es" ? "Gestión Comercial" : "Commercial Hub"}</span>
                <span className="text-[9px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                  {user?.clientName || "CLIENT"}
                </span>
              </div>
              {clientNav.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));

                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all ${
                      isActive
                        ? "bg-white dark:bg-[#242424] text-[#141414] dark:text-[#FAF8F3] font-bold shadow-xs border border-[#ECEAE3] dark:border-[#333]"
                        : "text-[#6B6861] dark:text-[#A09B90] hover:text-[#141414] dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-4 h-4 ${isActive ? "text-[#141414] dark:text-[#FAF8F3]" : "text-[#8C887E]"}`} />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            /* ADMIN VIEW */
            <>
              {/* Operations & CRM Section */}
              <div className="space-y-1">
                <div className="px-3 text-[10px] font-bold tracking-wider text-[#8C887E] uppercase mb-1">
                  {language === "es" ? "Operaciones & CRM" : "Operations & CRM"}
                </div>
                {adminCommercialNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all ${
                        isActive
                          ? "bg-white dark:bg-[#242424] text-[#141414] dark:text-[#FAF8F3] font-bold shadow-xs border border-[#ECEAE3] dark:border-[#333]"
                          : "text-[#6B6861] dark:text-[#A09B90] hover:text-[#141414] dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? "text-[#141414] dark:text-[#FAF8F3]" : "text-[#8C887E]"}`} />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Marketing, Ads & IA Section (Admin Only) */}
              <div className="space-y-1 pt-1">
                <div className="px-3 text-[10px] font-bold tracking-wider text-[#8C887E] uppercase mb-1 flex items-center justify-between">
                  <span>{language === "es" ? "Pautas & Marketing" : "Ads & Marketing"}</span>
                  <span className="text-[9px] bg-[#FAF0D7] dark:bg-[#2e2615] text-[#9A7320] dark:text-[#E5C158] px-1.5 py-0.2 rounded font-mono">
                    ADMIN
                  </span>
                </div>
                {adminMarketingNav.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href || pathname?.startsWith(item.href);

                  return (
                    <Link
                      key={item.label}
                      href={item.href}
                      className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all ${
                        isActive
                          ? "bg-white dark:bg-[#242424] text-[#141414] dark:text-[#FAF8F3] font-bold shadow-xs border border-[#ECEAE3] dark:border-[#333]"
                          : "text-[#6B6861] dark:text-[#A09B90] hover:text-[#141414] dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`w-4 h-4 ${isActive ? "text-[#141414] dark:text-[#FAF8F3]" : "text-[#8C887E]"}`} />
                        <span>{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Agency Administration (Admin Only) */}
              <div className="space-y-1 pt-1">
                <div className="px-3 text-[10px] font-bold tracking-wider text-[#8C887E] uppercase mb-1">
                  {language === "es" ? "Administración" : "Agency Settings"}
                </div>
                <Link
                  href="/settings"
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all ${
                    pathname === "/settings"
                      ? "bg-white dark:bg-[#242424] text-[#141414] dark:text-[#FAF8F3] font-bold shadow-xs border border-[#ECEAE3] dark:border-[#333]"
                      : "text-[#6B6861] dark:text-[#A09B90] hover:text-[#141414] dark:hover:text-white hover:bg-white/60 dark:hover:bg-white/5 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className={`w-4 h-4 ${pathname === "/settings" ? "text-[#141414] dark:text-[#FAF8F3]" : "text-[#8C887E]"}`} />
                    <span>{language === "es" ? "Configuración & Entorno" : "Settings & Env"}</span>
                  </div>
                </Link>
              </div>
            </>
          )}
        </div>

        {/* Footer: Service Status (Clean, verified) */}
        <div className="pt-2">
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-[#202020] border border-[#ECEAE3] dark:border-[#2f2f2f] shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <div className="font-bold text-[#141414] dark:text-[#FAF8F3] text-[11px] leading-tight">
                  {language === "es" ? "Estado del Sistema" : "System Status"}
                </div>
                <div className="text-[9px] text-[#6B6861] dark:text-[#A09B90]">
                  {isClient ? (language === "es" ? "Portal comercial activo" : "Commercial portal active") : (language === "es" ? "Bunker Agency activo" : "Bunker Agency active")}
                </div>
              </div>
            </div>
            <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              ONLINE
            </span>
          </div>
        </div>
      </aside>

      {/* Floating Notice Toast */}
      {constructionNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#141414] text-[#FAF8F3] border border-[#D4AF37]/50 p-4 rounded-2xl shadow-2xl max-w-sm animate-in slide-in-from-bottom duration-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#E5C158] flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-bold text-sm text-white mb-0.5">Información de Módulo</div>
            <p className="text-[#C5C2BA] leading-snug">
              El módulo <strong>&ldquo;{constructionNotice}&rdquo;</strong> requiere credenciales o permisos de API oficiales vigentes.
            </p>
          </div>
          <button
            onClick={() => setConstructionNotice(null)}
            className="text-[#8C887E] hover:text-white p-0.5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
