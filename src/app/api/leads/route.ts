import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const source = searchParams.get("source");

    const where: any = {
      organizationId: user!.organizationId,
      isDeleted: false,
    };

    if (status && status !== "all") {
      where.status = status;
    }

    if (source && source !== "all") {
      where.source = source;
    }

    if (search) {
      where.AND = [
        {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { companyName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        },
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
    return NextResponse.json({ success: false, error: "Error interno al consultar prospectos." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { name, companyName, email, phone, source, estimatedValue, ownerId } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ success: false, error: "El nombre es obligatorio." }, { status: 400 });
    }

    // Auto calculate initial AI qualification score based on info completeness
    let qualification = 50;
    if (email && phone) qualification += 20;
    if (companyName) qualification += 15;
    if (estimatedValue && Number(estimatedValue) > 20000) qualification += 15;

    const lead = await prisma.lead.create({
      data: {
        organizationId: user!.organizationId, // Strict organization isolation
        name: name.trim(),
        companyName: companyName?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        source: source || "manual",
        status: "new",
        qualification,
        estimatedValue: estimatedValue ? parseFloat(estimatedValue) : 0,
        ownerId: ownerId || user!.id,
        isDemo: false,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId: user!.organizationId,
        userId: user!.id,
        action: "lead_created",
        entityType: "Lead",
        entityId: lead.id,
        detailsJson: JSON.stringify({ name: lead.name, email: lead.email, source: lead.source }),
      },
    });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/leads error:", error);
    return NextResponse.json({ success: false, error: "Error al registrar prospecto." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { id, name, companyName, email, phone, status, qualification, estimatedValue, aiSummary } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID es requerido." }, { status: 400 });
    }

    // Verify lead belongs to user's organization
    const existing = await prisma.lead.findFirst({
      where: { id, organizationId: user!.organizationId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Prospecto no encontrado en su organización." }, { status: 404 });
    }

    const lead = await prisma.lead.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        companyName: companyName !== undefined ? companyName?.trim() || null : undefined,
        email: email !== undefined ? email?.trim() || null : undefined,
        phone: phone !== undefined ? phone?.trim() || null : undefined,
        status: status !== undefined ? status : undefined,
        qualification: qualification !== undefined ? Number(qualification) : undefined,
        estimatedValue: estimatedValue !== undefined ? Number(estimatedValue) : undefined,
        aiSummary: aiSummary !== undefined ? aiSummary : undefined,
      },
    });

    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    console.error("PUT /api/leads error:", error);
    return NextResponse.json({ success: false, error: "Error al actualizar prospecto." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // PRUEBA F: Deletion is restricted to admin role only
    const { user, errorResponse } = await requireRole(req, ["admin"]);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID es requerido." }, { status: 400 });
    }

    // Verify lead belongs to user's organization
    const existing = await prisma.lead.findFirst({
      where: { id, organizationId: user!.organizationId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Prospecto no encontrado en su organización." }, { status: 404 });
    }

    // Logical deletion
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
    return NextResponse.json({ success: false, error: "Error al eliminar prospecto." }, { status: 500 });
  }
}
