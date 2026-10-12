import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { clientBelongsToOrg } from "@/lib/validation-helpers";
import { validateAndNormalizePhone } from "@/lib/phone";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");

    const where: any = {
      organizationId: user!.organizationId,
      isDeleted: false,
    };

    if (clientId) {
      const belongs = await clientBelongsToOrg(user!.organizationId, clientId);
      if (!belongs) {
        return NextResponse.json(
          { success: false, error: "Cliente no encontrado en su organización." },
          { status: 404 }
        );
      }
      where.clientId = clientId;
    }

    const contacts = await prisma.contact.findMany({
      where,
      orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      include: {
        client: { select: { id: true, name: true, companyName: true } },
      },
    });

    return NextResponse.json({ success: true, contacts });
  } catch (error: any) {
    console.error("GET /api/contacts error:", error);
    return NextResponse.json(
      { success: false, error: "Error al consultar contactos." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { clientId, firstName, lastName, email, phone, jobTitle, isPrimary } = body;

    if (!clientId || typeof clientId !== "string") {
      return NextResponse.json(
        { success: false, error: "El cliente asociado es obligatorio." },
        { status: 400 }
      );
    }

    const belongs = await clientBelongsToOrg(user!.organizationId, clientId);
    if (!belongs) {
      return NextResponse.json(
        { success: false, error: "El cliente especificado no pertenece a su organización." },
        { status: 404 }
      );
    }

    if (!firstName || typeof firstName !== "string" || firstName.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "El nombre del contacto debe tener al menos 2 caracteres." },
        { status: 400 }
      );
    }

    let normalizedPhone: string | null = null;
    let formattedPhone: string | null = null;
    if (phone) {
      const phoneCheck = validateAndNormalizePhone(phone);
      if (!phoneCheck.isValid) {
        return NextResponse.json(
          { success: false, error: phoneCheck.error || "Número telefónico inválido." },
          { status: 400 }
        );
      }
      normalizedPhone = phoneCheck.normalized;
      formattedPhone = phoneCheck.formatted || phone;
    }

    if (email && typeof email === "string" && email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json(
          { success: false, error: "El correo electrónico no tiene un formato válido." },
          { status: 400 }
        );
      }
    }

    // Atomic creation with primary contact management
    const contact = await prisma.$transaction(async (tx) => {
      // Check existing contacts count
      const existingCount = await tx.contact.count({
        where: { clientId, organizationId: user!.organizationId, isDeleted: false },
      });

      // If user marks as primary or it's the very first contact, it will be primary
      const shouldBePrimary = Boolean(isPrimary) || existingCount === 0;

      if (shouldBePrimary) {
        await tx.contact.updateMany({
          where: { clientId, organizationId: user!.organizationId, isDeleted: false },
          data: { isPrimary: false },
        });
      }

      const created = await tx.contact.create({
        data: {
          organizationId: user!.organizationId,
          clientId,
          firstName: firstName.trim(),
          lastName: lastName?.trim() || null,
          email: email?.trim().toLowerCase() || null,
          phone: formattedPhone,
          jobTitle: jobTitle?.trim() || null,
          isPrimary: shouldBePrimary,
        },
      });

      // Log in audit trail
      await tx.auditLog.create({
        data: {
          organizationId: user!.organizationId,
          userId: user!.id,
          action: "contact_created",
          entityType: "Contact",
          entityId: created.id,
          detailsJson: JSON.stringify({
            clientId,
            name: `${created.firstName} ${created.lastName || ""}`.trim(),
            isPrimary: shouldBePrimary,
          }),
        },
      });

      return created;
    });

    return NextResponse.json({ success: true, contact }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/contacts error:", error);
    return NextResponse.json(
      { success: false, error: "Error al registrar contacto." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { id, firstName, lastName, email, phone, jobTitle, isPrimary } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ success: false, error: "ID de contacto es requerido." }, { status: 400 });
    }

    const existing = await prisma.contact.findFirst({
      where: { id, organizationId: user!.organizationId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Contacto no encontrado en su organización." },
        { status: 404 }
      );
    }

    if (firstName !== undefined && (typeof firstName !== "string" || firstName.trim().length < 2)) {
      return NextResponse.json(
        { success: false, error: "El nombre debe contener al menos 2 caracteres." },
        { status: 400 }
      );
    }

    let formattedPhone = existing.phone;
    if (phone !== undefined) {
      if (phone && phone.trim() !== "") {
        const phoneCheck = validateAndNormalizePhone(phone);
        if (!phoneCheck.isValid) {
          return NextResponse.json(
            { success: false, error: phoneCheck.error || "Número telefónico inválido." },
            { status: 400 }
          );
        }
        formattedPhone = phoneCheck.formatted || phone;
      } else {
        formattedPhone = null;
      }
    }

    if (email !== undefined && email && email.trim() !== "") {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        return NextResponse.json(
          { success: false, error: "El correo electrónico no tiene un formato válido." },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (isPrimary && existing.clientId) {
        // Demote other contacts of this client
        await tx.contact.updateMany({
          where: {
            clientId: existing.clientId,
            organizationId: user!.organizationId,
            id: { not: existing.id },
            isDeleted: false,
          },
          data: { isPrimary: false },
        });
      }

      return tx.contact.update({
        where: { id: existing.id },
        data: {
          firstName: firstName !== undefined ? firstName.trim() : undefined,
          lastName: lastName !== undefined ? (lastName?.trim() || null) : undefined,
          email: email !== undefined ? (email?.trim().toLowerCase() || null) : undefined,
          phone: formattedPhone,
          jobTitle: jobTitle !== undefined ? (jobTitle?.trim() || null) : undefined,
          isPrimary: isPrimary !== undefined ? Boolean(isPrimary) : undefined,
        },
      });
    });

    return NextResponse.json({ success: true, contact: updated });
  } catch (error: any) {
    console.error("PUT /api/contacts error:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar contacto." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID es requerido." }, { status: 400 });
    }

    const existing = await prisma.contact.findFirst({
      where: { id, organizationId: user!.organizationId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Contacto no encontrado en su organización." },
        { status: 404 }
      );
    }

    await prisma.contact.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return NextResponse.json({ success: true, message: "Contacto eliminado correctamente." });
  } catch (error: any) {
    console.error("DELETE /api/contacts error:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar contacto." },
      { status: 500 }
    );
  }
}
