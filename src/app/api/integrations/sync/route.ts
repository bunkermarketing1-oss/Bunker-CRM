import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { syncMetaIntegration, type SyncSummary } from "@/lib/integrations/meta-sync";
import { syncTikTokIntegration } from "@/lib/integrations/tiktok-sync";
import { syncConnectedPageConversations } from "@/services/meta-messaging.service";
import { ACCOUNT_STATUS, ACCOUNT_TYPE, INTEGRATION_PROVIDER, INTEGRATION_STATUS } from "@/lib/constants/integrations";
import { isCommercialLicenseActive } from "@/lib/license";

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    if (!isCommercialLicenseActive()) {
      return NextResponse.json({
        success: false,
        error: "Módulo de sincronización publicitaria bloqueado. Requiere activación de licencia comercial.",
      }, { status: 402 });
    }

    const body = await req.json().catch(() => ({}));
    const { id } = body;

    const integration = await prisma.integration.findFirst({
      where: { id, organizationId: user!.organizationId },
    });

    if (!integration) {
      return NextResponse.json({ success: false, error: "Integración no encontrada en su organización." }, { status: 404 });
    }

    if (integration.status !== INTEGRATION_STATUS.CONNECTED) {
      return NextResponse.json({
        success: false,
        error: `No se puede sincronizar: La integración ${integration.name} no está conectada o le faltan credenciales activas.`,
      }, { status: 400 });
    }

    let summary: SyncSummary | null = null;
    if (integration.provider === INTEGRATION_PROVIDER.META) {
      summary = await syncMetaIntegration(integration.id);

      // Sincronizar también conversaciones de páginas e Instagram conectadas
      const pageAccounts = await prisma.connectedAccount.findMany({
        where: {
          integrationId: integration.id,
          accountType: { in: [ACCOUNT_TYPE.FACEBOOK_PAGE, ACCOUNT_TYPE.INSTAGRAM_BUSINESS] },
          status: ACCOUNT_STATUS.ACTIVE,
          accessTokenEnc: { not: null },
        },
        select: { id: true },
      });

      for (const page of pageAccounts) {
        try {
          await syncConnectedPageConversations(page.id);
        } catch (pageSyncErr) {
          console.error(`[SYNC_ROUTE] Error sincronizando mensajes de página ${page.id}:`, pageSyncErr);
        }
      }
    } else if (integration.provider === INTEGRATION_PROVIDER.TIKTOK) {
      summary = await syncTikTokIntegration(integration.id);
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
  } catch (error) {
    console.error("Sync error:", error);
    const message = error instanceof Error ? error.message : "Error durante la sincronización.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
