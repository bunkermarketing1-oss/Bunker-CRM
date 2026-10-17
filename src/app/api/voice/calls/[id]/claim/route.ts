import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { scopeFromUser } from "@/lib/tenant";
import { claimCallSchema } from "@/lib/validations/voice";
import { claimInboundCall } from "@/services/calls.service";
import { voiceErrorResponse } from "../../../_errors";

export const dynamic = "force-dynamic";

/** El asesor contestó una entrante en su navegador. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;
  const scope = scopeFromUser(user!);
  if (!scope) return NextResponse.json({ success: false, error: "Llamada no encontrada." }, { status: 404 });

  const parsed = claimCallSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ success: false, error: "Datos inválidos." }, { status: 400 });

  try {
    await claimInboundCall(scope, user!.id, params.id, parsed.data.agentCallSid ?? null);
    return NextResponse.json({ success: true });
  } catch (error) {
    return voiceErrorResponse(error, "POST /api/voice/calls/[id]/claim", "Error al tomar la llamada.");
  }
}
