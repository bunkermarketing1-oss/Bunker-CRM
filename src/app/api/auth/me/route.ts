import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);

    if (!user) {
      return NextResponse.json(
        { success: false, authenticated: false, error: "No autenticado." },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clientId: user.clientId,
        clientName: user.clientName,
        clientLogoUrl: user.clientLogoUrl,
        isClientUser: user.isClientUser,
        isClientOwner: user.isClientOwner,
        organizationId: user.organizationId,
        organizationName: user.organizationName,
        organizationSlug: user.organizationSlug,
      },
    });
  } catch (err: any) {
    console.error("Error en GET /api/auth/me:", err);
    return NextResponse.json(
      { success: false, authenticated: false, error: "Error al verificar sesión." },
      { status: 500 }
    );
  }
}
