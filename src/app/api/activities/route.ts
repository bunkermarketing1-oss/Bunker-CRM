import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const clientId = searchParams.get("clientId");
    const leadId = searchParams.get("leadId");

    const where: any = {};
    if (type && type !== "all") where.type = type;
    if (clientId) where.clientId = clientId;
    if (leadId) where.leadId = leadId;

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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, title, description, outcome, clientId, leadId, userId } = body;

    if (!title || !type) {
      return NextResponse.json({ success: false, error: "Título y tipo son requeridos" }, { status: 400 });
    }

    const activity = await prisma.activity.create({
      data: {
        type, // call, meeting, email, note, sms
        title: title.trim(),
        description: description?.trim() || null,
        outcome: outcome || "completed",
        clientId: clientId || null,
        leadId: leadId || null,
        userId: userId || null,
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
