import { NextRequest, NextResponse } from "next/server";
import { twilioWebhookUrl } from "@/lib/integrations/twilio";
import { parseSignedTwilioWebhook } from "@/lib/integrations/twilio-webhook";
import { VOICE_WEBHOOK_PATH } from "@/lib/constants/voice";
import { applyVoiceCallback } from "@/services/calls.service";
import { invalidTwilioSignature, twimlResponseOf } from "../../_responses";

export const dynamic = "force-dynamic";

/** Callbacks de una llamada: `?callId=<id>&leg=customer|conference|recording|dial`. */
export async function POST(req: NextRequest) {
  // Twilio firma la URL completa, query incluida.
  const params = parseSignedTwilioWebhook(
    await req.text(),
    twilioWebhookUrl(`${VOICE_WEBHOOK_PATH.STATUS}${req.nextUrl.search}`),
    req.headers.get("x-twilio-signature"),
    process.env.TWILIO_AUTH_TOKEN
  );
  if (!params) return invalidTwilioSignature();

  const callId = req.nextUrl.searchParams.get("callId");
  const leg = req.nextUrl.searchParams.get("leg") || "";
  if (!callId) return NextResponse.json({ success: true });

  try {
    const twiml = await applyVoiceCallback(callId, leg, params);
    return twiml ? twimlResponseOf(twiml) : NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/integrations/twilio/voice/status error:", error);
    return NextResponse.json({ success: false, error: "Error al registrar el estado de la llamada." }, { status: 500 });
  }
}
