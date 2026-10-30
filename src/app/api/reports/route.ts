import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { scopeFromUser } from "@/lib/tenant";
import { clientBelongsToOrg } from "@/lib/validation-helpers";
import { parseReportRange } from "@/lib/constants/reports";
import { buildCommercialReport, emptyCommercialReport } from "@/services/reports.service";

export const dynamic = "force-dynamic";

/**
 * Reporte comercial y de retorno. Query: days=30|90|180|365 (default 90) & clientId (opcional).
 * ADMIN: toda la organización o filtrado por cliente. CLIENT: solo su empresa (forzado en servidor).
 */
export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  const searchParams = new URL(req.url).searchParams;
  const days = parseReportRange(searchParams.get("days"));
  let scope = scopeFromUser(user!);
  if (!scope) return NextResponse.json({ success: true, ...emptyCommercialReport(days) });

  const clientId = searchParams.get("clientId");
  if (!user!.isClientUser && clientId && clientId !== "all") {
    const belongs = await clientBelongsToOrg(user!.organizationId, clientId);
    if (!belongs) {
      return NextResponse.json(
        { success: false, error: "Cliente no pertenece a su organización." },
        { status: 404 }
      );
    }
    scope = { organizationId: user!.organizationId, clientId };
  }

  try {
    const report = await buildCommercialReport(scope, days);
    return NextResponse.json({ success: true, ...report });
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json({ success: false, error: "Error al generar el reporte." }, { status: 500 });
  }
}
