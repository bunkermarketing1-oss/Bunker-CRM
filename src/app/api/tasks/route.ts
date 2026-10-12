import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where: any = {};
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, dueDate, priority, clientId, leadId, userId } = body;

    if (!title || title.trim() === "") {
      return NextResponse.json({ success: false, error: "Título de la tarea es requerido" }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || "medium",
        status: "pending",
        clientId: clientId || null,
        leadId: leadId || null,
        userId: userId || null,
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, title, priority, dueDate } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID es requerido" }, { status: 400 });
    }

    const data: any = {};
    if (status) {
      data.status = status;
      if (status === "completed") {
        data.completedAt = new Date();
      } else {
        data.completedAt = null;
      }
    }
    if (title) data.title = title;
    if (priority) data.priority = priority;
    if (dueDate) data.dueDate = new Date(dueDate);

    const task = await prisma.task.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, task });
  } catch (error: any) {
    console.error("PUT /api/tasks error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
