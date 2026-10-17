import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { clientBelongsToOrg } from "@/lib/validation-helpers";
import { encryptSecret } from "@/lib/crypto";
import {
  ACCOUNT_STATUS,
  ACCOUNT_TYPE,
  INTEGRATION_PROVIDER,
  INTEGRATION_STATUS,
  type AccountType,
  type IntegrationProvider,
} from "@/lib/constants/integrations";

export const dynamic = "force-dynamic";

/**
 * POST /api/integrations/accounts
 * Conecta o registra manualmente una cuenta publicitaria o página social
 * (Facebook, Instagram, TikTok, Google Ads) y permite vincularla directamente
 * a un cliente o dejarla asignada al Portafolio BM de la Agencia.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const {
      provider = INTEGRATION_PROVIDER.META,
      accountType = ACCOUNT_TYPE.META_AD_ACCOUNT,
      accountName,
      externalId,
      clientId = null,
      accessToken = null,
    } = body;

    if (!accountName || typeof accountName !== "string" || !accountName.trim()) {
      return NextResponse.json(
        { success: false, error: "El nombre de la cuenta es requerido (ej. Workshop Carrito Naranja)." },
        { status: 400 }
      );
    }

    if (!externalId || typeof externalId !== "string" || !externalId.trim()) {
      return NextResponse.json(
        { success: false, error: "El ID o identificador de la cuenta es requerido (ej. 5194920503935574)." },
        { status: 400 }
      );
    }

    // Validar cliente si se especificó
    let targetClientName: string | null = null;
    if (clientId) {
      const belongs = await clientBelongsToOrg(user!.organizationId, clientId);
      if (!belongs) {
        return NextResponse.json(
          { success: false, error: "El cliente seleccionado no pertenece a su organización." },
          { status: 404 }
        );
      }
      const client = await prisma.client.findUnique({
        where: { id: clientId },
        select: { name: true },
      });
      targetClientName = client?.name || null;
    }

    // Buscar o inicializar la integración para este proveedor
    let integration = await prisma.integration.findFirst({
      where: {
        organizationId: user!.organizationId,
        provider: provider as IntegrationProvider,
      },
    });

    if (!integration) {
      const providerNames: Record<string, string> = {
        meta: "Meta for Business (Facebook & Instagram)",
        tiktok: "TikTok for Business",
        google_ads: "Google Ads",
      };

      integration = await prisma.integration.create({
        data: {
          organizationId: user!.organizationId,
          provider: provider as IntegrationProvider,
          name: providerNames[provider] || `${provider.toUpperCase()} Integration`,
          status: INTEGRATION_STATUS.CONNECTED,
          description: "Cuentas publicitarias y páginas conectadas para captura de leads y métricas.",
        },
      });
    } else if (integration.status !== INTEGRATION_STATUS.CONNECTED) {
      await prisma.integration.update({
        where: { id: integration.id },
        data: { status: INTEGRATION_STATUS.CONNECTED, errorMessage: null },
      });
    }

    // Cifrar el token si se suministró
    const cleanExternalId = externalId.trim();
    const tokenEnc = accessToken && typeof accessToken === "string" && accessToken.trim()
      ? encryptSecret(accessToken.trim())
      : null;

    // Upsert de la cuenta conectada
    const connectedAccount = await prisma.connectedAccount.upsert({
      where: {
        integrationId_accountType_externalId: {
          integrationId: integration.id,
          accountType: accountType as AccountType,
          externalId: cleanExternalId,
        },
      },
      create: {
        organizationId: user!.organizationId,
        integrationId: integration.id,
        clientId: clientId || null,
        accountName: accountName.trim(),
        accountType: accountType as AccountType,
        externalId: cleanExternalId,
        status: ACCOUNT_STATUS.ACTIVE,
        accessTokenEnc: tokenEnc,
      },
      update: {
        accountName: accountName.trim(),
        clientId: clientId || null,
        status: ACCOUNT_STATUS.ACTIVE,
        ...(tokenEnc ? { accessTokenEnc: tokenEnc } : {}),
      },
      include: {
        client: { select: { id: true, name: true } },
      },
    });

    // Registrar en auditoría
    await prisma.auditLog.create({
      data: {
        organizationId: user!.organizationId,
        userId: user!.id,
        action: "connected_account_linked",
        entityType: "ConnectedAccount",
        entityId: connectedAccount.id,
        detailsJson: JSON.stringify({
          provider,
          accountType,
          accountName: connectedAccount.accountName,
          externalId: cleanExternalId,
          clientId,
          clientName: targetClientName,
        }),
      },
    });

    return NextResponse.json({
      success: true,
      account: connectedAccount,
      message: clientId && targetClientName
        ? `Cuenta "${connectedAccount.accountName}" (${cleanExternalId}) vinculada exitosamente al cliente ${targetClientName}.`
        : `Cuenta "${connectedAccount.accountName}" vinculada exitosamente al Portafolio BM de la Agencia.`,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al conectar la cuenta";
    console.error("POST /api/integrations/accounts error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
