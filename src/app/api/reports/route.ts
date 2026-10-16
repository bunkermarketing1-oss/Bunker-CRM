import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { scopeFromUser } from "@/lib/tenant";
import { parseReportRange } from "@/lib/constants/reports";
import { buildCommercialReport, emptyCommercialReport } from "@/services/reports.service";

export const dynamic = "force-dynamic";

/**
 * Reporte comercial y de retorno. Query: days=30|90|180|365 (default 90).
 * ADMIN: toda la organización. CLIENT: solo su empresa (forzado en servidor).
 */
export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  const days = parseReportRange(new URL(req.url).searchParams.get("days"));
  const scope = scopeFromUser(user!);
  if (!scope) return NextResponse.json({ success: true, ...emptyCommercialReport(days) });

  try {
    const report = await buildCommercialReport(scope, days);
    return NextResponse.json({ success: true, ...report });
  } catch (error) {
    console.error("GET /api/reports error:", error);
    return NextResponse.json({ success: false, error: "Error al generar el reporte." }, { status: 500 });
  }
}
