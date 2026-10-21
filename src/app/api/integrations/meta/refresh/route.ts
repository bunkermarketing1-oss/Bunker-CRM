import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { isCommercialLicenseActive } from "@/lib/license";
import { ConnectedAccountError, refreshMetaCatalog } from "@/services/integrations.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/integrations/meta/refresh
 * Sincroniza y re-escanea en segundo plano el catálogo de cuentas publicitarias,
 * páginas de Facebook y perfiles de Instagram de la cuenta principal de Meta conectada.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    if (!isCommercialLicenseActive()) {
      return NextResponse.json(
        { success: false, error: "Módulo de Meta bloqueado: Licencia comercial pendiente de activación." },
        { status: 403 }
      );
    }

    const result = await refreshMetaCatalog({
      organizationId: user!.organizationId,
      userId: user!.id,
    });

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof ConnectedAccountError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("POST /api/integrations/meta/refresh error:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar catálogo de Meta." },
      { status: 500 }
    );
  }
}
