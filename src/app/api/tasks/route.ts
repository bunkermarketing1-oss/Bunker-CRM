import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";
import { clientBelongsToOrg, leadBelongsToOrg } from "@/lib/validation-helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");
    const leadId = searchParams.get("leadId");

    const where: any = {};

    if (user!.isClientUser) {
      if (!user!.clientId) {
        return NextResponse.json({ success: true, tasks: [] });
      }
      where.clientId = user!.clientId;
    } else if (clientId) {
      const belongs = await clientBelongsToOrg(user!.organizationId, clientId);
      if (!belongs) {
        return NextResponse.json(
          { success: false, error: "Cliente no pertenece a su organización." },
          { status: 404 }
        );
      }
      where.clientId = clientId;
    } else if (leadId) {
      const belongs = await leadBelongsToOrg(user!.organizationId, leadId);
      if (!belongs) {
        return NextResponse.json(
          { success: false, error: "Prospecto no pertenece a su organización." },
          { status: 404 }
        );
      }
      where.leadId = leadId;
    } else {
      where.OR = [
        { client: { organizationId: user!.organizationId } },
        { lead: { organizationId: user!.organizationId } },
        { user: { memberships: { some: { organizationId: user!.organizationId } } } },
      ];
    }

    if (status && status !== "all") {
      where.status = status;
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [{ status: "asc" }, { dueDate: "asc" }],
      include: {
        user: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    console.error("GET /api/tasks error:", error);
    return NextResponse.json({ success: false, error: "Error al consultar tareas." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { title, description, dueDate, priority, clientId, leadId, userId } = body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      return NextResponse.json({ success: false, error: "Título de la tarea es requerido." }, { status: 400 });
    }

    let targetClientId = clientId;
    if (user!.isClientUser) {
      if (!user!.clientId) {
        return NextResponse.json({ success: false, error: "Usuario cliente no tiene empresa asociada." }, { status: 403 });
      }
      targetClientId = user!.clientId;
    } else if (clientId) {
      const client = await prisma.client.findFirst({
        where: { id: clientId, organizationId: user!.organizationId },
      });
      if (!client) {
        return NextResponse.json({ success: false, error: "Cliente no pertenece a su organización." }, { status: 404 });
      }
    }

    if (leadId) {
      const lead = await prisma.lead.findFirst({
        where: { id: leadId, organizationId: user!.organizationId },
      });
      if (!lead) {
        return NextResponse.json({ success: false, error: "Prospecto no pertenece a su organización." }, { status: 404 });
      }
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || "medium",
        status: "pending",
        clientId: targetClientId || null,
        leadId: leadId || null,
        userId: userId || user!.id,
      },
      include: {
        user: { select: { id: true, name: true } },
        client: { select: { id: true, name: true } },
        lead: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ success: true, task }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/tasks error:", error);
    return NextResponse.json({ success: false, error: "Error al registrar tarea." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { id, status, title, priority, dueDate } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID es requerido." }, { status: 400 });
    }

    const existing = await prisma.task.findFirst({
      where: {
        id,
        OR: [
          { client: { organizationId: user!.organizationId } },
          { lead: { organizationId: user!.organizationId } },
          { user: { memberships: { some: { organizationId: user!.organizationId } } } },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Tarea no encontrada en su organización." }, { status: 404 });
    }

    if (user!.isClientUser && existing.clientId !== user!.clientId) {
      return NextResponse.json(
        { success: false, error: "Acceso denegado. No puede modificar tareas de otra empresa." },
        { status: 403 }
      );
    }

    const data: any = {};
    if (status) {
      data.status = status;
      data.completedAt = status === "completed" ? new Date() : null;
    }
    if (title) data.title = title.trim();
    if (priority) data.priority = priority;
    if (dueDate) data.dueDate = new Date(dueDate);

    const task = await prisma.task.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error("PUT /api/tasks error:", error);
    return NextResponse.json({ success: false, error: "Error al actualizar tarea." }, { status: 500 });
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

    const existing = await prisma.task.findFirst({
      where: {
        id,
        OR: [
          { client: { organizationId: user!.organizationId } },
          { lead: { organizationId: user!.organizationId } },
          { user: { memberships: { some: { organizationId: user!.organizationId } } } },
        ],
      },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Tarea no encontrada en su organización." }, { status: 404 });
    }

    if (user!.isClientUser && existing.clientId !== user!.clientId) {
      return NextResponse.json(
        { success: false, error: "Acceso denegado. No puede eliminar tareas de otra empresa." },
        { status: 403 }
      );
    }

    const task = await prisma.task.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error("DELETE /api/tasks error:", error);
    return NextResponse.json({ success: false, error: "Error al eliminar tarea." }, { status: 500 });
  }
}
