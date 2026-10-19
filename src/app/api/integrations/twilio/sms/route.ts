import { NextRequest, NextResponse } from "next/server";
import { TWILIO_SMS_WEBHOOK_PATH, twilioWebhookUrl } from "@/lib/integrations/twilio";
import { isKeywordHandledByTwilio, twimlResponse, verifyTwilioSignature } from "@/lib/integrations/twilio-webhook";
import { recordInboundSms, type InboundSmsOutcome } from "@/services/sms.service";

export const dynamic = "force-dynamic";

// La baja es global (vale para todos los clientes que usan este número), así que la promesa
// del mensaje se cumple. ALTA la reactiva.
const OPT_OUT_CONFIRMATION = "Listo, no te enviaremos más mensajes. Si cambias de opinión, responde ALTA.";
// Si además respondió STOP antes, Twilio sigue bloqueando el número hasta recibir START.
const OPT_IN_CONFIRMATION = "Listo, volverás a recibir nuestros mensajes. Si antes respondiste STOP, responde START.";

/** Confirmación en español; las palabras de Twilio (STOP, START…) las confirma Twilio. */
function confirmationFor(outcome: InboundSmsOutcome, body: string) {
  if (outcome.duplicate || isKeywordHandledByTwilio(body)) return undefined;
  if (outcome.optedOut) return OPT_OUT_CONFIRMATION;
  if (outcome.optedIn) return OPT_IN_CONFIRMATION;
  return undefined;
}

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
    const outcome = await recordInboundSms({ from, body, messageSid });
    return twiml(confirmationFor(outcome, body));
  } catch (error) {
    // Un 5xx hace que Twilio reintente; el MessageSid evita duplicar si se llegó a guardar.
    console.error("POST /api/integrations/twilio/sms error:", error);
    return NextResponse.json({ success: false, error: "Error al registrar el SMS." }, { status: 500 });
  }
}
