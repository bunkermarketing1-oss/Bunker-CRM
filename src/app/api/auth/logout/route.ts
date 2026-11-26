import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
  const isHttps =
    req.headers.get("x-forwarded-proto") === "https" ||
    req.nextUrl.protocol === "https:";

  const loginUrl = new URL("/login", req.url);
  const response = NextResponse.redirect(loginUrl);

  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    secure: isHttps,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}

export async function POST(req: NextRequest) {
  try {
    // Revoke the session in Supabase Auth so a copied token cannot be reused after logout.
    // Best effort: failing to revoke must never prevent the cookie from being cleared.
    const authHeader = req.headers.get("authorization");
    const token =
      authHeader && authHeader.startsWith("Bearer ")
        ? authHeader.substring(7).trim()
        : req.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (token) {
      try {
        // scope "local": only this session is revoked (other devices keep working).
        await getSupabaseAdmin().auth.admin.signOut(token, "local");
      } catch (revokeError) {
        console.error("No se pudo revocar la sesión en Supabase:", revokeError);
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "Sesión cerrada correctamente.",
    });

    const isHttps =
      req.headers.get("x-forwarded-proto") === "https" ||
      req.nextUrl.protocol === "https:";

    // Clear session cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: "",
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("Error en POST /api/auth/logout:", err);
    return NextResponse.json(
      { success: false, error: "Error al cerrar sesión." },
      { status: 500 }
    );
  }
}
