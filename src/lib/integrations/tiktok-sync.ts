import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import {
  listTikTokCampaigns,
  listTikTokCampaignInsights,
  type TikTokCampaign,
} from "@/lib/integrations/tiktok";
import { ACCOUNT_STATUS, ACCOUNT_TYPE, CAMPAIGN_PLATFORM, CAMPAIGN_STATUS } from "@/lib/constants/integrations";
import type { SyncSummary } from "@/lib/integrations/meta-sync";

const INITIAL_SYNC_DAYS = 90;
const SYNC_DAYS = 30;

function mapTikTokCampaignStatus(c: TikTokCampaign): string {
  if (c.operation_status === "ENABLE") return CAMPAIGN_STATUS.ACTIVE;
  if (c.operation_status === "DISABLE") return CAMPAIGN_STATUS.PAUSED;
  return CAMPAIGN_STATUS.COMPLETED;
}

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Sincroniza campañas y métricas diarias desde cuentas de TikTok Ads conectadas.
 */
export async function syncTikTokIntegration(integrationId: string): Promise<SyncSummary> {
  const accounts = await prisma.connectedAccount.findMany({
    where: {
      integrationId,
      accountType: ACCOUNT_TYPE.TIKTOK_ADVERTISER,
      status: { not: ACCOUNT_STATUS.DISABLED },
    },
  });

  const summary: SyncSummary = { accounts: 0, campaigns: 0, metricDays: 0, errors: [] };
  const until = new Date();

  for (const account of accounts) {
    if (!account.accessTokenEnc || !account.externalId) continue;
    const days = account.lastSyncAt ? SYNC_DAYS : INITIAL_SYNC_DAYS;
    const since = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000);

    try {
      const token = decryptSecret(account.accessTokenEnc);
      const remoteCampaigns = await listTikTokCampaigns(account.externalId, token);
      const campaignIdByExternal = new Map<string, string>();

      for (const rc of remoteCampaigns) {
        const isDaily = rc.budget_mode === "BUDGET_MODE_DAY";
        const budgetAmount = rc.budget || 0;

        const campaign = await prisma.campaign.upsert({
          where: {
            connectedAccountId_externalId: {
              connectedAccountId: account.id,
              externalId: rc.campaign_id,
            },
          },
          update: {
            name: rc.campaign_name,
            status: mapTikTokCampaignStatus(rc),
            objective: rc.objective_type ?? null,
            budget: budgetAmount,
            budgetType: isDaily ? "daily" : "lifetime",
            startDate: rc.create_time ? new Date(rc.create_time) : undefined,
          },
          create: {
            organizationId: account.organizationId,
            connectedAccountId: account.id,
            externalId: rc.campaign_id,
            name: rc.campaign_name,
            platform: CAMPAIGN_PLATFORM.TIKTOK,
            objective: rc.objective_type ?? null,
            budget: budgetAmount,
            budgetType: isDaily ? "daily" : "lifetime",
            status: mapTikTokCampaignStatus(rc),
            startDate: rc.create_time ? new Date(rc.create_time) : undefined,
          },
        });

        campaignIdByExternal.set(rc.campaign_id, campaign.id);
        summary.campaigns++;
      }

      // Sincronizar métricas diarias
      const insights = await listTikTokCampaignInsights(
        account.externalId,
        token,
        toIsoDate(since),
        toIsoDate(until)
      );

      for (const ins of insights) {
        const campaignId = campaignIdByExternal.get(ins.campaign_id);
        if (!campaignId) continue;

        await prisma.campaignMetric.upsert({
          where: {
            campaignId_date: {
              campaignId,
              date: new Date(`${ins.stat_time_day}T00:00:00.000Z`),
            },
          },
          update: {
            spend: parseFloat(ins.spend) || 0,
            impressions: parseInt(ins.impressions, 10) || 0,
            clicks: parseInt(ins.clicks, 10) || 0,
            conversions: parseInt(ins.conversion, 10) || 0,
          },
          create: {
            campaignId,
            date: new Date(`${ins.stat_time_day}T00:00:00.000Z`),
            spend: parseFloat(ins.spend) || 0,
            impressions: parseInt(ins.impressions, 10) || 0,
            clicks: parseInt(ins.clicks, 10) || 0,
            conversions: parseInt(ins.conversion, 10) || 0,
          },
        });
        summary.metricDays++;
      }

      await prisma.connectedAccount.update({
        where: { id: account.id },
        data: { lastSyncAt: new Date(), status: ACCOUNT_STATUS.ACTIVE },
      });

      summary.accounts++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      summary.errors.push(`${account.accountName}: ${msg}`);
      await prisma.connectedAccount.update({
        where: { id: account.id },
        data: { status: ACCOUNT_STATUS.ERROR },
      });
    }
  }

  return summary;
}
