import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/services/settings.service";

export const dynamic = "force-dynamic";

/** Configuración de la agencia y chequeo de variables de entorno. Solo ADMIN. */
export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const settings = await getSettings(user!.organizationId);
    return NextResponse.json({ success: true, ...settings });
  } catch (error) {
    console.error("GET /api/settings error:", error);
    return NextResponse.json({ success: false, error: "Error al cargar la configuración." }, { status: 500 });
  }
}
