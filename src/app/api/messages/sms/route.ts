import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const leadId = searchParams.get("leadId");

    const where: any = {
      organizationId: user!.organizationId,
      channel: "sms",
    };

    if (clientId) where.clientId = clientId;
    if (leadId) where.leadId = leadId;

    const messages = await prisma.message.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        lead: { select: { id: true, name: true, phone: true } },
        contact: { select: { id: true, firstName: true, phone: true } },
      },
      take: 100,
    });

    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
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

    if (message.length > 480) {
      return NextResponse.json({ success: false, error: "El mensaje supera el límite máximo de caracteres para SMS (480)." }, { status: 400 });
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

    // 3. Provider execution check
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromPhone = process.env.TWILIO_PHONE_NUMBER;

    let status = "pending";
    let providerMsgId = null;
    let errorMessage = null;

    if (accountSid && authToken && fromPhone) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
        const params = new URLSearchParams();
        params.append("To", cleanPhone);
        params.append("From", fromPhone);
        params.append("Body", message.trim());

        const authHeader = "Basic " + Buffer.from(`${accountSid}:${authToken}`).toString("base64");
        const twilioResponse = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": authHeader,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: params.toString(),
        });

        const twilioData = await twilioResponse.json();

        if (twilioResponse.ok) {
          status = "sent";
          providerMsgId = twilioData.sid;
        } else {
          status = "failed";
          errorMessage = twilioData.message || "Error devuelto por proveedor Twilio";
        }
      } catch (err: any) {
        status = "failed";
        errorMessage = err.message || "Fallo de conexión al enviar SMS";
      }
    } else {
      status = "failed";
      errorMessage = "El servicio de mensajería SMS aún no está conectado. Ve a Integraciones para activar tus claves de Twilio de forma sencilla.";
    }

    // 4. Save to Database with authenticated organization
    const savedMessage = await prisma.message.create({
      data: {
        organizationId: user!.organizationId,
        clientId: clientId || null,
        leadId: leadId || null,
        contactId: contactId || null,
        channel: "sms",
        direction: "outbound",
        recipient: cleanPhone,
        body: message.trim(),
        status,
        providerMsgId,
        errorMessage,
        isDemo: !accountSid,
      },
      include: {
        client: true,
        lead: true,
      },
    });

    // 5. Log as Activity
    if (clientId || leadId) {
      await prisma.activity.create({
        data: {
          clientId: clientId || null,
          leadId: leadId || null,
          userId: user!.id,
          type: "sms",
          title: `SMS enviado a ${cleanPhone}`,
          description: message.trim(),
          outcome: status === "sent" ? "completed" : "pending",
        },
      });
    }

    return NextResponse.json({
      success: status === "sent",
      message: status === "sent" ? "SMS enviado correctamente al proveedor." : errorMessage,
      data: savedMessage,
    }, { status: status === "sent" ? 200 : 400 });
  } catch (error: any) {
    console.error("POST /api/messages/sms error:", error);
    return NextResponse.json({ success: false, error: "Error al procesar envío de SMS." }, { status: 500 });
  }
}
