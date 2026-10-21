import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/auth";
import { buildMetaAuthUrl, getMetaConfig } from "@/lib/integrations/meta";
import { isCommercialLicenseActive } from "@/lib/license";
import { isSecureConnection, resolveAppBaseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

const META_STATE_COOKIE = "meta_oauth_state";
const META_REDIRECT_COOKIE = "meta_oauth_redirect_uri";

/** Inicia el flujo OAuth de Meta: redirige al diálogo de autorización de Facebook. */
export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  const baseUrl = resolveAppBaseUrl(req);

  if (!isCommercialLicenseActive()) {
    return NextResponse.redirect(
      new URL("/marketing/integrations?error=" + encodeURIComponent("Módulo de integración Meta Ads bloqueado: Licencia empresarial pendiente de activación comercial."), baseUrl)
    );
  }

  if (!getMetaConfig(req)) {
    return NextResponse.redirect(
      new URL("/marketing/integrations?error=" + encodeURIComponent("Meta no está configurado en el servidor (META_APP_ID / META_APP_SECRET)."), baseUrl)
    );
  }

  const redirectUri = `${baseUrl}/api/integrations/meta/callback`;
  const state = randomBytes(24).toString("hex");
  const response = NextResponse.redirect(buildMetaAuthUrl(state, redirectUri));
  const isSecure = isSecureConnection(baseUrl);

  response.cookies.set({
    name: META_STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  response.cookies.set({
    name: META_REDIRECT_COOKIE,
    value: redirectUri,
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
