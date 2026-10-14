import {
  Activity,
  BarChart3,
  Building2,
  CheckSquare,
  KanbanSquare,
  LayoutDashboard,
  LineChart,
  Plug,
  Settings,
  Share2,
  Sparkles,
  UserCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

export interface NavItem {
  href: string;
  icon: LucideIcon;
  label: { es: string; en: string };
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
      { href: ROUTES.CAMPAIGNS, icon: BarChart3, label: { es: "Campañas & Métricas", en: "Campaigns & Metrics" } },
      { href: ROUTES.AI_OPTIMIZER, icon: Sparkles, label: { es: "Pautas & Meta Ads (IA)", en: "Ads & Meta Ads (AI)" } },
      { href: ROUTES.SOCIAL_POSTS, icon: Share2, label: { es: "Publicaciones Sociales", en: "Social Posts" } },
      { href: ROUTES.INTEGRATIONS, icon: Plug, label: { es: "Integraciones Oficiales", en: "Integrations Hub" } },
    ],
  },
  {
    title: { es: "Administración", en: "Agency Settings" },
    items: [
      { href: ROUTES.SETTINGS, icon: Settings, label: { es: "Configuración & Entorno", en: "Settings & Env" } },
    ],
  },
];

export function navigationFor(isClient: boolean): NavSection[] {
  return isClient ? CLIENT_NAVIGATION : ADMIN_NAVIGATION;
}

/** El dashboard solo se marca activo en su ruta exacta; el resto también en sus subrutas. */
export function isNavItemActive(href: string, pathname: string | null): boolean {
  if (!pathname) return false;
  if (href === ROUTES.DASHBOARD) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
