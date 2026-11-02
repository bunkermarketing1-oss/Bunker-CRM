import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  CheckSquare,
  Inbox,
  KanbanSquare,
  LayoutDashboard,
  MessageSquare,
  PhoneCall,
  Plug,
  Settings,
  Share2,
  Sparkles,
  UserCheck,
  Users,
  Workflow,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: { es: string; en: string };
  badge?: "BETA" | "CONSTRUCCIÓN" | string;
  disabled?: boolean;
}

export interface NavSection {
  title: { es: string; en: string };
  badge?: "ADMIN" | "PRÓXIMAMENTE" | string;
  items: NavItem[];
}

/**
 * Menú por rol. Es la única definición: el Sidebar y la paleta de comandos (⌘K) la leen,
 * así que una página nueva solo se registra aquí.
 */
export const CLIENT_NAVIGATION: NavSection[] = [
  {
    title: { es: "Gestión Comercial", en: "Commercial Hub" },
    items: [
      { href: ROUTES.DASHBOARD, icon: LayoutDashboard, label: { es: "Inicio", en: "Home" } },
      { href: ROUTES.INBOX, icon: Inbox, label: { es: "Bandeja de Entrada", en: "Inbox" } },
      { href: ROUTES.LEADS, icon: Users, label: { es: "Mis Leads", en: "My Leads" } },
      { href: ROUTES.CLIENTS, icon: Building2, label: { es: "Mi Empresa & Contactos", en: "My Company & Contacts" } },
      { href: ROUTES.PIPELINE, icon: KanbanSquare, label: { es: "Pipeline Comercial", en: "Sales Pipeline" } },
      { href: ROUTES.ACTIVITIES, icon: Activity, label: { es: "Actividades & Llamadas", en: "Activities & Calls" } },
      { href: ROUTES.CALLS, icon: PhoneCall, label: { es: "Llamar", en: "Calls" } },
      { href: ROUTES.SMS, icon: MessageSquare, label: { es: "Mensajería SMS", en: "SMS Messaging" } },
      { href: ROUTES.TASKS, icon: CheckSquare, label: { es: "Tareas Pendientes", en: "Pending Tasks" } },
    ],
  },
  {
    title: { es: "Resultados & Campañas", en: "Results & Campaigns" },
    items: [
      { href: ROUTES.CAMPAIGNS, icon: BarChart3, label: { es: "Mis Campañas", en: "My Campaigns" } },
    ],
  },
];

/** Solo para el dueño del cliente: supervisión de sus asesores. Un asesor no la ve. */
/** Solo para el dueño del cliente: supervisión de sus ejecutivos. Un vendedor (CLIENT) no la ve. */
const OWNER_NAVIGATION_SECTION: NavSection = {
  title: { es: "Supervisión Comercial", en: "Sales Management" },
  items: [
    {
      href: ROUTES.TEAM_LIVE,
      icon: Users,
      label: { es: "Ejecutivos de Venta", en: "Sales Executives" },
    },
  ],
};

export const ADMIN_NAVIGATION: NavSection[] = [
  {
    title: { es: "Operaciones & CRM", en: "Operations & CRM" },
    items: [
      { href: ROUTES.DASHBOARD, icon: LayoutDashboard, label: { es: "Dashboard General", en: "Main Dashboard" } },
      { href: ROUTES.INBOX, icon: Inbox, label: { es: "Bandeja de Entrada", en: "Unified Inbox" } },
      { href: ROUTES.CLIENTS, icon: UserCheck, label: { es: "Empresas & Cuentas", en: "Companies & Accounts" } },
      { href: ROUTES.LEADS, icon: Users, label: { es: "Leads y Prospectos", en: "Leads & Prospects" } },
      { href: ROUTES.PIPELINE, icon: KanbanSquare, label: { es: "Pipeline de Ventas", en: "Sales Pipeline" } },
      { href: ROUTES.ACTIVITIES, icon: Activity, label: { es: "Actividades y Llamadas", en: "Activities & Calls" } },
      { href: ROUTES.TASKS, icon: CheckSquare, label: { es: "Tareas y Seguimiento", en: "Tasks & Tracking" } },
    ],
  },
  {
    title: { es: "Pautas & Marketing", en: "Ads & Marketing" },
    items: [
      { href: ROUTES.CAMPAIGNS, icon: BarChart3, label: { es: "Campañas & Inversión", en: "Campaigns & Spend" } },
      { href: ROUTES.INTEGRATIONS, icon: Plug, label: { es: "Integraciones Oficiales", en: "Integrations Hub" } },
    ],
  },
  {
    title: { es: "Mensajería & Telefonía", en: "Messaging & Calls" },
    items: [
      { href: ROUTES.CALLS, icon: PhoneCall, label: { es: "Llamadas & Líneas", en: "Calls & Lines" } },
      { href: ROUTES.SMS, icon: MessageSquare, label: { es: "Mensajería SMS", en: "SMS Messaging" } },
      { href: ROUTES.TEAM_LIVE, icon: Users, label: { es: "Ejecutivos de Venta", en: "Sales Executives" } },
    ],
  },
  {
    title: { es: "Administración", en: "Agency Settings" },
    items: [
      { href: ROUTES.SETTINGS, icon: Settings, label: { es: "Configuración & Servidor", en: "Settings & Server" } },
    ],
  },
  {
    title: { es: "En Construcción", en: "Under Construction" },
    badge: "PRÓXIMAMENTE",
    items: [
      {
        href: ROUTES.AI_OPTIMIZER,
        icon: Sparkles,
        label: { es: "Optimizador de Pautas (IA)", en: "Ads Optimizer (AI)" },
        badge: "CONSTRUCCIÓN",
        disabled: true,
      },
      {
        href: ROUTES.SOCIAL_POSTS,
        icon: Share2,
        label: { es: "Publicaciones Sociales", en: "Social Posts" },
        badge: "CONSTRUCCIÓN",
        disabled: true,
      },
      {
        href: ROUTES.CONTENT_CALENDAR,
        icon: CalendarDays,
        label: { es: "Calendario Editorial", en: "Content Calendar" },
        badge: "CONSTRUCCIÓN",
        disabled: true,
      },
      {
        href: ROUTES.AUTOMATIONS,
        icon: Workflow,
        label: { es: "Automatizaciones & Flujos", en: "Automations & Flows" },
        badge: "CONSTRUCCIÓN",
        disabled: true,
      },
    ],
  },
];

export interface NavigationRole {
  isClientUser?: boolean;
  isClientOwner?: boolean;
  clientId?: string | null;
}

/** Menú de la sesión. Ocultar un enlace no es la seguridad: la API también responde 403. */
export function navigationFor(user: NavigationRole | null | undefined): NavSection[] {
  if (!user?.isClientUser) return ADMIN_NAVIGATION;

  const baseSections = user.isClientOwner ? [...CLIENT_NAVIGATION, OWNER_NAVIGATION_SECTION] : CLIENT_NAVIGATION;

  if (!user.clientId) return baseSections;

  // Para usuarios del portal, "Mi Empresa & Contactos" navega directo a la Ficha 360° de su empresa
  const companyHref = `${ROUTES.CLIENTS}/${user.clientId}`;
  return baseSections.map((section) => ({
    ...section,
    items: section.items.map((item) =>
      item.href === ROUTES.CLIENTS ? { ...item, href: companyHref } : item
    ),
  }));
}

/** El dashboard solo se marca activo en su ruta exacta; el resto también en sus subrutas. */
export function isNavItemActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  const baseHref = href.split("?")[0];
  if (baseHref === ROUTES.DASHBOARD) return pathname === baseHref;
  return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
}
