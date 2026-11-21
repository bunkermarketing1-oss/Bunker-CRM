import { prisma } from "@/lib/prisma";
import { validateAndNormalizePhone } from "@/lib/phone";
import { computeInitialQualification } from "@/lib/lead-scoring";
import { LEAD_SOURCE, LEAD_STATUS } from "@/lib/constants/crm";
import { mapTikTokLeadFields, type TikTokLead } from "@/lib/integrations/tiktok";
import { assignLeadRoundRobin } from "@/services/round-robin.service";

export interface ProcessTikTokLeadInput {
  organizationId: string;
  clientId: string | null;
  lead: TikTokLead;
}

export interface ProcessTikTokLeadResult {
  leadId: string;
  isNew: boolean;
  assignedAdvisorId: string | null;
}

/**
 * Procesa la ingesta de un lead proveniente de TikTok Lead Generation.
 * Deduplica, normaliza campos/teléfono, auto-asigna por Round-Robin y detona el primer contacto (< 60s).
 */
export async function processTikTokLead(input: ProcessTikTokLeadInput): Promise<ProcessTikTokLeadResult> {
  const { organizationId, clientId, lead } = input;

  // 1. Deduplicación por externalLeadId
  if (lead.lead_id) {
    const existing = await prisma.lead.findUnique({
      where: {
        organizationId_externalLeadId: {
          organizationId,
          externalLeadId: lead.lead_id,
        },
      },
      select: { id: true, ownerId: true },
    });

    if (existing) {
      return {
        leadId: existing.id,
        isNew: false,
        assignedAdvisorId: existing.ownerId,
      };
    }
  }

  // 2. Mapeo y normalización de campos
  const mapped = mapTikTokLeadFields(lead.fields);
  const phoneInfo = validateAndNormalizePhone(mapped.phone);

  // 3. Crear el lead en base de datos
  const createdLead = await prisma.lead.create({
    data: {
      organizationId,
      clientId,
      name: mapped.name,
      email: mapped.email,
      phone: phoneInfo.formatted ?? mapped.phone,
      normalizedPhone: phoneInfo.normalized ?? null,
      companyName: mapped.companyName,
      notes: mapped.notes,
      source: LEAD_SOURCE.TIKTOK_ADS,
      status: LEAD_STATUS.NEW,
      qualification: computeInitialQualification({
        email: mapped.email,
        phone: mapped.phone,
        companyName: mapped.companyName,
        estimatedValue: null,
        source: LEAD_SOURCE.TIKTOK_ADS,
      }),
      campaign: lead.campaign_name ?? null,
      externalLeadId: lead.lead_id,
      externalFormId: lead.form_id ?? null,
      externalAdId: lead.ad_id ?? null,
      externalCampaignId: lead.campaign_id ?? null,
      smsConsent: true,
      smsConsentSource: "tiktok_lead_ad",
      createdAt: lead.create_time ? new Date(lead.create_time) : undefined,
    },
    select: { id: true },
  });

  // 4. Registro de auditoría
  await prisma.auditLog.create({
    data: {
      organizationId,
      action: "lead_captured_tiktok",
      entityType: "Lead",
      entityId: createdLead.id,
      detailsJson: JSON.stringify({
        externalLeadId: lead.lead_id,
        advertiserId: lead.advertiser_id,
        campaignId: lead.campaign_id,
        clientId,
      }),
    },
  });

  // 5. Auto-asignación inmediata vía Round-Robin y primer contacto < 60s
  let assignedAdvisorId: string | null = null;
  try {
    const rrResult = await assignLeadRoundRobin(createdLead.id, {
      triggerInstantContact: true,
    });
    if (rrResult.success && rrResult.assignedAdvisorId) {
      assignedAdvisorId = rrResult.assignedAdvisorId;
    }
  } catch (err) {
    console.error(`[TIKTOK_LEAD] Error en Round-Robin para lead ${createdLead.id}:`, err);
  }

  return {
    leadId: createdLead.id,
    isNew: true,
    assignedAdvisorId,
  };
}
