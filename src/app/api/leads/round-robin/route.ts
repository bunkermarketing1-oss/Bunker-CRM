import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { assignUnassignedLeads } from "@/services/round-robin.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/leads/round-robin
 * Ejecuta la auto-asignación por Round-Robin de prospectos sin asesor asignado.
 * Prioriza asesores que hayan marcado entrada hoy y distribuye la carga equitativamente.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    let targetClientId: string | null = null;

    if (user!.isClientUser) {
      targetClientId = user!.clientId;
    } else if (body.clientId && body.clientId !== "all") {
      targetClientId = String(body.clientId);
    }

    const result = await assignUnassignedLeads(user!.organizationId, targetClientId);

    return NextResponse.json({
      success: true,
      processed: result.processed,
      assigned: result.assigned,
      message: result.assigned > 0
        ? `Se asignaron ${result.assigned} prospectos equitativamente mediante Round-Robin.`
        : "No hay prospectos pendientes sin asignar o no hay asesores comerciales disponibles.",
    });
  } catch (error) {
    console.error("POST /api/leads/round-robin error:", error);
    const msg = error instanceof Error ? error.message : "Error al ejecutar Round-Robin en lote.";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
