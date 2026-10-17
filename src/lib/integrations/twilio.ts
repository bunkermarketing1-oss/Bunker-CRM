export interface TwilioSendResult {
  success: boolean;
  providerMsgId: string | null;
  errorMessage: string | null;
  status: "sent" | "failed";
}

/**
 * Cliente de integración para despacho de mensajes vía Twilio SMS API.
 * Sigue la regla de capa `lib/integrations/`: sin dependencias de React ni NextRequest.
 */
export async function sendTwilioSms(to: string, message: string): Promise<TwilioSendResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromPhone) {
    return {
      success: false,
      providerMsgId: null,
      errorMessage: "Faltan credenciales de Twilio en variables de entorno (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER).",
      status: "failed",
    };
  }

  try {
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams();
    params.append("To", to.trim());
    params.append("From", fromPhone.trim());
    params.append("Body", message.trim());

    const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
    const twilioResponse = await fetch(twilioUrl, {
      method: "POST",
      headers: {
        Authorization: authHeader,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    const twilioData = (await twilioResponse.json().catch(() => ({}))) as Record<string, unknown>;

    if (twilioResponse.ok) {
      return {
        success: true,
        providerMsgId: typeof twilioData.sid === "string" ? twilioData.sid : null,
        errorMessage: null,
        status: "sent",
      };
    }

    const messageError = typeof twilioData.message === "string" ? twilioData.message : "Error devuelto por proveedor Twilio";
    return {
      success: false,
      providerMsgId: null,
      errorMessage: messageError,
      status: "failed",
    };
  } catch (err) {
    const messageError = err instanceof Error ? err.message : "Fallo de conexión al contactar API de Twilio";
    return {
      success: false,
      providerMsgId: null,
      errorMessage: messageError,
      status: "failed",
    };
  }
}
