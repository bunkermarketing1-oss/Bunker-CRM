import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { validateAndNormalizePhone } from "@/lib/phone";
import {
  getMetaLead,
  listFormLeads,
  listPageLeadForms,
  subscribePageToLeadgen,
  subscribeInstagramToMessaging,
  type MetaLeadgenChange,
  type MetaWebhookPayload,
  type MetaLead,
} from "@/lib/integrations/meta";

import { mapMetaLeadFields } from "@/lib/integrations/meta-lead-fields";
import { isRecentMetaLead, resolvePageConnection } from "@/lib/integrations/meta-lead-policy";
import {
  ACCOUNT_STATUS,
  ACCOUNT_TYPE,
  INTEGRATION_PROVIDER,
  META_LEAD_AUTOMATION_MAX_AGE_MINUTES,
  META_LEAD_EVENT_STATUS,
  META_LEAD_MAX_ATTEMPTS,
  META_LEAD_NO_SMS_ACTIVITY_TITLE,
  META_LEAD_STALE_RECEIVED_MINUTES,
  type MetaLeadEventStatus,
} from "@/lib/constants/integrations";
import { ACTIVITY_TYPE, LEAD_SOURCE, LEAD_STATUS } from "@/lib/constants/crm";
import { computeInitialQualification } from "@/lib/lead-scoring";
import { runLeadCreatedAutomations } from "@/services/automations.service";
import type { PageLeadgenStatus } from "@/types/meta-leads";

const LEADGEN_FIELD = "leadgen";
const AUDIT_ACTION_LEAD_CAPTURED = "lead_captured_meta";
const MS_PER_MINUTE = 60 * 1000;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Error desconocido";
}

/**
 * Páginas de Facebook de Meta conectadas, activas y con token: las únicas de las que se
 * pueden leer leads. Compartido por el webhook y el respaldo para que ambos acepten lo mismo.
 */
const connectedPageWhere = {
  accountType: ACCOUNT_TYPE.FACEBOOK_PAGE,
  status: ACCOUNT_STATUS.ACTIVE,
  accessTokenEnc: { not: null },
  integration: { provider: INTEGRATION_PROVIDER.META },
};

/** Todas las conexiones de la página; `resolvePageConnection` decide si hay un dueño único. */
async function findConnectedPages(pageId: string) {
  return prisma.connectedAccount.findMany({
    where: { ...connectedPageWhere, externalId: pageId },
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

  const pending: string[] = [];
  for (const change of changes) {
    const id = await createEventIfNew(change.leadgen_id, change.page_id, change, change.form_id, change.ad_id);
    if (id) pending.push(id);
  }
  return pending;
}

/**
 * Crea el evento si el `leadgenId` es nuevo. Si ya existe y no está `processed` devuelve su
 * ID para que se procese: así el respaldo recupera eventos atascados o ignorados (la página
 * pudo conectarse después). Que no se procese dos veces a la vez lo garantiza `claimEvent`.
 */
async function createEventIfNew(
  leadgenId: string,
  pageId: string,
  payload: unknown,
  formId?: string,
  adId?: string
): Promise<string | null> {
  const existing = await prisma.metaLeadEvent.findUnique({ where: { leadgenId }, select: { id: true, status: true } });
  if (existing) return existing.status === META_LEAD_EVENT_STATUS.PROCESSED ? null : existing.id;
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

/** Un `received` sin avance desde esta fecha se considera abandonado (redeploy, caída). */
function staleReceivedBefore() {
  return new Date(Date.now() - META_LEAD_STALE_RECEIVED_MINUTES * MS_PER_MINUTE);
}

/**
 * Toma el evento para procesarlo y lo deja en `received` con un intento más. `attempts`
 * hace de versión: el `updateMany` solo gana si nadie lo tomó desde que se leyó, así el
 * webhook, un reenvío de Meta y el cron no lo procesan (ni mandan el SMS) a la vez. Un
 * `received` con intentos solo se retoma tras `META_LEAD_STALE_RECEIVED_MINUTES` sin avance.
 */
async function claimEvent(eventId: string, attempts: number) {
  const { count } = await prisma.metaLeadEvent.updateMany({
    where: {
      id: eventId,
      attempts,
      OR: [
        { status: META_LEAD_EVENT_STATUS.IGNORED },
        { status: META_LEAD_EVENT_STATUS.FAILED, attempts: { lt: META_LEAD_MAX_ATTEMPTS } },
        { status: META_LEAD_EVENT_STATUS.RECEIVED, attempts: 0 },
        {
          status: META_LEAD_EVENT_STATUS.RECEIVED,
          attempts: { lt: META_LEAD_MAX_ATTEMPTS },
          updatedAt: { lt: staleReceivedBefore() },
        },
      ],
    },
    data: { status: META_LEAD_EVENT_STATUS.RECEIVED, attempts: { increment: 1 } },
  });
  return count === 1;
}

async function ignoreEvent(eventId: string, message: string) {
  await prisma.metaLeadEvent.update({
    where: { id: eventId },
    data: { status: META_LEAD_EVENT_STATUS.IGNORED, organizationId: null, errorMessage: message },
  });
}

/**
 * Trae el lead de Meta y lo crea en el CRM, asignado al cliente de la página.
 * No lanza: el resultado queda en el estado del evento (`processed`, `failed`, `ignored`).
 * Devuelve el estado final, o null si el evento no se tocó (ya procesado o en curso).
 */
export async function processMetaLeadEvent(eventId: string): Promise<MetaLeadEventStatus | null> {
  // Todo va dentro del try: si algo falla antes de terminar el evento queda `failed` y, si ni
  // eso se pudo guardar, sigue `received` y el cron lo retoma al vencer el umbral de abandono.
  let organizationId: string | null = null;
  try {
    const event = await prisma.metaLeadEvent.findUnique({
      where: { id: eventId },
      select: { id: true, leadgenId: true, pageId: true, status: true, attempts: true },
    });
    if (!event || event.status === META_LEAD_EVENT_STATUS.PROCESSED) return null;
    if (!(await claimEvent(event.id, event.attempts))) return null;

    const resolution = resolvePageConnection(await findConnectedPages(event.pageId));
    if (resolution.kind === "none") {
      await ignoreEvent(event.id, `La página ${event.pageId} no está conectada (activa) en el CRM.`);
      return META_LEAD_EVENT_STATUS.IGNORED;
    }
    if (resolution.kind === "ambiguous") {
      console.error(
        `Meta leadgen ${event.leadgenId}: la página ${event.pageId} está conectada en varios dueños`,
        resolution.owners
      );
      await ignoreEvent(
        event.id,
        `La página ${event.pageId} está conectada en ${resolution.owners.length} organizaciones o clientes distintos. ` +
        "Deja una sola conexión para recibir sus leads."
      );
      return META_LEAD_EVENT_STATUS.IGNORED;
    }

    const page = resolution.page;
    organizationId = page.organizationId;
    // `connectedPageWhere` ya exige token; la comprobación es para el tipo.
    if (!page.accessTokenEnc) throw new Error(`La página ${event.pageId} no tiene token.`);
    const metaLead = await getMetaLead(event.leadgenId, decryptSecret(page.accessTokenEnc));
    const isRecent = isRecentMetaLead(metaLead.created_time, new Date(), META_LEAD_AUTOMATION_MAX_AGE_MINUTES);

    // Atribución de cliente: si la página no tiene cliente asignado pero la campaña pertenece
    // a una cuenta publicitaria vinculada a un cliente, se le asigna automáticamente.
    let targetClientId = page.clientId;
    if (!targetClientId && metaLead.campaign_id) {
      const matchedCampaign = await prisma.campaign.findFirst({
        where: {
          organizationId: page.organizationId,
          externalId: metaLead.campaign_id,
        },
        select: {
          connectedAccount: {
            select: { clientId: true },
          },
        },
      });
      if (matchedCampaign?.connectedAccount?.clientId) {
        targetClientId = matchedCampaign.connectedAccount.clientId;
      }
    }

    const leadId = await upsertLeadFromMeta(page.organizationId, targetClientId, metaLead, isRecent);

    // También cuando el lead ya existía: si un intento anterior lo creó y murió antes del SMS,
    // este lo manda; `runLeadCreatedAutomations` no lo repite si ya salió.
    if (isRecent) await runLeadCreatedAutomations(leadId);
    else await noteSkippedAutomations(leadId, targetClientId);

    await prisma.metaLeadEvent.update({
      where: { id: event.id },
      data: {
        organizationId: page.organizationId,
        status: META_LEAD_EVENT_STATUS.PROCESSED,
        errorMessage: null,
        leadId,
        processedAt: new Date(),
      },
    });
    return META_LEAD_EVENT_STATUS.PROCESSED;
  } catch (error) {
    console.error(`Meta leadgen event ${eventId} error:`, error);
    try {
      await prisma.metaLeadEvent.update({
        where: { id: eventId },
        data: { organizationId, status: META_LEAD_EVENT_STATUS.FAILED, errorMessage: errorMessage(error) },
      });
    } catch (updateError) {
      console.error(`Meta leadgen event ${eventId}: no se pudo marcar como fallido:`, updateError);
    }
    return META_LEAD_EVENT_STATUS.FAILED;
  }
}

/**
 * Crea el lead si no existe. Si ya existe no lo toca, para no pisar lo que editó el asesor.
 * Lead y AuditLog van en una transacción: si la auditoría falla no queda un lead sin rastro,
 * y el reintento lo crea completo.
 */
async function upsertLeadFromMeta(
  organizationId: string,
  clientId: string | null,
  metaLead: MetaLead,
  isRecent: boolean
) {
  const existing = await prisma.lead.findUnique({
    where: { organizationId_externalLeadId: { organizationId, externalLeadId: metaLead.id } },
    select: { id: true },
  });
  if (existing) return existing.id;

  const mapped = mapMetaLeadFields(metaLead.field_data || []);
  const phone = validateAndNormalizePhone(mapped.phone);

  return prisma.$transaction(async (tx) => {
    let campaignName = metaLead.campaign_name ?? null;
    if (!campaignName && metaLead.campaign_id) {
      const dbCamp = await tx.campaign.findFirst({
        where: { organizationId, externalId: metaLead.campaign_id },
        select: { name: true },
      });
      if (dbCamp?.name) campaignName = dbCamp.name;
    }
    if (!campaignName && metaLead.form_id) {
      const siblingLead = await tx.lead.findFirst({
        where: { organizationId, externalFormId: metaLead.form_id, campaign: { not: null } },
        select: { campaign: true },
      });
      if (siblingLead?.campaign) campaignName = siblingLead.campaign;
    }

    const lead = await tx.lead.create({
      data: {
        organizationId,
        clientId,
        name: mapped.name,
        email: mapped.email,
        phone: phone.formatted ?? mapped.phone,
        normalizedPhone: phone.normalized ?? null,
        companyName: mapped.companyName,
        notes: mapped.notes,
        source: LEAD_SOURCE.META_ADS,
        status: LEAD_STATUS.NEW,
        qualification: computeInitialQualification({
          email: mapped.email,
          phone: mapped.phone,
          companyName: mapped.companyName,
          estimatedValue: null,
          source: LEAD_SOURCE.META_ADS,
        }),
        campaign: campaignName,
        smsConsent: true,
        smsConsentSource: "meta_lead_ad",
        externalLeadId: metaLead.id,
        externalFormId: metaLead.form_id ?? null,
        externalAdId: metaLead.ad_id ?? null,
        externalCampaignId: metaLead.campaign_id ?? null,
        createdAt: metaLead.created_time ? new Date(metaLead.created_time) : undefined,
      },
      select: { id: true, campaign: true },
    });

    await tx.auditLog.create({
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
          automaticSms: isRecent,
        }),
      },
    });
    return lead.id;
  });
}

/**
 * Deja constancia en el lead de que no recibió el SMS automático por ser un lead viejo
 * recuperado por el respaldo, para que el asesor sepa que nadie lo ha contactado.
 * Idempotente: un reintento no duplica la nota.
 */
async function noteSkippedAutomations(leadId: string, clientId: string | null) {
  const existing = await prisma.activity.findFirst({
    where: { leadId, type: ACTIVITY_TYPE.NOTE, title: META_LEAD_NO_SMS_ACTIVITY_TITLE },
    select: { id: true },
  });
  if (existing) return;
  await prisma.activity.create({
    data: {
      clientId,
      leadId,
      type: ACTIVITY_TYPE.NOTE,
      title: META_LEAD_NO_SMS_ACTIVITY_TITLE,
      description:
        `El lead llegó al CRM más de ${META_LEAD_AUTOMATION_MAX_AGE_MINUTES} minutos después de llenar el ` +
        "formulario (recuperado por la sincronización con Meta), por eso no se le envió el SMS automático. " +
        "Contáctalo manualmente.",
    },
  });
}

export interface MetaLeadsSyncSummary {
  pages: number;
  recovered: number;
  retried: number;
  errors: string[];
}

/**
 * Respaldo del webhook: recorre los formularios de cada página conectada, registra los
 * leads de las últimas `sinceHours` horas que no llegaron (o quedaron sin procesar) y
 * reintenta los eventos fallidos o abandonados en `received`.
 */
export async function syncMetaLeads(
  sinceHours: number,
  organizationId?: string,
  clientId?: string | null
): Promise<MetaLeadsSyncSummary> {
  const summary: MetaLeadsSyncSummary = { pages: 0, recovered: 0, retried: 0, errors: [] };
  const sinceUnix = Math.floor((Date.now() - sinceHours * 60 * 60 * 1000) / 1000);

  const pageWhere: Record<string, unknown> = {
    ...connectedPageWhere,
    ...(organizationId ? { organizationId } : {}),
    ...(clientId ? { clientId } : {}),
  };
  if (organizationId) {
    pageWhere.organizationId = organizationId;
  }

  const pages = await prisma.connectedAccount.findMany({
    where: pageWhere,
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
          if (!metaLead.campaign_name && form.name) {
            metaLead.campaign_name = form.name.replace(/-final$/i, "").trim() || form.name;
          }
          if (!metaLead.form_id) {
            metaLead.form_id = form.id;
          }
          const eventId = await createEventIfNew(metaLead.id, page.externalId, metaLead, form.id, metaLead.ad_id);
          if (!eventId) continue;
          if ((await processMetaLeadEvent(eventId)) === META_LEAD_EVENT_STATUS.PROCESSED) summary.recovered++;
        }
      }
    } catch (error) {
      summary.errors.push(`${page.accountName}: ${errorMessage(error)}`);
    }
  }

  const pendingWhere: Record<string, unknown> = {
    attempts: { lt: META_LEAD_MAX_ATTEMPTS },
    OR: [
      { status: META_LEAD_EVENT_STATUS.FAILED },
      // Un `received` reciente puede estar procesándolo el webhook: solo los abandonados.
      { status: META_LEAD_EVENT_STATUS.RECEIVED, updatedAt: { lt: staleReceivedBefore() } },
    ],
  };
  if (organizationId) {
    pendingWhere.organizationId = organizationId;
  }

  const pending = await prisma.metaLeadEvent.findMany({
    where: pendingWhere,
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  for (const event of pending) {
    if (await processMetaLeadEvent(event.id)) summary.retried++;
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
  const igAccounts = await prisma.connectedAccount.findMany({
    where: { integrationId, accountType: ACCOUNT_TYPE.INSTAGRAM_BUSINESS, accessTokenEnc: { not: null } },
    select: { id: true, externalId: true, accountName: true, accessTokenEnc: true, metadataJson: true },
  });

  for (const ig of igAccounts) {
    if (!ig.externalId || !ig.accessTokenEnc) continue;
    const metadata = JSON.parse(ig.metadataJson || "{}");
    try {
      await subscribeInstagramToMessaging(ig.externalId, decryptSecret(ig.accessTokenEnc));
      metadata.messagingSubscribed = true;
      delete metadata.messagingError;
    } catch (error) {
      metadata.messagingSubscribed = false;
      metadata.messagingError = errorMessage(error);
      errors.push(`${ig.accountName}: ${metadata.messagingError}`);
    }
    await prisma.connectedAccount.update({ where: { id: ig.id }, data: { metadataJson: JSON.stringify(metadata) } });
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
