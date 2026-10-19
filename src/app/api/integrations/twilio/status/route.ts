import { NextRequest, NextResponse } from "next/server";
import { TWILIO_STATUS_WEBHOOK_PATH, twilioWebhookUrl } from "@/lib/integrations/twilio";
import { verifyTwilioSignature } from "@/lib/integrations/twilio-webhook";
import { applyTwilioStatus } from "@/services/sms.service";

export const dynamic = "force-dynamic";

/**
 * Callback de estado de un SMS enviado (`StatusCallback`, lo manda sendTwilioSms).
 * Público y protegido por `X-Twilio-Signature`. Se responde 200 aunque el SID no exista:
 * Twilio no reintenta los status callbacks, así que un error no recuperaría el estado.
 */
export async function POST(req: NextRequest) {
  const params = Object.fromEntries(new URLSearchParams(await req.text()));
  const url = twilioWebhookUrl(TWILIO_STATUS_WEBHOOK_PATH);
  if (!url || !verifyTwilioSignature(url, params, req.headers.get("x-twilio-signature"), process.env.TWILIO_AUTH_TOKEN)) {
    return NextResponse.json({ success: false, error: "Firma inválida." }, { status: 403 });
  }

  const messageSid = params.MessageSid || params.SmsSid;
  const status = params.MessageStatus || params.SmsStatus;
  if (!messageSid || !status) return NextResponse.json({ success: true, updated: false });

  try {
    const updated = await applyTwilioStatus(messageSid, status, params.ErrorCode);
    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("POST /api/integrations/twilio/status error:", error);
    return NextResponse.json({ success: false, error: "Error al actualizar el estado." }, { status: 500 });
  }
}
