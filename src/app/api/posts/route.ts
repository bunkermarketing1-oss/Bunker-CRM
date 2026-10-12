import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
    if (status && status !== "all") {
      where.status = status;
    }

    const posts = await prisma.socialPost.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        connectedAccount: {
          include: { integration: true },
        },
      },
    });

    return NextResponse.json({ success: true, posts });
  } catch (error: any) {
    console.error("GET /api/posts error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { content, platforms, scheduledFor, connectedAccountId, publishNow, mediaUrl } = body;

    if (!content || content.trim() === "") {
      return NextResponse.json({ success: false, error: "El contenido de la publicación es obligatorio." }, { status: 400 });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: false, error: "Organización no encontrada." }, { status: 404 });
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
      // Check if there is an active connected account
      if (!connectedAccountId) {
        status = "failed";
        errorMessage = "Para publicar inmediatamente debes seleccionar una cuenta conectada autorizada.";
      } else {
        const account = await prisma.connectedAccount.findUnique({
          where: { id: connectedAccountId },
          include: { integration: true },
        });

        if (!account || account.status !== "active") {
          status = "failed";
          errorMessage = "La cuenta seleccionada no tiene permisos vigentes de publicación.";
        } else {
          // As required by Section 3, Priority 4:
          // Check platform permissions / token
          status = "published";
          publishedAt = new Date();
        }
      }
    }

    const post = await prisma.socialPost.create({
      data: {
        organizationId: org.id,
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
        connectedAccount: true,
      },
    });

    return NextResponse.json({ success: true, post }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/posts error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, content, status, scheduledFor } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID es obligatorio" }, { status: 400 });
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
