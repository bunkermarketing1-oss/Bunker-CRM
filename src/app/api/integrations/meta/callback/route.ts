import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { exchangeMetaCode, listMetaAdAccounts, listMetaPages } from "@/lib/integrations/meta";
import { syncMetaIntegration } from "@/lib/integrations/meta-sync";
import { subscribeMetaPagesToLeadgen } from "@/services/meta-leads.service";
import { ACCOUNT_STATUS, ACCOUNT_TYPE, INTEGRATION_PROVIDER, INTEGRATION_STATUS, type AccountType } from "@/lib/constants/integrations";

import { isCommercialLicenseActive } from "@/lib/license";

import { resolveAppBaseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

const META_STATE_COOKIE = "meta_oauth_state";
const META_REDIRECT_COOKIE = "meta_oauth_redirect_uri";

function backToIntegrations(req: NextRequest, params: Record<string, string>) {
  const baseUrl = resolveAppBaseUrl(req);
  const url = new URL("/marketing/integrations", baseUrl);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const response = NextResponse.redirect(url);
  response.cookies.delete({ name: META_STATE_COOKIE, path: "/" });
  response.cookies.delete({ name: META_REDIRECT_COOKIE, path: "/" });
  response.cookies.delete({ name: META_STATE_COOKIE, path: "/api/integrations/meta" });
  response.cookies.delete({ name: META_REDIRECT_COOKIE, path: "/api/integrations/meta" });
  return response;
}

/** Callback OAuth de Meta: guarda cuentas publicitarias, páginas e Instagram con tokens cifrados. */
export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  if (!isCommercialLicenseActive()) {
    return backToIntegrations(req, { error: "Módulo bloqueado: Licencia empresarial pendiente de activación comercial." });
  }

  const { searchParams } = req.nextUrl;
  const expectedState = req.cookies.get(META_STATE_COOKIE)?.value;
  const redirectUri = req.cookies.get(META_REDIRECT_COOKIE)?.value;

  if (searchParams.get("error")) {
    return backToIntegrations(req, { error: searchParams.get("error_description") || "Autorización cancelada en Meta." });
  }

  const code = searchParams.get("code");
  if (!code || !expectedState || searchParams.get("state") !== expectedState) {
    return backToIntegrations(req, { error: "Solicitud OAuth inválida o expirada. Intenta conectar de nuevo." });
  }

  try {
    let integration = await prisma.integration.findFirst({
      where: { organizationId: user!.organizationId, provider: INTEGRATION_PROVIDER.META },
    });
    if (!integration) {
      integration = await prisma.integration.create({
        data: {
          organizationId: user!.organizationId,
          provider: INTEGRATION_PROVIDER.META,
          name: "Meta for Business (Facebook & Instagram)",
          description: "Páginas oficiales, catálogo de anuncios y sincronización de leads de Meta Ads.",
        },
      });
    }

    const { accessToken, expiresAt, grantedScopes } = await exchangeMetaCode(code, redirectUri);
    const [adAccounts, pages] = await Promise.all([listMetaAdAccounts(accessToken), listMetaPages(accessToken)]);

    const userTokenEnc = encryptSecret(accessToken);
    const scopes = grantedScopes.join(",");
    const base = { organizationId: user!.organizationId, integrationId: integration.id, scopes, status: ACCOUNT_STATUS.ACTIVE };

    const upsertAccount = (
      accountType: AccountType,
      externalId: string,
      data: { accountName: string; accessTokenEnc: string; tokenExpiresAt: Date | null; metadataJson: string | null }
    ) =>
      prisma.connectedAccount.upsert({
        where: { integrationId_accountType_externalId: { integrationId: integration!.id, accountType, externalId } },
        create: { ...base, accountType, externalId, ...data },
        update: { ...base, ...data },
      });

    for (const acc of adAccounts) {
      await upsertAccount(ACCOUNT_TYPE.META_AD_ACCOUNT, acc.id, {
        accountName: acc.name,
        accessTokenEnc: userTokenEnc,
        tokenExpiresAt: expiresAt,
        metadataJson: JSON.stringify({ currency: acc.currency, accountStatus: acc.account_status }),
      });
    }

    // Si el usuario no tiene cuentas publicitarias aún, se guarda el token de usuario en un registro base
    // para permitir re-escanear el catálogo en el futuro sin forzar otro login OAuth.
    if (adAccounts.length === 0) {
      await upsertAccount(ACCOUNT_TYPE.META_AD_ACCOUNT, "meta_master_user", {
        accountName: "Usuario Administrador Meta",
        accessTokenEnc: userTokenEnc,
        tokenExpiresAt: expiresAt,
        metadataJson: JSON.stringify({ isMasterToken: true }),
      });
    }

    for (const page of pages) {
      // Los tokens de página derivados de un token de larga duración no expiran.
      const pageTokenEnc = encryptSecret(page.access_token);
      await upsertAccount(ACCOUNT_TYPE.FACEBOOK_PAGE, page.id, {
        accountName: page.name,
        accessTokenEnc: pageTokenEnc,
        tokenExpiresAt: null,
        metadataJson: null,
      });
      if (page.instagram_business_account) {
        const ig = page.instagram_business_account;
        await upsertAccount(ACCOUNT_TYPE.INSTAGRAM_BUSINESS, ig.id, {
          accountName: ig.username ? `@${ig.username}` : `Instagram de ${page.name}`,
          accessTokenEnc: pageTokenEnc,
          tokenExpiresAt: null,
          metadataJson: JSON.stringify({ pageId: page.id }),
        });
      }
    }

    await prisma.integration.update({
      where: { id: integration.id },
      data: { status: INTEGRATION_STATUS.CONNECTED, errorMessage: null },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user!.organizationId,
        userId: user!.id,
        action: "integration_connected",
        entityType: "Integration",
        entityId: integration.id,
        detailsJson: JSON.stringify({
          provider: INTEGRATION_PROVIDER.META,
          adAccounts: adAccounts.length,
          pages: pages.length,
          scopes: grantedScopes,
        }),
      },
    });

    // Primera sincronización inmediata de campañas; los errores quedan en la cuenta y no bloquean la conexión.
    const summary = await syncMetaIntegration(integration.id);
    await prisma.integration.update({ where: { id: integration.id }, data: { lastSyncAt: new Date() } });

    // Sin esta suscripción Meta no envía los leads de las páginas al webhook.
    const leadgen = await subscribeMetaPagesToLeadgen(integration.id);

    return backToIntegrations(req, {
      connected: INTEGRATION_PROVIDER.META,
      message: `Meta conectado: ${adAccounts.length} cuenta(s) publicitaria(s), ${pages.length} página(s), ${summary.campaigns} campaña(s) sincronizada(s), ${leadgen.pages - leadgen.errors.length} página(s) recibiendo leads.`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    console.error("Meta OAuth callback error:", err);
    return backToIntegrations(req, { error: `No se pudo completar la conexión con Meta: ${message}` });
  }
}
