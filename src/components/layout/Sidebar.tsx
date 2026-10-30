"use client";

import React, { useEffect, useState, useRef, useMemo, Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X, ChevronDown, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";
import { useClientOptions } from "@/hooks/useClientOptions";
import { ROUTES } from "@/lib/constants/routes";
import { initialsOf } from "@/lib/greeting";
import { isNavItemActive, navigationFor, type NavItem } from "./navigation";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAiModal?: () => void;
}

export default function Sidebar(props: SidebarProps) {
  return (
    <Suspense fallback={null}>
      <SidebarContent {...props} />
    </Suspense>
  );
}

function SidebarContent({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isClient = Boolean(user?.isClientUser);
  const sections = navigationFor(user);

  const filtrableRoutes = useMemo<string[]>(
    () => [
      ROUTES.DASHBOARD,
      ROUTES.INBOX,
      ROUTES.LEADS,
      ROUTES.CAMPAIGNS,
      ROUTES.PIPELINE,
      ROUTES.ACTIVITIES,
      ROUTES.TASKS,
      ROUTES.REPORTS,
      ROUTES.INTEGRATIONS,
      ROUTES.CALLS,
      ROUTES.SMS,
      ROUTES.TEAM_LIVE,
      ROUTES.AUTOMATIONS,
      ROUTES.AI_OPTIMIZER,
      ROUTES.SOCIAL_POSTS,
      ROUTES.CONTENT_CALENDAR,
    ],
    []
  );

  // En móvil el menú es un panel superpuesto: al navegar debe cerrarse solo.
  useEffect(() => {
    onClose();
  }, [pathname, onClose]);

  const accountName = isClient ? user?.clientName || "Mi Empresa" : user?.organizationName || "Bunker Agency";

  const clients = useClientOptions();
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sincronizar el cliente seleccionado con los parámetros de la URL activa
  useEffect(() => {
    const urlCid = searchParams.get("clientId");
    if (urlCid) {
      setSelectedClientId(urlCid);
      if (typeof window !== "undefined") {
        localStorage.setItem("bunker_selected_client_id", urlCid);
      }
    } else if (pathname.startsWith(`${ROUTES.CLIENTS}/`)) {
      const parts = pathname.split("/");
      const pathClientId = parts[3];
      if (pathClientId) {
        setSelectedClientId(pathClientId);
        if (typeof window !== "undefined") {
          localStorage.setItem("bunker_selected_client_id", pathClientId);
        }
      }
    } else if (filtrableRoutes.includes(pathname) || pathname === ROUTES.CLIENTS) {
      setSelectedClientId("all");
      if (typeof window !== "undefined") {
        localStorage.setItem("bunker_selected_client_id", "all");
      }
    }
  }, [searchParams, pathname, filtrableRoutes]);

  const handleSelectClient = (id: string) => {
    setSelectedClientId(id);
    setIsDropdownOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("bunker_selected_client_id", id);
    }

    if (pathname.startsWith(ROUTES.CLIENTS)) {
      if (id !== "all") {
        router.push(`${ROUTES.CLIENTS}/${id}`);
      } else {
        router.push(ROUTES.CLIENTS);
      }
      return;
    }

    const isFiltrable = filtrableRoutes.some((route) => pathname === route || pathname.startsWith(`${route}/`));
    if (isFiltrable) {
      const baseRoute =
        filtrableRoutes.find((route) => pathname === route || pathname.startsWith(`${route}/`)) || pathname;
      if (id !== "all") {
        router.push(`${baseRoute}?clientId=${encodeURIComponent(id)}`);
      } else {
        router.push(baseRoute);
      }
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
        if (item.href === ROUTES.CLIENTS) {
          return {
            ...item,
            href: `${ROUTES.CLIENTS}/${selectedClientId}`,
            label: {
              es: selectedClient ? `Ficha de ${selectedClient.name}` : "Ficha de la Empresa",
              en: selectedClient ? `Profile of ${selectedClient.name}` : "Company Profile",
            },
          };
        }
        if (
          item.href === ROUTES.DASHBOARD ||
          item.href === ROUTES.INBOX ||
          item.href === ROUTES.LEADS ||
          item.href === ROUTES.CAMPAIGNS ||
          item.href === ROUTES.PIPELINE ||
          item.href === ROUTES.ACTIVITIES ||
          item.href === ROUTES.TASKS ||
          item.href === ROUTES.REPORTS ||
          item.href === ROUTES.INTEGRATIONS ||
          item.href === ROUTES.CALLS ||
          item.href === ROUTES.SMS ||
          item.href === ROUTES.TEAM_LIVE ||
          item.href === ROUTES.AUTOMATIONS ||
          item.href === ROUTES.AI_OPTIMIZER ||
          item.href === ROUTES.SOCIAL_POSTS ||
          item.href === ROUTES.CONTENT_CALENDAR
        ) {
          return {
            ...item,
            href: `${item.href}?clientId=${encodeURIComponent(selectedClientId)}`,
          };
        }
        return item;
      }),
    }));
  }, [sections, isClient, selectedClientId, selectedClient]);

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
          <Link
            href={
              selectedClientId !== "all" && !isClient
                ? `${ROUTES.DASHBOARD}?clientId=${encodeURIComponent(selectedClientId)}`
                : ROUTES.DASHBOARD
            }
            className="flex items-center gap-2 group"
          >
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
          <div className="relative mb-3" ref={dropdownRef}>
            {/* Selector de cuenta: Bunker vs Empresa Cliente */}
            <button
              type="button"
              onClick={() => setIsDropdownOpen((prev) => !prev)}
              className="w-full text-left bg-[#F8F9FA] hover:bg-[#F2F4F7] border border-[#EAECF0] p-2.5 rounded-xl flex items-center gap-2.5 shadow-2xs transition-colors cursor-pointer group"
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
                <div className="text-[10px] text-[#98A2B3] font-medium leading-none mb-1 flex items-center justify-between">
                  <span>{selectedClient ? "Empresa Cliente" : "Agencia Matriz"}</span>
                  <span className="text-[9px] text-amber-700 font-semibold uppercase">
                    {selectedClient ? "Cliente" : "Bunker"}
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

            {/* Dropdown Menu de selección */}
            {isDropdownOpen && (
              <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#EAECF0] rounded-xl shadow-xl p-1.5 max-h-60 overflow-y-auto space-y-0.5">
                <div className="px-2 py-1 text-[10px] font-semibold text-[#98A2B3] uppercase">
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
                  <span className="truncate flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Bunker Marketing Agency
                  </span>
                  {selectedClientId === "all" && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                </button>

                {clients.length > 0 && (
                  <>
                    <div className="border-t border-[#F2F4F7] my-1" />
                    <div className="px-2 py-0.5 text-[9px] font-semibold text-[#98A2B3] uppercase">
                      Clientes y Marcas ({clients.length})
                    </div>
                    {clients.map((c) => (
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
                        <span className="truncate flex items-center gap-2">
                          <span className="w-5 h-5 rounded bg-[#EAECF0] text-[#344054] text-[9px] font-bold flex items-center justify-center shrink-0">
                            {initialsOf(c.name, "CL")}
                          </span>
                          <span className="truncate">{c.name}</span>
                        </span>
                        {selectedClientId === c.id && <Check className="w-3.5 h-3.5 text-amber-600 shrink-0" />}
                      </button>
                    ))}
                  </> 
                )}
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
