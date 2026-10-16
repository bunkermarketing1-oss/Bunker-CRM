import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/auth";
import { buildMetaAuthUrl, getMetaConfig } from "@/lib/integrations/meta";

export const dynamic = "force-dynamic";

const META_STATE_COOKIE = "meta_oauth_state";

/** Inicia el flujo OAuth de Meta: redirige al diálogo de autorización de Facebook. */
export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  if (!getMetaConfig()) {
    return NextResponse.redirect(
      new URL("/marketing/integrations?error=" + encodeURIComponent("Meta no está configurado en el servidor (META_APP_ID / META_APP_SECRET)."), req.url)
    );
  }

  const state = randomBytes(24).toString("hex");
  const response = NextResponse.redirect(buildMetaAuthUrl(state));
  response.cookies.set({
    name: META_STATE_COOKIE,
    value: state,
    httpOnly: true,
    secure: req.nextUrl.protocol === "https:",
    sameSite: "lax",
    maxAge: 600,
    path: "/api/integrations/meta",
  });
  return response;
}
