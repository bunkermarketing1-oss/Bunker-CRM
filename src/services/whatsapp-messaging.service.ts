import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import {
  sendWhatsAppTextMessage,
  sendWhatsAppMediaMessage,
  cleanWhatsAppNumber,
  getWhatsAppMediaUrl,
  downloadWhatsAppMedia,
  whatsAppMediaTypeFromUrl,
  filenameFromUrl,
  type WhatsAppSendResult,
} from "@/lib/integrations/whatsapp";
import { storeInboxMedia } from "@/services/inbox-media.service";
import { getLeadAvatarUrl } from "@/lib/avatar";
import { ACCOUNT_STATUS, ACCOUNT_TYPE } from "@/lib/constants/integrations";
import { MESSAGE_CHANNEL, MESSAGE_DIRECTION, MESSAGE_STATUS, type MessageStatus } from "@/lib/constants/messaging";
import { ACTIVITY_TYPE, LEAD_SOURCE, LEAD_STATUS } from "@/lib/constants/crm";
import { assignLeadRoundRobin } from "@/services/round-robin.service";

export interface WhatsAppCredentials {
  phoneNumberId: string;
  accessToken: string;
}

/**
 * Resuelve las credenciales de WhatsApp Cloud API para la organización o cliente.
 */
export async function resolveWhatsAppCredentials(
  organizationId: string,
  clientId?: string | null
): Promise<WhatsAppCredentials | null> {
  // 1. Buscar cuenta conectada en la base de datos
  const account = await prisma.connectedAccount.findFirst({
    where: {
      organizationId,
      ...(clientId ? { clientId } : {}),
      accountType: ACCOUNT_TYPE.WHATSAPP_BUSINESS,
      status: ACCOUNT_STATUS.ACTIVE,
      accessTokenEnc: { not: null },
    },
    select: {
      externalId: true,
      accessTokenEnc: true,
    },
  });

  if (account && account.accessTokenEnc) {
    try {
      const accessToken = decryptSecret(account.accessTokenEnc);
      return { phoneNumberId: account.externalId, accessToken };
    } catch {
      // Si falla el desencriptado, continuar a variables de entorno
    }
  }

  // 2. Si no hay en DB para el cliente, buscar a nivel organización
  if (clientId) {
    const orgAccount = await prisma.connectedAccount.findFirst({
      where: {
        organizationId,
        accountType: ACCOUNT_TYPE.WHATSAPP_BUSINESS,
        status: ACCOUNT_STATUS.ACTIVE,
        accessTokenEnc: { not: null },
      },
      select: { externalId: true, accessTokenEnc: true },
    });
    if (orgAccount?.accessTokenEnc) {
      try {
        const accessToken = decryptSecret(orgAccount.accessTokenEnc);
        return { phoneNumberId: orgAccount.externalId, accessToken };
      } catch {
        // Silencioso
      }
    }
  }

  // 3. Respaldo por variables de entorno
  const envPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const envToken = process.env.WHATSAPP_ACCESS_TOKEN?.trim() || process.env.META_SYSTEM_USER_TOKEN?.trim();

  if (envPhoneId && envToken) {
    return { phoneNumberId: envPhoneId, accessToken: envToken };
  }

  return null;
}

/**
 * Convierte un archivo recibido por WhatsApp en una URL permanente: descarga el archivo con el token
 * (la URL de Meta es temporal y privada) y lo guarda en nuestro almacenamiento.
 */
async function resolveInboundMediaUrl(
  mediaId: string,
  accessToken: string,
  organizationId: string
): Promise<string | null> {
  const info = await getWhatsAppMediaUrl(mediaId, accessToken);
  if (!info?.url) return null;
  const file = await downloadWhatsAppMedia(info.url, accessToken);
  if (!file) return null;
  return storeInboxMedia({
    organizationId,
    buffer: file.buffer,
    contentType: info.mimeType || file.contentType,
  });
}

export interface SendWhatsAppOutboundParams {
  organizationId: string;
  userId?: string | null;
  clientId?: string | null;
  leadId?: string | null;
  recipient: string;
  body: string;
  mediaUrl?: string | null;
}

/**
 * Envía un mensaje saliente de WhatsApp Business Cloud API y lo persiste en la base de datos.
 */
export async function sendWhatsAppOutboundMessage({
  organizationId,
  userId,
  clientId,
  leadId,
  recipient,
  body,
  mediaUrl,
}: SendWhatsAppOutboundParams): Promise<{ success: boolean; message: { id: string; createdAt: Date }; error?: string }> {
  const credentials = await resolveWhatsAppCredentials(organizationId, clientId);

  let sendResult: WhatsAppSendResult = { success: false };
  let providerMsgId: string | null = null;
  let status: MessageStatus = MESSAGE_STATUS.PENDING;
  let errorMessage: string | null = null;

  if (credentials) {
    if (mediaUrl) {
      const mediaType = whatsAppMediaTypeFromUrl(mediaUrl);
      // WhatsApp no admite texto adjunto a una nota de voz: el texto, si hay, se manda aparte.
      const isAudio = mediaType === "audio";
      sendResult = await sendWhatsAppMediaMessage({
        phoneNumberId: credentials.phoneNumberId,
        accessToken: credentials.accessToken,
        to: recipient,
        mediaUrl,
        mediaType,
        caption: isAudio ? undefined : body || undefined,
        filename: mediaType === "document" ? filenameFromUrl(mediaUrl) : undefined,
      });
      if (sendResult.success && isAudio && body) {
        await sendWhatsAppTextMessage({
          phoneNumberId: credentials.phoneNumberId,
          accessToken: credentials.accessToken,
          to: recipient,
          text: body,
        });
      }
    } else {
      sendResult = await sendWhatsAppTextMessage({
        phoneNumberId: credentials.phoneNumberId,
        accessToken: credentials.accessToken,
        to: recipient,
        text: body,
      });
    }

    if (sendResult.success) {
      providerMsgId = sendResult.messageId || null;
      status = MESSAGE_STATUS.SENT;
    } else {
      status = MESSAGE_STATUS.FAILED;
      errorMessage = sendResult.error || "Error al enviar mensaje vía WhatsApp Cloud API.";
    }
  } else {
    // Si aún no hay credenciales vinculadas, se registra como entregado en demo
    status = MESSAGE_STATUS.DELIVERED;
    errorMessage = "WhatsApp Cloud API: Credenciales pendientes de vincular en Configuración > Integraciones.";
  }

  const finalBody = body && mediaUrl ? `${body}\n${mediaUrl}` : mediaUrl || body;

  const savedMessage = await prisma.message.create({
    data: {
      organizationId,
      clientId: clientId || null,
      leadId: leadId || null,
      channel: MESSAGE_CHANNEL.WHATSAPP,
      direction: MESSAGE_DIRECTION.OUTBOUND,
      recipient,
      body: finalBody,
      providerMsgId,
      status,
      errorMessage,
      isDemo: !credentials,
    },
    select: { id: true, createdAt: true },
  });

  // Registrar Activity en el timeline del lead
  if (leadId) {
    await prisma.activity.create({
      data: {
        leadId,
        clientId: clientId || null,
        userId: userId || null,
        type: ACTIVITY_TYPE.WHATSAPP,
        title: `WhatsApp Saliente · ${status === MESSAGE_STATUS.SENT || status === MESSAGE_STATUS.DELIVERED ? "Enviado" : "Pendiente"}`,
        description: body,
        outcome: status === MESSAGE_STATUS.FAILED ? "missed" : "completed",
      },
    });
  }

  return {
    success: sendResult.success || !credentials,
    message: savedMessage,
    error: errorMessage || undefined,
  };
}

/**
 * Procesa el webhook oficial de WhatsApp Business Cloud API (`object: "whatsapp_business_account"`).
 */
export async function processWhatsAppWebhook(payload: Record<string, unknown>): Promise<{ processed: number; errors: string[] }> {
  let processed = 0;
  const errors: string[] = [];

  const entries = (payload.entry as Array<Record<string, unknown>>) || [];

  for (const entry of entries) {
    const changes = (entry.changes as Array<Record<string, unknown>>) || [];

    for (const change of changes) {
      if (change.field !== "messages") continue;

      const value = (change.value as Record<string, unknown>) || {};
      const metadata = (value.metadata as Record<string, string>) || {};
      const phoneNumberId = metadata.phone_number_id;

      // 1. Procesar actualizaciones de estado de entrega (delivered, read, failed)
      const statuses = (value.statuses as Array<Record<string, string>>) || [];
      for (const st of statuses) {
        if (!st.id || !st.status) continue;
        try {
          let mappedStatus: MessageStatus = MESSAGE_STATUS.DELIVERED;
          if (st.status === "read") mappedStatus = MESSAGE_STATUS.READ;
          else if (st.status === "sent") mappedStatus = MESSAGE_STATUS.SENT;
          else if (st.status === "failed") mappedStatus = MESSAGE_STATUS.FAILED;

          await prisma.message.updateMany({
            where: { providerMsgId: st.id },
            data: {
              status: mappedStatus,
              deliveredAt: mappedStatus === MESSAGE_STATUS.DELIVERED || mappedStatus === MESSAGE_STATUS.READ ? new Date() : undefined,
            },
          });
          processed++;
        } catch (e) {
          errors.push(e instanceof Error ? e.message : "Error al actualizar estado");
        }
      }

      // 2. Procesar mensajes entrantes de clientes
      const messages = (value.messages as Array<Record<string, unknown>>) || [];
      const contacts = (value.contacts as Array<Record<string, unknown>>) || [];

      for (const msg of messages) {
        const msgId = msg.id as string;
        const fromDigits = cleanWhatsAppNumber((msg.from as string) || "");
        if (!msgId || !fromDigits) continue;

        // Evitar duplicados
        const existing = await prisma.message.findUnique({
          where: { providerMsgId: msgId },
          select: { id: true },
        });
        if (existing) continue;

        // Resolver la organización y cliente a partir del Phone Number ID
        let organizationId: string | null = null;
        let clientId: string | null = null;
        let waAccessToken: string | null = null;

        if (phoneNumberId) {
          const account = await prisma.connectedAccount.findFirst({
            where: {
              externalId: phoneNumberId,
              accountType: ACCOUNT_TYPE.WHATSAPP_BUSINESS,
            },
            select: { organizationId: true, clientId: true, accessTokenEnc: true },
          });
          if (account) {
            organizationId = account.organizationId;
            clientId = account.clientId;
            if (account.accessTokenEnc) {
              try {
                waAccessToken = decryptSecret(account.accessTokenEnc);
              } catch {
                // Silencioso
              }
            }
          }
        }

        if (!organizationId) {
          // Respaldo: primera organización activa
          const defaultOrg = await prisma.organization.findFirst({ select: { id: true } });
          if (!defaultOrg) continue;
          organizationId = defaultOrg.id;
        }

        if (!waAccessToken && organizationId) {
          const creds = await resolveWhatsAppCredentials(organizationId, clientId);
          if (creds?.accessToken) waAccessToken = creds.accessToken;
        }

        // Determinar texto y archivos multimedia del mensaje
        let textBody = "";
        let mediaUrlFound: string | null = null;
        const msgType = (msg.type as string) || "text";

        if (msgType === "text") {
          textBody = ((msg.text as Record<string, string>)?.body || "").trim();
        } else if (msgType === "image") {
          const img = msg.image as Record<string, string> | undefined;
          const mediaId = img?.id;
          const caption = (img?.caption || "").trim();
          if (mediaId && waAccessToken) {
            mediaUrlFound = await resolveInboundMediaUrl(mediaId, waAccessToken, organizationId);
          }
          textBody = caption ? `[Foto de WhatsApp: ${caption}]` : "[Foto enviada por WhatsApp]";
          if (mediaUrlFound) textBody = `${textBody}\n${mediaUrlFound}`;
        } else if (msgType === "audio" || msgType === "voice") {
          const audio = (msg.audio || msg.voice) as Record<string, string> | undefined;
          const mediaId = audio?.id;
          if (mediaId && waAccessToken) {
            mediaUrlFound = await resolveInboundMediaUrl(mediaId, waAccessToken, organizationId);
          }
          textBody = "[Mensaje de voz de WhatsApp]";
          if (mediaUrlFound) textBody = `${textBody}\n${mediaUrlFound}`;
        } else if (msgType === "document") {
          const doc = msg.document as Record<string, string> | undefined;
          const mediaId = doc?.id;
          const filename = (doc?.filename || "archivo").trim();
          if (mediaId && waAccessToken) {
            mediaUrlFound = await resolveInboundMediaUrl(mediaId, waAccessToken, organizationId);
          }
          textBody = `[Documento de WhatsApp: ${filename}]`;
          if (mediaUrlFound) textBody = `${textBody}\n${mediaUrlFound}`;
        } else if (msgType === "location") {
          const loc = msg.location as Record<string, unknown> | undefined;
          const locName = (loc?.name as string) || "";
          const locAddress = (loc?.address as string) || "";
          const lat = loc?.latitude;
          const lng = loc?.longitude;
          const placeStr = [locName, locAddress].filter(Boolean).join(" - ");
          textBody = placeStr
            ? `[Ubicación de WhatsApp: ${placeStr} (${lat}, ${lng})]`
            : `[Ubicación compartida por WhatsApp: Lat ${lat}, Lng ${lng}]`;
        } else if (msgType === "interactive" || msgType === "button") {
          const interactive = msg.interactive as Record<string, unknown> | undefined;
          const btnReply = interactive?.button_reply as Record<string, string> | undefined;
          const listReply = interactive?.list_reply as Record<string, string> | undefined;
          const btnText = btnReply?.title || listReply?.title || (msg.button as Record<string, string>)?.text || "";
          textBody = btnText ? `[Opción seleccionada: ${btnText}]` : `[Respuesta interactiva de WhatsApp]`;
        } else {
          textBody = `[Mensaje ${msgType} de WhatsApp]`;
        }

        // Obtener nombre de perfil del contacto en WhatsApp
        const contactProfile = contacts.find((c) => cleanWhatsAppNumber((c.wa_id as string) || "") === fromDigits);
        const rawProfileName = ((contactProfile?.profile as Record<string, string>)?.name || "").trim();
        const senderName = rawProfileName || `Contacto WhatsApp +${fromDigits}`;

        // Normalizar número telefónico
        const normalizedPhone = `+${fromDigits}`;

        // 3. Buscar o registrar el Lead en el CRM
        let lead = await prisma.lead.findFirst({
          where: {
            organizationId,
            OR: [
              { normalizedPhone },
              { phone: normalizedPhone },
              { phone: fromDigits },
            ],
          },
        });

        let isNewLead = false;
        if (!lead) {
          lead = await prisma.lead.create({
            data: {
              organizationId,
              clientId,
              name: senderName,
              avatarUrl: getLeadAvatarUrl(senderName),
              phone: normalizedPhone,
              normalizedPhone,
              source: LEAD_SOURCE.WHATSAPP,
              status: LEAD_STATUS.NEW,
              smsConsent: true,
              smsConsentSource: "whatsapp_inbound",
            },
          });
          isNewLead = true;
        } else {
          // Si el lead ya existía, enriquecerlo con el nombre y foto de WhatsApp
          const updateData: { name?: string; avatarUrl?: string } = {};
          const isGeneric =
            !lead.name ||
            lead.name.startsWith("Contacto WhatsApp") ||
            lead.name.startsWith("+") ||
            lead.name.toLowerCase().includes("desconocido") ||
            lead.name.startsWith("Lead WhatsApp");

          if (isGeneric && rawProfileName) {
            updateData.name = rawProfileName;
            lead.name = rawProfileName;
          }
          if (!lead.avatarUrl) {
            const newAvatar = getLeadAvatarUrl(lead.name || senderName);
            updateData.avatarUrl = newAvatar;
            lead.avatarUrl = newAvatar;
          }
          if (Object.keys(updateData).length > 0) {
            await prisma.lead.update({
              where: { id: lead.id },
              data: updateData,
            });
          }
        }

        // 4. Si el lead es nuevo, auto-asignar por Round-Robin inmediatamente
        if (isNewLead) {
          await assignLeadRoundRobin(lead.id, { triggerInstantContact: false }).catch(() => {});
        }

        // 5. Guardar el mensaje entrante
        await prisma.message.create({
          data: {
            organizationId,
            clientId: lead.clientId || clientId,
            leadId: lead.id,
            channel: MESSAGE_CHANNEL.WHATSAPP,
            direction: MESSAGE_DIRECTION.INBOUND,
            recipient: normalizedPhone,
            body: textBody,
            providerMsgId: msgId,
            status: MESSAGE_STATUS.DELIVERED,
          },
        });

        // 6. Registrar Activity en el lead
        await prisma.activity.create({
          data: {
            leadId: lead.id,
            clientId: lead.clientId || clientId,
            userId: lead.ownerId,
            type: ACTIVITY_TYPE.WHATSAPP,
            title: `Mensaje WhatsApp Entrante de ${senderName}`,
            description: textBody,
            outcome: "completed",
          },
        });

        processed++;
      }
    }
  }

  return { processed, errors };
}
