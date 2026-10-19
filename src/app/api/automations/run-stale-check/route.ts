import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { runStaleLeadsCheck } from "@/services/opportunity-automations.service";

export const dynamic = "force-dynamic";

/** POST /api/automations/run-stale-check: barrido manual de leads estancados (solo admin). */
export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const result = await runStaleLeadsCheck(user!.organizationId, user!.id);
    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error("POST /api/automations/run-stale-check error:", error);
    return NextResponse.json(
      { success: false, error: "No se pudo ejecutar el chequeo de leads estancados." },
      { status: 500 }
    );
  }
}
