import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { scopeFromUser } from "@/lib/tenant";
import { manualSmsSchema } from "@/lib/validations/sms";
import { SmsTargetError, listSmsMessages, sendManualSms } from "@/services/sms.service";

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

/** SMS manual. Los IDs deben ser de la organización y un CLIENT solo escribe a los suyos. */
export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  const scope = scopeFromUser(user!);
  if (!scope) {
    return NextResponse.json({ success: false, error: "Usuario cliente no tiene empresa asociada." }, { status: 403 });
  }

  const parsed = manualSmsSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }

  try {
    const { sent, errorMessage, message } = await sendManualSms(scope, user!.id, parsed.data);
    if (!sent) {
      return NextResponse.json({ success: false, error: errorMessage, data: message }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: "SMS enviado correctamente al proveedor.", data: message });
  } catch (error) {
    if (error instanceof SmsTargetError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("POST /api/messages/sms error:", error);
    return NextResponse.json({ success: false, error: "Error al procesar envío de SMS." }, { status: 500 });
  }
}
