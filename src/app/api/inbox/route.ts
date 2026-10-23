import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { clientBelongsToOrg } from "@/lib/validation-helpers";
import { ACCOUNT_TYPE } from "@/lib/constants/integrations";
import { MESSAGE_CHANNEL, MESSAGE_DIRECTION, MESSAGE_STATUS } from "@/lib/constants/messaging";
import { sendMetaOutboundReply } from "@/services/meta-messaging.service";

export const dynamic = "force-dynamic";

const replySchema = z.object({
  conversationId: z.string().min(1, "ID de conversación requerido"),
  channel: z.enum(["whatsapp", "messenger", "instagram", "facebook_comment", "instagram_comment", "sms"]),
  body: z.string().trim().min(1, "El mensaje no puede estar vacío").max(2000, "Máximo 2000 caracteres"),
  recipient: z.string().optional(),
  leadId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  commentId: z.string().optional().nullable(),
});

const assignSchema = z.object({
  action: z.literal("assign"),
  conversationId: z.string().min(1, "ID de conversación requerido"),
  advisorId: z.string().uuid("ID de asesor inválido").nullable(),
  leadId: z.string().uuid().optional().nullable(),
  senderName: z.string().optional(),
  senderPhone: z.string().optional().nullable(),
  senderEmail: z.string().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
});

interface ConversationMessage {
  id: string;
  senderName: string;
  body: string;
  createdAt: string;
  direction: "inbound" | "outbound";
  status?: string;
}

interface ConversationItem {
  id: string;
  channel: "whatsapp" | "messenger" | "instagram" | "facebook_comment" | "instagram_comment";
  senderName: string;
  senderAvatar?: string | null;
  recipient: string;
  clientId: string | null;
  clientName: string | null;
  connectedAccountId: string | null;
  accountName: string | null;
  unreadCount: number;
  lastMessageText: string;
  lastMessageTime: string;
  postContext?: {
    postId: string;
    postTitle: string;
    commentId: string;
  } | null;
  messages: ConversationMessage[];
  leadId?: string | null;
  leadPhone?: string | null;
  leadEmail?: string | null;
  assignedAdvisorId?: string | null;
  assignedAdvisorName?: string | null;
}

/**
 * GET /api/inbox
 * Centraliza mensajes de WhatsApp, Facebook Messenger, Instagram Direct y comentarios públicos.
 * - ADMIN: Puede ver todos o filtrar por ?clientId= y ?channel=
 * - CLIENT: Filtro estricto forzado en servidor por su user.clientId
 */
export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const channelFilter = searchParams.get("channel") || "all";
    const searchFilter = (searchParams.get("search") || "").trim().toLowerCase();

    // Multi-tenant check
    let targetClientId: string | null = null;
    if (user!.isClientUser) {
      if (!user!.clientId) {
        return NextResponse.json({
          success: true,
          conversations: [],
          stats: { total: 0, unread: 0, whatsapp: 0, messenger: 0, instagram: 0, comments: 0 },
        });
      }
      targetClientId = user!.clientId;
    } else {
      const requested = searchParams.get("clientId");
      if (requested && requested !== "all") {
        if (!(await clientBelongsToOrg(user!.organizationId, requested))) {
          return NextResponse.json({ success: false, error: "Cliente no pertenece a su organización." }, { status: 404 });
        }
        targetClientId = requested;
      }
    }

    // 1. Obtener cuentas conectadas vinculadas a la organización (y opcionalmente al cliente)
    const accountWhere: {
      organizationId: string;
      clientId?: string;
    } = {
      organizationId: user!.organizationId,
    };
    if (targetClientId) {
      accountWhere.clientId = targetClientId;
    }

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

    // 2. Obtener mensajes registrados en base de datos (WhatsApp / SMS)
    const messageWhere: {
      organizationId: string;
      clientId?: string;
    } = {
      organizationId: user!.organizationId,
    };
    if (targetClientId) {
      messageWhere.clientId = targetClientId;
    }

    const dbMessages = await prisma.message.findMany({
      where: messageWhere,
      orderBy: { createdAt: "desc" },
      take: 250,
      include: {
        client: { select: { id: true, name: true } },
        lead: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            clientId: true,
            client: { select: { id: true, name: true } },
            ownerId: true,
            owner: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    // Reordenar cronológicamente para que la conversación fluya de más antiguo a más nuevo
    dbMessages.reverse();

    // Agrupar mensajes de BD por conversación (por destinatario/remitente o lead)
    const dbConvMap = new Map<string, ConversationItem>();

    for (const msg of dbMessages) {
      const convKey = `msg_${msg.leadId || msg.recipient}`;
      const sender = msg.lead?.name || msg.recipient;

      let ch: ConversationItem["channel"] = "whatsapp";
      if (msg.channel === "messenger") ch = "messenger";
      else if (msg.channel === "instagram") ch = "instagram";
      else if (msg.channel === "facebook_comment") ch = "facebook_comment";
      else if (msg.channel === "instagram_comment") ch = "instagram_comment";
      else ch = "whatsapp";

      const channelAccountLabel =
        ch === "whatsapp"
          ? "WhatsApp Business"
          : ch === "messenger"
          ? "Facebook Messenger"
          : ch === "instagram"
          ? "Instagram Direct"
          : "Línea Oficial";

      if (!dbConvMap.has(convKey)) {
        dbConvMap.set(convKey, {
          id: convKey,
          channel: ch,
          senderName: sender,
          senderAvatar: null,
          recipient: msg.recipient || "Línea Oficial",
          clientId: msg.clientId || msg.lead?.clientId || null,
          clientName: msg.client?.name || msg.lead?.client?.name || null,
          connectedAccountId: null,
          accountName: channelAccountLabel,
          unreadCount: msg.direction === "inbound" ? 1 : 0,
          lastMessageText: msg.body,
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
      conv.lastMessageText = msg.body;
      conv.lastMessageTime = msg.createdAt.toISOString();
      if (msg.direction === "inbound") {
        conv.unreadCount += 1;
      }
      conv.messages.push({
        id: msg.id,
        senderName: msg.direction === "inbound" ? sender : "Tú (Asesor)",
        body: msg.body,
        createdAt: msg.createdAt.toISOString(),
        direction: msg.direction === "inbound" ? "inbound" : "outbound",
        status: msg.status,
      });
    }

    // 3. Obtener clientes para el selector de filtro (solo para administradores de Bunker)
    const clientsList = user!.isClientUser
      ? []
      : await prisma.client.findMany({
          where: { organizationId: user!.organizationId, isDeleted: false },
          select: { id: true, name: true, companyName: true },
          orderBy: { name: "asc" },
        });

    // 4. Todas las conversaciones provienen 100% de la base de datos real (cero mocks)
    let allConversations = Array.from(dbConvMap.values());

    // Filtrar por cliente si aplica
    if (targetClientId) {
      allConversations = allConversations.filter((c) => c.clientId === targetClientId);
    }

    // Filtrar por canal
    if (channelFilter !== "all") {
      if (channelFilter === "comments") {
        allConversations = allConversations.filter(
          (c) => c.channel === "facebook_comment" || c.channel === "instagram_comment"
        );
      } else {
        allConversations = allConversations.filter((c) => c.channel === channelFilter);
      }
    }

    // Filtrar por texto de búsqueda
    if (searchFilter) {
      allConversations = allConversations.filter(
        (c) =>
          c.senderName.toLowerCase().includes(searchFilter) ||
          c.lastMessageText.toLowerCase().includes(searchFilter) ||
          (c.clientName && c.clientName.toLowerCase().includes(searchFilter)) ||
          (c.leadEmail && c.leadEmail.toLowerCase().includes(searchFilter)) ||
          (c.leadPhone && c.leadPhone.includes(searchFilter))
      );
    }

    // Ordenar por mensaje más reciente
    allConversations.sort((a, b) => new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime());

    // Estadísticas
    const stats = {
      total: allConversations.length,
      unread: allConversations.filter((c) => c.unreadCount > 0).length,
      whatsapp: allConversations.filter((c) => c.channel === "whatsapp").length,
      messenger: allConversations.filter((c) => c.channel === "messenger").length,
      instagram: allConversations.filter((c) => c.channel === "instagram").length,
      comments: allConversations.filter(
        (c) => c.channel === "facebook_comment" || c.channel === "instagram_comment"
      ).length,
    };

    // Consultar asesores/vendedores activos para asignación comercial
    const userWhere: {
      memberships: { some: { organizationId: string } };
      isActive: boolean;
      clientId?: string | null;
    } = {
      memberships: { some: { organizationId: user!.organizationId } },
      isActive: true,
    };
    if (user!.isClientUser && user!.clientId) {
      userWhere.clientId = user!.clientId;
    }

    const availableAdvisors = await prisma.user.findMany({
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

    return NextResponse.json({
      success: true,
      targetClientId,
      conversations: allConversations,
      stats,
      connectedAccounts,
      clients: user!.isClientUser ? [] : clientsList,
      advisors: availableAdvisors,
    });
  } catch (error) {
    console.error("GET /api/inbox error:", error);
    const message = error instanceof Error ? error.message : "Error al consultar la bandeja de entrada.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/inbox
 * Envía una respuesta por WhatsApp, Messenger, Instagram Direct o responde un comentario público.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
    }

    const { conversationId, channel, body: messageBody, recipient, leadId, clientId } = parsed.data;

    // Validación multi-tenant: si es usuario cliente, forzar su clientId
    let targetClientId = clientId;
    if (user!.isClientUser) {
      targetClientId = user!.clientId;
    }

    let savedMessage;
    if ((channel === "messenger" || channel === "instagram") && recipient && recipient !== "Usuario Social") {
      try {
        savedMessage = await sendMetaOutboundReply({
          organizationId: user!.organizationId,
          senderUserId: user!.id,
          targetClientId,
          leadId,
          recipient,
          channel: channel as "messenger" | "instagram",
          body: messageBody,
        });
      } catch (sendErr) {
        const msg = sendErr instanceof Error ? sendErr.message : "Error al enviar mensaje por Meta.";
        return NextResponse.json({ success: false, error: msg }, { status: 400 });
      }
    } else {
      // Registrar mensaje en la base de datos para trazabilidad (SMS o WhatsApp)
      savedMessage = await prisma.message.create({
        data: {
          organizationId: user!.organizationId,
          clientId: targetClientId || null,
          leadId: leadId || null,
          channel: channel.includes("whatsapp") ? MESSAGE_CHANNEL.WHATSAPP : MESSAGE_CHANNEL.SMS,
          direction: MESSAGE_DIRECTION.OUTBOUND,
          recipient: recipient || "Usuario Social",
          body: messageBody,
          status: MESSAGE_STATUS.SENT,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: "Respuesta enviada con éxito.",
      reply: {
        id: savedMessage.id,
        conversationId,
        body: messageBody,
        channel,
        direction: "outbound",
        createdAt: savedMessage.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error("POST /api/inbox reply error:", error);
    const message = error instanceof Error ? error.message : "Error al enviar la respuesta.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/inbox
 * Asigna o reasigna un vendedor/asesor comercial a una conversación o prospecto (Lead).
 * Si la conversación no tiene lead en CRM aún, crea el prospecto automáticamente para seguimiento.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Datos de asignación inválidos." },
        { status: 400 }
      );
    }

    const { conversationId, advisorId, leadId, senderName, senderPhone, senderEmail, clientId } = parsed.data;

    let targetClientId = clientId;
    if (user!.isClientUser) {
      targetClientId = user!.clientId;
    }

    // Verificar si el asesor seleccionado pertenece a la organización
    let assignedAdvisor: { id: string; name: string } | null = null;
    if (advisorId) {
      const foundAdvisor = await prisma.user.findFirst({
        where: {
          id: advisorId,
          isActive: true,
          memberships: { some: { organizationId: user!.organizationId } },
          ...(user!.isClientUser && user!.clientId ? { clientId: user!.clientId } : {}),
        },
        select: { id: true, name: true },
      });

      if (!foundAdvisor) {
        return NextResponse.json(
          { success: false, error: "El asesor seleccionado no pertenece a la organización o empresa." },
          { status: 404 }
        );
      }
      assignedAdvisor = foundAdvisor;
    }

    let targetLeadId = leadId;

    if (targetLeadId) {
      // Actualizar el lead existente
      await prisma.lead.update({
        where: { id: targetLeadId },
        data: { ownerId: advisorId },
      });
    } else {
      // Si la conversación de mensajería no tiene lead en CRM aún, crearlo automáticamente
      const createdLead = await prisma.lead.create({
        data: {
          organizationId: user!.organizationId,
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

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        organizationId: user!.organizationId,
        userId: user!.id,
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

    return NextResponse.json({
      success: true,
      message: assignedAdvisor ? `Conversación asignada a ${assignedAdvisor.name}` : "Conversación desasignada.",
      leadId: targetLeadId,
      assignedAdvisorId: advisorId,
      assignedAdvisorName: assignedAdvisor?.name || null,
    });
  } catch (error) {
    console.error("PATCH /api/inbox error:", error);
    const message = error instanceof Error ? error.message : "Error al asignar la conversación.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
