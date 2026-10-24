import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { ACCOUNT_STATUS, ACCOUNT_TYPE, INTEGRATION_PROVIDER, INTEGRATION_STATUS } from "@/lib/constants/integrations";
import { getPagesLeadgenStatus } from "@/services/meta-leads.service";
import { getTwilioEnvStatus } from "@/services/integrations.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const integrations = await prisma.integration.findMany({
      where: { organizationId: user!.organizationId },
      include: {
        // Nunca exponer accessTokenEnc al cliente
        connectedAccounts: {
          select: {
            id: true,
            accountName: true,
            accountType: true,
            externalId: true,
            status: true,
            tokenExpiresAt: true,
            lastSyncAt: true,
            clientId: true,
            client: { select: { id: true, name: true } },
            metadataJson: true, // solo para calcular el estado de leads; no se devuelve
          },
          orderBy: [{ accountType: "asc" }, { accountName: "asc" }],
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const pages = integrations
      .flatMap((it) => it.connectedAccounts)
      .filter((acc) => acc.accountType === ACCOUNT_TYPE.FACEBOOK_PAGE);
    const leadgenByPage = await getPagesLeadgenStatus(user!.organizationId, pages);

    const integrationsWithLeadgen = integrations.map((it) => ({
      ...it,
      connectedAccounts: it.connectedAccounts.map(({ metadataJson: _metadataJson, ...acc }) => ({
        ...acc,
        leadgen: acc.accountType === ACCOUNT_TYPE.FACEBOOK_PAGE && acc.externalId ? leadgenByPage.get(acc.externalId) ?? null : null,
      })),
    }));

    const credentialStatus = {
      meta: Boolean(process.env.META_APP_ID && process.env.META_APP_SECRET),
      google_ads: Boolean(process.env.GOOGLE_ADS_CLIENT_ID && process.env.GOOGLE_ADS_DEVELOPER_TOKEN),
      tiktok: Boolean(process.env.TIKTOK_APP_ID && process.env.TIKTOK_APP_SECRET),
      twilio: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN),
    };

    return NextResponse.json({
      success: true,
      integrations: integrationsWithLeadgen,
      credentialStatus,
      twilioEnv: getTwilioEnvStatus(),
    });
  } catch (error: any) {
    console.error("GET /api/integrations error:", error);
    return NextResponse.json({ success: false, error: "Error al consultar integraciones." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { id, action, credentials } = body;

    const integration = await prisma.integration.findFirst({
      where: { id, organizationId: user!.organizationId },
    });

    if (!integration) {
      return NextResponse.json({ success: false, error: "Integración no encontrada en su organización." }, { status: 404 });
    }

    if (action === "disconnect") {
      const updated = await prisma.integration.update({
        where: { id },
        data: {
          status: INTEGRATION_STATUS.DISCONNECTED,
          lastSyncAt: null,
          errorMessage: null,
        },
      });

      await prisma.connectedAccount.deleteMany({
        where: { integrationId: id },
      });

      await prisma.auditLog.create({
        data: {
          organizationId: user!.organizationId,
          userId: user!.id,
          action: "integration_disconnected",
          entityType: "Integration",
          entityId: integration.id,
          detailsJson: JSON.stringify({ provider: integration.provider }),
        },
      });

      return NextResponse.json({
        success: true,
        message: `${integration.name} ha sido desconectada.`,
        integration: updated,
      });
    }

    if (action === "connect") {
      if (integration.provider === INTEGRATION_PROVIDER.META) {
        return NextResponse.json({
          success: false,
          error: "Meta se conecta mediante inicio de sesión con Facebook (OAuth), no con claves manuales.",
          oauthUrl: "/api/integrations/meta/connect",
        }, { status: 400 });
      }

      // Las credenciales de Twilio solo se leen de variables de entorno del servidor
      // (src/lib/integrations/twilio.ts): marcarla "conectada" aquí no habilitaría ningún envío.
      if (integration.provider === INTEGRATION_PROVIDER.TWILIO) {
        return NextResponse.json({
          success: false,
          error: "Twilio se configura con variables de entorno del servidor (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER), no desde este panel.",
        }, { status: 400 });
      }

      const { apiKey, apiSecret, accountId } = credentials || {};

      if (!apiKey || !apiSecret) {
        return NextResponse.json({
          success: false,
          error: "Faltan credenciales obligatorias: Clave API y Clave Secreta.",
        }, { status: 400 });
      }

      if (apiKey.length < 8 || apiSecret.length < 8) {
        return NextResponse.json({
          success: false,
          error: "Las credenciales proporcionadas tienen un formato inválido o son demasiado cortas.",
        }, { status: 400 });
      }

      const updated = await prisma.integration.update({
        where: { id },
        data: {
          status: INTEGRATION_STATUS.CONNECTED,
          lastSyncAt: new Date(),
          errorMessage: null,
        },
      });

      await prisma.connectedAccount.create({
        data: {
          organizationId: user!.organizationId,
          integrationId: id,
          accountName: `Cuenta Oficial (${integration.provider.toUpperCase()})`,
          externalId: accountId || `acc_${Date.now()}`,
          status: ACCOUNT_STATUS.ACTIVE,
        },
      });

      await prisma.auditLog.create({
        data: {
          organizationId: user!.organizationId,
          userId: user!.id,
          action: "integration_connected",
          entityType: "Integration",
          entityId: integration.id,
          detailsJson: JSON.stringify({ provider: integration.provider }),
        },
      });

      return NextResponse.json({
        success: true,
        message: `Conexión autorizada exitosamente con ${integration.name}`,
        integration: updated,
      });
    }

    return NextResponse.json({ success: false, error: "Acción no reconocida." }, { status: 400 });
  } catch (error: any) {
    console.error("POST /api/integrations error:", error);
    return NextResponse.json({ success: false, error: "Error al actualizar integración." }, { status: 500 });
  }
}
