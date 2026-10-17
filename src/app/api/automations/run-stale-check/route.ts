import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { executeStaleLeadsCheck } from "@/services/automations.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/automations/run-stale-check
 * Ejecuta el barrido de prospectos estancados (> 14 días sin actividad)
 * y genera automáticamente las tareas de reactivación comercial.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const result = await executeStaleLeadsCheck(user!.organizationId, user!.id);

    return NextResponse.json({
      success: true,
      result,
      message: `Escaneo completado: ${result.leadsAnalyzed} prospectos analizados, ${result.tasksCreated} tareas de reactivación creadas.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al ejecutar chequeo de prospectos estancados";
    console.error("POST /api/automations/run-stale-check error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
