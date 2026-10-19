import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createPhoneLineSchema } from "@/lib/validations/voice";
import { createPhoneLine, listPhoneLines } from "@/services/calls.service";
import { voiceErrorResponse } from "../_errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    return NextResponse.json({ success: true, lines: await listPhoneLines(user!.organizationId) });
  } catch (error) {
    return voiceErrorResponse(error, "GET /api/voice/lines", "Error al consultar líneas.");
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  const parsed = createPhoneLineSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }

  try {
    const line = await createPhoneLine(user!.organizationId, user!.id, parsed.data);
    return NextResponse.json({ success: true, line }, { status: 201 });
  } catch (error) {
    return voiceErrorResponse(error, "POST /api/voice/lines", "Error al registrar la línea.");
  }
}
