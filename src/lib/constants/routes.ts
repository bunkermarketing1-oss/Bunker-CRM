/** Rutas de páginas de la app. Úsalas en vez de escribir "/crm/leads" a mano. */
export const ROUTES = {
  LOGIN: "/login",
  DASHBOARD: "/dashboard",
  CLIENTS: "/crm/clients",
  LEADS: "/crm/leads",
  PIPELINE: "/crm/pipeline",
  ACTIVITIES: "/crm/activities",
  TASKS: "/crm/tasks",
  CAMPAIGNS: "/campaigns",
  REPORTS: "/reports",
  AI_OPTIMIZER: "/marketing/ai-optimizer",
  SOCIAL_POSTS: "/marketing/posts",
  INTEGRATIONS: "/marketing/integrations",
  CONTENT_CALENDAR: "/marketing/calendar",
  SMS: "/messaging/sms",
  CALLS: "/messaging/calls",
  TEAM_LIVE: "/team/live",
  AUTOMATIONS: "/automations",
  SETTINGS: "/settings",
} as const;

export function clientDetailRoute(clientId: string): string {
  return `${ROUTES.CLIENTS}/${clientId}`;
}

export function leadSearchRoute(term: string): string {
  return `${ROUTES.LEADS}?search=${encodeURIComponent(term)}`;
}
