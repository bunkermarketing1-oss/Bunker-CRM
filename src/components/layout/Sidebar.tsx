"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCheck,
  KanbanSquare,
  PhoneCall,
  CheckSquare,
  Share2,
  Calendar,
  Layers,
  MessageSquare,
  History,
  Workflow,
  BarChart3,
  Settings,
  Sparkles,
  ChevronDown,
  Plus,
  ArrowUpRight,
  Radio,
} from "lucide-react";

interface SidebarProps {
  onOpenAiModal: () => void;
}

export default function Sidebar({ onOpenAiModal }: SidebarProps) {
  const pathname = usePathname();

  const mainNav = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Mensajes & Leads", href: "/crm/leads", icon: MessageSquare, badge: "9+" },
    { label: "Clientes Activos", href: "/crm/clients", icon: UserCheck },
    { label: "Pipeline de Ventas", href: "/crm/pipeline", icon: KanbanSquare },
    { label: "Llamadas & Actividades", href: "/crm/activities", icon: PhoneCall },
    { label: "Tareas", href: "/crm/tasks", icon: CheckSquare },
    { label: "Optimizador IA (Pautas)", href: "/marketing/ai-optimizer", icon: Sparkles },
    { label: "SMS Transaccional", href: "/messaging/sms", icon: PhoneCall },
    { label: "Cuentas Conectadas", href: "/marketing/integrations", icon: Share2 },
    { label: "Publicaciones", href: "/marketing/posts", icon: Layers },
    { label: "Calendario Editorial", href: "/marketing/calendar", icon: Calendar },
    { label: "Automatizaciones", href: "/automations", icon: Workflow },
    { label: "Reportes", href: "/reports", icon: BarChart3 },
    { label: "Configuración", href: "/settings", icon: Settings },
  ];

  const departments = [
    { name: "Ventas & Leads", color: "bg-[#F97316]" },
    { name: "Pautas & Meta Ads", color: "bg-[#6366F1]" },
    { name: "Marketing & IA Bunker", color: "bg-[#EF4444]" },
  ];

  return (
    <aside className="w-64 bg-[#F0EFEA] border-r border-[#ECEAE3] flex flex-col h-screen fixed left-0 top-0 z-30 select-none p-4">
      {/* Official Bunker Logo Brand Header */}
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

      {/* Top Profile Card (Exact match to reference) */}
      <div className="bg-white rounded-2xl border border-[#ECEAE3] p-2.5 flex items-center justify-between shadow-xs mb-4">
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

      {/* Main Navigation List */}
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 -mr-1">
        {mainNav.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));

          return (
            <Link
              key={item.href}
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

        {/* Departments Section (Exact match to reference) */}
        <div className="pt-4 pb-2">
          <div className="flex items-center justify-between px-3 text-xs font-bold text-[#141414] mb-2">
            <span>Departamentos</span>
            <button className="text-[#8C887E] hover:text-[#141414] p-0.5">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
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

      {/* Bottom Pro Mode Card (Exact match to reference with black-gold ivory button) */}
      <div className="pt-3">
        <div className="bg-white rounded-2xl border border-[#ECEAE3] p-3.5 space-y-2.5 shadow-xs">
          <div>
            <div className="text-[10px] font-bold tracking-wider text-[#8C887E] uppercase">BUNKER AGENCY</div>
            <div className="text-sm font-black text-[#141414] tracking-tight">
              PRO MODE <span className="text-[#D4AF37]">✦</span>
            </div>
            <div className="text-[10px] text-[#6B6861] mt-0.5 leading-snug">
              IA comercial y optimizador de Meta Ads 100% activo.
            </div>
          </div>

          <button
            onClick={onOpenAiModal}
            className="btn-black-gold rounded-xl py-2 px-3 text-xs font-semibold w-full flex items-center justify-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Asistente Bunker AI</span>
          </button>
        </div>
      </div>
    </aside>
  );
}
