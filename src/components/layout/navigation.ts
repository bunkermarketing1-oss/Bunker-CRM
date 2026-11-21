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
      { href: ROUTES.APPOINTMENTS, icon: CalendarDays, label: { es: "Citas & Agenda", en: "Appointments" } },
      { href: ROUTES.LEADS, icon: Users, label: { es: "Prospectos", en: "Prospects" } },
      { href: ROUTES.CLIENTS, icon: Building2, label: { es: "Mi Empresa", en: "My Company" } },
      { href: ROUTES.PIPELINE, icon: KanbanSquare, label: { es: "Pipeline", en: "Pipeline" } },
      { href: ROUTES.ACTIVITIES, icon: Activity, label: { es: "Actividades", en: "Activities" } },
      { href: ROUTES.CALLS, icon: PhoneCall, label: { es: "Central Telefónica", en: "Phone System" } },
      { href: ROUTES.SMS, icon: MessageSquare, label: { es: "Mensajes SMS", en: "SMS" } },
      { href: ROUTES.TASKS, icon: CheckSquare, label: { es: "Tareas", en: "Tasks" } },
    ],
  },
  {
    title: { es: "Resultados", en: "Results" },
    items: [
      { href: ROUTES.CAMPAIGNS, icon: BarChart3, label: { es: "Mis Campañas", en: "My Campaigns" } },
    ],
  },
];

/** Solo para el dueño del cliente: supervisión de su equipo de ventas. Un vendedor no la ve. */
const OWNER_NAVIGATION_SECTION: NavSection = {
  title: { es: "Supervisión", en: "Management" },
  items: [
    {
      href: ROUTES.TEAM_LIVE,
      icon: Radio,
      label: { es: "Supervisión en Vivo", en: "Live Supervision" },
    },
    {
      href: ROUTES.TEAM_USERS,
      icon: Users,
      label: { es: "Equipo de Ventas", en: "Sales Team" },
    },
  ],
};

export const ADMIN_NAVIGATION: NavSection[] = [
  {
    title: { es: "Operaciones & CRM", en: "Operations & CRM" },
    items: [
      { href: ROUTES.DASHBOARD, icon: LayoutDashboard, label: { es: "Inicio", en: "Home" } },
      { href: ROUTES.INBOX, icon: Inbox, label: { es: "Bandeja de Entrada", en: "Inbox" } },
      { href: ROUTES.APPOINTMENTS, icon: CalendarDays, label: { es: "Citas & Agenda", en: "Appointments" } },
      { href: ROUTES.CLIENTS, icon: UserCheck, label: { es: "Empresas", en: "Companies" } },
      { href: ROUTES.LEADS, icon: Users, label: { es: "Prospectos", en: "Prospects" } },
      { href: ROUTES.PIPELINE, icon: KanbanSquare, label: { es: "Pipeline", en: "Pipeline" } },
      { href: ROUTES.ACTIVITIES, icon: Activity, label: { es: "Actividades", en: "Activities" } },
      { href: ROUTES.TASKS, icon: CheckSquare, label: { es: "Tareas", en: "Tasks" } },
    ],
  },
  {
    title: { es: "Marketing", en: "Marketing" },
    items: [
      { href: ROUTES.CAMPAIGNS, icon: BarChart3, label: { es: "Campañas", en: "Campaigns" } },
      { href: ROUTES.INTEGRATIONS, icon: Plug, label: { es: "Conexiones", en: "Connections" } },
    ],
  },
  {
    title: { es: "Comunicaciones", en: "Communications" },
    items: [
      { href: ROUTES.CALLS, icon: PhoneCall, label: { es: "Central Telefónica", en: "Phone System" } },
      { href: ROUTES.SMS, icon: MessageSquare, label: { es: "Mensajes SMS", en: "SMS" } },
      { href: ROUTES.TEAM_LIVE, icon: Radio, label: { es: "Supervisión en Vivo", en: "Live Supervision" } },
    ],
  },
  {
    title: { es: "Administración", en: "Settings" },
    items: [
      { href: ROUTES.TEAM_USERS, icon: Users, label: { es: "Equipo & Asesores", en: "Team & Advisors" } },
      { href: ROUTES.SETTINGS, icon: Settings, label: { es: "Configuración", en: "Settings" } },
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
