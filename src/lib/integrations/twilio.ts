export interface TwilioSendResult {
  success: boolean;
  providerMsgId: string | null;
  errorMessage: string | null;
  status: "sent" | "failed";
}

function humanizeTwilioError(rawMessage: string): string {
  const lower = rawMessage.toLowerCase();
  if (lower.includes("trial") && lower.includes("unverified")) {
    return "Tu cuenta de prueba de Twilio solo permite enviar SMS a números verificados previamente en tu panel de Twilio. Para enviar a cualquier cliente, activa tu cuenta con saldo.";
  }
  if (lower.includes("geo-permission") || lower.includes("permission to send an sms") || lower.includes("21408")) {
    return "Tu cuenta de Twilio tiene bloqueados los envíos a este país. Debes habilitar el país de destino en 'Geo-Permissions' dentro de la consola de Twilio.";
  }
  if (lower.includes("authenticate") || lower.includes("20003") || lower.includes("credentials")) {
    return "Las claves de Twilio (Account SID o Auth Token) no coinciden o expiraron. Por favor revísalas en la sección de Integraciones.";
  }
  if (lower.includes("not a valid") || lower.includes("sms-capable") || lower.includes("21606")) {
    return "El número de teléfono remitente configurado no tiene habilitado el envío de SMS en Twilio.";
  }
  if (lower.includes("not a valid phone number") || lower.includes("e.164") || lower.includes("21211")) {
    return "El número de teléfono del cliente no es válido o le falta el prefijo de país (ej: +57 o +52).";
  }
  return `Twilio no pudo procesar el envío: ${rawMessage}`;
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
      errorMessage: "El servicio de mensajería SMS aún no está activo. Ve a la pantalla de Integraciones para conectar tu cuenta telefónica de Twilio.",
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

    const rawError = typeof twilioData.message === "string" ? twilioData.message : "Error reportado por el operador de telefonía.";
    return {
      success: false,
      providerMsgId: null,
      errorMessage: humanizeTwilioError(rawError),
      status: "failed",
    };
  } catch (err) {
    const messageError = err instanceof Error ? err.message : "No fue posible conectar con el servidor de mensajería.";
    return {
      success: false,
      providerMsgId: null,
      errorMessage: messageError,
      status: "failed",
    };
  }
}
