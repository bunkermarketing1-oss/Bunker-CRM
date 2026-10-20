import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/auth";
import { buildMetaAuthUrl, getMetaConfig } from "@/lib/integrations/meta";

export const dynamic = "force-dynamic";

const META_STATE_COOKIE = "meta_oauth_state";
const META_REDIRECT_COOKIE = "meta_oauth_redirect_uri";

/** Inicia el flujo OAuth de Meta: redirige al diálogo de autorización de Facebook. */
export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  if (!getMetaConfig()) {
    return NextResponse.redirect(
      new URL("/marketing/integrations?error=" + encodeURIComponent("Meta no está configurado en el servidor (META_APP_ID / META_APP_SECRET)."), req.url)
    );
  }

  // Determinar la URL base exacta de la solicitud (compatible con Dokploy / proxies inversos)
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || (req.headers.get("x-forwarded-ssl") === "on" ? "https" : null);
  const host = forwardedHost || req.headers.get("host") || req.nextUrl.host;
  const proto = forwardedProto || (req.nextUrl.protocol ? req.nextUrl.protocol.replace(":", "") : "https");
  const requestOrigin = `${proto}://${host}`;

  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  const baseUrl = (envUrl && !envUrl.includes("localhost") ? envUrl : requestOrigin).replace(/\/$/, "");
  const redirectUri = `${baseUrl}/api/integrations/meta/callback`;

  const state = randomBytes(24).toString("hex");
  const response = NextResponse.redirect(buildMetaAuthUrl(state, redirectUri));
  const isSecure = proto === "https" || req.nextUrl.protocol === "https:";

  response.cookies.set({
    name: META_STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/integrations/meta",
  });

  response.cookies.set({
    name: META_REDIRECT_COOKIE,
    value: redirectUri,
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    maxAge: 600,
    path: "/api/integrations/meta",
  });

  return response;
}
