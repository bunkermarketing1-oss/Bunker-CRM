import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const orgId = user!.organizationId;

    const [
      totalLeads,
      activeClients,
      opportunities,
      pendingTasks,
      totalSmsSent,
      scheduledPosts,
      integrations,
      recentActivities,
      recentLeads,
    ] = await Promise.all([
      prisma.lead.count({ where: { organizationId: orgId, isDeleted: false } }),
      prisma.client.count({ where: { organizationId: orgId, isDeleted: false, status: "active" } }),
      prisma.opportunity.findMany({ where: { organizationId: orgId, isDeleted: false }, include: { stage: true } }),
      prisma.task.count({
        where: {
          status: "pending",
          OR: [
            { client: { organizationId: orgId } },
            { lead: { organizationId: orgId } },
            { user: { memberships: { some: { organizationId: orgId } } } },
          ],
        },
      }),
      prisma.message.count({ where: { organizationId: orgId, channel: "sms" } }),
      prisma.socialPost.count({ where: { organizationId: orgId, status: "scheduled" } }),
      prisma.integration.findMany({ where: { organizationId: orgId } }),
      prisma.activity.findMany({
        where: {
          OR: [
            { client: { organizationId: orgId } },
            { lead: { organizationId: orgId } },
            { user: { memberships: { some: { organizationId: orgId } } } },
          ],
        },
        take: 6,
        orderBy: { performedAt: "desc" },
        include: {
          client: { select: { name: true } },
          lead: { select: { name: true } },
          user: { select: { name: true } },
        },
      }),
      prisma.lead.findMany({
        where: { organizationId: orgId, isDeleted: false },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: { owner: { select: { name: true } } },
      }),
    ]);

    let openDealsCount = 0;
    let wonDealsCount = 0;
    let totalPipelineValue = 0;
    let wonRevenue = 0;

    opportunities.forEach((opp) => {
      if (opp.status === "open") {
        openDealsCount++;
        totalPipelineValue += opp.value;
      } else if (opp.status === "won") {
        wonDealsCount++;
        wonRevenue += opp.value;
      }
    });

    const totalDeals = openDealsCount + wonDealsCount;
    const conversionRate = totalDeals > 0 ? Math.round((wonDealsCount / totalDeals) * 100) : 0;

    const connectedIntegrations = integrations.filter((i) => i.status === "connected").length;

    return NextResponse.json({
      success: true,
      metrics: {
        totalLeads,
        activeClients,
        openDealsCount,
        wonDealsCount,
        totalPipelineValue,
        wonRevenue,
        conversionRate,
        pendingTasks,
        totalSmsSent,
        scheduledPosts,
        connectedIntegrations,
        totalIntegrations: integrations.length,
      },
      recentActivities,
      recentLeads,
      integrations,
    });
  } catch (error: any) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ success: false, error: "Error al cargar métricas del panel principal." }, { status: 500 });
  }
}
