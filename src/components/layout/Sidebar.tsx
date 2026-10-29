"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ChevronDown, Check, Inbox, Users, BarChart3, Building2, Shield, Tag, Plug } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useClientOptions } from "@/hooks/useClientOptions";
import { ROUTES, clientDetailRoute } from "@/lib/constants/routes";
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

  const clients = useClientOptions();
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("bunker_selected_client_id");
      if (saved) setSelectedClientId(saved);
    }
  }, []);

  const handleSelectClient = (id: string) => {
    setSelectedClientId(id);
    setIsDropdownOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("bunker_selected_client_id", id);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  const selectedClient = useMemo(() => {
    if (selectedClientId === "all") return null;
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  const adaptedSections = useMemo(() => {
    if (isClient || selectedClientId === "all") return sections;
    return sections.map((sec) => ({
      ...sec,
      items: sec.items.map((item) => {
        if (item.href === ROUTES.INBOX || item.href === ROUTES.LEADS || item.href === ROUTES.CAMPAIGNS) {
          return {
            ...item,
            href: `${item.href}?clientId=${selectedClientId}`,
          };
        }
        return item;
      }),
    }));
  }, [sections, isClient, selectedClientId]);

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

        {isClient ? (
          <div className="bg-[#F8F9FA] rounded-xl border border-[#EAECF0] p-2.5 flex items-center gap-2.5 mb-4 shadow-2xs">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
              {initialsOf(accountName, "CL")}
            </div>
            <div className="min-w-0">
              <div className="text-[10px] text-[#98A2B3] font-medium leading-none mb-0.5">
                {language === "es" ? "Portal Cliente" : "Client Portal"}
              </div>
              <div className="text-xs font-semibold text-[#101828] truncate leading-tight">{accountName}</div>
            </div>
          </div>
        ) : (
          <div className="relative mb-3.5" ref={dropdownRef}>
            {/* Pestañas de separación clara: Bunker (Agencia) vs Marcas / Clientes */}
            <div className="flex items-center p-1 bg-[#F2F4F7] rounded-xl mb-2 text-xs font-medium">
              <button
                type="button"
                onClick={() => handleSelectClient("all")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                  selectedClientId === "all"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-[#667085] hover:text-slate-900"
                }`}
              >
                <Shield className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">Bunker</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedClientId === "all" && clients.length > 0) {
                    handleSelectClient(clients[0].id);
                  }
                  setIsDropdownOpen((prev) => !prev);
                }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-all cursor-pointer ${
                  selectedClientId !== "all"
                    ? "bg-white text-slate-900 shadow-2xs font-semibold"
                    : "text-[#667085] hover:text-slate-900"
                }`}
              >
                <Tag className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="truncate">Marcas ({clients.length})</span>
              </button>
            </div>

            {/* Selector interactivo de cuenta activa */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="w-full text-left bg-[#F8F9FA] hover:bg-[#F2F4F7] border border-[#EAECF0] p-2 rounded-xl flex items-center gap-2.5 shadow-2xs transition-colors cursor-pointer group"
            >
              <div
                className={`w-8 h-8 rounded-lg ${
                  selectedClient
                    ? "bg-gradient-to-br from-amber-500 to-amber-700 text-white"
                    : "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950"
                } flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs`}
              >
                {selectedClient ? initialsOf(selectedClient.name, "CL") : "BM"}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] text-[#98A2B3] font-medium leading-none mb-0.5 flex items-center justify-between">
                  <span>{selectedClient ? "Marca / Cliente" : "Agencia Matriz"}</span>
                  <span className="text-[9px] text-amber-700 font-semibold uppercase font-mono">
                    {selectedClient ? "Marca activa" : "Bunker"}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[#101828] truncate leading-tight">
                  {selectedClient ? selectedClient.name : "Bunker Marketing Agency"}
                </div>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-[#667085] transition-transform duration-200 shrink-0 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Dropdown Menu de selección con separación por Agencia vs Clientes/Marcas */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#EAECF0] rounded-xl shadow-xl p-1.5 max-h-64 overflow-y-auto space-y-1">
                <div className="px-2 pt-1 pb-0.5 text-[10px] font-semibold text-[#98A2B3] uppercase tracking-wider">
                  Agencia Bunker
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectClient("all")}
                  className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    selectedClientId === "all"
                      ? "bg-amber-50 text-amber-900 font-semibold"
                      : "text-[#344054] hover:bg-[#F8F9FA]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-5 h-5 rounded bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-bold text-[9px] flex items-center justify-center shrink-0">
                      BM
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium">Bunker Marketing Agency</div>
                    </div>
                  </div>
                  {selectedClientId === "all" && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 ml-1" />}
                </button>

                <div className="border-t border-[#F2F4F7] my-1" />

                <div className="px-2 pt-0.5 pb-1 flex items-center justify-between text-[10px] font-semibold text-[#98A2B3] uppercase tracking-wider">
                  <span>Clientes o Marcas ({clients.length})</span>
                </div>

                {clients.length === 0 ? (
                  <div className="px-3 py-2 text-xs text-[#98A2B3] italic text-center">
                    No hay marcas conectadas aún
                  </div>
                ) : (
                  clients.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectClient(c.id)}
                      className={`w-full text-left flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                        selectedClientId === c.id
                          ? "bg-amber-50 text-amber-900 font-semibold"
                          : "text-[#344054] hover:bg-[#F8F9FA]"
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-5 h-5 rounded bg-[#EAECF0] text-[#344054] font-bold text-[9px] flex items-center justify-center shrink-0">
                          {initialsOf(c.name, "CL")}
                        </div>
                        <span className="truncate text-xs">{c.name}</span>
                      </div>
                      {selectedClientId === c.id && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0 ml-1" />}
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Botones directos: Si hay cliente seleccionado, muestra opciones de la marca */}
            {selectedClient ? (
              <div className="mt-2 p-2 bg-gradient-to-b from-amber-50/70 to-[#FFFDF5] border border-amber-200/80 rounded-xl shadow-2xs">
                <div className="flex items-center justify-between text-[10px] font-semibold text-amber-950 px-1 mb-1.5">
                  <span className="truncate font-bold">Opciones de {selectedClient.name}:</span>
                  <button
                    type="button"
                    onClick={() => handleSelectClient("all")}
                    className="text-[9px] text-amber-700 hover:text-amber-900 underline font-medium cursor-pointer"
                  >
                    Volver a Bunker
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Link
                    href={`${ROUTES.INBOX}?clientId=${selectedClient.id}`}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-900 bg-white border border-amber-200/80 hover:bg-amber-50 hover:border-amber-300 transition-colors shadow-2xs group"
                  >
                    <Inbox className="w-3.5 h-3.5 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">Bandeja</span>
                  </Link>
                  <Link
                    href={`${ROUTES.LEADS}?clientId=${selectedClient.id}`}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-900 bg-white border border-amber-200/80 hover:bg-amber-50 hover:border-amber-300 transition-colors shadow-2xs group"
                  >
                    <Users className="w-3.5 h-3.5 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">Leads</span>
                  </Link>
                  <Link
                    href={`${ROUTES.CAMPAIGNS}?clientId=${selectedClient.id}`}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-900 bg-white border border-amber-200/80 hover:bg-amber-50 hover:border-amber-300 transition-colors shadow-2xs group"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">Campañas</span>
                  </Link>
                  <Link
                    href={clientDetailRoute(selectedClient.id)}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-900 bg-white border border-amber-200/80 hover:bg-amber-50 hover:border-amber-300 transition-colors shadow-2xs group"
                  >
                    <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">Ficha 360°</span>
                  </Link>
                </div>
              </div>
            ) : (
              /* Botones exclusivos para Bunker cuando es directamente de Bunker */
              <div className="mt-2 p-2 bg-gradient-to-b from-slate-50 to-[#F8F9FA] border border-[#EAECF0] rounded-xl shadow-2xs">
                <div className="flex items-center justify-between text-[10px] font-semibold text-slate-700 px-1 mb-1.5">
                  <span className="truncate font-bold">Opciones de Bunker:</span>
                  <span className="text-[9px] text-amber-800 bg-amber-50 border border-amber-300/80 px-1.5 py-0.5 rounded font-mono uppercase font-semibold">
                    Matriz
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <Link
                    href={ROUTES.CLIENTS}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-900 bg-white border border-[#EAECF0] hover:bg-amber-50 hover:border-amber-300 transition-colors shadow-2xs group"
                  >
                    <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">Empresas</span>
                  </Link>
                  <Link
                    href={ROUTES.INTEGRATIONS}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-900 bg-white border border-[#EAECF0] hover:bg-amber-50 hover:border-amber-300 transition-colors shadow-2xs group"
                  >
                    <Plug className="w-3.5 h-3.5 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">Integraciones</span>
                  </Link>
                  <Link
                    href={ROUTES.INBOX}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-900 bg-white border border-[#EAECF0] hover:bg-amber-50 hover:border-amber-300 transition-colors shadow-2xs group"
                  >
                    <Inbox className="w-3.5 h-3.5 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">Bandeja</span>
                  </Link>
                  <Link
                    href={ROUTES.DASHBOARD}
                    className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-medium text-slate-900 bg-white border border-[#EAECF0] hover:bg-amber-50 hover:border-amber-300 transition-colors shadow-2xs group"
                  >
                    <BarChart3 className="w-3.5 h-3.5 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                    <span className="truncate">Dashboard</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        <nav className="flex-1 overflow-y-auto space-y-4 pr-1 -mr-1" aria-label="Navegación principal">
          {adaptedSections.map((section) => (
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
