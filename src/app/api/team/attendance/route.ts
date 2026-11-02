import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { recordAttendance } from "@/services/team-attendance.service";

export const dynamic = "force-dynamic";

const attendanceSchema = z.object({
  action: z.enum(["check_in", "check_out", "heartbeat"]),
});

/**
 * POST /api/team/attendance
 * Registra el check-in, check-out o actividad (heartbeat) del vendedor autenticado.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const parsed = attendanceSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Acción inválida" },
        { status: 400 }
      );
    }

    const result = await recordAttendance({
      userId: user!.id,
      organizationId: user!.organizationId,
      clientId: user!.clientId || null,
      action: parsed.data.action,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("POST /api/team/attendance error:", error);
    const message = error instanceof Error ? error.message : "Error al registrar asistencia";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
