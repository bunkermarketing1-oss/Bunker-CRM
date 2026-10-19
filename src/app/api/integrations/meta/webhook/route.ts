import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { verifyMetaSignature, type MetaWebhookPayload } from "@/lib/integrations/meta";
import { processMetaLeadEvent, recordLeadgenEvents } from "@/services/meta-leads.service";

export const dynamic = "force-dynamic";

/**
 * Webhook de Meta (objeto `page`, campo `leadgen`). Es público: Meta no envía sesión,
 * la autenticidad la da la firma `X-Hub-Signature-256`.
 * URL de callback en la app de Meta: https://<dominio>/api/integrations/meta/webhook
 */

function verifyTokenMatches(given: string | null) {
  const expected = process.env.META_WEBHOOK_VERIFY_TOKEN;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
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
  // fallos, desactiva el webhook. Los errores quedan en MetaLeadEvent y el cron los reintenta.
  try {
    const eventIds = await recordLeadgenEvents(payload);
    await Promise.allSettled(eventIds.map((id) => processMetaLeadEvent(id)));
    return NextResponse.json({ success: true, received: eventIds.length });
  } catch (error) {
    console.error("POST /api/integrations/meta/webhook error:", error);
    return NextResponse.json({ success: true, received: 0 });
  }
}
