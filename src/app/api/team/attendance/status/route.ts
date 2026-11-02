import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { getUserAttendanceStatus } from "@/services/team-attendance.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/team/attendance/status
 * Devuelve el estado actual de asistencia (check-in de hoy) del usuario en sesión.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const status = await getUserAttendanceStatus(user!.id);
    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    console.error("GET /api/team/attendance/status error:", error);
    const message = error instanceof Error ? error.message : "Error al obtener estado de asistencia";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
