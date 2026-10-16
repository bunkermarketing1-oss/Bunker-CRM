import type { StageRow } from "@/types/reports";

export interface DashboardMetrics {
  totalLeads: number;
  /** Leads creados en los últimos 7 días. */
  leadsThisWeek: number;
  /** null para usuarios CLIENT: solo ven su propia empresa. */
  activeClients: number | null;
  openDealsCount: number;
  openPipelineValue: number;
  wonDealsCount: number;
  wonRevenue: number;
  /** % de negocios cerrados (ganados + perdidos) que se ganaron. */
  winRate: number;
  pendingTasks: number;
  overdueTasks: number;
}

export interface DashboardLead {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  status: string;
  createdAt: string;
}

export interface DashboardActivity {
  id: string;
  type: string;
  title: string;
  performedAt: string;
  userName: string | null;
  /** Lead o cliente al que pertenece la actividad. */
  relatedName: string | null;
}

export interface DashboardTask {
  id: string;
  title: string;
  priority: string;
  dueDate: string | null;
  relatedName: string | null;
}

export interface DashboardIntegration {
  id: string;
  provider: string;
  name: string;
  status: string;
  lastSyncAt: string | null;
}

export interface DashboardData {
  metrics: DashboardMetrics;
  pipeline: StageRow[];
  recentLeads: DashboardLead[];
  recentActivities: DashboardActivity[];
  upcomingTasks: DashboardTask[];
  /** Vacío para usuarios CLIENT. */
  integrations: DashboardIntegration[];
}

export interface DashboardResponse extends DashboardData {
  success: true;
}
