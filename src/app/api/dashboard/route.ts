import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
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
      prisma.lead.count({ where: { isDeleted: false } }),
      prisma.client.count({ where: { isDeleted: false, status: "active" } }),
      prisma.opportunity.findMany({ where: { isDeleted: false }, include: { stage: true } }),
      prisma.task.count({ where: { status: "pending" } }),
      prisma.message.count({ where: { channel: "sms" } }),
      prisma.socialPost.count({ where: { status: "scheduled" } }),
      prisma.integration.findMany(),
      prisma.activity.findMany({
        take: 6,
        orderBy: { performedAt: "desc" },
        include: {
          client: { select: { name: true } },
          lead: { select: { name: true } },
          user: { select: { name: true } },
        },
      }),
      prisma.lead.findMany({
        take: 5,
        where: { isDeleted: false },
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
