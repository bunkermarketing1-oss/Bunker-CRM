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
  Server,
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
    <aside className="w-64 bg-[#090d16] border-r border-[#1a2333] flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#1a2333] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-bunker-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-bunker-600/30 font-black text-white text-base">
            B
          </div>
          <div>
            <div className="font-extrabold tracking-wide text-white text-sm flex items-center gap-1.5">
              BUNKER <span className="text-bunker-400">CRM</span>
            </div>
            <div className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
              AGENCY EDITION
            </div>
          </div>
        </div>
      </div>

      {/* AI Assistant Callout */}
      <div className="px-4 py-3">
        <button
          onClick={onOpenAiModal}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-bunker-900/60 to-indigo-950/60 border border-bunker-500/30 hover:border-bunker-400/60 transition-all text-xs font-semibold text-bunker-200 group shadow-md"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-bunker-400 group-hover:rotate-12 transition-transform" />
            <span>Asistente Bunker AI</span>
          </div>
          <span className="text-[10px] bg-bunker-600/50 text-bunker-100 px-1.5 py-0.5 rounded uppercase">
            Prompt
          </span>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <div className="px-3 text-[10px] font-bold tracking-wider text-gray-500 uppercase">
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-bunker-600/20 text-white border-l-2 border-bunker-500 pl-2.5 font-semibold"
                      : "text-gray-400 hover:text-gray-200 hover:bg-[#111827]"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-bunker-400" : "text-gray-400"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Dokploy Production Status Footer */}
      <div className="p-3 border-t border-[#1a2333] bg-[#070a10]">
        <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-[#0e1422] border border-[#1e293b]">
          <div className="flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <div>
              <div className="font-semibold text-white leading-tight">Dokploy Producción</div>
              <div className="text-[9px] text-gray-400">179.236.72.72:3000</div>
            </div>
          </div>
          <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded border border-emerald-500/20">
            ONLINE
          </span>
        </div>
      </div>
    </aside>
  );
}
