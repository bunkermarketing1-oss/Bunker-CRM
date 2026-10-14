import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {
      organizationId: user!.organizationId,
    };
    if (status && status !== "all") {
      where.status = status;
    }

    const posts = await prisma.socialPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        connectedAccount: {
          // Nunca exponer accessTokenEnc al cliente
          select: { id: true, accountName: true, accountType: true, status: true, integration: true },
        },
      },
    });

    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    console.error("GET /api/posts error:", error);
    return NextResponse.json({ success: false, error: "Error al consultar publicaciones." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { content, platforms, scheduledFor, connectedAccountId, publishNow, mediaUrl } = body;

    if (!content || typeof content !== "string" || content.trim() === "") {
      return NextResponse.json({ success: false, error: "El contenido de la publicación es obligatorio." }, { status: 400 });
    }

    let status = "draft";
    let scheduledDate = null;
    let publishedAt = null;
    let errorMessage = null;

    if (scheduledFor) {
      status = "scheduled";
      scheduledDate = new Date(scheduledFor);
    }

    if (publishNow) {
      if (!connectedAccountId) {
        status = "failed";
        errorMessage = "Para publicar inmediatamente debes seleccionar una cuenta conectada autorizada.";
      } else {
        const account = await prisma.connectedAccount.findFirst({
          where: { id: connectedAccountId, organizationId: user!.organizationId },
          include: { integration: true },
        });

        if (!account || account.status !== "active") {
          status = "failed";
          errorMessage = "La cuenta seleccionada no tiene permisos vigentes de publicación.";
        } else {
          status = "published";
          publishedAt = new Date();
        }
      }
    }

    const post = await prisma.socialPost.create({
      data: {
        organizationId: user!.organizationId,
        connectedAccountId: connectedAccountId || null,
        content: content.trim(),
        platformsJson: JSON.stringify(platforms || ["instagram", "facebook"]),
        mediaUrlsJson: mediaUrl ? JSON.stringify([mediaUrl]) : null,
        scheduledFor: scheduledDate,
        publishedAt,
        status,
        errorMessage,
        isDemo: false,
      },
      include: {
        connectedAccount: { select: { id: true, accountName: true, accountType: true, status: true } },
      },
    });

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/posts error:", error);
    return NextResponse.json({ success: false, error: "Error al crear publicación." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { id, content, status, scheduledFor } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID es obligatorio." }, { status: 400 });
    }

    const existing = await prisma.socialPost.findFirst({
      where: { id, organizationId: user!.organizationId },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Publicación no encontrada en su organización." }, { status: 404 });
    }

    const data: any = {};
    if (content) data.content = content.trim();
    if (status) data.status = status;
    if (scheduledFor) data.scheduledFor = new Date(scheduledFor);

    const post = await prisma.socialPost.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    console.error("PUT /api/posts error:", error);
    return NextResponse.json({ success: false, error: "Error al actualizar publicación." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID es obligatorio." }, { status: 400 });
    }

    const existing = await prisma.socialPost.findFirst({
      where: { id, organizationId: user!.organizationId },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Publicación no encontrada en su organización." }, { status: 404 });
    }

    const post = await prisma.socialPost.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, post });
  } catch (error: any) {
    console.error("DELETE /api/posts error:", error);
    return NextResponse.json({ success: false, error: "Error al eliminar publicación." }, { status: 500 });
  }
}
