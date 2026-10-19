import { NextRequest } from "next/server";
import { twilioWebhookUrl } from "@/lib/integrations/twilio";
import { parseSignedTwilioWebhook } from "@/lib/integrations/twilio-webhook";
import { sayTwiml } from "@/lib/integrations/twilio-twiml";
import { VOICE_WEBHOOK_PATH } from "@/lib/constants/voice";
import { handleInboundCall } from "@/services/calls.service";
import { invalidTwilioSignature, twimlResponseOf } from "../../_responses";

export const dynamic = "force-dynamic";

/** "A call comes in" de cada número de Twilio registrado como línea. */
export async function POST(req: NextRequest) {
  const params = parseSignedTwilioWebhook(
    await req.text(),
    twilioWebhookUrl(VOICE_WEBHOOK_PATH.INBOUND),
    req.headers.get("x-twilio-signature"),
    process.env.TWILIO_AUTH_TOKEN
  );
  if (!params) return invalidTwilioSignature();

  try {
    return twimlResponseOf(await handleInboundCall(params));
  } catch (error) {
    console.error("POST /api/integrations/twilio/voice/inbound error:", error);
    return twimlResponseOf(sayTwiml("Gracias por llamar. En este momento no podemos atenderte."));
  }
}
