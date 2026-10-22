"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { ROUTES } from "@/lib/constants/routes";
import { initialsOf } from "@/lib/greeting";
import { isNavItemActive, navigationFor, type NavItem } from "./navigation";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAiModal?: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isClient = Boolean(user?.isClientUser);
  const sections = navigationFor(user);

  // En móvil el menú es un panel superpuesto: al navegar debe cerrarse solo.
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  const accountName = isClient ? user?.clientName || "Mi Empresa" : user?.organizationName || "Bunker Agency";

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className="fixed inset-0 z-30 bg-black/30 backdrop-blur-[2px] lg:hidden"
        />
      )}

      <aside
        className={`w-64 bg-white border-r border-[#EAECF0] flex flex-col h-screen fixed left-0 top-0 z-40 select-none p-4 transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-2 pt-1 pb-3 mb-1">
          <Link href={ROUTES.DASHBOARD} className="flex items-center gap-2 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/bunker-logo.png"
              alt="Bunker"
              className="h-6 w-auto object-contain transition-transform group-hover:scale-105"
            />
            <span className="text-[10px] font-mono font-bold tracking-wider text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300/80 px-2 py-0.5 rounded-md uppercase shadow-2xs">
              {isClient ? "PORTAL" : "CRM"}
            </span>
          </Link>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="lg:hidden p-1.5 rounded-xl text-[#98A2B3] hover:text-[#101828] hover:bg-[#F8F9FA]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="bg-[#F8F9FA] rounded-xl border border-[#EAECF0] p-2.5 flex items-center gap-2.5 mb-4 shadow-2xs">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
            {initialsOf(accountName, isClient ? "CL" : "BA")}
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-[#98A2B3] font-medium leading-none mb-0.5">
              {isClient ? (language === "es" ? "Portal Cliente" : "Client Portal") : "Admin Bunker"}
            </div>
            <div className="text-xs font-semibold text-[#101828] truncate leading-tight">{accountName}</div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-1" aria-label="Navegación principal">
          {sections.map((section) => (
            <div key={section.title.es} className="space-y-0.5">
              <div className="px-3 text-[10px] font-semibold tracking-wider text-[#98A2B3] uppercase mb-1.5 flex items-center justify-between">
                <span>{section.title[language]}</span>
                {section.badge && (
                  <span className="text-[9px] bg-amber-50 text-amber-800 border border-amber-300 px-1.5 rounded font-mono font-medium">
                    {section.badge}
                  </span>
                )}
              </div>
              {section.items.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  label={item.label[language]}
                  isActive={isNavItemActive(item.href, pathname)}
                />
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}

function SidebarLink({ item, label, isActive }: { item: NavItem; label: string; isActive: boolean }) {
  const Icon = item.icon;

  if (item.disabled) {
    return (
      <div
        className="relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[#98A2B3] opacity-60 cursor-not-allowed select-none border border-transparent"
        title="Módulo en construcción"
        aria-disabled="true"
      >
        <Icon className="w-4 h-4 flex-shrink-0 text-[#98A2B3]" />
        <span className="truncate">{label}</span>
        {item.badge && (
          <span className="ml-auto text-[8.5px] font-mono font-medium tracking-tight bg-[#F2F4F7] text-[#475467] border border-[#EAECF0] px-1.5 py-0.5 rounded whitespace-nowrap">
            {item.badge}
          </span>
        )}
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      className={`relative flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs transition-colors ${
        isActive
          ? "bg-[#0F172A] text-white font-medium shadow-2xs"
          : "text-[#475467] hover:text-[#101828] hover:bg-[#F8F9FA] font-normal border border-transparent"
      }`}
    >
      {isActive && (
        <span className="absolute left-0 top-2 bottom-2 w-[2.5px] rounded-r-full bg-amber-400" />
      )}
      <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-amber-400" : "text-[#667085]"}`} />
      <span className="truncate">{label}</span>
      {item.badge && (
        <span className="ml-auto text-[9px] font-mono font-medium bg-amber-50 text-amber-800 border border-amber-200 px-1.5 rounded">
          {item.badge}
        </span>
      )}
    </Link>
  );
}
