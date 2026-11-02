import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { isClientOwnerRole } from "@/lib/roles";
import { getSellerAttendanceHistory } from "@/services/team-attendance.service";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ userId: string }>;
}

/**
 * GET /api/team/attendance/[userId]?days=15
 * Devuelve la bitácora de los últimos 15 días con check-in, check-out y resumen de actividad.
 * Acceso exclusivo: ADMIN de Bunker o Dueño (CLIENT_OWNER) de la empresa a la que pertenece el vendedor.
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { userId } = await params;
    const { searchParams } = new URL(req.url);
    const days = parseInt(searchParams.get("days") || "15", 10);

    // Seguridad de roles: Solo ADMIN o CLIENT_OWNER pueden auditar la bitácora
    const isOwner = isClientOwnerRole(user!.role);
    const isAdmin = !user!.isClientUser;

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: "Acceso exclusivo para el dueño o administrador de la empresa." },
        { status: 403 }
      );
    }

    const targetClientId = user!.isClientUser ? (user!.clientId ?? null) : null;

    const history = await getSellerAttendanceHistory(
      user!.organizationId,
      targetClientId,
      userId,
      isNaN(days) ? 15 : Math.min(Math.max(days, 1), 60)
    );

    return NextResponse.json(history);
  } catch (error) {
    console.error("GET /api/team/attendance/[userId] error:", error);
    const message = error instanceof Error ? error.message : "Error al consultar bitácora de asistencia";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
