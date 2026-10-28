import { prisma } from "@/lib/prisma";
import { ACCOUNT_TYPE, ACCOUNT_STATUS } from "@/lib/constants/integrations";
import { MESSAGE_CHANNEL, MESSAGE_DIRECTION, MESSAGE_STATUS } from "@/lib/constants/messaging";
import { sendMetaOutboundReply, syncConnectedPageConversations } from "@/services/meta-messaging.service";
import { sendManualSms } from "@/services/sms.service";
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
// Control de auto-sincronización periódica por organización (mínimo 15s entre llamadas a Meta)
const orgLastSyncMap = new Map<string, number>();
const AUTO_SYNC_COOLDOWN_MS = 15000;

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

  // 2. Sincronizar páginas conectadas (bajo demanda o auto-sync cada 15s)
  const now = Date.now();
  const lastSync = orgLastSyncMap.get(organizationId) || 0;
  const shouldAutoSync = triggerSync || (now - lastSync > AUTO_SYNC_COOLDOWN_MS && !cleanSearch && channel === "all");

  if (shouldAutoSync) {
    orgLastSyncMap.set(organizationId, now);
    const pageAccounts = await prisma.connectedAccount.findMany({
      where: {
        organizationId,
        ...(targetClientId ? { clientId: targetClientId } : {}),
        accountType: ACCOUNT_TYPE.FACEBOOK_PAGE,
        status: ACCOUNT_STATUS.ACTIVE,
        accessTokenEnc: { not: null },
      },
      select: { id: true },
    });

    for (const page of pageAccounts) {
      try {
        await syncConnectedPageConversations(page.id);
      } catch (syncErr) {
        console.error(`[INBOX_SYNC] Error sincronizando página ${page.id}:`, syncErr);
      }
    }
  }

  // 3. Construir filtros de mensajes con soporte de búsqueda en servidor e índices
  const messageWhere: Prisma.MessageWhereInput = {
    organizationId,
    ...(targetClientId ? { clientId: targetClientId } : {}),
  };

  if (channel && channel !== "all") {
    if (channel === "comments") {
      messageWhere.channel = {
        in: [MESSAGE_CHANNEL.FACEBOOK_COMMENT, MESSAGE_CHANNEL.INSTAGRAM_COMMENT],
      };
    } else {
      messageWhere.channel = channel;
    }
  }

  
  if (cleanSearch) {
    messageWhere.OR = [
      { recipient: { contains: cleanSearch, mode: "insensitive" } },
      { body: { contains: cleanSearch, mode: "insensitive" } },
      { lead: { is: { name: { contains: cleanSearch, mode: "insensitive" } } } },
      { lead: { is: { phone: { contains: cleanSearch } } } },
      { lead: { is: { email: { contains: cleanSearch, mode: "insensitive" } } } },
    ];
  }

  let dbMessages = await prisma.message.findMany({
    where: messageWhere,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      client: { select: { id: true, name: true } },
      lead: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
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
        accountType: ACCOUNT_TYPE.FACEBOOK_PAGE,
        status: ACCOUNT_STATUS.ACTIVE,
        accessTokenEnc: { not: null },
      },
      select: { id: true },
    });

    let importedAny = false;
    for (const page of pageAccounts) {
      try {
        const res = await syncConnectedPageConversations(page.id);
        if (res.messages > 0) importedAny = true;
      } catch (syncErr) {
        console.error(`[INBOX_AUTO_SYNC] Error en sincronización inicial:`, syncErr);
      }
    }

    if (importedAny) {
      dbMessages = await prisma.message.findMany({
        where: messageWhere,
        orderBy: { createdAt: "desc" },
        take: limit,
        include: {
          client: { select: { id: true, name: true } },
          lead: {
            select: {
              id: true,
              name: true,
              phone: true,
              email: true,
              avatarUrl: true,
              clientId: true,
              client: { select: { id: true, name: true } },
              ownerId: true,
              owner: { select: { id: true, name: true, email: true } },
            },
          },
        },
      });
    }
  }

  // 4. Agrupar mensajes en conversaciones preservando el orden cronológico
  // Invertir para agrupar en orden temporal (antiguo -> nuevo) y que el último mensaje sea el más reciente
  const chronologicalMessages = [...dbMessages].reverse();
  const dbConvMap = new Map<string, ConversationItem>();

  for (const msg of chronologicalMessages) {
    const convKey = `msg_${msg.leadId || msg.recipient}`;
    const sender = msg.lead?.name || msg.recipient;

    let ch: ConversationItem["channel"] = "whatsapp";
    if (msg.channel === MESSAGE_CHANNEL.MESSENGER) ch = "messenger";
    else if (msg.channel === MESSAGE_CHANNEL.INSTAGRAM) ch = "instagram";
    else if (msg.channel === MESSAGE_CHANNEL.SMS) ch = "sms";
    else if (msg.channel === MESSAGE_CHANNEL.FACEBOOK_COMMENT) ch = "facebook_comment";
    else if (msg.channel === MESSAGE_CHANNEL.INSTAGRAM_COMMENT) ch = "instagram_comment";
    else ch = "whatsapp";

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
        senderAvatar: msg.lead?.avatarUrl || null,
        recipient: msg.recipient || "Línea Oficial",
        clientId: msg.clientId || msg.lead?.clientId || null,
        clientName: msg.client?.name || msg.lead?.client?.name || null,
        connectedAccountId: null,
        accountName: channelAccountLabel,
        unreadCount: 0,
        lastMessageText: msg.direction === MESSAGE_DIRECTION.OUTBOUND ? `Tú: ${msg.body}` : msg.body,
        lastMessageTime: msg.createdAt.toISOString(),
        leadId: msg.lead?.id || null,
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
      conv.unreadCount += 1;
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

  // Estadísticas globales / filtradas
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

  // Clientes para selectores de admin
  const clientsList = isClientUser
    ? []
    : await prisma.client.findMany({
        where: { organizationId, isDeleted: false },
        select: { id: true, name: true, companyName: true },
        orderBy: { name: "asc" },
      });

  // Asesores comerciales activos
  const userWhere: Prisma.UserWhereInput = {
    memberships: { some: { organizationId } },
    isActive: true,
    ...(isClientUser && targetClientId ? { clientId: targetClientId } : {}),
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
    conversations: allConversations,
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
  limit = 200,
}: {
  organizationId: string;
  targetClientId: string | null;
  recipient: string;
  leadId?: string | null;
  limit?: number;
}): Promise<ConversationMessage[]> {
  const where: Prisma.MessageWhereInput = {
    organizationId,
    ...(targetClientId ? { clientId: targetClientId } : {}),
    ...(leadId
      ? {
          OR: [{ leadId }, { recipient }],
        }
      : { recipient }),
  };

  const messages = await prisma.message.findMany({
    where,
    orderBy: { createdAt: "asc" },
    take: limit,
    include: {
      lead: { select: { id: true, name: true, phone: true } },
    },
  });

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

interface SendReplyParams {
  organizationId: string;
  userId: string;
  targetClientId: string | null;
  conversationId: string;
  channel: string;
  body: string;
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
  recipient,
  leadId,
  scope,
}: SendReplyParams) {
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
    });
  } else if (channel === MESSAGE_CHANNEL.SMS && recipient && recipient !== "Usuario Social") {
    if (!scope) {
      throw new Error("Usuario cliente no tiene empresa asociada para envío de SMS.");
    }

    const smsResult = await sendManualSms(scope, userId, {
      recipient,
      message: body,
      leadId: leadId || undefined,
      clientId: targetClientId || undefined,
    });

    if (!smsResult.sent) {
      throw new Error(smsResult.errorMessage || "Error al enviar SMS vía Twilio.");
    }
    savedMessage = smsResult.message;
  } else {
    // Canal WhatsApp u otros: registrar en base de datos
    savedMessage = await prisma.message.create({
      data: {
        organizationId,
        clientId: targetClientId || null,
        leadId: leadId || null,
        channel: channel.includes("whatsapp") ? MESSAGE_CHANNEL.WHATSAPP : channel,
        direction: MESSAGE_DIRECTION.OUTBOUND,
        recipient: recipient || "Usuario Social",
        body,
        status: MESSAGE_STATUS.SENT,
      },
    });
  }

  return {
    id: savedMessage.id,
    conversationId,
    body,
    channel,
    direction: "outbound" as const,
    createdAt: savedMessage.createdAt.toISOString(),
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
        name: senderName || "Prospecto de Bandeja Omnicanal",
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
