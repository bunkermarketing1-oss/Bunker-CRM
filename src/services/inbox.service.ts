import { prisma } from "@/lib/prisma";
import { ACTIVITY_TYPE } from "@/lib/constants/crm";
import { ACCOUNT_TYPE, ACCOUNT_STATUS } from "@/lib/constants/integrations";
import { MESSAGE_CHANNEL, MESSAGE_DIRECTION, MESSAGE_STATUS } from "@/lib/constants/messaging";
import { sendMetaOutboundReply, syncConnectedPageConversations } from "@/services/meta-messaging.service";
import { sendManualSms } from "@/services/sms.service";
import { sendWhatsAppOutboundMessage } from "@/services/whatsapp-messaging.service";
import { getLeadAvatarUrl } from "@/lib/avatar";
import type { TenantScope } from "@/types/tenant";
import type {
  ConversationItem,
  ConversationMessage,
  InboxResponse,
  InboxStats,
  AdvisorOption,
} from "@/types/inbox";
import type { Prisma } from "@prisma/client";

interface GetInboxOptions {
  channel?: string;
  search?: string;
  limit?: number;
  triggerSync?: boolean;
  isClientUser?: boolean;
}

/**
 * Obtiene las conversaciones y estadísticas de la bandeja de entrada omnicanal
 * filtradas estrictamente por organización y cliente (multi-tenant).
 */
// Control de auto-sincronización periódica por organización y cliente (mínimo 15s entre llamadas a Meta)
const clientLastSyncMap = new Map<string, number>();
const AUTO_SYNC_COOLDOWN_MS = 20000;

export async function getInboxConversations(
  organizationId: string,
  targetClientId: string | null,
  options: GetInboxOptions = {}
): Promise<InboxResponse> {
  const { channel = "all", search = "", limit = 500, triggerSync = false, isClientUser = false } = options;
  const cleanSearch = search.trim();

  // 1. Obtener cuentas conectadas vinculadas
  const accountWhere: Prisma.ConnectedAccountWhereInput = {
    organizationId,
    ...(targetClientId ? { clientId: targetClientId } : {}),
  };

  const connectedAccounts = await prisma.connectedAccount.findMany({
    where: accountWhere,
    select: {
      id: true,
      accountName: true,
      accountType: true,
      externalId: true,
      clientId: true,
      client: { select: { id: true, name: true } },
    },
  });

  // 2. Sincronizar páginas conectadas (bajo demanda o auto-sync cada 15s por cliente)
  const now = Date.now();
  const syncKey = `${organizationId}_${targetClientId || "all"}`;
  if (triggerSync) {
    clientLastSyncMap.delete(syncKey);
  }
  const lastSync = clientLastSyncMap.get(syncKey) || 0;
  const shouldAutoSync = triggerSync || (now - lastSync > AUTO_SYNC_COOLDOWN_MS && !cleanSearch);

  if (shouldAutoSync) {
    clientLastSyncMap.set(syncKey, now);

    // Si se especifica un cliente, buscar cuentas asignadas a ese cliente;
    // de lo contrario, rotar por fecha de última sincronización (lastSyncAt asc)
    let pageAccounts = await prisma.connectedAccount.findMany({
      where: {
        organizationId,
        ...(targetClientId ? { clientId: targetClientId } : {}),
        accountType: { in: [ACCOUNT_TYPE.FACEBOOK_PAGE, ACCOUNT_TYPE.INSTAGRAM_BUSINESS] },
        status: ACCOUNT_STATUS.ACTIVE,
        accessTokenEnc: { not: null },
      },
      select: { id: true },
      orderBy: { lastSyncAt: "asc" },
      take: triggerSync ? (targetClientId ? 8 : 10) : (targetClientId ? 6 : 5),
    });

    // Fallback: si se filtró por marca y no hay cuentas directamente vinculadas por clientId,
    // buscar páginas activas cuyo nombre coincida con el nombre del cliente
    if (targetClientId && pageAccounts.length === 0) {
      const client = await prisma.client.findUnique({
        where: { id: targetClientId },
        select: { name: true },
      });
      if (client?.name) {
        const firstWord = client.name.split(" ")[0];
        pageAccounts = await prisma.connectedAccount.findMany({
          where: {
            organizationId,
            accountType: { in: [ACCOUNT_TYPE.FACEBOOK_PAGE, ACCOUNT_TYPE.INSTAGRAM_BUSINESS] },
            status: ACCOUNT_STATUS.ACTIVE,
            accessTokenEnc: { not: null },
            accountName: { contains: firstWord, mode: "insensitive" },
          },
          select: { id: true },
          take: 4,
        });
      }
    }

    if (pageAccounts.length > 0) {
      const timeoutMs = triggerSync ? 12000 : 6000;
      const syncTasks = pageAccounts.map((page) =>
        Promise.race([
          syncConnectedPageConversations(page.id),
          new Promise<void>((_, reject) => setTimeout(() => reject(new Error("Timeout")), timeoutMs)),
        ]).catch((syncErr) => {
          console.warn(`[INBOX_SYNC] Página ${page.id}:`, syncErr instanceof Error ? syncErr.message : syncErr);
        })
      );

      // Si fue solicitado explícitamente (?sync=true), esperar la sincronización para responder con los mensajes más recientes
      if (triggerSync) {
        await Promise.allSettled(syncTasks);
      } else {
        // En sondeos silenciosos, ejecutar en segundo plano
        Promise.allSettled(syncTasks).catch(() => {});
      }
    }
  }

  // 3. Construir filtros de mensajes con soporte de búsqueda en servidor e índices
  const messageWhere: Prisma.MessageWhereInput = {
    organizationId,
  };

  const andConditions: Prisma.MessageWhereInput[] = [];

  if (targetClientId) {
    andConditions.push({
      OR: [
        { clientId: targetClientId },
        { lead: { is: { clientId: targetClientId } } },
      ],
    });
  }

  if (cleanSearch) {
    andConditions.push({
      OR: [
        { recipient: { contains: cleanSearch, mode: "insensitive" } },
        { body: { contains: cleanSearch, mode: "insensitive" } },
        { lead: { is: { name: { contains: cleanSearch, mode: "insensitive" } } } },
        { lead: { is: { phone: { contains: cleanSearch } } } },
        { lead: { is: { email: { contains: cleanSearch, mode: "insensitive" } } } },
      ],
    });
  }

  if (andConditions.length > 0) {
    messageWhere.AND = andConditions;
  }

  const dbMessages = await prisma.message.findMany({
    where: messageWhere,
    orderBy: { createdAt: "desc" },
    take: Math.max(limit, 1000),
    include: {
      client: { select: { id: true, name: true } },
      lead: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          status: true,
          avatarUrl: true,
          clientId: true,
          client: { select: { id: true, name: true } },
          ownerId: true,
          owner: { select: { id: true, name: true, email: true } },
        },
      },
    },
  });

  // Si no hay mensajes y es la primera carga sin sync explícito, sincronizar si hay cuentas conectadas
  if (dbMessages.length === 0 && !triggerSync && !cleanSearch && channel === "all") {
    const pageAccounts = await prisma.connectedAccount.findMany({
      where: {
        organizationId,
        ...(targetClientId ? { clientId: targetClientId } : {}),
        accountType: { in: [ACCOUNT_TYPE.FACEBOOK_PAGE, ACCOUNT_TYPE.INSTAGRAM_BUSINESS] },
        status: ACCOUNT_STATUS.ACTIVE,
        accessTokenEnc: { not: null },
      },
      select: { id: true },
    });

    if (pageAccounts.length > 0) {
      // Disparar sincronización sin bloquear indefinidamente la respuesta de la base de datos
      Promise.allSettled(
        pageAccounts.map((page) =>
          Promise.race([
            syncConnectedPageConversations(page.id),
            new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 3000)),
          ]).catch((syncErr) => {
            console.warn(`[INBOX_AUTO_SYNC] Página ${page.id}:`, syncErr instanceof Error ? syncErr.message : syncErr);
          })
        )
      ).catch(() => {});
    }
  }

  // 4. Agrupar mensajes en conversaciones preservando el orden cronológico
  // Invertir para agrupar en orden temporal (antiguo -> nuevo) y que el último mensaje sea el más reciente
  const chronologicalMessages = [...dbMessages].reverse();
  const dbConvMap = new Map<string, ConversationItem>();

  for (const msg of chronologicalMessages) {
    let ch: ConversationItem["channel"] = "whatsapp";
    if (msg.channel === MESSAGE_CHANNEL.MESSENGER) ch = "messenger";
    else if (msg.channel === MESSAGE_CHANNEL.INSTAGRAM) ch = "instagram";
    else if (msg.channel === MESSAGE_CHANNEL.SMS) ch = "sms";
    else if (msg.channel === MESSAGE_CHANNEL.FACEBOOK_COMMENT) ch = "facebook_comment";
    else if (msg.channel === MESSAGE_CHANNEL.INSTAGRAM_COMMENT) ch = "instagram_comment";
    else ch = "whatsapp";

    // Clave única por canal y remitente/prospecto para evitar colisiones entre canales distintos
    const convKey = `msg_${ch}_${msg.leadId || msg.recipient}`;
    const sender = msg.lead?.name || msg.recipient;

    const channelAccountLabel =
      ch === "whatsapp"
        ? "WhatsApp Business"
        : ch === "messenger"
        ? "Facebook Messenger"
        : ch === "instagram"
        ? "Instagram Direct"
        : ch === "sms"
        ? "Twilio SMS"
        : ch === "facebook_comment"
        ? "Comentario Facebook"
        : ch === "instagram_comment"
        ? "Comentario Instagram"
        : "Línea Oficial";

    if (!dbConvMap.has(convKey)) {
      dbConvMap.set(convKey, {
        id: convKey,
        channel: ch,
        senderName: sender,
        senderAvatar: getLeadAvatarUrl(sender, msg.lead?.avatarUrl),
        recipient: msg.recipient || "Línea Oficial",
        clientId: msg.clientId || msg.lead?.clientId || null,
        clientName: msg.client?.name || msg.lead?.client?.name || null,
        connectedAccountId: null,
        accountName: channelAccountLabel,
        unreadCount: 0,
        waitingForReply: false,
        lastInboundTime: null,
        lastMessageText: msg.direction === MESSAGE_DIRECTION.OUTBOUND ? `Tú: ${msg.body}` : msg.body,
        lastMessageTime: msg.createdAt.toISOString(),
        leadId: msg.lead?.id || null,
        leadStatus: msg.lead?.status || "new",
        leadPhone: msg.lead?.phone || msg.recipient,
        leadEmail: msg.lead?.email || null,
        assignedAdvisorId: msg.lead?.ownerId || null,
        assignedAdvisorName: msg.lead?.owner?.name || null,
        messages: [],
      });
    }

    const conv = dbConvMap.get(convKey)!;
    conv.lastMessageText = msg.direction === MESSAGE_DIRECTION.OUTBOUND ? `Tú: ${msg.body}` : msg.body;
    conv.lastMessageTime = msg.createdAt.toISOString();
    if (msg.lead?.avatarUrl && !conv.senderAvatar) {
      conv.senderAvatar = msg.lead.avatarUrl;
    }
    if (msg.direction === MESSAGE_DIRECTION.INBOUND) {
      conv.waitingForReply = true;
      conv.lastInboundTime = msg.createdAt.toISOString();
      if (msg.status !== MESSAGE_STATUS.READ) {
        conv.unreadCount += 1;
      }
    } else {
      conv.waitingForReply = false;
    }
    conv.messages.push({
      id: msg.id,
      senderName: msg.direction === MESSAGE_DIRECTION.INBOUND ? sender : "Tú (Asesor)",
      body: msg.body,
      createdAt: msg.createdAt.toISOString(),
      direction: msg.direction === MESSAGE_DIRECTION.INBOUND ? "inbound" : "outbound",
      status: msg.status,
      channel: msg.channel,
    });
  }

  const allConversations = Array.from(dbConvMap.values());

  // Ordenar conversaciones por su mensaje más reciente (más nuevo arriba)
  allConversations.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

  // Estadísticas globales precisas por canal para las pestañas de navegación (nunca caen a 0 al filtrar por pestaña)
  const stats: InboxStats = {
    total: allConversations.length,
    unread: allConversations.filter((c) => c.unreadCount > 0).length,
    whatsapp: allConversations.filter((c) => c.channel === "whatsapp").length,
    messenger: allConversations.filter((c) => c.channel === "messenger").length,
    instagram: allConversations.filter((c) => c.channel === "instagram").length,
    sms: allConversations.filter((c) => c.channel === "sms").length,
    comments: allConversations.filter(
      (c) => c.channel === "facebook_comment" || c.channel === "instagram_comment"
    ).length,
  };

  // Filtrar el listado de conversaciones según la pestaña de canal activa
  let filteredConversations = allConversations;
  if (channel && channel !== "all") {
    if (channel === "comments") {
      filteredConversations = allConversations.filter(
        (c) => c.channel === "facebook_comment" || c.channel === "instagram_comment"
      );
    } else {
      filteredConversations = allConversations.filter((c) => c.channel === channel);
    }

    // Si en los mensajes recientes no hubo de este canal pero el usuario lo seleccionó,
    // buscar si existen mensajes históricos para este canal y agregarlos
    if (filteredConversations.length === 0 && !cleanSearch) {
      const channelFilterCondition =
        channel === "comments"
          ? { in: [MESSAGE_CHANNEL.FACEBOOK_COMMENT, MESSAGE_CHANNEL.INSTAGRAM_COMMENT] }
          : channel;

      const olderChannelMsgs = await prisma.message.findMany({
        where: {
          ...messageWhere,
          channel: channelFilterCondition,
        },
        orderBy: { createdAt: "desc" },
        take: 100,
        include: {
          client: { select: { id: true, name: true } },
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              status: true,
              avatarUrl: true,
              clientId: true,
              client: { select: { id: true, name: true } },
              ownerId: true,
              owner: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });

      if (olderChannelMsgs.length > 0) {
        const olderChronological = [...olderChannelMsgs].reverse();
        const olderConvMap = new Map<string, ConversationItem>();

        for (const msg of olderChronological) {
          let ch: ConversationItem["channel"] = "whatsapp";
          if (msg.channel === MESSAGE_CHANNEL.MESSENGER) ch = "messenger";
          else if (msg.channel === MESSAGE_CHANNEL.INSTAGRAM) ch = "instagram";
          else if (msg.channel === MESSAGE_CHANNEL.SMS) ch = "sms";
          else if (msg.channel === MESSAGE_CHANNEL.FACEBOOK_COMMENT) ch = "facebook_comment";
          else if (msg.channel === MESSAGE_CHANNEL.INSTAGRAM_COMMENT) ch = "instagram_comment";

          const convKey = `msg_${ch}_${msg.leadId || msg.recipient}`;
          const sender = msg.lead?.name || msg.recipient;

          if (!olderConvMap.has(convKey)) {
            olderConvMap.set(convKey, {
              id: convKey,
              channel: ch,
              senderName: sender,
              senderAvatar: getLeadAvatarUrl(sender, msg.lead?.avatarUrl),
              recipient: msg.recipient || "Línea Oficial",
              clientId: msg.clientId || msg.lead?.clientId || null,
              clientName: msg.client?.name || msg.lead?.client?.name || null,
              connectedAccountId: null,
              accountName:
                ch === "whatsapp"
                  ? "WhatsApp Business"
                  : ch === "messenger"
                  ? "Facebook Messenger"
                  : ch === "instagram"
                  ? "Instagram Direct"
                  : ch === "sms"
                  ? "Twilio SMS"
                  : ch === "facebook_comment"
                  ? "Comentario Facebook"
                  : "Comentario Instagram",
              unreadCount: 0,
              waitingForReply: false,
              lastInboundTime: null,
              lastMessageText: msg.direction === MESSAGE_DIRECTION.OUTBOUND ? `Tú: ${msg.body}` : msg.body,
              lastMessageTime: msg.createdAt.toISOString(),
              leadId: msg.lead?.id || null,
              leadStatus: msg.lead?.status || "new",
              leadPhone: msg.lead?.phone || msg.recipient,
              leadEmail: msg.lead?.email || null,
              assignedAdvisorId: msg.lead?.ownerId || null,
              assignedAdvisorName: msg.lead?.owner?.name || null,
              messages: [],
            });
          }

          const conv = olderConvMap.get(convKey)!;
          conv.lastMessageText = msg.direction === MESSAGE_DIRECTION.OUTBOUND ? `Tú: ${msg.body}` : msg.body;
          conv.lastMessageTime = msg.createdAt.toISOString();
          if (msg.lead?.avatarUrl && !conv.senderAvatar) {
            conv.senderAvatar = msg.lead.avatarUrl;
          }
          if (msg.direction === MESSAGE_DIRECTION.INBOUND) {
            conv.waitingForReply = true;
            conv.lastInboundTime = msg.createdAt.toISOString();
            if (msg.status !== MESSAGE_STATUS.READ) {
              conv.unreadCount += 1;
            }
          } else {
            conv.waitingForReply = false;
          }
          conv.messages.push({
            id: msg.id,
            senderName: msg.direction === MESSAGE_DIRECTION.INBOUND ? sender : "Tú (Asesor)",
            body: msg.body,
            createdAt: msg.createdAt.toISOString(),
            direction: msg.direction === MESSAGE_DIRECTION.INBOUND ? "inbound" : "outbound",
            status: msg.status,
            channel: msg.channel,
          });
        }

        filteredConversations = Array.from(olderConvMap.values()).sort(
          (a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
        );

        if (channel === "whatsapp") stats.whatsapp = filteredConversations.length;
        else if (channel === "messenger") stats.messenger = filteredConversations.length;
        else if (channel === "instagram") stats.instagram = filteredConversations.length;
        else if (channel === "sms") stats.sms = filteredConversations.length;
        else if (channel === "comments") stats.comments = filteredConversations.length;
        stats.total = stats.whatsapp + stats.messenger + stats.instagram + stats.sms + stats.comments;
      }
    }
  }

  // Clientes para selectores de admin
  const clientsList = isClientUser
    ? []
    : await prisma.client.findMany({
        // Con una marca activa solo se devuelve esa marca: la lista completa no debe viajar al navegador.
        where: { organizationId, isDeleted: false, ...(targetClientId ? { id: targetClientId } : {}) },
        select: { id: true, name: true, companyName: true },
        orderBy: { name: "asc" },
      });

  // Asesores comerciales activos
  const userWhere: Prisma.UserWhereInput = {
    memberships: { some: { organizationId } },
    isActive: true,
    // Un usuario CLIENT solo ve a su equipo; con una marca activa, el administrador ve el de la marca y al personal de agencia.
    ...(targetClientId
      ? isClientUser
        ? { clientId: targetClientId }
        : { OR: [{ clientId: targetClientId }, { clientId: null }] }
      : {}),
  };

  const advisors: AdvisorOption[] = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      clientId: true,
    },
    orderBy: { name: "asc" },
  });

  return {
    success: true,
    targetClientId,
    conversations: filteredConversations,
    stats,
    connectedAccounts,
    clients: clientsList,
    advisors,
  };
}

/**
 * Obtiene el historial cronológico completo de una conversación específica.
 * Resuelve el problema donde conversaciones de días anteriores solo mostraban un fragmento.
 */
export async function getConversationThread({
  organizationId,
  targetClientId,
  recipient,
  leadId,
  channel,
  limit = 200,
}: {
  organizationId: string;
  targetClientId: string | null;
  recipient: string;
  leadId?: string | null;
  channel?: string;
  limit?: number;
}): Promise<ConversationMessage[]> {
  const andConditions: Prisma.MessageWhereInput[] = [
    leadId
      ? {
          OR: [{ leadId }, { recipient }],
        }
      : { recipient },
  ];

  if (targetClientId) {
    andConditions.push({
      OR: [
        { clientId: targetClientId },
        { lead: { is: { clientId: targetClientId } } },
      ],
    });
  }

  if (channel && channel !== "all") {
    if (channel === "comments") {
      andConditions.push({
        channel: { in: [MESSAGE_CHANNEL.FACEBOOK_COMMENT, MESSAGE_CHANNEL.INSTAGRAM_COMMENT] },
      });
    } else {
      andConditions.push({ channel });
    }
  }

  const where: Prisma.MessageWhereInput = {
    organizationId,
    AND: andConditions,
  };

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      lead: { select: { id: true, name: true, phone: true } },
    },
  });

  // Marcar automáticamente como leídos los mensajes entrantes al abrir el hilo
  prisma.message.updateMany({
    where: {
      organizationId,
      AND: [
        ...andConditions,
        { direction: MESSAGE_DIRECTION.INBOUND },
        { status: { not: MESSAGE_STATUS.READ } },
      ],
    },
    data: {
      status: MESSAGE_STATUS.READ,
    },
  }).catch(() => {});

  return messages.map((m) => ({
    id: m.id,
    senderName: m.direction === MESSAGE_DIRECTION.INBOUND ? (m.lead?.name || m.recipient) : "Tú (Asesor)",
    body: m.body,
    createdAt: m.createdAt.toISOString(),
    direction: m.direction === MESSAGE_DIRECTION.INBOUND ? "inbound" : "outbound",
    status: m.status,
    channel: m.channel,
  }));
}

/**
 * Marca como leídos todos los mensajes entrantes de una conversación o prospecto.
 */
export async function markConversationAsRead({
  organizationId,
  targetClientId,
  recipient,
  leadId,
  channel,
}: {
  organizationId: string;
  targetClientId?: string | null;
  recipient?: string;
  leadId?: string | null;
  channel?: string;
}) {
  const andConditions: Prisma.MessageWhereInput[] = [
    { direction: MESSAGE_DIRECTION.INBOUND },
    { status: { not: MESSAGE_STATUS.READ } },
  ];

  if (leadId && recipient) {
    andConditions.push({ OR: [{ leadId }, { recipient }] });
  } else if (leadId) {
    andConditions.push({ leadId });
  } else if (recipient) {
    andConditions.push({ recipient });
  }

  if (targetClientId) {
    andConditions.push({
      OR: [
        { clientId: targetClientId },
        { lead: { is: { clientId: targetClientId } } },
      ],
    });
  }

  if (channel && channel !== "all") {
    if (channel === "comments") {
      andConditions.push({
        channel: { in: [MESSAGE_CHANNEL.FACEBOOK_COMMENT, MESSAGE_CHANNEL.INSTAGRAM_COMMENT] },
      });
    } else {
      andConditions.push({ channel });
    }
  }

  return prisma.message.updateMany({
    where: {
      organizationId,
      AND: andConditions,
    },
    data: {
      status: MESSAGE_STATUS.READ,
    },
  });
}

interface SendReplyParams {
  organizationId: string;
  userId: string;
  targetClientId: string | null;
  conversationId: string;
  channel: string;
  body: string;
  imageUrl?: string | null;
  mediaUrl?: string | null;
  fileName?: string | null;
  recipient?: string;
  leadId?: string | null;
  scope?: TenantScope | null;
}

/**
 * Envía una respuesta saliente al canal correspondiente (Meta, Twilio SMS o registro local).
 */
export async function replyToConversation({
  organizationId,
  userId,
  targetClientId,
  conversationId,
  channel,
  body,
  imageUrl,
  mediaUrl,
  fileName,
  recipient,
  leadId,
  scope,
}: SendReplyParams) {
  const attachmentUrl = mediaUrl || imageUrl || null;
  let savedMessage: { id: string; createdAt: Date };

  if (
    (channel === MESSAGE_CHANNEL.MESSENGER || channel === MESSAGE_CHANNEL.INSTAGRAM) &&
    recipient &&
    recipient !== "Usuario Social"
  ) {
    savedMessage = await sendMetaOutboundReply({
      organizationId,
      senderUserId: userId,
      targetClientId,
      leadId,
      recipient,
      channel: channel as "messenger" | "instagram",
      body,
      imageUrl: attachmentUrl,
    });
  } else if (channel === MESSAGE_CHANNEL.SMS && recipient && recipient !== "Usuario Social") {
    if (!scope) {
      throw new Error("Usuario cliente no tiene empresa asociada para envío de SMS.");
    }

    const smsResult = await sendManualSms(scope, userId, {
      recipient,
      message: body || (fileName ? `Archivo adjunto: ${fileName}` : "Archivo adjunto"),
      mediaUrl: attachmentUrl || undefined,
      leadId: leadId || undefined,
      clientId: targetClientId || undefined,
    });

    if (!smsResult.sent) {
      throw new Error(smsResult.errorMessage || "Error al enviar SMS vía Twilio.");
    }
    savedMessage = smsResult.message;
  } else if ((channel === MESSAGE_CHANNEL.WHATSAPP || channel.includes("whatsapp")) && recipient && recipient !== "Usuario Social") {
    // Canal WhatsApp Business Cloud API Oficial
    const waResult = await sendWhatsAppOutboundMessage({
      organizationId,
      userId,
      clientId: targetClientId,
      leadId: leadId || null,
      recipient,
      body: body || (fileName ? `Archivo: ${fileName}` : ""),
      mediaUrl: attachmentUrl || undefined,
    });
    savedMessage = waResult.message;
  } else {
    // Otros canales o registro local
    const finalBody = body && attachmentUrl
      ? `${body}\n${attachmentUrl}`
      : (attachmentUrl || body || (fileName ? `[Archivo: ${fileName}]` : "[Archivo adjunto]"));

    savedMessage = await prisma.message.create({
      data: {
        organizationId,
        clientId: targetClientId || null,
        leadId: leadId || null,
        channel: channel.includes("whatsapp") ? MESSAGE_CHANNEL.WHATSAPP : channel,
        direction: MESSAGE_DIRECTION.OUTBOUND,
        recipient: recipient || "Usuario Social",
        body: finalBody,
        status: MESSAGE_STATUS.DELIVERED,
      },
    });
  }

  // Buscar el último mensaje entrante del prospecto para calcular el Tiempo de Respuesta (SLA)
  let responseTimeSec: number | null = null;
  try {
    const lastInbound = await prisma.message.findFirst({
      where: {
        organizationId,
        direction: MESSAGE_DIRECTION.INBOUND,
        ...(recipient && recipient !== "Usuario Social" ? { recipient } : {}),
        ...(leadId ? { leadId } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });

    if (lastInbound) {
      responseTimeSec = Math.max(0, Math.round((Date.now() - new Date(lastInbound.createdAt).getTime()) / 1000));
    }
  } catch {
    // Silencioso
  }

  // Registrar actividad por canal para el monitoreo de ejecutivos de venta y métricas de SLA
  let actType: string = ACTIVITY_TYPE.NOTE;
  if (channel.includes("whatsapp")) actType = ACTIVITY_TYPE.WHATSAPP;
  else if (channel.includes("messenger")) actType = ACTIVITY_TYPE.MESSENGER;
  else if (channel.includes("instagram")) actType = ACTIVITY_TYPE.INSTAGRAM;
  else if (channel === MESSAGE_CHANNEL.SMS) actType = ACTIVITY_TYPE.SMS;

  let outcome = "completed";
  let title = `Mensaje saliente vía ${channel}`;
  if (responseTimeSec !== null) {
    const minutes = Math.floor(responseTimeSec / 60);
    const seconds = responseTimeSec % 60;
    const formatted = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
    title = `Respuesta enviada (${formatted})`;
    outcome = responseTimeSec <= 300 ? "sla_ok" : responseTimeSec <= 900 ? "sla_warning" : "sla_breached";
  }

  prisma.activity.create({
    data: {
      userId,
      clientId: targetClientId || null,
      leadId: leadId || null,
      type: actType,
      title,
      description: responseTimeSec !== null
        ? `Tiempo de respuesta del asesor: ${Math.round(responseTimeSec / 60)} min. ${body.slice(0, 100)}`
        : body.slice(0, 160),
      outcome,
    },
  }).catch(() => {});

  return {
    id: savedMessage.id,
    conversationId,
    body,
    channel,
    direction: "outbound" as const,
    createdAt: savedMessage.createdAt.toISOString(),
    responseTimeSec,
  };
}

interface AssignConversationParams {
  organizationId: string;
  userId: string;
  targetClientId: string | null;
  conversationId: string;
  advisorId: string | null;
  leadId?: string | null;
  senderName?: string;
  senderPhone?: string | null;
  senderEmail?: string | null;
}

/**
 * Asigna un asesor comercial a la conversación y prospecto (creándolo si no existía).
 */
export async function assignConversation({
  organizationId,
  userId,
  targetClientId,
  conversationId,
  advisorId,
  leadId,
  senderName,
  senderPhone,
  senderEmail,
}: AssignConversationParams) {
  let assignedAdvisor: { id: string; name: string } | null = null;

  if (advisorId) {
    const foundAdvisor = await prisma.user.findFirst({
      where: {
        id: advisorId,
        isActive: true,
        memberships: { some: { organizationId } },
        ...(targetClientId ? { clientId: targetClientId } : {}),
      },
      select: { id: true, name: true },
    });

    if (!foundAdvisor) {
      throw new Error("El asesor seleccionado no pertenece a la organización o empresa.");
    }
    assignedAdvisor = foundAdvisor;
  }

  let targetLeadId = leadId;

  if (targetLeadId) {
    await prisma.lead.update({
      where: { id: targetLeadId },
      data: { ownerId: advisorId },
    });
  } else {
    const createdLead = await prisma.lead.create({
      data: {
        organizationId,
        clientId: targetClientId || null,
        name: senderName || "Prospecto de Bandeja de Entrada",
        phone: senderPhone || null,
        email: senderEmail || null,
        source: "SOCIAL_INBOX",
        status: "NEW",
        ownerId: advisorId,
      },
      select: { id: true, name: true },
    });
    targetLeadId = createdLead.id;
  }

  await prisma.auditLog.create({
    data: {
      organizationId,
      userId,
      action: "inbox_conversation_assigned",
      entityType: "Lead",
      entityId: targetLeadId,
      detailsJson: JSON.stringify({
        conversationId,
        advisorId,
        advisorName: assignedAdvisor?.name || null,
      }),
    },
  });

  return {
    leadId: targetLeadId,
    assignedAdvisorId: advisorId,
    assignedAdvisorName: assignedAdvisor?.name || null,
    message: assignedAdvisor ? `Conversación asignada a ${assignedAdvisor.name}` : "Conversación desasignada.",
  };
}
