import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const teamMembers = await prisma.user.findMany({
      where: {
        memberships: {
          some: {
            organizationId: user!.organizationId,
          },
        },
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, users: teamMembers });
  } catch (error: any) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { success: false, error: "Error al consultar equipo comercial." },
      { status: 500 }
    );
  }
}
