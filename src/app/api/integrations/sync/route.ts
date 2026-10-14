import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { syncMetaIntegration, type SyncSummary } from "@/lib/integrations/meta-sync";

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { id } = body;

    const integration = await prisma.integration.findFirst({
      where: { id, organizationId: user!.organizationId },
    });

    if (!integration) {
      return NextResponse.json({ success: false, error: "Integración no encontrada en su organización." }, { status: 404 });
    }

    if (integration.status !== "connected") {
      return NextResponse.json({
        success: false,
        error: `No se puede sincronizar: La integración ${integration.name} no está conectada o le faltan credenciales activas.`,
      }, { status: 400 });
    }

    let summary: SyncSummary | null = null;
    if (integration.provider === "meta") {
      summary = await syncMetaIntegration(integration.id);
    }

    const syncError = summary && summary.errors.length > 0 ? summary.errors.join(" | ") : null;
    const updated = await prisma.integration.update({
      where: { id },
      data: {
        lastSyncAt: new Date(),
        errorMessage: syncError,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user!.organizationId,
        userId: user!.id,
        action: "integration_synced",
        entityType: "Integration",
        entityId: integration.id,
        detailsJson: JSON.stringify({ provider: integration.provider, timestamp: new Date(), summary }),
      },
    });

    if (summary && summary.accounts === 0 && summary.errors.length > 0) {
      return NextResponse.json({ success: false, error: `Sincronización fallida: ${syncError}` }, { status: 502 });
    }

    return NextResponse.json({
      success: true,
      summary,
      message: summary
        ? `Sincronizadas ${summary.campaigns} campaña(s) y ${summary.metricDays} día(s) de métricas de ${summary.accounts} cuenta(s).` +
          (syncError ? ` Con errores: ${syncError}` : "")
        : `Sincronización completada exitosamente con ${integration.name}.`,
      lastSyncAt: updated.lastSyncAt,
    });
  } catch (error: any) {
    console.error("Sync error:", error);
    return NextResponse.json({ success: false, error: "Error durante la sincronización." }, { status: 500 });
  }
}
