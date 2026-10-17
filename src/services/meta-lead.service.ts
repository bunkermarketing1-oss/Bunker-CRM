import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { fetchMetaLead } from "@/lib/integrations/meta";
import { validateAndNormalizePhone } from "@/lib/phone";
import { processLeadCreatedAutomations } from "@/services/automations.service";
import { ACCOUNT_STATUS, INTEGRATION_PROVIDER } from "@/lib/constants/integrations";

export interface ProcessMetaLeadResult {
  success: boolean;
  leadId?: string;
  leadName?: string;
  clientId?: string | null;
  organizationId?: string;
  skipped?: boolean;
  error?: string;
}

/**
 * Servicio de procesamiento e ingesta de prospectos captados en tiempo real
 * por formularios de Meta Lead Ads (Facebook & Instagram).
 * Sigue las reglas de capa `services/`: sin NextRequest ni NextResponse.
 */
export async function processMetaLeadgenEvent(params: {
  pageId: string;
  leadgenId: string;
  formId?: string;
  adId?: string;
}): Promise<ProcessMetaLeadResult> {
  const { pageId, leadgenId, formId, adId } = params;

  try {
    // 1. Evitar procesamiento duplicado (idempotencia)
    const existingLead = await prisma.lead.findFirst({
      where: { externalLeadId: leadgenId },
      select: { id: true, name: true, organizationId: true, clientId: true },
    });

    if (existingLead) {
      return {
        success: true,
        leadId: existingLead.id,
        leadName: existingLead.name,
        clientId: existingLead.clientId,
        organizationId: existingLead.organizationId,
        skipped: true,
      };
    }

    // 2. Buscar la cuenta conectada que coincida con la Página o Anunciante de Meta
    let connectedAccount = await prisma.connectedAccount.findFirst({
      where: {
        externalId: pageId,
        status: { not: ACCOUNT_STATUS.DISABLED },
      },
      include: {
        integration: true,
        client: true,
      },
    });

    // Si no está asociada directamente por ID de página, buscar cualquier cuenta de Meta activa
    if (!connectedAccount) {
      connectedAccount = await prisma.connectedAccount.findFirst({
        where: {
          integration: { provider: INTEGRATION_PROVIDER.META },
          status: ACCOUNT_STATUS.ACTIVE,
          accessTokenEnc: { not: null },
        },
        include: {
          integration: true,
          client: true,
        },
      });
    }

    // Resolver token de acceso
    let token: string | null = null;
    if (connectedAccount?.accessTokenEnc) {
      try {
        token = decryptSecret(connectedAccount.accessTokenEnc);
      } catch (err) {
        console.error("Error al descifrar token de Meta:", err);
      }
    }

    // Fallback opcional a variable de entorno del sistema
    if (!token && process.env.META_SYSTEM_USER_TOKEN) {
      token = process.env.META_SYSTEM_USER_TOKEN;
    }

    if (!token) {
      return {
        success: false,
        error: `No se encontró un token válido de Meta para la página ${pageId}. Conecta tu cuenta en Integraciones.`,
      };
    }

    // Determinar la organización
    let organizationId = connectedAccount?.organizationId;
    if (!organizationId) {
      const defaultOrg = await prisma.organization.findFirst({
        select: { id: true },
        orderBy: { createdAt: "asc" },
      });
      organizationId = defaultOrg?.id;
    }

    if (!organizationId) {
      return {
        success: false,
        error: "No existe una organización configurada para registrar el prospecto.",
      };
    }

    // 3. Consultar datos completos del lead en Meta Graph API
    const rawLead = await fetchMetaLead(leadgenId, token);

    // 4. Normalizar teléfono
    const phoneResult = validateAndNormalizePhone(rawLead.phone);
    const normalizedPhone = phoneResult.normalized || rawLead.phone;

    // 5. Identificar campaña si existe adId
    let campaignName: string | null = null;
    if (adId || rawLead.adId) {
      const targetAdId = adId || rawLead.adId;
      const matchedCampaign = await prisma.campaign.findFirst({
        where: {
          organizationId,
          externalId: targetAdId,
        },
        select: { name: true },
      });
      if (matchedCampaign) {
        campaignName = matchedCampaign.name;
      }
    }

    // 6. Formatear respuestas del formulario en notas
    const customEntries = Object.entries(rawLead.customFields);
    let notes = "";
    if (customEntries.length > 0) {
      notes = "Respuestas del formulario en Meta:\n" + customEntries.map(([k, v]) => `• ${k}: ${v}`).join("\n");
    }

    // 7. Calcular calificación preliminar con IA
    let qualification = 70;
    if (rawLead.phone && phoneResult.isValid) qualification += 15;
    if (rawLead.email) qualification += 10;
    if (rawLead.companyName) qualification += 5;
    if (qualification > 100) qualification = 100;

    const clientId = connectedAccount?.clientId || null;

    // 8. Crear el prospecto en la base de datos
    const lead = await prisma.lead.create({
      data: {
        organizationId,
        clientId,
        name: rawLead.name,
        companyName: rawLead.companyName || null,
        email: rawLead.email || null,
        phone: rawLead.phone || null,
        normalizedPhone: normalizedPhone || null,
        source: "meta_ads",
        campaign: campaignName || (formId ? `Formulario ${formId}` : "Campaña Meta Ads"),
        externalLeadId: leadgenId,
        utmSource: "meta",
        utmMedium: "paid_social",
        notes: notes || null,
        status: "new",
        qualification,
        aiSummary: `Prospecto captado automáticamente en tiempo real desde Meta Ads${
          connectedAccount?.client?.name ? ` para ${connectedAccount.client.name}` : ""
        }.`,
      },
    });

    // 9. Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        organizationId,
        action: "lead_captured_meta_webhook",
        entityType: "Lead",
        entityId: lead.id,
        detailsJson: JSON.stringify({
          leadgenId,
          pageId,
          formId,
          adId: adId || rawLead.adId,
          clientId,
          qualification,
        }),
      },
    });

    // 10. Disparar automatizaciones en segundo plano (SMS inmediato o IA fuera de horario)
    try {
      await processLeadCreatedAutomations({
        lead: {
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          normalizedPhone: lead.normalizedPhone,
          companyName: lead.companyName,
          clientId: lead.clientId,
          organizationId: lead.organizationId,
          ownerId: lead.ownerId || null,
        },
        organizationId,
      });
    } catch (autoErr) {
      console.error("Error al ejecutar automatizaciones para el nuevo lead:", autoErr);
    }

    return {
      success: true,
      leadId: lead.id,
      leadName: lead.name,
      clientId: lead.clientId,
      organizationId: lead.organizationId,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Error inesperado al procesar lead de Meta";
    console.error("Fallo en processMetaLeadgenEvent:", error);
    return {
      success: false,
      error: errorMsg,
    };
  }
}
