import { NextRequest } from "next/server";
import { twilioWebhookUrl } from "@/lib/integrations/twilio";
import { parseSignedTwilioWebhook } from "@/lib/integrations/twilio-webhook";
import { VOICE_WEBHOOK_PATH } from "@/lib/constants/voice";
import { recordingNoticeTwiml } from "@/services/calls.service";
import { invalidTwilioSignature, twimlResponseOf } from "../../_responses";

export const dynamic = "force-dynamic";

/** Aviso de grabación que Twilio reproduce a la conferencia cuando la línea graba. */
export async function POST(req: NextRequest) {
  const params = parseSignedTwilioWebhook(
    await req.text(),
    twilioWebhookUrl(VOICE_WEBHOOK_PATH.ANNOUNCE),
    req.headers.get("x-twilio-signature"),
    process.env.TWILIO_AUTH_TOKEN
  );
  if (!params) return invalidTwilioSignature();
  return twimlResponseOf(recordingNoticeTwiml());
}
