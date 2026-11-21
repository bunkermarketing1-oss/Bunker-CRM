import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { updateLeadSchema } from "@/lib/validations/lead";
import { validateAndNormalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { id } = await params;

    const where: {
      id: string;
      organizationId: string;
      isDeleted: boolean;
      clientId?: string;
    } = {
      id,
      organizationId: user!.organizationId,
      isDeleted: false,
    };

    if (user!.isClientUser) {
      if (!user!.clientId) {
        return NextResponse.json(
          { success: false, error: "Usuario sin empresa asignada." },
          { status: 403 }
        );
      }
      where.clientId = user!.clientId;
    }

    const lead = await prisma.lead.findFirst({
      where,
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        client: { select: { id: true, name: true, companyName: true } },
        opportunities: {
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" },
          include: {
            stage: { select: { id: true, name: true, color: true } },
          },
        },
        activities: {
          orderBy: { performedAt: "desc" },
          take: 30,
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        tasks: {
          orderBy: { dueDate: "asc" },
          take: 30,
          include: {
            user: { select: { id: true, name: true } },
          },
        },
        calls: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        appointments: {
          orderBy: { scheduledAt: "desc" },
          take: 15,
          include: {
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json(
        { success: false, error: "Prospecto no encontrado en su organización." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, lead });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener el prospecto.";
    console.error("GET /api/leads/[id] error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { id } = await params;
    const rawBody = await req.json().catch(() => ({}));

    const validationResult = updateLeadSchema.safeParse(rawBody);
    if (!validationResult.success) {
      const fieldErrors = validationResult.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0] || "Datos inválidos";
      return NextResponse.json({ success: false, error: firstError, fieldErrors }, { status: 400 });
    }

    const { name, email, phone, companyName, status, source, notes, estimatedValue, ownerId } =
      validationResult.data;

    const where: {
      id: string;
      organizationId: string;
      isDeleted: boolean;
      clientId?: string;
    } = {
      id,
      organizationId: user!.organizationId,
      isDeleted: false,
    };

    if (user!.isClientUser) {
      if (!user!.clientId) {
        return NextResponse.json({ success: false, error: "Acceso denegado." }, { status: 403 });
      }
      where.clientId = user!.clientId;
    }

    const existingLead = await prisma.lead.findFirst({ where });
    if (!existingLead) {
      return NextResponse.json({ success: false, error: "Prospecto no encontrado." }, { status: 404 });
    }

    let normalizedPhone = existingLead.normalizedPhone;
    if (phone && phone !== existingLead.phone) {
      const normResult = validateAndNormalizePhone(phone);
      normalizedPhone = normResult.normalized || null;
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone, normalizedPhone }),
        ...(companyName !== undefined && { companyName }),
        ...(status !== undefined && { status }),
        ...(source !== undefined && { source }),
        ...(notes !== undefined && { notes }),
        ...(estimatedValue !== undefined && { estimatedValue }),
        ...(ownerId !== undefined && { ownerId: ownerId || null }),
      },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
        client: { select: { id: true, name: true, companyName: true } },
      },
    });

    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar el prospecto.";
    console.error("PATCH /api/leads/[id] error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
