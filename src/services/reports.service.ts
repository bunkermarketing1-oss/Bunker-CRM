import { prisma } from "@/lib/prisma";
import { LEAD_STATUS, OPPORTUNITY_STATUS, leadSourceLabel } from "@/lib/constants/crm";
import { PAID_LEAD_SOURCES } from "@/lib/constants/reports";
import { buildTrend, hoursBetween, median, percentage, singleCurrency } from "@/lib/reports";
import type { ReportsData, SourceBreakdownRow, StageRow } from "@/types/reports";
import type { TenantScope } from "@/types/tenant";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Reporte comercial del período: leads, conversión, ingresos, pipeline, velocidad de respuesta
 * e inversión en pauta. Todo filtrado por organización y, para usuarios CLIENT, por su empresa.
 */
export async function buildCommercialReport(scope: TenantScope, days: number): Promise<ReportsData> {
  const until = new Date();
  const since = new Date(until.getTime() - days * DAY_MS);
  const clientFilter = scope.clientId ? { clientId: scope.clientId } : {};

  const [leads, wonDeals, openDeals, stages, metrics] = await Promise.all([
    prisma.lead.findMany({
      where: { organizationId: scope.organizationId, isDeleted: false, createdAt: { gte: since }, ...clientFilter },
      select: { id: true, source: true, status: true, createdAt: true, estimatedValue: true },
    }),
    // No hay fecha de cierre: updatedAt es la mejor aproximación de cuándo se ganó el negocio.
    prisma.opportunity.findMany({
      where: {
        organizationId: scope.organizationId,
        isDeleted: false,
        status: OPPORTUNITY_STATUS.WON,
        updatedAt: { gte: since },
        ...clientFilter,
      },
      select: { value: true },
    }),
    prisma.opportunity.findMany({
      where: { organizationId: scope.organizationId, isDeleted: false, status: OPPORTUNITY_STATUS.OPEN, ...clientFilter },
      select: { value: true, probability: true, stageId: true },
    }),
    prisma.pipelineStage.findMany({
      where: { organizationId: scope.organizationId },
      select: { id: true, name: true, color: true },
      orderBy: { order: "asc" },
    }),
    prisma.campaignMetric.findMany({
      where: {
        date: { gte: since },
        campaign: {
          organizationId: scope.organizationId,
          externalId: { not: null },
          ...(scope.clientId ? { connectedAccount: { clientId: scope.clientId } } : {}),
        },
      },
      select: { spend: true, campaign: { select: { currency: true } } },
    }),
  ]);

  const firstContacts = leads.length
    ? await prisma.activity.groupBy({
        by: ["leadId"],
        where: { leadId: { in: leads.map((lead) => lead.id) } },
        _min: { performedAt: true },
      })
    : [];
  const firstContactByLead = new Map(firstContacts.map((row) => [row.leadId, row._min.performedAt]));

  const responseHours = leads.flatMap((lead) => {
    const firstContact = firstContactByLead.get(lead.id);
    return firstContact ? [hoursBetween(lead.createdAt, firstContact)] : [];
  });

  const isConverted = (status: string) => status === LEAD_STATUS.CONVERTED;
  const convertedLeads = leads.filter((lead) => isConverted(lead.status)).length;
  const paidLeads = leads.filter((lead) => PAID_LEAD_SOURCES.includes(lead.source)).length;

  const wonRevenue = wonDeals.reduce((sum, deal) => sum + deal.value, 0);
  const adSpend = metrics.reduce((sum, metric) => sum + metric.spend, 0);

  return {
    days,
    generatedAt: until.toISOString(),
    kpis: {
      newLeads: leads.length,
      conversionRate: percentage(convertedLeads, leads.length),
      wonRevenue,
      wonDeals: wonDeals.length,
      averageTicket: wonDeals.length ? wonRevenue / wonDeals.length : 0,
      openPipelineValue: openDeals.reduce((sum, deal) => sum + deal.value, 0),
      weightedPipelineValue: openDeals.reduce((sum, deal) => sum + (deal.value * deal.probability) / 100, 0),
      medianFirstResponseHours: median(responseHours),
      contactedRate: percentage(responseHours.length, leads.length),
      adSpend,
      adSpendCurrency: singleCurrency(metrics.map((metric) => metric.campaign.currency)),
      costPerLead: adSpend > 0 && paidLeads > 0 ? adSpend / paidLeads : null,
    },
    sources: breakdownBySource(leads),
    trend: buildTrend(
      leads.map((lead) => ({ createdAt: lead.createdAt, converted: isConverted(lead.status) })),
      since,
      until,
      days
    ),
    stages: groupByStage(stages, openDeals),
  };
}

/** Reporte en cero (usuario CLIENT sin empresa asignada), con la tendencia vacía ya armada. */
export function emptyCommercialReport(days: number): ReportsData {
  const until = new Date();
  return {
    days,
    generatedAt: until.toISOString(),
    kpis: {
      newLeads: 0,
      conversionRate: 0,
      wonRevenue: 0,
      wonDeals: 0,
      averageTicket: 0,
      openPipelineValue: 0,
      weightedPipelineValue: 0,
      medianFirstResponseHours: null,
      contactedRate: 0,
      adSpend: 0,
      adSpendCurrency: null,
      costPerLead: null,
    },
    sources: [],
    trend: buildTrend([], new Date(until.getTime() - days * DAY_MS), until, days),
    stages: [],
  };
}

function breakdownBySource(
  leads: { source: string; status: string; estimatedValue: number | null }[]
): SourceBreakdownRow[] {
  const rows = new Map<string, SourceBreakdownRow>();
  for (const lead of leads) {
    const row = rows.get(lead.source) ?? {
      source: lead.source,
      label: leadSourceLabel(lead.source),
      leads: 0,
      converted: 0,
      conversionRate: 0,
      estimatedValue: 0,
      isPaid: PAID_LEAD_SOURCES.includes(lead.source),
    };
    row.leads += 1;
    if (lead.status === LEAD_STATUS.CONVERTED) row.converted += 1;
    row.estimatedValue += lead.estimatedValue ?? 0;
    rows.set(lead.source, row);
  }
  return Array.from(rows.values())
    .map((row) => ({ ...row, conversionRate: percentage(row.converted, row.leads) }))
    .sort((a, b) => b.leads - a.leads);
}

function groupByStage(
  stages: { id: string; name: string; color: string }[],
  openDeals: { value: number; stageId: string }[]
): StageRow[] {
  return stages.map((stage) => {
    const deals = openDeals.filter((deal) => deal.stageId === stage.id);
    return {
      stageId: stage.id,
      name: stage.name,
      color: stage.color,
      deals: deals.length,
      value: deals.reduce((sum, deal) => sum + deal.value, 0),
    };
  });
}
