import { NextRequest, NextResponse } from "next/server";
import { isValidCronAuthorization } from "@/lib/cron";
import { runStaleLeadsCheckForAllOrganizations } from "@/services/opportunity-automations.service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Barrido programado de leads estancados en todas las organizaciones con reglas activas.
 * Crea tareas de reactivación; no envía mensajes al lead.
 * Uso (cron en Dokploy, una vez al día, p. ej. 13:00 UTC = 8:00 en Bogotá/Lima):
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/stale-leads
 */
export async function POST(req: NextRequest) {
  if (!isValidCronAuthorization(req.headers.get("authorization"))) {
    return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const summary = await runStaleLeadsCheckForAllOrganizations();
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    console.error("POST /api/cron/stale-leads error:", error);
    return NextResponse.json({ success: false, error: "Error al revisar leads estancados." }, { status: 500 });
  }
}
