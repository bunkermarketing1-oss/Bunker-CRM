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
  Radio,
} from "lucide-react";

interface SidebarProps {
  onOpenAiModal: () => void;
}

export default function Sidebar({ onOpenAiModal }: SidebarProps) {
  const pathname = usePathname();

  const navSections = [
    {
      title: "PRINCIPAL",
      items: [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      ],
    },
    {
      title: "CRM COMERCIAL",
      items: [
        { label: "Leads / Prospectos", href: "/crm/leads", icon: Users },
        { label: "Clientes Activos", href: "/crm/clients", icon: UserCheck },
        { label: "Pipeline de Ventas", href: "/crm/pipeline", icon: KanbanSquare },
        { label: "Llamadas y Actividades", href: "/crm/activities", icon: PhoneCall },
        { label: "Tareas y Recordatorios", href: "/crm/tasks", icon: CheckSquare },
      ],
    },
    {
      title: "MARKETING & REDES",
      items: [
        { label: "Optimizador IA Pautas", href: "/marketing/ai-optimizer", icon: Sparkles },
        { label: "Cuentas Conectadas", href: "/marketing/integrations", icon: Share2 },
        { label: "Publicaciones", href: "/marketing/posts", icon: Layers },
        { label: "Calendario Editorial", href: "/marketing/calendar", icon: Calendar },
      ],
    },
    {
      title: "MENSAJERÍA",
      items: [
        { label: "Envío de SMS", href: "/messaging/sms", icon: MessageSquare },
        { label: "Historial de Mensajes", href: "/messaging/sms?tab=history", icon: History },
      ],
    },
    {
      title: "SISTEMA",
      items: [
        { label: "Automatizaciones", href: "/automations", icon: Workflow },
        { label: "Reportes Comerciales", href: "/reports", icon: BarChart3 },
        { label: "Configuración", href: "/settings", icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-[#F3F1EB] border-r border-[#E8E6DF] flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#E8E6DF] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#D97757] flex items-center justify-center shadow-sm font-serif font-bold text-white text-base">
            B
          </div>
          <div>
            <div className="font-bold text-[#1F1E1D] text-sm tracking-tight flex items-center gap-1.5">
              Bunker <span className="text-[#D97757]">CRM</span>
            </div>
            <div className="text-[10px] text-[#716F6A] uppercase tracking-wider font-medium">
              Agency Platform
            </div>
          </div>
        </div>
      </div>

      {/* Claude Style AI Prompt Button */}
      <div className="px-4 py-3">
        <button
          onClick={onOpenAiModal}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] hover:border-[#D97757]/40 hover:bg-[#FFFFFF] transition-all text-xs font-medium text-[#1F1E1D] group shadow-sm"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-[#D97757]" />
            <span className="text-[#1F1E1D]">Asistente Bunker AI</span>
          </div>
          <span className="text-[10px] bg-[#FBF1ED] text-[#D97757] font-semibold px-1.5 py-0.5 rounded border border-[#F3D6CB]">
            Prompt
          </span>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-0.5">
            <div className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-wider text-[#9C9890] uppercase">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-[#FFFFFF] text-[#1F1E1D] shadow-sm font-semibold border border-[#E8E6DF]"
                      : "text-[#716F6A] hover:text-[#1F1E1D] hover:bg-[#FAF9F5]/70"
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#D97757]" : "text-[#716F6A]"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Production Status Footer */}
      <div className="p-3 border-t border-[#E8E6DF] bg-[#EFECE4]/60">
        <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-[#FFFFFF] border border-[#E8E6DF]">
          <div className="flex items-center gap-2">
            <Radio className="w-3 h-3 text-emerald-600 animate-pulse" />
            <div>
              <div className="font-medium text-[#1F1E1D] leading-tight">Dokploy Producción</div>
              <div className="text-[9px] text-[#716F6A]">179.236.72.72:3000</div>
            </div>
          </div>
          <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-200">
            ONLINE
          </span>
        </div>
      </div>
    </aside>
  );
}
