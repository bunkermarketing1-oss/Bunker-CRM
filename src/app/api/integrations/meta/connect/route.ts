import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/auth";
import { buildMetaAuthUrl, getMetaConfig } from "@/lib/integrations/meta";
import { isCommercialLicenseActive } from "@/lib/license";
import { isSecureConnection, resolveAppBaseUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

const META_STATE_COOKIE = "meta_oauth_state";
const META_REDIRECT_COOKIE = "meta_oauth_redirect_uri";
const META_CLIENT_ID_COOKIE = "meta_oauth_client_id";

/** Inicia el flujo OAuth de Meta: redirige al diálogo de autorización de Facebook. */
export async function GET(req: NextRequest) {
  const baseUrl = resolveAppBaseUrl(req);

  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse || !user) {
      // Si la sesión expiró o no existe, redirigir al login en vez de retornar JSON 401
      const loginUrl = new URL("/login", baseUrl);
      loginUrl.searchParams.set("callbackUrl", "/marketing/integrations");
      return NextResponse.redirect(loginUrl);
    }

    if (!isCommercialLicenseActive()) {
      return NextResponse.redirect(
        new URL(
          "/marketing/integrations?error=" +
            encodeURIComponent("Módulo de integración Meta Ads bloqueado: Licencia empresarial pendiente de activación comercial."),
          baseUrl
        )
      );
    }

    if (!getMetaConfig(req)) {
      return NextResponse.redirect(
        new URL(
          "/marketing/integrations?error=" +
            encodeURIComponent("Meta no está configurado en el servidor (META_APP_ID / META_APP_SECRET)."),
          baseUrl
        )
      );
    }

    const { searchParams } = req.nextUrl;
    const clientIdParam = searchParams.get("clientId");
    const reauth = searchParams.get("reauth") === "true";

    const redirectUri = `${baseUrl}/api/integrations/meta/callback`;
    const state = randomBytes(24).toString("hex");
    const authUrl = buildMetaAuthUrl(state, redirectUri, { reauthenticate: reauth });
    const response = NextResponse.redirect(authUrl);
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

    if (clientIdParam && clientIdParam !== "all") {
      response.cookies.set({
        name: META_CLIENT_ID_COOKIE,
        value: clientIdParam,
        httpOnly: true,
        secure: isSecure,
        sameSite: "lax",
        maxAge: 600,
        path: "/",
      });
    } else {
      response.cookies.delete({ name: META_CLIENT_ID_COOKIE, path: "/" });
    }

    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno al iniciar OAuth de Meta";
    console.error("Meta connect route error:", error);
    return NextResponse.redirect(
      new URL("/marketing/integrations?error=" + encodeURIComponent(`No se pudo conectar con Meta: ${message}`), baseUrl)
    );
  }
}
