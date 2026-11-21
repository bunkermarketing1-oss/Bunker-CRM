import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ACCOUNT_STATUS, ACCOUNT_TYPE } from "@/lib/constants/integrations";
import { processTikTokLead } from "@/services/tiktok-leads.service";
import type { TikTokLead, TikTokLeadField } from "@/lib/integrations/tiktok";

export const dynamic = "force-dynamic";

/**
 * GET /api/integrations/tiktok/webhook
 * Verificación de webhook requerida por TikTok for Business Developers / Events Manager.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const challenge = searchParams.get("challenge") || searchParams.get("hub.challenge");

  if (challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json({
    status: "active",
    service: "Bunker CRM TikTok Webhook Gateway",
    timestamp: new Date().toISOString(),
  });
}

interface RawTikTokPayload {
  event?: string;
  challenge?: string;
  advertiser_id?: string;
  lead_id?: string;
  form_id?: string;
  ad_id?: string;
  campaign_id?: string;
  campaign_name?: string;
  create_time?: string;
  fields?: Array<{ key?: string; name?: string; value?: string }>;
  lead_data?: Record<string, string>;
  // Fallbacks para webhooks simplificados
  name?: string;
  email?: string;
  phone?: string;
}

/**
 * POST /api/integrations/tiktok/webhook
 * Receptor de eventos de clientes potenciales (Lead Generation) de TikTok Ads.
 */
export async function POST(req: NextRequest) {
  try {
    const body: RawTikTokPayload = await req.json().catch(() => ({}));

    // Verificación tipo desafío en body
    if (body.event === "verify" || body.challenge) {
      return NextResponse.json({ challenge: body.challenge || "verified", code: 0 });
    }

    const advertiserId = body.advertiser_id ? String(body.advertiser_id).trim() : null;
    const leadId = body.lead_id ? String(body.lead_id).trim() : `tt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    // Buscar la cuenta conectada en el CRM para asociar la organización y cliente correspondientes
    let account = null;
    if (advertiserId) {
      account = await prisma.connectedAccount.findFirst({
        where: {
          externalId: advertiserId,
          accountType: ACCOUNT_TYPE.TIKTOK_ADVERTISER,
          status: { not: ACCOUNT_STATUS.DISABLED },
        },
        select: {
          id: true,
          organizationId: true,
          clientId: true,
          accessTokenEnc: true,
        },
      });
    }

    // Si no se encuentra por advertiser_id exacto, buscar cualquier cuenta activa de TikTok
    if (!account) {
      account = await prisma.connectedAccount.findFirst({
        where: {
          accountType: ACCOUNT_TYPE.TIKTOK_ADVERTISER,
          status: { not: ACCOUNT_STATUS.DISABLED },
        },
        select: {
          id: true,
          organizationId: true,
          clientId: true,
          accessTokenEnc: true,
        },
      });
    }

    if (!account) {
      console.warn(`[TIKTOK_WEBHOOK] No se encontró cuenta de TikTok configurada para advertiser ${advertiserId}.`);
      return NextResponse.json({
        success: false,
        error: "No existe una cuenta de TikTok vinculada para este anunciante.",
      }, { status: 404 });
    }

    // Construir campos de lead a partir de la carga útil recibida
    const fields: TikTokLeadField[] = [];

    if (Array.isArray(body.fields)) {
      for (const item of body.fields) {
        const key = item.key || item.name;
        if (key && item.value !== undefined) {
          fields.push({ key, value: String(item.value) });
        }
      }
    } else if (body.lead_data && typeof body.lead_data === "object") {
      for (const [k, v] of Object.entries(body.lead_data)) {
        if (v !== undefined) {
          fields.push({ key: k, value: String(v) });
        }
      }
    } else {
      if (body.name) fields.push({ key: "name", value: body.name });
      if (body.email) fields.push({ key: "email", value: body.email });
      if (body.phone) fields.push({ key: "phone", value: body.phone });
    }

    const leadPayload: TikTokLead = {
      lead_id: leadId,
      advertiser_id: advertiserId || "unknown",
      form_id: body.form_id,
      ad_id: body.ad_id,
      campaign_id: body.campaign_id,
      campaign_name: body.campaign_name,
      create_time: body.create_time || new Date().toISOString(),
      fields,
    };

    const result = await processTikTokLead({
      organizationId: account.organizationId,
      clientId: account.clientId,
      lead: leadPayload,
    });

    return NextResponse.json({
      success: true,
      leadId: result.leadId,
      isNew: result.isNew,
      assignedAdvisorId: result.assignedAdvisorId,
    });
  } catch (error) {
    console.error("[TIKTOK_WEBHOOK] Error procesando evento de TikTok:", error);
    const msg = error instanceof Error ? error.message : "Error interno del webhook de TikTok.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
