import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { scopeFromUser } from "@/lib/tenant";
import { clientBelongsToOrg } from "@/lib/validation-helpers";
import {
  getInboxConversations,
  getConversationThread,
  replyToConversation,
  assignConversation,
} from "@/services/inbox.service";

export const dynamic = "force-dynamic";

const replySchema = z.object({
  conversationId: z.string().min(1, "ID de conversación requerido"),
  channel: z.enum([
    "whatsapp",
    "messenger",
    "instagram",
    "facebook_comment",
    "instagram_comment",
    "sms",
  ]),
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

/**
 * GET /api/inbox
 * Centraliza mensajes de WhatsApp, Facebook Messenger, Instagram Direct, Twilio SMS y comentarios públicos.
 * - ADMIN: Puede ver todos o filtrar por ?clientId=, ?channel= y ?search=
 * - CLIENT: Filtro estricto forzado en servidor por su user.clientId
 * - Si incluye ?thread=true y ?recipient=..., devuelve el historial cronológico completo de esa conversación.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const channelFilter = searchParams.get("channel") || "all";
    const searchFilter = (searchParams.get("search") || "").trim();
    const isThread = searchParams.get("thread") === "true";
    const recipient = searchParams.get("recipient") || "";
    const leadId = searchParams.get("leadId") || null;

    // Multi-tenant check
    let targetClientId: string | null = null;
    if (user!.isClientUser) {
      if (!user!.clientId) {
        return NextResponse.json({
          success: true,
          conversations: [],
          stats: { total: 0, unread: 0, whatsapp: 0, messenger: 0, instagram: 0, sms: 0, comments: 0 },
        });
      }
      targetClientId = user!.clientId;
    } else {
      const requested = searchParams.get("clientId");
      if (requested && requested !== "all") {
        if (!(await clientBelongsToOrg(user!.organizationId, requested))) {
          return NextResponse.json(
            { success: false, error: "Cliente no pertenece a su organización." },
            { status: 404 }
          );
        }
        targetClientId = requested;
      }
    }

    // Consulta de hilo individual completo si se solicita
    if (isThread && (recipient || leadId)) {
      const messages = await getConversationThread({
        organizationId: user!.organizationId,
        targetClientId,
        recipient,
        leadId,
        channel: channelFilter !== "all" ? channelFilter : undefined,
      });
      return NextResponse.json({ success: true, messages });
    }

    // Consulta principal de conversaciones
    const shouldSync = searchParams.get("sync") === "true";
    const result = await getInboxConversations(user!.organizationId, targetClientId, {
      channel: channelFilter,
      search: searchFilter,
      limit: 500,
      triggerSync: shouldSync,
      isClientUser: Boolean(user!.isClientUser),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/inbox error:", error);
    const message = error instanceof Error ? error.message : "Error al consultar la bandeja de entrada.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/inbox
 * Envía una respuesta por WhatsApp, Messenger, Instagram Direct, Twilio SMS o responde un comentario público.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const parsed = replySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 }
      );
    }

    const { conversationId, channel, body: messageBody, recipient, leadId, clientId } = parsed.data;

    let targetClientId = clientId;
    if (user!.isClientUser) {
      targetClientId = user!.clientId;
    }

    const scope = scopeFromUser(user!);

    const reply = await replyToConversation({
      organizationId: user!.organizationId,
      userId: user!.id,
      targetClientId: targetClientId || null,
      conversationId,
      channel,
      body: messageBody,
      recipient,
      leadId,
      scope,
    });

    return NextResponse.json({
      success: true,
      message: "Respuesta enviada con éxito.",
      reply,
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

    const result = await assignConversation({
      organizationId: user!.organizationId,
      userId: user!.id,
      targetClientId: targetClientId || null,
      conversationId,
      advisorId,
      leadId,
      senderName,
      senderPhone,
      senderEmail,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("PATCH /api/inbox error:", error);
    const message = error instanceof Error ? error.message : "Error al asignar la conversación.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
