import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin } from "@/lib/auth";
import { CLIENT_STATUSES, isOrgMember, parseAmount } from "@/lib/validation-helpers";
import { validateAndNormalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: { id: string };
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { id } = params;
    if (!id) {
      return NextResponse.json({ success: false, error: "ID de cliente no proporcionado." }, { status: 400 });
    }

    if (user!.isClientUser && user!.clientId !== id) {
      return NextResponse.json(
        { success: false, error: "Acceso denegado. No tiene permisos para consultar la empresa de otro cliente." },
        { status: 403 }
      );
    }

    const client = await prisma.client.findFirst({
      where: {
        id,
        organizationId: user!.organizationId,
        isDeleted: false,
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        contacts: {
          where: { isDeleted: false },
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        opportunities: {
          where: { isDeleted: false },
          include: {
            stage: { select: { id: true, name: true, color: true } },
          },
          orderBy: { createdAt: "desc" },
        },
        activities: {
          orderBy: { performedAt: "desc" },
          include: {
            user: { select: { id: true, name: true, role: true } },
          },
          take: 50,
        },
        tasks: {
          orderBy: [{ status: "asc" }, { dueDate: "asc" }],
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        connectedAccounts: {
          select: {
            id: true,
            accountName: true,
            accountType: true,
            externalId: true,
            status: true,
            lastSyncAt: true,
            createdAt: true,
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
        leads: {
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" },
          take: 50,
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
            normalizedPhone: true,
            campaign: true,
            status: true,
            qualification: true,
            estimatedValue: true,
            source: true,
            createdAt: true,
          },
        },
      },
    });

    if (!client) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado en su organización." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, client });
  } catch (error: any) {
    console.error(`GET /api/clients/${params.id} error:`, error);
    return NextResponse.json(
      { success: false, error: "Error al consultar la ficha del cliente." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { id } = params;

    if (user!.isClientUser && user!.clientId !== id) {
      return NextResponse.json(
        { success: false, error: "Acceso denegado. No tiene permisos para modificar la empresa de otro cliente." },
        { status: 403 }
      );
    }

    const existing = await prisma.client.findFirst({
      where: {
        id,
        organizationId: user!.organizationId,
        isDeleted: false,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado en su organización." },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { name, companyName, email, phone, website, industry, status, revenue, notes, ownerId } = body;

    if (name !== undefined && (typeof name !== "string" || name.trim().length < 2)) {
      return NextResponse.json(
        { success: false, error: "El nombre debe contener al menos 2 caracteres." },
        { status: 400 }
      );
    }

    if (status !== undefined && !(CLIENT_STATUSES as readonly string[]).includes(status)) {
      return NextResponse.json(
        { success: false, error: "El estado comercial proporcionado no es válido." },
        { status: 400 }
      );
    }

    let revenueAmount: number | undefined = undefined;
    if (revenue !== undefined) {
      const parsed = parseAmount(revenue);
      if (parsed === null) {
        return NextResponse.json(
          { success: false, error: "El ingreso mensual contratado debe ser un número válido en USD." },
          { status: 400 }
        );
      }
      revenueAmount = parsed;
    }

    if (ownerId && (typeof ownerId !== "string" || !(await isOrgMember(user!.organizationId, ownerId)))) {
      return NextResponse.json(
        { success: false, error: "El asesor asignado no pertenece a su organización." },
        { status: 400 }
      );
    }

    let formattedPhone = existing.phone;
    if (phone !== undefined) {
      if (phone && phone.trim() !== "") {
        const phoneCheck = validateAndNormalizePhone(phone);
        if (!phoneCheck.isValid) {
          return NextResponse.json(
            { success: false, error: phoneCheck.error || "Número telefónico no válido." },
            { status: 400 }
          );
        }
        formattedPhone = phoneCheck.formatted || phone;
      } else {
        formattedPhone = null;
      }
    }

    const updated = await prisma.client.update({
      where: { id: existing.id },
      data: {
        name: name !== undefined ? name.trim() : undefined,
        companyName: companyName !== undefined ? (companyName?.trim() || null) : undefined,
        email: email !== undefined ? (email?.trim().toLowerCase() || null) : undefined,
        phone: formattedPhone,
        website: website !== undefined ? (website?.trim() || null) : undefined,
        industry: industry !== undefined ? (industry?.trim() || "General") : undefined,
        status: status !== undefined ? status : undefined,
        revenue: revenueAmount !== undefined ? revenueAmount : undefined,
        notes: notes !== undefined ? (notes?.trim() || null) : undefined,
        ownerId: ownerId !== undefined ? ownerId : undefined,
      },
      include: {
        owner: { select: { id: true, name: true, email: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user!.organizationId,
        userId: user!.id,
        action: "client_updated",
        entityType: "Client",
        entityId: updated.id,
        detailsJson: JSON.stringify({
          name: updated.name,
          status: updated.status,
          revenue: updated.revenue,
        }),
      },
    });

    return NextResponse.json({ success: true, client: updated });
  } catch (error: any) {
    console.error(`PUT /api/clients/${params.id} error:`, error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar ficha del cliente." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const { id } = params;
    const existing = await prisma.client.findFirst({
      where: {
        id,
        organizationId: user!.organizationId,
        isDeleted: false,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Cliente no encontrado en su organización." },
        { status: 404 }
      );
    }

    await prisma.client.update({
      where: { id: existing.id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: "Cliente eliminado correctamente." });
  } catch (error: any) {
    console.error(`DELETE /api/clients/${params.id} error:`, error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar cliente." },
      { status: 500 }
    );
  }
}
