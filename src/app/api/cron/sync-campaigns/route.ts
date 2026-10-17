import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isValidCronAuthorization } from "@/lib/cron";
import { syncMetaIntegration } from "@/lib/integrations/meta-sync";
import { INTEGRATION_PROVIDER, INTEGRATION_STATUS } from "@/lib/constants/integrations";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Sincronización programada de campañas de todas las organizaciones.
 * Uso (cron en Dokploy, p. ej. cada 6 horas):
 *   curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/cron/sync-campaigns
 */
export async function POST(req: NextRequest) {
  if (!isValidCronAuthorization(req.headers.get("authorization"))) {
    return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  }

  const integrations = await prisma.integration.findMany({
    where: { provider: INTEGRATION_PROVIDER.META, status: INTEGRATION_STATUS.CONNECTED },
  });

  const results = [];
  for (const integration of integrations) {
    try {
      const summary = await syncMetaIntegration(integration.id);
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          lastSyncAt: new Date(),
          errorMessage: summary.errors.length ? summary.errors.join(" | ") : null,
        },
      });
      results.push({ integrationId: integration.id, provider: integration.provider, ...summary });
    } catch (err: any) {
      console.error(`Cron sync error (${integration.id}):`, err);
      results.push({ integrationId: integration.id, provider: integration.provider, errors: [err.message] });
    }
  }

  return NextResponse.json({ success: true, results });
}
