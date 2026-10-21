import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { syncMetaLeads } from "@/services/meta-leads.service";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const DEFAULT_SYNC_HOURS = 8760; // 1 año (365 días) de histórico de formularios Meta

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const hours = typeof body.hours === "number" && body.hours > 0 ? body.hours : DEFAULT_SYNC_HOURS;

    const summary = await syncMetaLeads(hours, user!.organizationId);

    return NextResponse.json({
      success: true,
      message: `Sincronización completada. Se revisaron ${summary.pages} página(s) y se recuperaron ${summary.recovered} prospectos.`,
      summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al sincronizar leads.";
    console.error("POST /api/leads/sync error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
