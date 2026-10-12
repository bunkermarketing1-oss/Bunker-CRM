import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");

    const where: any = {
      isDeleted: false,
    };

    if (status && status !== "all") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { companyName: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } },
        { industry: { contains: search } },
      ];
    }

    const clients = await prisma.client.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true } },
        contacts: { where: { isDeleted: false } },
        opportunities: { where: { isDeleted: false }, include: { stage: true } },
        activities: { take: 5, orderBy: { performedAt: "desc" } },
        tasks: { where: { status: "pending" } },
      },
    });

    return NextResponse.json({ success: true, clients });
  } catch (error: any) {
    console.error("GET /api/clients error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, companyName, email, phone, website, industry, revenue, notes, ownerId } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ success: false, error: "El nombre del cliente es obligatorio" }, { status: 400 });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: false, error: "Organización no encontrada" }, { status: 400 });
    }

    const client = await prisma.client.create({
      data: {
        organizationId: org.id,
        name: name.trim(),
        companyName: companyName?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        website: website?.trim() || null,
        industry: industry?.trim() || "General",
        revenue: revenue ? parseFloat(revenue) : 0,
        notes: notes?.trim() || null,
        ownerId: ownerId || null,
        status: "active",
        isDemo: false,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        action: "client_created",
        entityType: "Client",
        entityId: client.id,
        detailsJson: JSON.stringify({ name: client.name, email: client.email }),
      },
    });

    return NextResponse.json({ success: true, client }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/clients error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, companyName, email, phone, website, industry, status, revenue, notes } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID es requerido" }, { status: 400 });
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        name,
        companyName,
        email,
        phone,
        website,
        industry,
        status,
        revenue: revenue !== undefined ? parseFloat(revenue) : undefined,
        notes,
      },
    });

    return NextResponse.json({ success: true, client });
  } catch (error: any) {
    console.error("PUT /api/clients error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID es requerido" }, { status: 400 });
    }

    // Logical deletion
    const client = await prisma.client.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, client });
  } catch (error: any) {
    console.error("DELETE /api/clients error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
