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
  MessageSquare,
  Workflow,
  Plus,
  AlertCircle,
  X,
  ChevronDown,
} from "lucide-react";

interface SidebarProps {
  onOpenAiModal: () => void;
}

export default function Sidebar({ onOpenAiModal }: SidebarProps) {
  const pathname = usePathname();
  const [constructionNotice, setConstructionNotice] = useState<string | null>(null);

  const activeNav = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Leads y Prospectos", href: "/crm/leads", icon: Users, badge: "9+" },
  ];

  const upcomingModules = [
    { label: "Clientes & Cuentas", href: "/crm/clients", icon: UserCheck },
    { label: "Pipeline de Ventas", href: "/crm/pipeline", icon: KanbanSquare },
    { label: "Pautas & Meta Ads (IA)", href: "/marketing/ai-optimizer", icon: Sparkles },
    { label: "Mensajería & SMS", href: "/messaging/sms", icon: MessageSquare },
    { label: "Automatizaciones & Flujos", href: "/automations", icon: Workflow },
  ];

  const departments = [
    { name: "Ventas & Leads", color: "bg-[#F97316]" },
    { name: "Pautas & Meta Ads", color: "bg-[#6366F1]" },
    { name: "Marketing & IA Bunker", color: "bg-[#EF4444]" },
  ];

  const handleUpcomingClick = (e: React.MouseEvent, label: string) => {
    e.preventDefault();
    setConstructionNotice(label);
    setTimeout(() => setConstructionNotice(null), 3500);
  };

  return (
    <>
      <aside className="w-64 bg-[#F0EFEA] border-r border-[#ECEAE3] flex flex-col h-screen fixed left-0 top-0 z-30 select-none p-4">
        {/* Brand Header with Official Bunker Logo */}
        <div className="flex items-center justify-between px-2 pt-1 pb-3 mb-1">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <img
              src="/bunker-logo.png"
              alt="Bunker"
              className="h-6 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="text-[10px] font-mono font-bold tracking-wider text-[#9A7320] bg-[#FAF0D7] border border-[#F2E5C4] px-1.5 py-0.5 rounded-md uppercase">
              CRM
            </span>
          </Link>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-[#ECEAE3] p-2.5 flex items-center justify-between shadow-xs mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#141414] text-[#FAF8F3] border border-[#D4AF37]/50 flex items-center justify-center font-bold text-xs flex-shrink-0">
              BA
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[#8C887E] font-medium leading-none mb-0.5">Admin</div>
              <div className="text-xs font-bold text-[#141414] truncate leading-tight">Bunker Agency</div>
            </div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-[#8C887E] flex-shrink-0" />
        </div>

        {/* Navigation Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-1">
          {/* Active Modules Section */}
          <div className="space-y-1">
            <div className="px-3 text-[10px] font-bold tracking-wider text-[#8C887E] uppercase mb-1">
              Módulos Activos
            </div>
            {activeNav.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs transition-all ${
                    isActive
                      ? "bg-white text-[#141414] font-bold shadow-xs border border-[#ECEAE3]"
                      : "text-[#6B6861] hover:text-[#141414] hover:bg-white/60 font-medium"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 ${isActive ? "text-[#141414]" : "text-[#8C887E]"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="bg-[#FAF0D7] text-[#9A7320] text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-[#F2E5C4]">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Upcoming Modules (En Construcción) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-3 text-[10px] font-bold tracking-wider text-[#8C887E] uppercase mb-1">
              <span>Próximas Fases</span>
              <span className="text-[9px] lowercase bg-[#FAF0D7] text-[#9A7320] px-1.5 py-0.2 rounded font-mono">
                en cola
              </span>
            </div>
            {upcomingModules.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.label}
                  onClick={(e) => handleUpcomingClick(e, item.label)}
                  className="w-full flex items-center justify-between px-3.5 py-2 rounded-2xl text-xs text-[#9C988F] hover:text-[#6B6861] hover:bg-white/40 transition-all font-medium group text-left"
                >
                  <div className="flex items-center gap-3">
                    <Icon className="w-3.5 h-3.5 text-[#B3AFA5] group-hover:text-[#8C887E]" />
                    <span className="text-[11px]">{item.label}</span>
                  </div>
                  <span className="text-[9px] text-[#A8A49B] bg-[#EBE8DF]/80 px-1.5 py-0.5 rounded-md font-medium">
                    Próx.
                  </span>
                </button>
              );
            })}
          </div>

          {/* Departments */}
          <div className="pt-1">
            <div className="flex items-center justify-between px-3 text-xs font-bold text-[#141414] mb-1.5">
              <span>Departamentos</span>
              <button className="text-[#8C887E] hover:text-[#141414] p-0.5">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-1">
              {departments.map((dept, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-[#6B6861] hover:text-[#141414] rounded-xl cursor-pointer hover:bg-white/50 transition-colors"
                >
                  <span className={`w-2.5 h-2.5 rounded-sm ${dept.color}`} />
                  <span className="font-medium text-[11px]">{dept.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer: Service Status (Clean, no technical IPs) */}
        <div className="pt-2">
          <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white border border-[#ECEAE3] shadow-xs">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <div className="font-bold text-[#141414] text-[11px] leading-tight">Estado de Servicio</div>
                <div className="text-[9px] text-[#6B6861]">Todos los sistemas operativos</div>
              </div>
            </div>
            <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
              ONLINE
            </span>
          </div>
        </div>
      </aside>

      {/* Floating Construction Toast */}
      {constructionNotice && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#141414] text-[#FAF8F3] border border-[#D4AF37]/50 p-4 rounded-2xl shadow-2xl max-w-sm animate-in slide-in-from-bottom duration-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#E5C158] flex-shrink-0 mt-0.5" />
          <div className="flex-1 text-xs">
            <div className="font-bold text-sm text-white mb-0.5">Sección en Construcción</div>
            <p className="text-[#C5C2BA] leading-snug">
              El módulo <strong>&ldquo;{constructionNotice}&rdquo;</strong> se habilitará en la siguiente fase. Actualmente estamos trabajando exclusivamente en <strong>Leads y Prospectos</strong>.
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
