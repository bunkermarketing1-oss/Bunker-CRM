import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { clientBelongsToOrg } from "@/lib/validation-helpers";
import { bulkSmsSchema } from "@/lib/validations/sms";
import { BulkSmsLimitError, previewBulkSms, sendBulkSms } from "@/services/sms.service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** Envío masivo de SMS a los leads que cumplen el filtro. Con `dryRun: true` solo cuenta. */
export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  const parsed = bulkSmsSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }
  const { filter, template, dryRun } = parsed.data;

  if (filter.clientId && !(await clientBelongsToOrg(user!.organizationId, filter.clientId))) {
    return NextResponse.json({ success: false, error: "El cliente seleccionado no existe en tu organización." }, { status: 400 });
  }

  try {
    if (dryRun) {
      const preview = await previewBulkSms(user!.organizationId, filter);
      return NextResponse.json({ success: true, preview });
    }
    const result = await sendBulkSms(user!.organizationId, user!.id, filter, template);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    if (error instanceof BulkSmsLimitError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error("POST /api/messages/sms/bulk error:", error);
    return NextResponse.json({ success: false, error: "Error al enviar los SMS." }, { status: 500 });
  }
}
