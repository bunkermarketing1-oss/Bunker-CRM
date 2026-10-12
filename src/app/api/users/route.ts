import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireAdmin, normalizeRole, ROLES } from "@/lib/auth";
import { clientBelongsToOrg } from "@/lib/validation-helpers";
import { getSupabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const scope = searchParams.get("scope"); // "client" | "bunker" | "all"

    const where: any = {
      memberships: {
        some: {
          organizationId: user!.organizationId,
        },
      },
    };

    // Client Portal Users can ONLY list users associated with their own client
    if (user!.isClientUser) {
      if (!user!.clientId) {
        return NextResponse.json({ success: true, users: [] });
      }
      where.clientId = user!.clientId;
      where.isActive = true;
    } else {
      // Bunker Staff
      if (clientId) {
        const belongs = await clientBelongsToOrg(user!.organizationId, clientId);
        if (!belongs) {
          return NextResponse.json(
            { success: false, error: "Cliente no pertenece a su organización." },
            { status: 404 }
          );
        }
        where.clientId = clientId;
      } else if (scope === "client") {
        where.clientId = { not: null };
      } else if (scope === "bunker") {
        where.clientId = null;
        where.isActive = true;
      }
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        clientId: true,
        isActive: true,
        createdAt: true,
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, users });
  } catch (error: any) {
    console.error("GET /api/users error:", error);
    return NextResponse.json(
      { success: false, error: "Error al consultar usuarios." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Only Bunker Administrators can create users
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { email, password, name, role, clientId } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Correo electrónico no válido." },
        { status: 400 }
      );
    }

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "El nombre debe contener al menos 2 caracteres." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanRole = normalizeRole(role || (clientId ? "CLIENT" : "ADMIN"));

    // If creating a Client Portal user, clientId is mandatory and must belong to this org
    let targetClientId: string | null = null;
    if (cleanRole === "CLIENT") {
      if (!clientId || typeof clientId !== "string") {
        return NextResponse.json(
          { success: false, error: "Debe especificar el cliente (empresa) al que pertenecerá el usuario con rol CLIENT." },
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
      targetClientId = clientId;
    }

    // Check if email already exists in local DB
    const existingDb = await prisma.user.findFirst({
      where: { email: cleanEmail },
    });
    if (existingDb) {
      return NextResponse.json(
        { success: false, error: "Ya existe un usuario registrado con este correo electrónico." },
        { status: 409 }
      );
    }

    // Provision user in Supabase Auth securely
    const supabaseAdmin = getSupabaseAdmin();
    const securePassword = password && typeof password === "string" && password.length >= 6
      ? password
      : `Bunker${Math.random().toString(36).slice(-8)}!`;

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: cleanEmail,
      password: securePassword,
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        role: cleanRole,
        clientId: targetClientId,
      },
    });

    if (authError || !authData.user) {
      console.error("Error creating user in Supabase Auth:", authError);
      return NextResponse.json(
        { success: false, error: authError?.message || "Error al crear cuenta en el proveedor de autenticación." },
        { status: 400 }
      );
    }

    // Create user record in Prisma DB and link to organization
    const newUser = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: cleanEmail,
          name: name.trim(),
          passwordHash: "managed_by_supabase_auth",
          role: cleanRole,
          clientId: targetClientId,
          supabaseAuthId: authData.user.id,
          isActive: true,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: user!.organizationId,
          userId: created.id,
          role: cleanRole,
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: user!.organizationId,
          userId: user!.id,
          action: "user_created",
          entityType: "User",
          entityId: created.id,
          detailsJson: JSON.stringify({
            email: cleanEmail,
            role: cleanRole,
            clientId: targetClientId,
          }),
        },
      });

      return created;
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          clientId: newUser.clientId,
          isActive: newUser.isActive,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/users error:", error);
    return NextResponse.json(
      { success: false, error: "Error al registrar usuario." },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { id, isActive, role, action } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { success: false, error: "ID de usuario es requerido." },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id,
        memberships: {
          some: { organizationId: user!.organizationId },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Usuario no encontrado en su organización." },
        { status: 404 }
      );
    }

    // Action: Generate password recovery link
    if (action === "reset_password") {
      const supabaseAdmin = getSupabaseAdmin();
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: targetUser.email,
      });

      if (linkError) {
        return NextResponse.json(
          { success: false, error: linkError.message || "Error al generar enlace de restablecimiento." },
          { status: 500 }
        );
      }

      await prisma.auditLog.create({
        data: {
          organizationId: user!.organizationId,
          userId: user!.id,
          action: "password_reset_requested",
          entityType: "User",
          entityId: targetUser.id,
          detailsJson: JSON.stringify({ email: targetUser.email }),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Enlace de recuperación generado con éxito.",
        recoveryUrl: linkData?.properties?.action_link || null,
      });
    }

    const updated = await prisma.user.update({
      where: { id: targetUser.id },
      data: {
        isActive: isActive !== undefined ? Boolean(isActive) : undefined,
        role: role !== undefined ? normalizeRole(role) : undefined,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        clientId: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user!.organizationId,
        userId: user!.id,
        action: "user_updated",
        entityType: "User",
        entityId: updated.id,
        detailsJson: JSON.stringify({
          isActive: updated.isActive,
          role: updated.role,
        }),
      },
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error: any) {
    console.error("PUT /api/users error:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar usuario." },
      { status: 500 }
    );
  }
}
