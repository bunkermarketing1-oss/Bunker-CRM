/**
 * Cliente de Meta WhatsApp Business Cloud API Oficial (Graph API v21.0).
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */

const GRAPH_API_BASE = "https://graph.facebook.com/v21.0";

export interface WhatsAppSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  code?: number;
}

export interface SendTextMessageParams {
  phoneNumberId: string;
  accessToken: string;
  to: string; // E.164 (con o sin '+')
  text: string;
}

export interface SendMediaMessageParams {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  mediaUrl: string;
  mediaType?: "image" | "document" | "audio" | "video";
  caption?: string;
  filename?: string;
}

export interface SendTemplateMessageParams {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  templateName: string;
  languageCode?: string; // Por defecto "es"
  components?: Array<{
    type: "header" | "body" | "button";
    sub_type?: string;
    index?: number;
    parameters: Array<{
      type: "text" | "currency" | "date_time" | "image" | "document" | "video";
      text?: string;
      image?: { link: string };
    }>;
  }>;
}

/**
 * Normaliza el número telefónico para WhatsApp Cloud API (solo dígitos sin '+').
 */
export function cleanWhatsAppNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Envía un mensaje de texto libre por WhatsApp Business Cloud API.
 * Válido dentro de la ventana de servicio de 24 horas desde el último mensaje del usuario.
 */
export async function sendWhatsAppTextMessage({
  phoneNumberId,
  accessToken,
  to,
  text,
}: SendTextMessageParams): Promise<WhatsAppSendResult> {
  const recipient = cleanWhatsAppNumber(to);
  if (!recipient) {
    return { success: false, error: "Número de teléfono inválido." };
  }

  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "text",
    text: {
      preview_url: false,
      body: text,
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const err = data.error;
      const code = err?.code;
      let humanMsg = err?.message || `Meta API respondió ${res.status}`;

      if (code === 131047) {
        humanMsg = "Han pasado más de 24 horas desde el último mensaje del cliente. Para contactarlo debes enviar una plantilla aprobada de WhatsApp o esperar a que escriba nuevamente.";
      } else if (code === 190) {
        humanMsg = "El token de acceso de WhatsApp Business ha expirado. Por favor reconecta la cuenta en Configuración > Integraciones.";
      } else if (code === 131026) {
        humanMsg = "El mensaje no pudo ser entregado al número del destinatario (puede no tener WhatsApp activo).";
      }

      return { success: false, error: humanMsg, code };
    }

    const messageId = data.messages?.[0]?.id;
    return { success: true, messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fallo de conexión al enviar mensaje de WhatsApp.";
    return { success: false, error: message };
  }
}

/**
 * Envía un archivo multimedia (imagen, documento, video) por WhatsApp Business Cloud API.
 */
export async function sendWhatsAppMediaMessage({
  phoneNumberId,
  accessToken,
  to,
  mediaUrl,
  mediaType = "image",
  caption,
  filename,
}: SendMediaMessageParams): Promise<WhatsAppSendResult> {
  const recipient = cleanWhatsAppNumber(to);
  if (!recipient) {
    return { success: false, error: "Número de teléfono inválido." };
  }

  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;
  const mediaObject: Record<string, string> = { link: mediaUrl };
  if (caption) mediaObject.caption = caption;
  if (filename) mediaObject.filename = filename;

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: mediaType,
    [mediaType]: mediaObject,
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error?.message || `Meta respondió ${res.status}`, code: data.error?.code };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al enviar multimedia por WhatsApp" };
  }
}

/**
 * Envía una plantilla oficial aprobada por Meta (útil para iniciar conversaciones o fuera de las 24h).
 */
export async function sendWhatsAppTemplateMessage({
  phoneNumberId,
  accessToken,
  to,
  templateName,
  languageCode = "es",
  components,
}: SendTemplateMessageParams): Promise<WhatsAppSendResult> {
  const recipient = cleanWhatsAppNumber(to);
  if (!recipient) {
    return { success: false, error: "Número de teléfono inválido." };
  }

  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: recipient,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components ? { components } : {}),
    },
  };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.error?.message || `Meta respondió ${res.status}`, code: data.error?.code };
    }

    return { success: true, messageId: data.messages?.[0]?.id };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Error al enviar plantilla de WhatsApp" };
  }
}

export interface WhatsAppMediaInfo {
  url?: string;
  mimeType?: string;
  fileSize?: number;
  id?: string;
}

/**
 * Consulta la URL temporal oficial de descarga para un archivo multimedia recibido en WhatsApp Cloud API.
 */
export async function getWhatsAppMediaUrl(
  mediaId: string,
  accessToken: string
): Promise<WhatsAppMediaInfo | null> {
  if (!mediaId || !accessToken) return null;
  const url = `${GRAPH_API_BASE}/${mediaId}`;
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    if (!data?.url) return null;
    return {
      url: data.url,
      mimeType: data.mime_type,
      fileSize: data.file_size,
      id: data.id,
    };
  } catch {
    return null;
  }
}

export interface DownloadedWhatsAppMedia {
  buffer: Buffer;
  contentType: string;
}

/**
 * Descarga el archivo desde la URL temporal que entrega Meta. Esa URL exige el token de acceso
 * y caduca en minutos, por eso el archivo se copia a nuestro almacenamiento en cuanto llega.
 */
export async function downloadWhatsAppMedia(
  url: string,
  accessToken: string
): Promise<DownloadedWhatsAppMedia | null> {
  try {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const buffer = Buffer.from(await res.arrayBuffer());
    return { buffer, contentType: res.headers.get("content-type") || "application/octet-stream" };
  } catch {
    return null;
  }
}
