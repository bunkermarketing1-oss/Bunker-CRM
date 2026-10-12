import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const source = searchParams.get("source");

    const where: any = {
      isDeleted: false,
    };

    if (status && status !== "all") {
      where.status = status;
    }

    if (source && source !== "all") {
      where.source = source;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { companyName: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    const leads = await prisma.lead.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json({ success: true, leads });
  } catch (error: any) {
    console.error("GET /api/leads error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, companyName, email, phone, source, estimatedValue, ownerId } = body;

    if (!name || name.trim() === "") {
      return NextResponse.json({ success: false, error: "El nombre es obligatorio." }, { status: 400 });
    }

    // Default to first organization
    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: false, error: "Organización no encontrada." }, { status: 400 });
    }

    // Auto calculate initial AI qualification score based on info completeness
    let qualification = 50;
    if (email && phone) qualification += 20;
    if (companyName) qualification += 15;
    if (estimatedValue && Number(estimatedValue) > 20000) qualification += 15;

    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        name: name.trim(),
        companyName: companyName?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        source: source || "manual",
        status: "new",
        qualification,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : 0,
        ownerId: ownerId || null,
        isDemo: false, // Created by user
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        action: "lead_created",
        entityType: "Lead",
        entityId: lead.id,
        detailsJson: JSON.stringify({ name: lead.name, email: lead.email, source: lead.source }),
      },
    });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/leads error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, name, companyName, email, phone, status, qualification, estimatedValue, aiSummary } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID es requerido" }, { status: 400 });
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        name,
        companyName,
        email,
        phone,
        status,
        qualification: qualification !== undefined ? Number(qualification) : undefined,
        estimatedValue: estimatedValue !== undefined ? Number(estimatedValue) : undefined,
        aiSummary,
      },
    });

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    console.error("PUT /api/leads error:", error);
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

    // Logical deletion as required by Section 3, Priority 1
    const lead = await prisma.lead.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    console.error("DELETE /api/leads error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
