import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { scopeFromUser } from "@/lib/tenant";
import { issueVoiceToken } from "@/services/calls.service";
import { voiceErrorResponse } from "../_errors";

export const dynamic = "force-dynamic";

/** Access Token para que el navegador haga y reciba llamadas (Twilio Voice SDK). */
export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;
  if (!scopeFromUser(user!)) {
    return NextResponse.json({ success: false, error: "Usuario cliente no tiene empresa asociada." }, { status: 403 });
  }

  try {
    const tokenData = await issueVoiceToken(user!.id);
    return NextResponse.json({ success: true, ...tokenData });
  } catch (error) {
    return voiceErrorResponse(error, "GET /api/voice/token", "Error al generar el acceso a llamadas.");
  }
}
