import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { scopeFromUser } from "@/lib/tenant";
import { getDashboard } from "@/services/dashboard.service";
import type { DashboardData } from "@/types/dashboard";

export const dynamic = "force-dynamic";

const EMPTY_DASHBOARD: DashboardData = {
  metrics: {
    totalLeads: 0,
    leadsThisWeek: 0,
    activeClients: null,
    openDealsCount: 0,
    openPipelineValue: 0,
    wonDealsCount: 0,
    wonRevenue: 0,
    winRate: 0,
    pendingTasks: 0,
    overdueTasks: 0,
  },
  pipeline: [],
  recentLeads: [],
  recentActivities: [],
  upcomingTasks: [],
  integrations: [],
};

/**
 * Panel de inicio. ADMIN: toda la organización (incluye clientes activos e integraciones).
 * CLIENT: solo su empresa, forzado en servidor.
 */
export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  const scope = scopeFromUser(user!);
  if (!scope) return NextResponse.json({ success: true, ...EMPTY_DASHBOARD });

  try {
    const dashboard = await getDashboard(scope);
    return NextResponse.json({ success: true, ...dashboard });
  } catch (error) {
    console.error("GET /api/dashboard error:", error);
    return NextResponse.json({ success: false, error: "Error al cargar métricas del panel principal." }, { status: 500 });
  }
}
