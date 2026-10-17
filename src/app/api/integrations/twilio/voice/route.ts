import { NextRequest } from "next/server";
import { twilioWebhookUrl } from "@/lib/integrations/twilio";
import { parseSignedTwilioWebhook } from "@/lib/integrations/twilio-webhook";
import { sayTwiml } from "@/lib/integrations/twilio-twiml";
import { VOICE_WEBHOOK_PATH } from "@/lib/constants/voice";
import { handleVoiceAppRequest } from "@/services/calls.service";
import { invalidTwilioSignature, twimlResponseOf } from "../_responses";

export const dynamic = "force-dynamic";

/**
 * Voice URL del TwiML App: Twilio la llama cuando el navegador hace `device.connect()`,
 * con los parámetros que mandó el navegador (`callId`, o `monitorCallId` + `mode`).
 */
export async function POST(req: NextRequest) {
  const params = parseSignedTwilioWebhook(
    await req.text(),
    twilioWebhookUrl(VOICE_WEBHOOK_PATH.APP),
    req.headers.get("x-twilio-signature"),
    process.env.TWILIO_AUTH_TOKEN
  );
  if (!params) return invalidTwilioSignature();

  try {
    return twimlResponseOf(await handleVoiceAppRequest(params));
  } catch (error) {
    console.error("POST /api/integrations/twilio/voice error:", error);
    return twimlResponseOf(sayTwiml("No se pudo completar la llamada. Intenta de nuevo."));
  }
}
