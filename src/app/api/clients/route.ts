import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { CLIENT_STATUSES, parseAmount } from "@/lib/validation-helpers";
import { createClientSchema } from "@/lib/validations/client";
import { ClientServiceError, createClient } from "@/services/clients.service";

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

    // Client users can only see their own company
    if (user!.isClientUser) {
      if (!user!.clientId) {
        return NextResponse.json({ success: true, clients: [] });
      }
      where.id = user!.clientId;
    }

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
        connectedAccounts: {
          select: {
            id: true,
            accountName: true,
            accountType: true,
            externalId: true,
            status: true,
            lastSyncAt: true,
            integration: {
              select: {
                id: true,
                provider: true,
                name: true,
                status: true,
              },
            },
          },
        },
        _count: {
          select: {
            leads: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, clients });
  } catch (error: any) {
    console.error("GET /api/clients error:", error);
    return NextResponse.json({ success: false, error: "Error al consultar clientes." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  if (user!.isClientUser) {
    return NextResponse.json(
      { success: false, error: "Acceso denegado. La creación de clientes está reservada para administradores de Bunker Agency." },
      { status: 403 }
    );
  }

  const parsed = createClientSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }

  try {
    const client = await createClient({ organizationId: user!.organizationId, userId: user!.id }, parsed.data);
    return NextResponse.json({ success: true, client }, { status: 201 });
  } catch (error) {
    if (error instanceof ClientServiceError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("POST /api/clients error:", error);
    return NextResponse.json({ success: false, error: "Error al registrar cliente." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { id, name, companyName, email, phone, website, industry, logoUrl, status, revenue, notes } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ success: false, error: "ID es requerido." }, { status: 400 });
    }

    const existing = await prisma.client.findFirst({
      where: { id, organizationId: user!.organizationId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Cliente no encontrado en su organización." }, { status: 404 });
    }

    if (user!.isClientUser) {
      if (!user!.clientId || existing.id !== user!.clientId) {
        return NextResponse.json(
          { success: false, error: "Acceso denegado. No puede modificar información de otra empresa." },
          { status: 403 }
        );
      }
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
        logoUrl: logoUrl !== undefined ? logoUrl?.trim() || null : undefined,
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
    const { user, errorResponse } = await requireAdmin(req);
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
