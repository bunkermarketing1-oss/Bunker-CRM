import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { scopeFromUser } from "@/lib/tenant";
import { hangupCall } from "@/services/calls.service";
import { voiceErrorResponse } from "../../../_errors";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;
  const scope = scopeFromUser(user!);
  if (!scope) return NextResponse.json({ success: false, error: "Llamada no encontrada." }, { status: 404 });

  try {
    await hangupCall(scope, params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return voiceErrorResponse(error, "POST /api/voice/calls/[id]/hangup", "Error al colgar la llamada.");
  }
}
