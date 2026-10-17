import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { scopeFromUser } from "@/lib/tenant";
import { validateAndNormalizePhone } from "@/lib/phone";
import { isPhoneOptedOut, listSmsMessages } from "@/services/sms.service";
import { sendTwilioSms } from "@/lib/integrations/twilio";
import { ACTIVITY_TYPE } from "@/lib/constants/crm";
import { MESSAGE_CHANNEL, MESSAGE_DIRECTION, MESSAGE_STATUS, SMS_MAX_LENGTH } from "@/lib/constants/messaging";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    // Un usuario CLIENT solo ve los SMS de su empresa, sin importar el clientId que mande.
    const scope = scopeFromUser(user!);
    if (!scope) return NextResponse.json({ success: true, messages: [] });

    const { searchParams } = new URL(req.url);
    const messages = await listSmsMessages(scope, {
      clientId: searchParams.get("clientId"),
      leadId: searchParams.get("leadId"),
    });

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error("GET /api/messages/sms error:", error);
    return NextResponse.json({ success: false, error: "Error al consultar mensajes SMS." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { recipient, message, clientId, leadId, contactId } = body;

    // 1. Validation
    if (!recipient || typeof recipient !== "string" || recipient.trim() === "") {
      return NextResponse.json({ success: false, error: "El número telefónico destinatario es obligatorio." }, { status: 400 });
    }

    // Clean phone number
    const cleanPhone = recipient.replace(/[^\d+]/g, "").trim();
    if (cleanPhone.length < 8) {
      return NextResponse.json({ success: false, error: "El formato del número telefónico no es válido (ej. +525549123011)." }, { status: 400 });
    }

    if (!message || typeof message !== "string" || message.trim() === "") {
      return NextResponse.json({ success: false, error: "El cuerpo del mensaje no puede estar vacío." }, { status: 400 });
    }

    if (message.length > SMS_MAX_LENGTH) {
      return NextResponse.json({ success: false, error: `El mensaje supera el límite máximo de caracteres para SMS (${SMS_MAX_LENGTH}).` }, { status: 400 });
    }

    // 2. Duplicate prevention (Look back 2 minutes for identical text to identical number within same org)
    const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
    const existingDuplicate = await prisma.message.findFirst({
      where: {
        organizationId: user!.organizationId,
        recipient: cleanPhone,
        body: message.trim(),
        createdAt: { gte: twoMinutesAgo },
      },
    });

    if (existingDuplicate) {
      return NextResponse.json({
        success: false,
        error: "Prevención de duplicados: Un mensaje con el mismo contenido fue enviado a este número hace menos de 2 minutos.",
      }, { status: 429 });
    }

    // 3. El número pidió no recibir SMS (respondió BAJA/STOP)
    const normalizedRecipient = validateAndNormalizePhone(cleanPhone).normalized ?? cleanPhone;
    if (await isPhoneOptedOut(user!.organizationId, normalizedRecipient)) {
      return NextResponse.json(
        { success: false, error: "Este número pidió no recibir más SMS (respondió BAJA o STOP)." },
        { status: 409 }
      );
    }

    // 4. Provider execution
    const { status, providerMsgId, errorMessage, isDemo } = await sendTwilioSms(cleanPhone, message.trim());

    // 5. Save to Database with authenticated organization
    const savedMessage = await prisma.message.create({
      data: {
        organizationId: user!.organizationId,
        clientId: clientId || null,
        leadId: leadId || null,
        contactId: contactId || null,
        channel: MESSAGE_CHANNEL.SMS,
        direction: MESSAGE_DIRECTION.OUTBOUND,
        recipient: cleanPhone,
        body: message.trim(),
        status,
        providerMsgId,
        errorMessage,
        isDemo,
      },
      include: {
        client: true,
        lead: true,
      },
    });

    // 6. Log as Activity
    if (clientId || leadId) {
      await prisma.activity.create({
        data: {
          clientId: clientId || null,
          leadId: leadId || null,
          userId: user!.id,
          type: ACTIVITY_TYPE.SMS,
          title: `SMS enviado a ${cleanPhone}`,
          description: message.trim(),
          outcome: status === MESSAGE_STATUS.SENT ? "completed" : "pending",
        },
      });
    }

    return NextResponse.json({
      success: status === MESSAGE_STATUS.SENT,
      message: status === MESSAGE_STATUS.SENT ? "SMS enviado correctamente al proveedor." : errorMessage,
      data: savedMessage,
    }, { status: status === MESSAGE_STATUS.SENT ? 200 : 400 });
  } catch (error: any) {
    console.error("POST /api/messages/sms error:", error);
    return NextResponse.json({ success: false, error: "Error al procesar envío de SMS." }, { status: 500 });
  }
}
