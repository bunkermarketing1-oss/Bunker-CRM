import { NextRequest, NextResponse } from "next/server";
import { isValidCronAuthorization } from "@/lib/cron";
import { syncMetaLeads } from "@/services/meta-leads.service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// 48 h cubre una caída de fin de semana del servidor o del webhook sin recorrer de más.
const BACKFILL_HOURS = 48;

/**
 * Respaldo del webhook de leads de Meta: recupera los que no llegaron y reintenta fallidos.
 * Uso (cron en Dokploy, cada 15 minutos):
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/sync-meta-leads
 */
export async function POST(req: NextRequest) {
  if (!isValidCronAuthorization(req.headers.get("authorization"))) {
    return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const summary = await syncMetaLeads(BACKFILL_HOURS);
    return NextResponse.json({ success: true, ...summary });
  } catch (error) {
    console.error("POST /api/cron/sync-meta-leads error:", error);
    return NextResponse.json({ success: false, error: "Error al sincronizar leads de Meta." }, { status: 500 });
  }
}
