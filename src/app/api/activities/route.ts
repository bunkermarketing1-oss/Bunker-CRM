import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { clientBelongsToOrg, leadBelongsToOrg } from "@/lib/validation-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const clientId = searchParams.get("clientId");
    const leadId = searchParams.get("leadId");

    const where: any = {};

    if (clientId) {
      const belongs = await clientBelongsToOrg(user!.organizationId, clientId);
      if (!belongs) {
        return NextResponse.json(
          { success: false, error: "Cliente no pertenece a su organización." },
          { status: 404 }
        );
      }
      where.clientId = clientId;
    } else if (leadId) {
      const belongs = await leadBelongsToOrg(user!.organizationId, leadId);
      if (!belongs) {
        return NextResponse.json(
          { success: false, error: "Prospecto no pertenece a su organización." },
          { status: 404 }
        );
      }
      where.leadId = leadId;
    } else {
      where.OR = [
        { client: { organizationId: user!.organizationId } },
        { lead: { organizationId: user!.organizationId } },
        { user: { memberships: { some: { organizationId: user!.organizationId } } } },
      ];
    }

    if (type && type !== "all") where.type = type;

    const activities = await prisma.activity.findMany({
      where,
      orderBy: { performedAt: "desc" },
      include: {
        user: { select: { id: true, name: true, role: true } },
        client: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
      },
      take: 50,
    });

    return NextResponse.json({ success: true, activities });
  } catch (error: any) {
    console.error("GET /api/activities error:", error);
    return NextResponse.json({ success: false, error: "Error al consultar actividades." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { type, title, description, outcome, clientId, leadId } = body;

    if (!title || !type) {
      return NextResponse.json({ success: false, error: "Título y tipo son requeridos." }, { status: 400 });
    }

    // Verify client or lead belongs to user's org if provided
    if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, organizationId: user!.organizationId },
      });
      if (!client) {
        return NextResponse.json({ success: false, error: "Cliente no pertenece a su organización." }, { status: 404 });
      }
    }

    if (leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId: user!.organizationId },
      });
      if (!lead) {
        return NextResponse.json({ success: false, error: "Prospecto no pertenece a su organización." }, { status: 404 });
      }
    }

    const activity = await prisma.activity.create({
      data: {
        type, // call, meeting, email, note, sms
        title: title.trim(),
        description: description?.trim() || null,
        outcome: outcome || "completed",
        clientId: clientId || null,
        leadId: leadId || null,
        userId: user!.id,
      },
      include: {
        user: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, activity }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/activities error:", error);
    return NextResponse.json({ success: false, error: "Error al registrar actividad." }, { status: 500 });
  }
}
