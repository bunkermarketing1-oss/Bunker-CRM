import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";
import {
  OPPORTUNITY_STATUSES,
  parseAmount,
  parseProbability,
  stageBelongsToOrg,
  clientBelongsToOrg,
  leadBelongsToOrg,
} from "@/lib/validation-helpers";

export const dynamic = "force-dynamic";

const badRequest = (error: string) =>
  NextResponse.json({ success: false, error }, { status: 400 });

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const stages = await prisma.pipelineStage.findMany({
      where: { organizationId: user!.organizationId },
      orderBy: { order: "asc" },
      include: {
        opportunities: {
          // Defense in depth: never surface opportunities of another organization,
          // even if one was linked to this stage.
          where: { isDeleted: false, organizationId: user!.organizationId },
          include: {
            client: { select: { id: true, name: true, phone: true } },
            lead: { select: { id: true, name: true, phone: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Summary stats
    let totalPipelineValue = 0;
    let totalWonValue = 0;
    let openDealsCount = 0;

    stages.forEach((stage) => {
      stage.opportunities.forEach((opp) => {
        if (opp.status === "open") {
          totalPipelineValue += opp.value;
          openDealsCount += 1;
        } else if (opp.status === "won") {
          totalWonValue += opp.value;
        }
      });
    });

    return NextResponse.json({
      success: true,
      stages,
      stats: {
        totalPipelineValue,
        totalWonValue,
        openDealsCount,
      },
    });
  } catch (error: any) {
    console.error("GET /api/pipeline error:", error);
    return NextResponse.json({ success: false, error: "Error al consultar pipeline comercial." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { title, value, stageId, clientId, leadId, probability, expectedClose } = body;

    if (typeof title !== "string" || title.trim() === "" || typeof stageId !== "string" || !stageId) {
      return badRequest("Título y etapa son obligatorios.");
    }
    if (title.trim().length > 150) {
      return badRequest("El título no puede exceder 150 caracteres.");
    }

    const amount = parseAmount(value);
    if (amount === null) {
      return badRequest("El valor comercial debe ser un número mayor o igual a 0 (USD).");
    }

    const prob = parseProbability(probability);
    if (prob === null) {
      return badRequest("La probabilidad debe ser un entero entre 0 y 100.");
    }

    let closeDate: Date | null = null;
    if (expectedClose) {
      closeDate = new Date(expectedClose);
      if (isNaN(closeDate.getTime())) {
        return badRequest("La fecha estimada de cierre no es válida.");
      }
    }

    // Every referenced record must belong to the authenticated user's organization.
    if (!(await stageBelongsToOrg(user!.organizationId, stageId))) {
      return badRequest("Etapa de pipeline no válida para su organización.");
    }
    if (clientId && !(await clientBelongsToOrg(user!.organizationId, String(clientId)))) {
      return badRequest("El cliente indicado no pertenece a su organización.");
    }
    if (leadId && !(await leadBelongsToOrg(user!.organizationId, String(leadId)))) {
      return badRequest("El prospecto indicado no pertenece a su organización.");
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        organizationId: user!.organizationId,
        stageId,
        clientId: clientId || null,
        leadId: leadId || null,
        title: title.trim(),
        value: amount,
        probability: prob,
        expectedClose: closeDate,
        status: "open",
        isDemo: false,
      },
      include: {
        client: true,
        lead: true,
        stage: true,
      },
    });

    return NextResponse.json({ success: true, opportunity }, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/pipeline error:", error);
    return NextResponse.json({ success: false, error: "Error al registrar oportunidad." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { id, stageId, status, value, probability } = body;

    if (!id || typeof id !== "string") {
      return badRequest("ID es obligatorio.");
    }

    const existing = await prisma.opportunity.findFirst({
      where: { id, organizationId: user!.organizationId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Oportunidad no encontrada en su organización." }, { status: 404 });
    }

    const data: any = {};

    if (stageId !== undefined && stageId !== null && stageId !== "") {
      if (typeof stageId !== "string" || !(await stageBelongsToOrg(user!.organizationId, stageId))) {
        return badRequest("Etapa de pipeline no válida para su organización.");
      }
      data.stageId = stageId;
    }

    if (status !== undefined && status !== null && status !== "") {
      if (!(OPPORTUNITY_STATUSES as readonly string[]).includes(status)) {
        return badRequest("El estado de la oportunidad no es válido.");
      }
      data.status = status;
    }

    if (value !== undefined) {
      const amount = parseAmount(value);
      if (amount === null) {
        return badRequest("El valor comercial debe ser un número mayor o igual a 0 (USD).");
      }
      data.value = amount;
    }

    if (probability !== undefined) {
      const prob = parseProbability(probability);
      if (prob === null) {
        return badRequest("La probabilidad debe ser un entero entre 0 y 100.");
      }
      data.probability = prob;
    }

    const opportunity = await prisma.opportunity.update({
      where: { id },
      data,
      include: {
        stage: true,
      },
    });

    return NextResponse.json({ success: true, opportunity });
  } catch (error: any) {
    console.error("PUT /api/pipeline error:", error);
    return NextResponse.json({ success: false, error: "Error al actualizar oportunidad." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireRole(req, ["admin"]);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ success: false, error: "ID es obligatorio." }, { status: 400 });
    }

    const existing = await prisma.opportunity.findFirst({
      where: { id, organizationId: user!.organizationId, isDeleted: false },
    });

    if (!existing) {
      return NextResponse.json({ success: false, error: "Oportunidad no encontrada en su organización." }, { status: 404 });
    }

    const opportunity = await prisma.opportunity.update({
      where: { id },
      data: { isDeleted: true, deletedAt: new Date() },
    });

    return NextResponse.json({ success: true, opportunity });
  } catch (error: any) {
    console.error("DELETE /api/pipeline error:", error);
    return NextResponse.json({ success: false, error: "Error al eliminar oportunidad." }, { status: 500 });
  }
}
