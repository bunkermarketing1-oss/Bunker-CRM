import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { validateAndNormalizePhone } from "@/lib/phone";
import {
  getMetaLead,
  listFormLeads,
  listPageLeadForms,
  subscribePageToLeadgen,
  type MetaLead,
  type MetaLeadgenChange,
  type MetaWebhookPayload,
} from "@/lib/integrations/meta";
import { mapMetaLeadFields } from "@/lib/integrations/meta-lead-fields";
import {
  ACCOUNT_STATUS,
  ACCOUNT_TYPE,
  INTEGRATION_PROVIDER,
  META_LEAD_EVENT_STATUS,
  META_LEAD_MAX_ATTEMPTS,
} from "@/lib/constants/integrations";
import { LEAD_SOURCE, LEAD_STATUS } from "@/lib/constants/crm";
import type { PageLeadgenStatus } from "@/types/meta-leads";

const LEADGEN_FIELD = "leadgen";
const AUDIT_ACTION_LEAD_CAPTURED = "lead_captured_meta";

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Error desconocido";
}

/** Página de Facebook conectada (con token) a la que pertenece un lead. */
async function findConnectedPage(pageId: string) {
  return prisma.connectedAccount.findFirst({
    where: {
      accountType: ACCOUNT_TYPE.FACEBOOK_PAGE,
      externalId: pageId,
      status: { not: ACCOUNT_STATUS.DISABLED },
      integration: { provider: INTEGRATION_PROVIDER.META },
    },
    select: { id: true, organizationId: true, clientId: true, accessTokenEnc: true },
  });
}

/**
 * Guarda los eventos `leadgen` de un payload del webhook. Un `leadgen_id` que ya existe
 * (Meta reintenta si no respondimos a tiempo) no se vuelve a crear.
 * Devuelve los IDs de eventos que hay que procesar.
 */
export async function recordLeadgenEvents(payload: MetaWebhookPayload): Promise<string[]> {
  const changes: MetaLeadgenChange[] = (payload.entry || []).flatMap((entry) =>
    (entry.changes || []).filter((c) => c.field === LEADGEN_FIELD && c.value?.leadgen_id).map((c) => c.value)
  );

  const created: string[] = [];
  for (const change of changes) {
    const id = await createEventIfNew(change.leadgen_id, change.page_id, change, change.form_id, change.ad_id);
    if (id) created.push(id);
  }
  return created;
}

async function createEventIfNew(
  leadgenId: string,
  pageId: string,
  payload: unknown,
  formId?: string,
  adId?: string
): Promise<string | null> {
  const existing = await prisma.metaLeadEvent.findUnique({ where: { leadgenId }, select: { id: true, status: true } });
  // Un evento ignorado se reprocesa: la página pudo conectarse después de recibirlo.
  if (existing) return existing.status === META_LEAD_EVENT_STATUS.IGNORED ? existing.id : null;
  try {
    const event = await prisma.metaLeadEvent.create({
      data: { leadgenId, pageId, formId: formId ?? null, adId: adId ?? null, payloadJson: JSON.stringify(payload) },
      select: { id: true },
    });
    return event.id;
  } catch {
    // Dos entregas simultáneas del mismo lead: la otra ganó la carrera por el índice único.
    return null;
  }
}

/**
 * Trae el lead de Meta y lo crea en el CRM, asignado al cliente de la página.
 * No lanza: el resultado queda en el estado del evento (`processed`, `failed`, `ignored`).
 */
export async function processMetaLeadEvent(eventId: string) {
  const event = await prisma.metaLeadEvent.findUnique({ where: { id: eventId } });
  if (!event || event.status === META_LEAD_EVENT_STATUS.PROCESSED) return;

  const page = await findConnectedPage(event.pageId);
  if (!page || !page.accessTokenEnc) {
    await prisma.metaLeadEvent.update({
      where: { id: event.id },
      data: {
        status: META_LEAD_EVENT_STATUS.IGNORED,
        attempts: { increment: 1 },
        errorMessage: `La página ${event.pageId} no está conectada en el CRM.`,
      },
    });
    return;
  }

  try {
    const metaLead = await getMetaLead(event.leadgenId, decryptSecret(page.accessTokenEnc));
    const leadId = await upsertLeadFromMeta(page.organizationId, page.clientId, metaLead);

    await prisma.metaLeadEvent.update({
      where: { id: event.id },
      data: {
        organizationId: page.organizationId,
        status: META_LEAD_EVENT_STATUS.PROCESSED,
        attempts: { increment: 1 },
        errorMessage: null,
        leadId,
        processedAt: new Date(),
      },
    });
  } catch (error) {
    console.error(`Meta leadgen ${event.leadgenId} error:`, error);
    await prisma.metaLeadEvent.update({
      where: { id: event.id },
      data: {
        organizationId: page.organizationId,
        status: META_LEAD_EVENT_STATUS.FAILED,
        attempts: { increment: 1 },
        errorMessage: errorMessage(error),
      },
    });
  }
}

/** Crea el lead si no existe. Si ya existe no lo toca, para no pisar lo que editó el asesor. */
async function upsertLeadFromMeta(organizationId: string, clientId: string | null, metaLead: MetaLead) {
  const existing = await prisma.lead.findUnique({
    where: { organizationId_externalLeadId: { organizationId, externalLeadId: metaLead.id } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const mapped = mapMetaLeadFields(metaLead.field_data || []);
  const phone = validateAndNormalizePhone(mapped.phone);

  const lead = await prisma.lead.create({
    data: {
      organizationId,
      clientId,
      name: mapped.name,
      email: mapped.email,
      // Si Meta trae un teléfono que no se puede normalizar se guarda tal cual: es mejor
      // que el asesor lo vea y lo corrija a perder el dato.
      phone: phone.formatted ?? mapped.phone,
      normalizedPhone: phone.normalized,
      companyName: mapped.companyName,
      notes: mapped.notes,
      source: LEAD_SOURCE.META_ADS,
      status: LEAD_STATUS.NEW,
      campaign: metaLead.campaign_name ?? null,
      externalLeadId: metaLead.id,
      externalFormId: metaLead.form_id ?? null,
      externalAdId: metaLead.ad_id ?? null,
      externalCampaignId: metaLead.campaign_id ?? null,
      createdAt: metaLead.created_time ? new Date(metaLead.created_time) : undefined,
    },
    select: { id: true, name: true, source: true, campaign: true },
  });

  await prisma.auditLog.create({
    data: {
      organizationId,
      action: AUDIT_ACTION_LEAD_CAPTURED,
      entityType: "Lead",
      entityId: lead.id,
      detailsJson: JSON.stringify({
        externalLeadId: metaLead.id,
        formId: metaLead.form_id,
        campaign: lead.campaign,
        clientId,
      }),
    },
  });

  return lead.id;
}

export interface MetaLeadsSyncSummary {
  pages: number;
  recovered: number;
  retried: number;
  errors: string[];
}

/**
 * Respaldo del webhook: recorre los formularios de cada página conectada, registra los
 * leads de las últimas `sinceHours` horas que no llegaron y reintenta los eventos fallidos.
 */
export async function syncMetaLeads(sinceHours: number): Promise<MetaLeadsSyncSummary> {
  const summary: MetaLeadsSyncSummary = { pages: 0, recovered: 0, retried: 0, errors: [] };
  const sinceUnix = Math.floor((Date.now() - sinceHours * 60 * 60 * 1000) / 1000);

  const pages = await prisma.connectedAccount.findMany({
    where: {
      accountType: ACCOUNT_TYPE.FACEBOOK_PAGE,
      status: { not: ACCOUNT_STATUS.DISABLED },
      accessTokenEnc: { not: null },
      integration: { provider: INTEGRATION_PROVIDER.META },
    },
    select: { externalId: true, accountName: true, accessTokenEnc: true },
  });

  for (const page of pages) {
    if (!page.externalId || !page.accessTokenEnc) continue;
    summary.pages++;
    try {
      const token = decryptSecret(page.accessTokenEnc);
      const forms = await listPageLeadForms(page.externalId, token);
      for (const form of forms) {
        const leads = await listFormLeads(form.id, token, sinceUnix);
        for (const metaLead of leads) {
          const eventId = await createEventIfNew(metaLead.id, page.externalId, metaLead, form.id, metaLead.ad_id);
          if (!eventId) continue;
          await processMetaLeadEvent(eventId);
          summary.recovered++;
        }
      }
    } catch (error) {
      summary.errors.push(`${page.accountName}: ${errorMessage(error)}`);
    }
  }

  const failed = await prisma.metaLeadEvent.findMany({
    where: { status: META_LEAD_EVENT_STATUS.FAILED, attempts: { lt: META_LEAD_MAX_ATTEMPTS } },
    select: { id: true },
  });
  for (const event of failed) {
    await processMetaLeadEvent(event.id);
    summary.retried++;
  }

  return summary;
}

/**
 * Suscribe las páginas de una integración al webhook `leadgen`. El resultado queda en
 * `metadataJson.leadgenSubscribed` de cada página para mostrarlo en Integraciones.
 */
export async function subscribeMetaPagesToLeadgen(integrationId: string) {
  const pages = await prisma.connectedAccount.findMany({
    where: { integrationId, accountType: ACCOUNT_TYPE.FACEBOOK_PAGE, accessTokenEnc: { not: null } },
    select: { id: true, externalId: true, accountName: true, accessTokenEnc: true, metadataJson: true },
  });

  const errors: string[] = [];
  for (const page of pages) {
    if (!page.externalId || !page.accessTokenEnc) continue;
    const metadata = JSON.parse(page.metadataJson || "{}");
    try {
      await subscribePageToLeadgen(page.externalId, decryptSecret(page.accessTokenEnc));
      metadata.leadgenSubscribed = true;
      delete metadata.leadgenError;
    } catch (error) {
      metadata.leadgenSubscribed = false;
      metadata.leadgenError = errorMessage(error);
      errors.push(`${page.accountName}: ${metadata.leadgenError}`);
    }
    await prisma.connectedAccount.update({ where: { id: page.id }, data: { metadataJson: JSON.stringify(metadata) } });
  }
  return { pages: pages.length, errors };
}

/**
 * Estado de suscripción y último lead recibido por página, a partir del `metadataJson`
 * de cada cuenta. Devuelve un mapa por `externalId` de la página.
 */
export async function getPagesLeadgenStatus(
  organizationId: string,
  pages: { externalId: string | null; metadataJson: string | null }[]
): Promise<Map<string, PageLeadgenStatus>> {
  const pageIds = pages.map((p) => p.externalId).filter((id): id is string => Boolean(id));
  const lastLeads = pageIds.length
    ? await prisma.metaLeadEvent.groupBy({
        by: ["pageId"],
        where: { organizationId, status: META_LEAD_EVENT_STATUS.PROCESSED, pageId: { in: pageIds } },
        _max: { processedAt: true },
      })
    : [];
  const lastLeadByPage = new Map(lastLeads.map((row) => [row.pageId, row._max.processedAt]));

  const statuses = new Map<string, PageLeadgenStatus>();
  for (const page of pages) {
    if (!page.externalId) continue;
    const metadata = JSON.parse(page.metadataJson || "{}");
    statuses.set(page.externalId, {
      subscribed: typeof metadata.leadgenSubscribed === "boolean" ? metadata.leadgenSubscribed : null,
      error: metadata.leadgenError ?? null,
      lastLeadAt: lastLeadByPage.get(page.externalId)?.toISOString() ?? null,
    });
  }
  return statuses;
}
