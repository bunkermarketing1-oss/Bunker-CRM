"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type LanguageCode = "es" | "en";

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const translations: Record<LanguageCode, Record<string, string>> = {
  es: {
    // Topbar & Greetings
    "greeting.morning": "Buenos días",
    "greeting.afternoon": "Buenas tardes",
    "greeting.evening": "Buenas noches",
    "topbar.search_placeholder": "Buscar prospectos, empresas, teléfonos...",
    "topbar.register_lead": "+ Registrar Lead",
    "topbar.logout": "Cerrar Sesión",
    "topbar.verified_perms": "Permisos verificados por servidor",
    "topbar.dark_mode": "Modo Oscuro",
    "topbar.light_mode": "Modo Claro",
    "topbar.language": "Idioma",

    // Roles
    "role.admin": "Administrador",
    "role.sales_rep": "Comercial / Ventas",
    "role.marketing_specialist": "Marketing & Pauta",
    "role.analyst": "Analista",
    "role.member": "Miembro",

    // Navigation (Sidebar)
    "nav.dashboard": "Dashboard",
    "nav.leads": "Leads y Prospectos",
    "nav.clients": "Clientes & Cuentas",
    "nav.pipeline": "Pipeline de Ventas",
    "nav.ads_ia": "Pautas & Meta Ads (IA)",
    "nav.sms": "Mensajería & SMS",
    "nav.automations": "Automatizaciones & Flujos",
    "nav.upcoming": "Próximas Fases",
    "nav.queued": "en cola",
    "nav.departments": "Departamentos",
    "nav.dept_sales": "Ventas & Leads",
    "nav.dept_ads": "Pautas & Meta Ads",
    "nav.dept_mkt": "Marketing & IA Bunker",
    "nav.ai_copilot": "Copiloto IA Bunker",
    "nav.ai_badge": "Activo",
    "nav.ai_prompt": "¿Qué deseas optimizar hoy?",
    "nav.help": "Centro de Ayuda",
    "nav.settings": "Ajustes",

    // Clients & Hub 360
    "clients.title": "Centro de Gestión de Clientes",
    "clients.subtitle": "Administración centralizada de cuentas, contratos de facturación recurrente (MRR), contactos clave y cronología comercial 360°.",
    "clients.new_client": "Nuevo Cliente",
    "clients.profile_360": "Ficha 360°",
    "clients.back_to_list": "Volver al listado de clientes",
    "clients.tab_summary": "Resumen de Cuenta",
    "clients.tab_contacts": "Contactos",
    "clients.tab_activities": "Cronología de Actividades",
    "clients.tab_opportunities": "Oportunidades (Pipeline)",
    "clients.tab_tasks": "Tareas y Próximas Acciones",
    "clients.status_active": "ACTIVO",
    "clients.status_on_hold": "EN PAUSA",
    "clients.status_churned": "CANCELADO",
    "clients.metric_active": "Activos",
    "clients.metric_on_hold": "En Pausa",
    "clients.metric_churned": "Cancelados",
    "clients.metric_mrr": "MRR Activo",
    "clients.metric_arr": "ARR Proyectado",
    "clients.metric_pipeline": "Pipeline Cuentas",
    "clients.mrr_label": "Facturación MRR",
    "clients.arr_label": "ARR Anualizado",
    "clients.primary_contact": "Contacto principal",
    "clients.advisor": "Asesor",
    "clients.industry": "Sector",

    // Common Actions
    "action.save": "Guardar",
    "action.cancel": "Cancelar",
    "action.edit": "Editar",
    "action.delete": "Eliminar",
    "action.search": "Buscar",
    "action.filter": "Filtrar",
    "action.all": "Todos",
    "action.refresh": "Refrescar",
  },
  en: {
    // Topbar & Greetings
    "greeting.morning": "Good morning",
    "greeting.afternoon": "Good afternoon",
    "greeting.evening": "Good evening",
    "topbar.search_placeholder": "Search leads, companies, phones...",
    "topbar.register_lead": "+ Register Lead",
    "topbar.logout": "Log Out",
    "topbar.verified_perms": "Server-verified permissions",
    "topbar.dark_mode": "Dark Mode",
    "topbar.light_mode": "Light Mode",
    "topbar.language": "Language",

    // Roles
    "role.admin": "Administrator",
    "role.sales_rep": "Sales Representative",
    "role.marketing_specialist": "Marketing & Ads Specialist",
    "role.analyst": "Data Analyst",
    "role.member": "Team Member",

    // Navigation (Sidebar)
    "nav.dashboard": "Dashboard",
    "nav.leads": "Leads & Prospects",
    "nav.clients": "Clients & Accounts",
    "nav.pipeline": "Sales Pipeline",
    "nav.ads_ia": "Ads & Meta Ads (AI)",
    "nav.sms": "Messaging & SMS",
    "nav.automations": "Automations & Workflows",
    "nav.upcoming": "Upcoming Phases",
    "nav.queued": "queued",
    "nav.departments": "Departments",
    "nav.dept_sales": "Sales & Leads",
    "nav.dept_ads": "Ads & Meta Campaigns",
    "nav.dept_mkt": "Marketing & AI Hub",
    "nav.ai_copilot": "Bunker AI Copilot",
    "nav.ai_badge": "Active",
    "nav.ai_prompt": "What would you like to optimize?",
    "nav.help": "Help Center",
    "nav.settings": "Settings",

    // Clients & Hub 360
    "clients.title": "Client Management Hub",
    "clients.subtitle": "Centralized management of accounts, recurring revenue contracts (MRR), key contacts, and 360° commercial timeline.",
    "clients.new_client": "New Client",
    "clients.profile_360": "360° Profile",
    "clients.back_to_list": "Back to clients list",
    "clients.tab_summary": "Account Summary",
    "clients.tab_contacts": "Contacts",
    "clients.tab_activities": "Activities Timeline",
    "clients.tab_opportunities": "Pipeline Opportunities",
    "clients.tab_tasks": "Tasks & Next Actions",
    "clients.status_active": "ACTIVE",
    "clients.status_on_hold": "ON HOLD",
    "clients.status_churned": "CANCELLED",
    "clients.metric_active": "Active",
    "clients.metric_on_hold": "On Hold",
    "clients.metric_churned": "Cancelled",
    "clients.metric_mrr": "Active MRR",
    "clients.metric_arr": "Projected ARR",
    "clients.metric_pipeline": "Account Pipeline",
    "clients.mrr_label": "MRR Revenue",
    "clients.arr_label": "Annualized ARR",
    "clients.primary_contact": "Primary Contact",
    "clients.advisor": "Advisor",
    "clients.industry": "Industry",

    // Common Actions
    "action.save": "Save",
    "action.cancel": "Cancel",
    "action.edit": "Edit",
    "action.delete": "Delete",
    "action.search": "Search",
    "action.filter": "Filter",
    "action.all": "All",
    "action.refresh": "Refresh",
  },
};

const LanguageContext = createContext<LanguageContextType>({
  language: "es",
  setLanguage: () => {},
  toggleLanguage: () => {},
  t: (key: string, fallback?: string) => fallback || key,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>("es");

  useEffect(() => {
    const saved = localStorage.getItem("bunker_lang") as LanguageCode | null;
    if (saved === "es" || saved === "en") {
      setLanguageState(saved);
      document.documentElement.lang = saved;
    }
  }, []);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
    localStorage.setItem("bunker_lang", lang);
    document.documentElement.lang = lang;
  };

  const toggleLanguage = () => {
    const next: LanguageCode = language === "es" ? "en" : "es";
    setLanguage(next);
  };

  const t = (key: string, fallback?: string): string => {
    return translations[language]?.[key] || fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
