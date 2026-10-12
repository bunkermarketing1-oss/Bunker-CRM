import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";
import { CLIENT_STATUSES, isOrgMember, parseAmount } from "@/lib/validation-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status");
    const industry = searchParams.get("industry");
    const ownerId = searchParams.get("ownerId");
    const sort = searchParams.get("sort") || "newest";

    const where: any = {
      organizationId: user!.organizationId,
      isDeleted: false,
    };

    if (status && status !== "all") {
      where.status = status;
    }

    if (industry && industry !== "all") {
      where.industry = industry;
    }

    if (ownerId && ownerId !== "all") {
      where.ownerId = ownerId;
    }

    if (search.trim()) {
      const cleanSearch = search.trim();
      where.AND = [
        {
          OR: [
            { name: { contains: cleanSearch, mode: "insensitive" } },
            { companyName: { contains: cleanSearch, mode: "insensitive" } },
            { email: { contains: cleanSearch, mode: "insensitive" } },
            { phone: { contains: cleanSearch, mode: "insensitive" } },
            { industry: { contains: cleanSearch, mode: "insensitive" } },
          ],
        },
      ];
    }

    let orderBy: any = { createdAt: "desc" };
    if (sort === "name_asc") orderBy = { name: "asc" };
    else if (sort === "name_desc") orderBy = { name: "desc" };
    else if (sort === "revenue_desc") orderBy = { revenue: "desc" };
    else if (sort === "revenue_asc") orderBy = { revenue: "asc" };
    else if (sort === "oldest") orderBy = { createdAt: "asc" };

    const clients = await prisma.client.findMany({
      where,
      orderBy,
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        contacts: { where: { isDeleted: false } },
        opportunities: { where: { isDeleted: false }, include: { stage: true } },
        activities: { take: 5, orderBy: { performedAt: "desc" } },
        tasks: { where: { status: "pending" } },
      },
    });

    return NextResponse.json({ success: true, clients });
  } catch (error: any) {
    console.error("GET /api/clients error:", error);
    return NextResponse.json({ success: false, error: "Error al consultar clientes." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { name, companyName, email, phone, website, industry, revenue, notes, ownerId } = body;

    if (!name || typeof name !== "string" || name.trim() === "") {
      return NextResponse.json({ success: false, error: "El nombre del cliente es obligatorio." }, { status: 400 });
    }

    const revenueAmount = parseAmount(revenue);
    if (revenueAmount === null) {
      return NextResponse.json(
        { success: false, error: "El valor contratado debe ser un número mayor o igual a 0 (USD)." },
        { status: 400 }
      );
    }

    // The owner must be a member of the authenticated user's organization.
    if (ownerId && (typeof ownerId !== "string" || !(await isOrgMember(user!.organizationId, ownerId)))) {
      return NextResponse.json(
        { success: false, error: "El responsable asignado no pertenece a su organización." },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        organizationId: user!.organizationId,
        name: name.trim(),
        companyName: companyName?.trim() || null,
        email: email?.trim() || null,
        phone: phone?.trim() || null,
        website: website?.trim() || null,
        industry: industry?.trim() || "General",
        revenue: revenueAmount,
        notes: notes?.trim() || null,
        ownerId: ownerId || user!.id,
        status: "active",
        isDemo: false,
      },
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId: user!.organizationId,
        userId: user!.id,
        action: "client_created",
        entityType: "Client",
        entityId: client.id,
        detailsJson: JSON.stringify({ name: client.name, email: client.email }),
      },
    });

    return NextResponse.json({ success: true, client }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/clients error:", error);
    return NextResponse.json({ success: false, error: "Error al registrar cliente." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { id, name, companyName, email, phone, website, industry, status, revenue, notes } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ success: false, error: "ID es requerido." }, { status: 400 });
    }

    const existing = await prisma.client.findFirst({
      where: { id, organizationId: user!.organizationId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Cliente no encontrado en su organización." }, { status: 404 });
    }

    if (name !== undefined && (typeof name !== "string" || name.trim() === "")) {
      return NextResponse.json({ success: false, error: "El nombre del cliente es obligatorio." }, { status: 400 });
    }
    if (status !== undefined && !(CLIENT_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json({ success: false, error: "El estado del cliente no es válido." }, { status: 400 });
    }
    let revenueAmount: number | undefined = undefined;
    if (revenue !== undefined) {
      const parsed = parseAmount(revenue);
      if (parsed === null) {
        return NextResponse.json(
          { success: false, error: "El valor contratado debe ser un número mayor o igual a 0 (USD)." },
          { status: 400 }
        );
      }
      revenueAmount = parsed;
    }

    const client = await prisma.client.update({
      where: { id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        companyName: companyName !== undefined ? companyName?.trim() || null : undefined,
        email: email !== undefined ? email?.trim() || null : undefined,
        phone: phone !== undefined ? phone?.trim() || null : undefined,
        website: website !== undefined ? website?.trim() || null : undefined,
        industry: industry !== undefined ? industry?.trim() || "General" : undefined,
        status: status !== undefined ? status : undefined,
        revenue: revenueAmount,
        notes: notes !== undefined ? notes?.trim() || null : undefined,
      },
    });

    return NextResponse.json({ success: true, client });
  } catch (error: any) {
    console.error("PUT /api/clients error:", error);
    return NextResponse.json({ success: false, error: "Error al actualizar cliente." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireRole(req, ["admin"]);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID es requerido." }, { status: 400 });
    }

    const existing = await prisma.client.findFirst({
      where: { id, organizationId: user!.organizationId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Cliente no encontrado en su organización." }, { status: 404 });
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
    return NextResponse.json({ success: false, error: "Error al eliminar cliente." }, { status: 500 });
  }
}
