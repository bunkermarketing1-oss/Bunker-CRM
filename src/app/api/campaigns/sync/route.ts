import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { clientBelongsToOrg } from "@/lib/validation-helpers";
import { INTEGRATION_PROVIDER, INTEGRATION_STATUS } from "@/lib/constants/integrations";
import { syncMetaIntegration } from "@/lib/integrations/meta-sync";
import { isCommercialLicenseActive } from "@/lib/license";

export const dynamic = "force-dynamic";

/**
 * POST /api/campaigns/sync
 * Sincroniza bajo demanda las campañas publicitarias y métricas de Meta Ads.
 * - ADMIN: Puede sincronizar toda la agencia o una marca específica (?clientId=).
 * - CLIENT: Solo sincroniza las cuentas asociadas a su empresa.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    if (!isCommercialLicenseActive()) {
      return NextResponse.json(
        {
          success: false,
          error: "Módulo de Campañas Publicitarias en pausa. Licencia empresarial pendiente de activación comercial.",
        },
        { status: 402 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const requestedClientId = body.clientId;

    let targetClientId: string | null = null;
    if (user!.isClientUser) {
      if (!user!.clientId) {
        return NextResponse.json(
          { success: false, error: "Usuario cliente no tiene empresa asociada." },
          { status: 403 }
        );
      }
      targetClientId = user!.clientId;
    } else if (requestedClientId && requestedClientId !== "all") {
      const belongs = await clientBelongsToOrg(user!.organizationId, requestedClientId);
      if (!belongs) {
        return NextResponse.json(
          { success: false, error: "Cliente no pertenece a su organización." },
          { status: 404 }
        );
      }
      targetClientId = requestedClientId;
    }

    const metaIntegration = await prisma.integration.findFirst({
      where: {
        organizationId: user!.organizationId,
        provider: INTEGRATION_PROVIDER.META,
        status: INTEGRATION_STATUS.CONNECTED,
      },
    });

    if (!metaIntegration) {
      return NextResponse.json(
        {
          success: false,
          error: "No hay una integración activa de Meta conectada en la organización.",
        },
        { status: 404 }
      );
    }

    const summary = await syncMetaIntegration(metaIntegration.id);

    await prisma.integration.update({
      where: { id: metaIntegration.id },
      data: { lastSyncAt: new Date(), errorMessage: summary.errors.length > 0 ? summary.errors.join(" | ") : null },
    });

    const clientMsg = targetClientId ? ` para la marca seleccionada` : "";
    return NextResponse.json({
      success: true,
      summary,
      message: `Sincronización completada${clientMsg}: ${summary.campaigns} campaña(s) y ${summary.metricDays} día(s) de métricas de ${summary.accounts} cuenta(s).`,
    });
  } catch (error) {
    console.error("POST /api/campaigns/sync error:", error);
    const message = error instanceof Error ? error.message : "Error durante la sincronización de campañas.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
