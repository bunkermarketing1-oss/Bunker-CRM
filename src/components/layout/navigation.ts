import {
  Activity,
  BarChart3,
  Building2,
  CalendarDays,
  CheckSquare,
  KanbanSquare,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  PhoneCall,
  Plug,
  Radio,
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
  /** Módulo visible pero aún sin datos reales o en desarrollo. */
  badge?: "BETA" | "CONSTRUCCIÓN" | string;
  disabled?: boolean;
}

export interface NavSection {
  title: { es: string; en: string };
  badge?: "ADMIN";
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
      { href: ROUTES.LEADS, icon: Users, label: { es: "Mis Leads", en: "My Leads" } },
      { href: ROUTES.CLIENTS, icon: Building2, label: { es: "Mi Empresa & Contactos", en: "My Company & Contacts" } },
      { href: ROUTES.PIPELINE, icon: KanbanSquare, label: { es: "Pipeline Comercial", en: "Sales Pipeline" } },
      { href: ROUTES.ACTIVITIES, icon: Activity, label: { es: "Actividades & Llamadas", en: "Activities & Calls" } },
      {
        href: ROUTES.CALLS,
        icon: PhoneCall,
        label: { es: "Llamar", en: "Calls" },
        badge: "CONSTRUCCIÓN",
        disabled: true,
      },
      { href: ROUTES.TASKS, icon: CheckSquare, label: { es: "Tareas Pendientes", en: "Pending Tasks" } },
    ],
  },
  {
    title: { es: "Resultados", en: "Results" },
    items: [
      { href: ROUTES.CAMPAIGNS, icon: BarChart3, label: { es: "Mis Campañas", en: "My Campaigns" } },
      { href: ROUTES.REPORTS, icon: LineChart, label: { es: "Reportes", en: "Reports" } },
    ],
  },
];

/** Solo para el dueño del cliente: supervisión de sus asesores. Un asesor no la ve. */
const OWNER_NAVIGATION_SECTION: NavSection = {
  title: { es: "Mi Equipo", en: "My Team" },
  items: [
    {
      href: ROUTES.TEAM_LIVE,
      icon: Radio,
      label: { es: "Equipo en vivo", en: "Live Team" },
      badge: "CONSTRUCCIÓN",
      disabled: true,
    },
  ],
};

export const ADMIN_NAVIGATION: NavSection[] = [
  {
    title: { es: "Operaciones & CRM", en: "Operations & CRM" },
    items: [
      { href: ROUTES.DASHBOARD, icon: LayoutDashboard, label: { es: "Dashboard General", en: "Main Dashboard" } },
      { href: ROUTES.CLIENTS, icon: UserCheck, label: { es: "Clientes & Cuentas", en: "Clients & Accounts" } },
      { href: ROUTES.LEADS, icon: Users, label: { es: "Leads y Prospectos", en: "Leads & Prospects" } },
      { href: ROUTES.PIPELINE, icon: KanbanSquare, label: { es: "Pipeline de Ventas", en: "Sales Pipeline" } },
      { href: ROUTES.ACTIVITIES, icon: Activity, label: { es: "Actividades y Llamadas", en: "Activities & Calls" } },
      { href: ROUTES.TASKS, icon: CheckSquare, label: { es: "Tareas y Seguimiento", en: "Tasks & Tracking" } },
      { href: ROUTES.REPORTS, icon: LineChart, label: { es: "Reportes & ROI", en: "Reports & ROI" } },
    ],
  },
  {
    title: { es: "Pautas & Marketing", en: "Ads & Marketing" },
    badge: "ADMIN",
    items: [
      { href: ROUTES.CAMPAIGNS, icon: BarChart3, label: { es: "Campañas & Inversión", en: "Campaigns & Spend" } },
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
      { href: ROUTES.INTEGRATIONS, icon: Plug, label: { es: "Integraciones Oficiales", en: "Integrations Hub" } },
    ],
  },
  {
    title: { es: "Mensajería & Automatización", en: "Messaging & Automation" },
    badge: "ADMIN",
    items: [
      {
        href: ROUTES.SMS,
        icon: MessageSquare,
        label: { es: "Mensajería SMS", en: "SMS Messaging" },
        badge: "CONSTRUCCIÓN",
        disabled: true,
      },
      {
        href: ROUTES.CALLS,
        icon: PhoneCall,
        label: { es: "Llamadas & Líneas", en: "Calls & Lines" },
        badge: "CONSTRUCCIÓN",
        disabled: true,
      },
      {
        href: ROUTES.TEAM_LIVE,
        icon: Radio,
        label: { es: "Asesores en vivo", en: "Live Advisors" },
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
  {
    title: { es: "Administración", en: "Agency Settings" },
    items: [
      { href: ROUTES.SETTINGS, icon: Settings, label: { es: "Configuración & Servidor", en: "Settings & Server" } },
    ],
  },
];

export interface NavigationRole {
  isClientUser?: boolean;
  isClientOwner?: boolean;
}

/** Menú de la sesión. Ocultar un enlace no es la seguridad: la API también responde 403. */
export function navigationFor(user: NavigationRole | null | undefined): NavSection[] {
  if (!user?.isClientUser) return ADMIN_NAVIGATION;
  return user.isClientOwner ? [...CLIENT_NAVIGATION, OWNER_NAVIGATION_SECTION] : CLIENT_NAVIGATION;
}

/** El dashboard solo se marca activo en su ruta exacta; el resto también en sus subrutas. */
export function isNavItemActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === ROUTES.DASHBOARD) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
