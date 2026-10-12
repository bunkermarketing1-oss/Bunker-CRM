import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { prisma } from "@/lib/prisma";
import { AUTH_COOKIE_NAME, AUTH_COOKIE_MAX_AGE } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email, password } = body;

    if (!email || !password || typeof email !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Correo electrónico y contraseña requeridos." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Authenticate with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: password,
    });

    if (error || !data.session || !data.user) {
      // Generic error response to prevent user enumeration
      return NextResponse.json(
        { success: false, error: "Credenciales inválidas o acceso no autorizado." },
        { status: 401 }
      );
    }

    // Verify user status in Prisma database
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { supabaseAuthId: data.user.id },
          { email: cleanEmail },
        ],
      },
      include: {
        memberships: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json(
        { success: false, error: "El usuario no cuenta con un perfil comercial asignado." },
        { status: 403 }
      );
    }

    if (!dbUser.isActive) {
      return NextResponse.json(
        { success: false, error: "Cuenta de usuario desactivada. Contacte a la dirección." },
        { status: 403 }
      );
    }

    // Link supabaseAuthId if not yet linked
    if (!dbUser.supabaseAuthId) {
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { supabaseAuthId: data.user.id },
      });
    }

    const organization = dbUser.memberships[0]?.organization;

    // Create response with secure HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        role: dbUser.role,
        organization: organization ? { id: organization.id, name: organization.name } : null,
      },
    });

    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: data.session.access_token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: AUTH_COOKIE_MAX_AGE,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("Error en POST /api/auth/login:", err);
    return NextResponse.json(
      { success: false, error: "Error interno al procesar el inicio de sesión." },
      { status: 500 }
    );
  }
}
