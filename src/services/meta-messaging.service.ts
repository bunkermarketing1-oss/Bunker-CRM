import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import {
  sendMetaDirectMessage,
  getMetaSenderProfile,
  listPageConversations,
  type MetaWebhookPayload,
  type MetaMessagingItem,
} from "@/lib/integrations/meta";
import { ACCOUNT_STATUS, ACCOUNT_TYPE } from "@/lib/constants/integrations";
import { MESSAGE_CHANNEL, MESSAGE_DIRECTION, MESSAGE_STATUS, type MessageChannel } from "@/lib/constants/messaging";
import { LEAD_SOURCE, LEAD_STATUS } from "@/lib/constants/crm";

function isGenericLeadName(name: unknown): boolean {
  if (!name || typeof name !== "string") return true;
  const lower = name.toLowerCase().trim();
  return (
    lower === "usuario de facebook" ||
    lower === "facebook user" ||
    lower === "cliente messenger" ||
    lower.startsWith("lead messenger") ||
    lower.startsWith("lead instagram")
  );
}

export interface ProcessMessagingResult {
  processed: number;
  skipped: number;
  errors: string[];
}

/**
 * Normaliza y procesa los eventos entrantes de mensajería directa de Meta
 * (Facebook Messenger e Instagram Direct).
 */
export async function processMetaMessaging(payload: MetaWebhookPayload): Promise<ProcessMessagingResult> {
  const result: ProcessMessagingResult = { processed: 0, skipped: 0, errors: [] };
  const entries = payload.entry || [];

  for (const entry of entries) {
    const messagingItems: MetaMessagingItem[] = entry.messaging || [];
    if (messagingItems.length === 0) continue;

    for (const item of messagingItems) {
      try {
        const handled = await handleSingleMessagingItem(entry.id, item, payload.object);
        if (handled) {
          result.processed++;
        } else {
          result.skipped++;
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error desconocido";
        console.error("Error al procesar mensaje de Meta:", msg, item);
        result.errors.push(msg);
      }
    }
  }

  return result;
}

/**
 * Procesa un ítem individual de mensajería entrante o eco saliente.
 */
async function handleSingleMessagingItem(
  entryId: string,
  item: MetaMessagingItem,
  payloadObject?: string
): Promise<boolean> {
  const isEcho = Boolean(item.message?.is_echo);
  const mid = item.message?.mid || item.postback?.mid;
  if (!mid) {
    // Eventos de lectura o entrega sin mid de mensaje no se guardan como chat
    return false;
  }

  // Idempotencia: si el mid de Meta ya existe en base de datos, ignorar
  const existingMessage = await prisma.message.findUnique({
    where: { providerMsgId: mid },
    select: { id: true },
  });
  if (existingMessage) {
    return false;
  }

  // Identificar el canal (Instagram Direct vs Facebook Messenger)
  const isInstagram = payloadObject === "instagram";
  const channel: MessageChannel = isInstagram ? MESSAGE_CHANNEL.INSTAGRAM : MESSAGE_CHANNEL.MESSENGER;

  // El identificador del activo oficial (Página de Facebook o Cuenta de Instagram)
  const assetId = isEcho ? item.sender.id : item.recipient.id;
  // El identificador del prospecto o usuario que chatea (PSID o IGSID)
  const leadExternalId = isEcho ? item.recipient.id : item.sender.id;

  if (!leadExternalId || !assetId) {
    return false;
  }

  // Buscar la cuenta conectada activa correspondiente en Bunker CRM
  const connectedAccount = await prisma.connectedAccount.findFirst({
    where: {
      status: ACCOUNT_STATUS.ACTIVE,
      accessTokenEnc: { not: null },
      OR: [
        { externalId: assetId },
        { externalId: entryId },
      ],
    },
    select: {
      id: true,
      organizationId: true,
      clientId: true,
      accountType: true,
      accessTokenEnc: true,
      accountName: true,
      metadataJson: true,
    },
  });

  if (!connectedAccount || !connectedAccount.accessTokenEnc) {
    // El activo no está vinculado o activo en la organización
    return false;
  }

  // Contenido del mensaje de texto o indicación de archivo adjunto
  let bodyText = (item.message?.text || item.postback?.title || item.postback?.payload || "").trim();
  if (!bodyText && item.message?.attachments && item.message.attachments.length > 0) {
    const firstType = item.message.attachments[0]?.type || "archivo";
    bodyText = `[${firstType.toUpperCase()}]`;
  }
  if (!bodyText) {
    bodyText = "[Mensaje interactivo]";
  }

  // 1. Localizar o registrar el Lead (Prospecto) en el CRM para esta conversación
  let lead = await prisma.lead.findFirst({
    where: {
      organizationId: connectedAccount.organizationId,
      externalLeadId: leadExternalId,
    },
    select: { id: true, name: true, clientId: true, avatarUrl: true },
  });

  if (!lead && !isEcho) {
    let senderName: string | null = null;
    let senderAvatar: string | null = null;
    try {
      const pageToken = decryptSecret(connectedAccount.accessTokenEnc);
      const profile = await getMetaSenderProfile(pageToken, leadExternalId, isInstagram);
      if (profile) {
        senderName = profile.name || (profile.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : null) || profile.username || null;
        senderAvatar = profile.profile_pic || null;
      }
    } catch {
      // Fallback seguro
    }

    const defaultName = isInstagram
      ? `Lead Instagram (${leadExternalId.slice(-4)})`
      : `Lead Messenger (${leadExternalId.slice(-4)})`;

    lead = await prisma.lead.create({
      data: {
        organizationId: connectedAccount.organizationId,
        clientId: connectedAccount.clientId,
        name: senderName || defaultName,
        avatarUrl: senderAvatar,
        source: isInstagram ? LEAD_SOURCE.INSTAGRAM_DIRECT : LEAD_SOURCE.FACEBOOK_MESSENGER,
        externalLeadId: leadExternalId,
        status: LEAD_STATUS.NEW,
      },
      select: { id: true, name: true, clientId: true, avatarUrl: true },
    });

    // Registrar en auditoría la creación del prospecto por mensajería
    await prisma.auditLog.create({
      data: {
        organizationId: connectedAccount.organizationId,
        action: "lead_captured_meta_messaging",
        entityType: "Lead",
        entityId: lead.id,
        detailsJson: JSON.stringify({
          channel,
          senderId: leadExternalId,
          assetName: connectedAccount.accountName,
          clientId: connectedAccount.clientId,
        }),
      },
    });
  } else if (lead && !isEcho && isGenericLeadName(lead.name)) {
    try {
      const pageToken = decryptSecret(connectedAccount.accessTokenEnc);
      const profile = await getMetaSenderProfile(pageToken, leadExternalId, isInstagram);
      if (profile) {
        const realName =
          profile.name ||
          (profile.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : null) ||
          profile.username;
        const pic = profile.profile_pic;
        const updateData: { name?: string; avatarUrl?: string } = {};
        if (realName && isGenericLeadName(lead.name)) {
          updateData.name = realName;
          lead.name = realName;
        }
        if (pic && !lead.avatarUrl) {
          updateData.avatarUrl = pic;
          lead.avatarUrl = pic;
        }
        if (Object.keys(updateData).length > 0) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: updateData,
          });
        }
      }
    } catch {
      // Silencioso
    }
  }

  if (lead && !lead.clientId && connectedAccount.clientId) {
    // Si el prospecto ya existía pero no tenía cliente asignado, asociarlo al cliente del activo
    await prisma.lead.update({
      where: { id: lead.id },
      data: { clientId: connectedAccount.clientId },
    });
    lead.clientId = connectedAccount.clientId;
  }

  // 2. Registrar el mensaje en la tabla Message
  await prisma.message.create({
    data: {
      organizationId: connectedAccount.organizationId,
      clientId: connectedAccount.clientId || lead?.clientId || null,
      leadId: lead?.id || null,
      channel,
      direction: isEcho ? MESSAGE_DIRECTION.OUTBOUND : MESSAGE_DIRECTION.INBOUND,
      recipient: leadExternalId,
      body: bodyText,
      providerMsgId: mid,
      status: isEcho ? MESSAGE_STATUS.SENT : MESSAGE_STATUS.DELIVERED,
    },
  });

  return true;
}

export interface SendOutboundParams {
  organizationId: string;
  senderUserId?: string;
  targetClientId?: string | null;
  leadId?: string | null;
  recipient: string;
  channel: "messenger" | "instagram";
  body: string;
}

/**
 * Envía una respuesta por Meta (Facebook Messenger o Instagram Direct)
 * a través de la Graph API oficial y la guarda en la base de datos.
 */
export async function sendMetaOutboundReply(params: SendOutboundParams) {
  const { organizationId, targetClientId, leadId, recipient, channel, body } = params;

  const isInstagram = channel === "instagram";
  const accountType = isInstagram ? ACCOUNT_TYPE.INSTAGRAM_BUSINESS : ACCOUNT_TYPE.FACEBOOK_PAGE;

  let effectiveClientId = targetClientId;
  if (!effectiveClientId && leadId) {
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { clientId: true } });
    if (lead?.clientId) effectiveClientId = lead.clientId;
  }

  // Buscar todas las cuentas activas del canal (Facebook Page o Instagram) asociadas a la empresa
  let candidateAccounts = await prisma.connectedAccount.findMany({
    where: {
      organizationId,
      status: ACCOUNT_STATUS.ACTIVE,
      accessTokenEnc: { not: null },
      accountType,
      ...(effectiveClientId ? { clientId: effectiveClientId } : {}),
    },
    select: { id: true, accessTokenEnc: true, clientId: true, accountName: true, externalId: true },
  });

  // Si no se encontró filtrada por effectiveClientId, intentar cualquier cuenta activa del canal en la organización
  if (candidateAccounts.length === 0) {
    candidateAccounts = await prisma.connectedAccount.findMany({
      where: {
        organizationId,
        status: ACCOUNT_STATUS.ACTIVE,
        accessTokenEnc: { not: null },
        accountType,
      },
      select: { id: true, accessTokenEnc: true, clientId: true, accountName: true, externalId: true },
    });
  }

  if (candidateAccounts.length === 0) {
    throw new Error(
      `No se encontró una ${
        isInstagram ? "cuenta de Instagram" : "página de Facebook"
      } activa conectada para enviar la respuesta.`
    );
  }

  // Si hay más de una cuenta candidata, priorizar la que mejor coincida con el nombre de la empresa
  if (candidateAccounts.length > 1 && effectiveClientId) {
    const client = await prisma.client.findUnique({
      where: { id: effectiveClientId },
      select: { name: true },
    });
    if (client?.name) {
      const targetName = client.name.toLowerCase().trim();
      candidateAccounts.sort((a, b) => {
        const nameA = (a.accountName || "").toLowerCase().trim();
        const nameB = (b.accountName || "").toLowerCase().trim();
        const matchA = nameA === targetName ? 2 : (nameA.includes(targetName) || targetName.includes(nameA)) ? 1 : 0;
        const matchB = nameB === targetName ? 2 : (nameB.includes(targetName) || targetName.includes(nameB)) ? 1 : 0;
        return matchB - matchA;
      });
    }
  }

  // Enviar a través de la cuenta seleccionada con reintento automático si el PSID pertenece a otra página.
  // En Meta, cada página de Facebook tiene identificadores de usuario (PSID) propios. Si una empresa
  // tiene varias páginas y la primera falla con (#100 No matching user), intentamos automáticamente con la siguiente.
  let sendResult: { message_id: string; recipient_id: string } | null = null;
  let successfulAccount = candidateAccounts[0];
  let lastError: unknown = null;

  for (const account of candidateAccounts) {
    if (!account.accessTokenEnc) continue;
    try {
      const token = decryptSecret(account.accessTokenEnc);
      sendResult = await sendMetaDirectMessage(token, recipient, body);
      successfulAccount = account;
      break;
    } catch (err) {
      lastError = err;
      const errMsg = err instanceof Error ? err.message : String(err);
      const isUserNotFound =
        errMsg.includes("(#100)") ||
        errMsg.includes("No se encontró al usuario") ||
        errMsg.includes("No matching user") ||
        errMsg.includes("2018001");

      if (isUserNotFound && candidateAccounts.length > 1) {
        console.warn(
          `[META_REPLY] El destinatario ${recipient} no corresponde a la página "${account.accountName}". Probando siguiente página conectada...`
        );
        continue;
      }
      throw err;
    }
  }

  if (!sendResult) {
    throw (
      lastError ||
      new Error(
        `No se pudo enviar el mensaje por ${
          isInstagram ? "Instagram" : "Facebook Messenger"
        }. Verifique que el usuario mantenga una conversación activa.`
      )
    );
  }

  const savedMessage = await prisma.message.create({
    data: {
      organizationId,
      clientId: targetClientId || successfulAccount.clientId || null,
      leadId: leadId || null,
      channel: isInstagram ? MESSAGE_CHANNEL.INSTAGRAM : MESSAGE_CHANNEL.MESSENGER,
      direction: MESSAGE_DIRECTION.OUTBOUND,
      recipient,
      body,
      providerMsgId: sendResult.message_id,
      status: MESSAGE_STATUS.SENT,
    },
  });

  return savedMessage;
}

/**
 * Sincroniza conversaciones históricas y recientes de una página de Facebook conectada
 * hacia la base de datos (Inbox y Leads).
 */
export async function syncConnectedPageConversations(connectedAccountId: string) {
  const account = await prisma.connectedAccount.findUnique({
    where: { id: connectedAccountId },
    select: {
      id: true,
      organizationId: true,
      clientId: true,
      externalId: true,
      accountType: true,
      accessTokenEnc: true,
      accountName: true,
      metadataJson: true,
    },
  });

  if (
    !account ||
    (account.accountType !== ACCOUNT_TYPE.FACEBOOK_PAGE &&
      account.accountType !== ACCOUNT_TYPE.INSTAGRAM_BUSINESS) ||
    !account.accessTokenEnc ||
    !account.externalId
  ) {
    return { synced: 0, messages: 0 };
  }

  let pageToken: string;
  try {
    pageToken = decryptSecret(account.accessTokenEnc);
  } catch (err) {
    console.error(`[SYNC_PAGE] No se pudo descifrar el token de la cuenta ${account.id}:`, err);
    return { synced: 0, messages: 0 };
  }

  const isInstagram = account.accountType === ACCOUNT_TYPE.INSTAGRAM_BUSINESS;
  let targetAssetId = account.externalId;
  if (isInstagram && account.metadataJson) {
    try {
      const parsedMeta = JSON.parse(account.metadataJson);
      if (parsedMeta.pageId) targetAssetId = parsedMeta.pageId;
    } catch {
      // Fallback
    }
  }

  let convs = await listPageConversations(targetAssetId, pageToken, 25, isInstagram ? "instagram" : "messenger");
  if (isInstagram && convs.length === 0 && targetAssetId !== account.externalId) {
    const fallbackConvs = await listPageConversations(account.externalId, pageToken, 25, "instagram");
    if (fallbackConvs.length > 0) convs = fallbackConvs;
  }

  let importedMsgs = 0;
  for (const conv of convs) {
    // Si la cuenta es de Instagram pero la conversación no tiene participantes de IG y tiene senders de Messenger, omitir
    if (isInstagram && !conv.participants?.data && conv.senders?.data) {
      continue;
    }
    // Determinar remitente (buscar en participants para Instagram, senders para Messenger, o en mensajes entrantes)
    let customerId: string | undefined;
    let customerName: string | undefined;

    if (isInstagram && conv.participants?.data) {
      const part = conv.participants.data.find((p) => p.id !== account.externalId && p.id !== targetAssetId);
      if (part) {
        customerId = part.id;
        customerName = part.username ? `@${part.username}` : part.name;
      }
    }

    if (!customerId && conv.senders?.data) {
      const sender = conv.senders.data.find((s) => s.id !== account.externalId && s.id !== targetAssetId);
      if (sender) {
        customerId = sender.id;
        customerName = sender.name;
      }
    }

    if (!customerId || customerId.startsWith("t_")) {
      const inboundMsg = (conv.messages?.data || []).find(
        (m) => m.from?.id && m.from.id !== account.externalId && m.from.id !== targetAssetId
      );
      if (inboundMsg?.from?.id) {
        customerId = inboundMsg.from.id;
        if (!customerName) {
          customerName = inboundMsg.from.name || (inboundMsg.from.username ? `@${inboundMsg.from.username}` : undefined);
        }
      }
    }

    if (!customerId) customerId = conv.id;
    const customer = { id: customerId, name: customerName || (isInstagram ? "Cliente Instagram" : "Cliente Messenger") };

    let lead = await prisma.lead.findFirst({
      where: {
        organizationId: account.organizationId,
        externalLeadId: customer.id,
      },
      select: { id: true, name: true, clientId: true, avatarUrl: true },
    });

    let realName = customer.name;
    let profilePic: string | null = null;

    // Solo consultar el perfil a la API si el nombre es genérico para no ralentizar el bucle con 25 llamadas HTTP
    const shouldFetchProfile = isGenericLeadName(realName) || (lead && isGenericLeadName(lead.name));
    if (shouldFetchProfile) {
      try {
        const profile = await getMetaSenderProfile(pageToken, customer.id, isInstagram);
        if (profile) {
          const profileName =
            profile.name ||
            (profile.first_name ? `${profile.first_name} ${profile.last_name || ""}`.trim() : null) ||
            profile.username;
          if (profileName) realName = profileName;
          if (profile.profile_pic) profilePic = profile.profile_pic;
        }
      } catch {
        // Fallback
      }
    }

    if (!lead) {
      const finalName = !isGenericLeadName(realName) ? realName : (isInstagram ? "Cliente Instagram" : "Cliente Messenger");
      try {
        lead = await prisma.lead.create({
          data: {
            organizationId: account.organizationId,
            clientId: account.clientId,
            name: finalName,
            avatarUrl: profilePic,
            source: isInstagram ? LEAD_SOURCE.INSTAGRAM_DIRECT : LEAD_SOURCE.FACEBOOK_MESSENGER,
            externalLeadId: customer.id,
            status: LEAD_STATUS.CONTACTED,
          },
          select: { id: true, name: true, clientId: true, avatarUrl: true },
        });
      } catch {
        lead = await prisma.lead.findFirst({
          where: {
            organizationId: account.organizationId,
            externalLeadId: customer.id,
          },
          select: { id: true, name: true, clientId: true, avatarUrl: true },
        });
      }
    } else {
      const updateData: { name?: string; avatarUrl?: string; clientId?: string } = {};
      if (realName && isGenericLeadName(lead.name) && !isGenericLeadName(realName)) {
        updateData.name = realName;
        lead.name = realName;
      }
      if (profilePic && !lead.avatarUrl) {
        updateData.avatarUrl = profilePic;
        lead.avatarUrl = profilePic;
      }
      if (account.clientId && lead.clientId !== account.clientId) {
        updateData.clientId = account.clientId;
        lead.clientId = account.clientId;
      }
      if (Object.keys(updateData).length > 0) {
        await prisma.lead.update({
          where: { id: lead.id },
          data: updateData,
        });
      }
    }

    const messages = conv.messages?.data || [];
    for (const msg of messages) {
      if (!msg.message && !msg.id) continue;
      const existing = await prisma.message.findUnique({ where: { providerMsgId: msg.id } });
      if (existing) {
        if (!existing.clientId && account.clientId) {
          await prisma.message.update({
            where: { id: existing.id },
            data: { clientId: account.clientId, leadId: lead.id },
          });
        }
      } else {
        await prisma.message.create({
          data: {
            organizationId: account.organizationId,
            clientId: account.clientId,
            leadId: lead.id,
            channel: isInstagram ? MESSAGE_CHANNEL.INSTAGRAM : MESSAGE_CHANNEL.MESSENGER,
            direction: (msg.from?.id === account.externalId || (Boolean(msg.from?.name && account.accountName) && msg.from!.name!.toLowerCase() === account.accountName!.toLowerCase())) ? MESSAGE_DIRECTION.OUTBOUND : MESSAGE_DIRECTION.INBOUND,
            recipient: customer.id,
            body: msg.message || "[Mensaje multimedia]",
            providerMsgId: msg.id,
            status: MESSAGE_STATUS.DELIVERED,
            createdAt: new Date(msg.created_time),
          },
        });
        importedMsgs++;
      }
    }
  }

  try {
    await prisma.connectedAccount.update({
      where: { id: connectedAccountId },
      data: { lastSyncAt: new Date() },
    });
  } catch {
    // Non-fatal
  }

  return { synced: convs.length, messages: importedMsgs };
}
