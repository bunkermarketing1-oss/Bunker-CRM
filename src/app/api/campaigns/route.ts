import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { clientBelongsToOrg } from "@/lib/validation-helpers";
import { AD_ACCOUNT_TYPES, CAMPAIGN_STATUS } from "@/lib/constants/integrations";
import { isCommercialLicenseActive } from "@/lib/license";

export const dynamic = "force-dynamic";

const ALLOWED_DAYS = [7, 30, 90];

/**
 * Campañas pagadas y métricas del rango seleccionado.
 * - ADMIN: toda la organización, filtrable por ?clientId=
 * - CLIENT: solo las cuentas que el admin asignó a su empresa (el filtro se fuerza en servidor)
 * Query: days=7|30|90 (default 30), clientId, platform=meta_ads|tiktok
 */
export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    if (!isCommercialLicenseActive()) {
      return NextResponse.json({
        success: false,
        error: "Módulo de Campañas Publicitarias en pausa. Licencia empresarial pendiente de activación comercial.",
        isLicenseRequired: true,
      }, { status: 402 });
    }

    const { searchParams } = new URL(req.url);
    const daysParam = parseInt(searchParams.get("days") || "30", 10);
    const days = ALLOWED_DAYS.includes(daysParam) ? daysParam : 30;
    const platform = searchParams.get("platform");

    let clientId: string | null = null;
    if (user!.isClientUser) {
      if (!user!.clientId) {
        return NextResponse.json({ success: true, days, accounts: [], campaigns: [], daily: [], totals: emptyTotals() });
      }
      clientId = user!.clientId;
    } else {
      const requested = searchParams.get("clientId");
      if (requested && requested !== "all") {
        if (!(await clientBelongsToOrg(user!.organizationId, requested))) {
          return NextResponse.json({ success: false, error: "Cliente no pertenece a su organización." }, { status: 404 });
        }
        clientId = requested;
      }
    }

    const accountWhere: any = {
      organizationId: user!.organizationId,
      accountType: { in: AD_ACCOUNT_TYPES },
    };
    if (clientId) accountWhere.clientId = clientId;

    const accounts = await prisma.connectedAccount.findMany({
      where: accountWhere,
      select: {
        id: true,
        accountName: true,
        accountType: true,
        status: true,
        lastSyncAt: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { accountName: "asc" },
    });
    const accountIds = accounts.map((a) => a.id);

    const requestedAccountId = searchParams.get("accountId");
    let targetAccountIds = accountIds;
    if (requestedAccountId && requestedAccountId !== "all") {
      targetAccountIds = accountIds.filter((id) => id === requestedAccountId);
    }

    const campaignWhere: any = {
      organizationId: user!.organizationId,
      connectedAccountId: { in: targetAccountIds },
      externalId: { not: null },
    };
    if (platform && platform !== "all") campaignWhere.platform = platform;

    const campaigns = await prisma.campaign.findMany({
      where: campaignWhere,
      select: {
        id: true,
        name: true,
        platform: true,
        objective: true,
        status: true,
        currency: true,
        budget: true,
        budgetType: true,
        startDate: true,
        endDate: true,
        connectedAccountId: true,
      },
    });
    const campaignIds = campaigns.map((c) => c.id);

    const since = new Date();
    since.setUTCHours(0, 0, 0, 0);
    since.setUTCDate(since.getUTCDate() - (days - 1));
    const metricWhere = { campaignId: { in: campaignIds }, date: { gte: since } };
    const sumFields = { spend: true, impressions: true, clicks: true, conversions: true } as const;

    const [byCampaign, byDay] = await Promise.all([
      prisma.campaignMetric.groupBy({ by: ["campaignId"], where: metricWhere, _sum: sumFields }),
      prisma.campaignMetric.groupBy({ by: ["date"], where: metricWhere, _sum: sumFields, orderBy: { date: "asc" } }),
    ]);

    const metricsByCampaign = new Map(byCampaign.map((m) => [m.campaignId, m._sum]));
    const accountById = new Map(accounts.map((a) => [a.id, a]));

    const campaignRows = campaigns
      .map((c) => {
        const m = metricsByCampaign.get(c.id);
        const account = c.connectedAccountId ? accountById.get(c.connectedAccountId) : undefined;
        return {
          ...c,
          accountName: account?.accountName || null,
          client: account?.client || null,
          ...withRatios({
            spend: m?.spend || 0,
            impressions: m?.impressions || 0,
            clicks: m?.clicks || 0,
            conversions: m?.conversions || 0,
          }),
        };
      })
      .sort((a, b) => b.spend - a.spend);

    // Serie diaria completa (rellena con ceros los días sin datos)
    const dayMap = new Map(byDay.map((d) => [d.date.toISOString().slice(0, 10), d._sum]));
    const daily = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(since);
      d.setUTCDate(since.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      const s = dayMap.get(key);
      daily.push({
        date: key,
        spend: s?.spend || 0,
        impressions: s?.impressions || 0,
        clicks: s?.clicks || 0,
        conversions: s?.conversions || 0,
      });
    }

    const totals = withRatios(
      campaignRows.reduce(
        (acc, c) => ({
          spend: acc.spend + c.spend,
          impressions: acc.impressions + c.impressions,
          clicks: acc.clicks + c.clicks,
          conversions: acc.conversions + c.conversions,
        }),
        { spend: 0, impressions: 0, clicks: 0, conversions: 0 }
      )
    );

    const currencies = Array.from(new Set(campaigns.map((c) => c.currency).filter(Boolean)));

    return NextResponse.json({
      success: true,
      days,
      clientId,
      selectedAccountId: requestedAccountId || "all",
      currency: currencies.length === 1 ? currencies[0] : null,
      accounts,
      campaigns: campaignRows,
      daily,
      totals: { ...totals, activeCampaigns: campaigns.filter((c) => c.status === CAMPAIGN_STATUS.ACTIVE).length },
    });
  } catch (error) {
    console.error("GET /api/campaigns error:", error);
    const message = error instanceof Error ? error.message : "Error al consultar campañas.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

function withRatios(m: { spend: number; impressions: number; clicks: number; conversions: number }) {
  return {
    ...m,
    ctr: m.impressions ? (m.clicks / m.impressions) * 100 : 0,
    cpc: m.clicks ? m.spend / m.clicks : 0,
    cpm: m.impressions ? (m.spend / m.impressions) * 1000 : 0,
    costPerConversion: m.conversions ? m.spend / m.conversions : 0,
  };
}

function emptyTotals() {
  return { ...withRatios({ spend: 0, impressions: 0, clicks: 0, conversions: 0 }), activeCampaigns: 0 };
}
