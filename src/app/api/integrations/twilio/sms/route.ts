import { NextRequest, NextResponse } from "next/server";
import { TWILIO_SMS_WEBHOOK_PATH, twilioWebhookUrl } from "@/lib/integrations/twilio";
import { isOptOutHandledByTwilio, twimlResponse, verifyTwilioSignature } from "@/lib/integrations/twilio-webhook";
import { recordInboundSms } from "@/services/sms.service";

export const dynamic = "force-dynamic";

const OPT_OUT_CONFIRMATION = "Listo, no te enviaremos más mensajes. Si cambias de opinión, escríbenos de nuevo.";

const twiml = (reply?: string) => new NextResponse(twimlResponse(reply), { status: 200, headers: { "Content-Type": "text/xml" } });

/**
 * SMS entrante (respuesta de un lead). Es público: Twilio no envía sesión, la autenticidad
 * la da `X-Twilio-Signature`. En la consola de Twilio: número → Messaging →
 * "A message comes in" → https://<dominio>/api/integrations/twilio/sms (HTTP POST).
 */
export async function POST(req: NextRequest) {
  const params = Object.fromEntries(new URLSearchParams(await req.text()));
  const url = twilioWebhookUrl(TWILIO_SMS_WEBHOOK_PATH);
  if (!url || !verifyTwilioSignature(url, params, req.headers.get("x-twilio-signature"), process.env.TWILIO_AUTH_TOKEN)) {
    return NextResponse.json({ success: false, error: "Firma inválida." }, { status: 403 });
  }

  const from = params.From;
  const messageSid = params.MessageSid || params.SmsSid;
  if (!from || !messageSid) return twiml();

  try {
    const body = params.Body ?? "";
    const { optedOut } = await recordInboundSms({ from, body, messageSid });
    return twiml(optedOut && !isOptOutHandledByTwilio(body) ? OPT_OUT_CONFIRMATION : undefined);
  } catch (error) {
    // Un 5xx hace que Twilio reintente; el MessageSid evita duplicar si se llegó a guardar.
    console.error("POST /api/integrations/twilio/sms error:", error);
    return NextResponse.json({ success: false, error: "Error al registrar el SMS." }, { status: 500 });
  }
}
