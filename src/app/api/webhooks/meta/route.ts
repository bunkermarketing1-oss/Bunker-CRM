import { NextRequest, NextResponse } from "next/server";
import { processMetaLeadgenEvent } from "@/services/meta-lead.service";

export const dynamic = "force-dynamic";

/** Token configurado para verificar la autenticidad del webhook con Meta */
const DEFAULT_VERIFY_TOKEN = "bunker_meta_leadgen_2026";

/**
 * GET /api/webhooks/meta
 * Responde al reto de verificación de Webhooks de Meta (Facebook & Instagram).
 * Meta envía hub.mode, hub.verify_token y hub.challenge.
 */
export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const expectedToken = process.env.META_WEBHOOK_VERIFY_TOKEN || DEFAULT_VERIFY_TOKEN;

  if (mode === "subscribe" && token === expectedToken) {
    // Meta exige responder exactamente con el valor numérico/cadena de hub.challenge
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    });
  }

  return NextResponse.json(
    { success: false, error: "Token de verificación de Webhook inválido o no coincide." },
    { status: 403 }
  );
}

/**
 * POST /api/webhooks/meta
 * Receptor en tiempo real de eventos de Meta Lead Ads.
 * Cuando un usuario llena un formulario en Facebook o Instagram, Meta notifica aquí al instante.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    // Validar que sea un evento de tipo 'page'
    if (body.object !== "page" && body.object !== "instagram") {
      return NextResponse.json({ success: true, message: "Evento no procesable" }, { status: 200 });
    }

    const entries = Array.isArray(body.entry) ? body.entry : [];
    const results = [];

    for (const entry of entries) {
      const pageId = String(entry.id || "");
      const changes = Array.isArray(entry.changes) ? entry.changes : [];

      for (const change of changes) {
        if (change.field === "leadgen" && change.value?.leadgen_id) {
          const leadgenId = String(change.value.leadgen_id);
          const formId = change.value.form_id ? String(change.value.form_id) : undefined;
          const adId = change.value.ad_id ? String(change.value.ad_id) : undefined;

          // Procesar con el service
          const result = await processMetaLeadgenEvent({
            pageId,
            leadgenId,
            formId,
            adId,
          });

          results.push(result);
        }
      }
    }

    // Siempre retornar 200 OK a Meta para confirmar recepción y evitar reintentos continuos
    return NextResponse.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error("Error en Webhook de Meta:", error);
    // Retornar 200 con status false para no bloquear la cola de reintentos de Meta ante payloads malformados
    return NextResponse.json(
      { success: false, error: "Error interno al procesar webhook" },
      { status: 200 }
    );
  }
}
