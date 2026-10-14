import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import {
  MetaApiError,
  countMetaConversions,
  listMetaCampaignInsights,
  listMetaCampaigns,
  type MetaCampaign,
} from "@/lib/integrations/meta";

// Primera sincronización trae 90 días de histórico; las siguientes, 30 (Meta ajusta
// conversiones retroactivamente dentro de la ventana de atribución).
const INITIAL_SYNC_DAYS = 90;
const SYNC_DAYS = 30;

function mapCampaignStatus(c: MetaCampaign) {
  if (c.status === "ACTIVE") return "active";
  if (c.status === "PAUSED") return "paused";
  return "completed"; // ARCHIVED, DELETED
}

function toIsoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

export interface SyncSummary {
  accounts: number;
  campaigns: number;
  metricDays: number;
  errors: string[];
}

/**
 * Sincroniza campañas y métricas diarias (90 días la primera vez, luego 30) de todas las
 * cuentas publicitarias de Meta conectadas a una integración.
 */
export async function syncMetaIntegration(integrationId: string): Promise<SyncSummary> {
  const accounts = await prisma.connectedAccount.findMany({
    where: { integrationId, accountType: "meta_ad_account", status: { not: "disabled" } },
  });

  const summary: SyncSummary = { accounts: 0, campaigns: 0, metricDays: 0, errors: [] };
  const until = new Date();

  for (const account of accounts) {
    if (!account.accessTokenEnc || !account.externalId) continue;
    const days = account.lastSyncAt ? SYNC_DAYS : INITIAL_SYNC_DAYS;
    const since = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);

    try {
      const token = decryptSecret(account.accessTokenEnc);
      const meta = JSON.parse(account.metadataJson || "{}");

      const remoteCampaigns = await listMetaCampaigns(account.externalId, token);
      const campaignIdByExternal = new Map<string, string>();

      for (const rc of remoteCampaigns) {
        const isDaily = Boolean(rc.daily_budget);
        const budgetCents = parseInt(rc.daily_budget || rc.lifetime_budget || "0", 10) || 0;
        const data = {
          name: rc.name,
          platform: "meta_ads",
          objective: rc.objective || null,
          currency: meta.currency || null,
          budget: budgetCents / 100,
          budgetType: rc.daily_budget || rc.lifetime_budget ? (isDaily ? "daily" : "lifetime") : null,
          status: mapCampaignStatus(rc),
          startDate: rc.start_time ? new Date(rc.start_time) : null,
          endDate: rc.stop_time ? new Date(rc.stop_time) : null,
          isDemo: false,
        };

        const saved = await prisma.campaign.upsert({
          where: { connectedAccountId_externalId: { connectedAccountId: account.id, externalId: rc.id } },
          create: { ...data, organizationId: account.organizationId, connectedAccountId: account.id, externalId: rc.id },
          update: data,
        });
        campaignIdByExternal.set(rc.id, saved.id);
      }

      const insights = await listMetaCampaignInsights(account.externalId, token, toIsoDate(since), toIsoDate(until));
      for (const row of insights) {
        const campaignId = campaignIdByExternal.get(row.campaign_id);
        if (!campaignId) continue;
        const values = {
          spend: parseFloat(row.spend || "0") || 0,
          impressions: parseInt(row.impressions || "0", 10) || 0,
          reach: parseInt(row.reach || "0", 10) || 0,
          clicks: parseInt(row.clicks || "0", 10) || 0,
          conversions: countMetaConversions(row.actions),
        };
        const date = new Date(`${row.date_start}T00:00:00.000Z`);
        await prisma.campaignMetric.upsert({
          where: { campaignId_date: { campaignId, date } },
          create: { campaignId, date, ...values },
          update: values,
        });
        summary.metricDays++;
      }

      // Totales de la campaña = suma de todo el histórico diario almacenado.
      // El alcance diario no es sumable (usuarios únicos), se toma el máximo diario como aproximación.
      for (const campaignId of Array.from(campaignIdByExternal.values())) {
        const agg = await prisma.campaignMetric.aggregate({
          where: { campaignId },
          _sum: { spend: true, impressions: true, clicks: true, conversions: true },
          _max: { reach: true },
        });
        await prisma.campaign.update({
          where: { id: campaignId },
          data: {
            spent: agg._sum.spend || 0,
            impressions: agg._sum.impressions || 0,
            clicks: agg._sum.clicks || 0,
            conversions: agg._sum.conversions || 0,
            reach: agg._max.reach || 0,
          },
        });
      }

      await prisma.connectedAccount.update({
        where: { id: account.id },
        data: { status: "active", lastSyncAt: new Date() },
      });
      summary.accounts++;
      summary.campaigns += remoteCampaigns.length;
    } catch (err: any) {
      const expired = err instanceof MetaApiError && err.code === 190;
      await prisma.connectedAccount.update({
        where: { id: account.id },
        data: { status: expired ? "expired" : "error" },
      });
      summary.errors.push(`${account.accountName}: ${err.message}`);
    }
  }

  return summary;
}
