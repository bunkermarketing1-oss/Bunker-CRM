import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updatePhoneLineSchema } from "@/lib/validations/voice";
import { updatePhoneLine } from "@/services/calls.service";
import { voiceErrorResponse } from "../../_errors";

export const dynamic = "force-dynamic";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  const parsed = updatePhoneLineSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }

  try {
    const line = await updatePhoneLine(user!.organizationId, user!.id, params.id, parsed.data);
    return NextResponse.json({ success: true, line });
  } catch (error) {
    return voiceErrorResponse(error, "PATCH /api/voice/lines/[id]", "Error al actualizar la línea.");
  }
}
