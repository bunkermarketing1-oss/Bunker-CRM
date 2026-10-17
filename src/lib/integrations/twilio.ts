/**
 * Cliente mínimo de Twilio Messaging (REST, sin SDK).
 * Docs: https://www.twilio.com/docs/messaging/api/message-resource
 */

import { MESSAGE_STATUS } from "@/lib/constants/messaging";

export interface TwilioSendResult {
  status: typeof MESSAGE_STATUS.SENT | typeof MESSAGE_STATUS.FAILED;
  providerMsgId: string | null;
  errorMessage: string | null;
  /** Sin credenciales no se envía nada: el mensaje queda marcado como demo. */
  isDemo: boolean;
}

export function getTwilioConfig() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromPhone) return null;
  return { accountSid, authToken, fromPhone };
}

/** Envía un SMS. Nunca lanza: los errores vuelven en `errorMessage` para guardarlos en `Message`. */
export async function sendTwilioSms(to: string, body: string): Promise<TwilioSendResult> {
  const cfg = getTwilioConfig();
  if (!cfg) {
    return {
      status: MESSAGE_STATUS.FAILED,
      providerMsgId: null,
      errorMessage: "Faltan credenciales del proveedor (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN en variables de entorno).",
      isDemo: true,
    };
  }

  try {
    const params = new URLSearchParams({ To: to, From: cfg.fromPhone, Body: body });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: "Basic " + Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });
    const data: { sid?: string; message?: string } = await res.json().catch(() => ({}));

    if (!res.ok) {
      return {
        status: MESSAGE_STATUS.FAILED,
        providerMsgId: null,
        errorMessage: data.message || "Error devuelto por proveedor Twilio",
        isDemo: false,
      };
    }
    return { status: MESSAGE_STATUS.SENT, providerMsgId: data.sid ?? null, errorMessage: null, isDemo: false };
  } catch (error) {
    return {
      status: MESSAGE_STATUS.FAILED,
      providerMsgId: null,
      errorMessage: error instanceof Error ? error.message : "Fallo de conexión al enviar SMS",
      isDemo: false,
    };
  }
}
