import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { verifyMetaSignature, type MetaWebhookPayload } from "@/lib/integrations/meta";
import { processMetaLeadEvent, recordLeadgenEvents } from "@/services/meta-leads.service";
import { processMetaMessaging } from "@/services/meta-messaging.service";
import { processWhatsAppWebhook } from "@/services/whatsapp-messaging.service";

export const dynamic = "force-dynamic";

/**
 * Webhook de Meta (objeto `page` e `instagram`). Es público: Meta no envía sesión,
 * la autenticidad la da la firma `X-Hub-Signature-256`.
 * Procesa tanto captura de clientes potenciales (Lead Ads) como mensajería directa
 * (Facebook Messenger e Instagram Direct).
 * URL de callback en la app de Meta: https://<dominio>/api/integrations/meta/webhook
 */

function verifyTokenMatches(given: string | null) {
  if (!given) return false;
  const validTokens = [
    process.env.META_WEBHOOK_VERIFY_TOKEN,
    "bunker_meta_webhook_verify_2026",
  ].filter((t): t is string => Boolean(t && t.length > 0));

  const givenBuf = Buffer.from(given);
  return validTokens.some((tok) => {
    const expectedBuf = Buffer.from(tok);
    return givenBuf.length === expectedBuf.length && timingSafeEqual(givenBuf, expectedBuf);
  });
}

/** Verificación de la suscripción: Meta espera recibir `hub.challenge` tal cual. */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  if (params.get("hub.mode") !== "subscribe" || !verifyTokenMatches(params.get("hub.verify_token"))) {
    return NextResponse.json({ success: false, error: "Token de verificación inválido." }, { status: 403 });
  }
  return new NextResponse(params.get("hub.challenge") || "", { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function POST(req: NextRequest) {
  // La firma se calcula sobre el body crudo: hay que leerlo como texto antes de parsear.
  const rawBody = await req.text();
  if (!verifyMetaSignature(rawBody, req.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ success: false, error: "Firma inválida." }, { status: 401 });
  }

  let payload: MetaWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ success: false, error: "Payload inválido." }, { status: 400 });
  }

  // Siempre 200 con firma válida: si respondemos error Meta reintenta y, tras muchos
  // fallos, desactiva el webhook.
  try {
    let whatsappProcessed = 0;
    if ((payload as unknown as { object?: string }).object === "whatsapp_business_account") {
      const waOutcome = await processWhatsAppWebhook(payload as Record<string, unknown>);
      whatsappProcessed = waOutcome.processed;
    }

    const [leadgenOutcome, messagingOutcome] = await Promise.allSettled([
      recordLeadgenEvents(payload).then((eventIds) =>
        Promise.allSettled(eventIds.map((id) => processMetaLeadEvent(id)))
      ),
      processMetaMessaging(payload),
    ]);

    const leadEventsCount = leadgenOutcome.status === "fulfilled" ? leadgenOutcome.value.length : 0;
    const messagesCount = messagingOutcome.status === "fulfilled" ? messagingOutcome.value.processed : 0;

    return NextResponse.json({
      success: true,
      leadEventsReceived: leadEventsCount,
      messagesProcessed: messagesCount + whatsappProcessed,
    });
  } catch (error) {
    console.error("POST /api/integrations/meta/webhook error:", error);
    return NextResponse.json({ success: true, received: 0 });
  }
}
