import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
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
