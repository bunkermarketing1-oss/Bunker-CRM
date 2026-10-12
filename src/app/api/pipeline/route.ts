import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: false, error: "Organización no encontrada" }, { status: 404 });
    }

    const stages = await prisma.pipelineStage.findMany({
      where: { organizationId: org.id },
      orderBy: { order: "asc" },
      include: {
        opportunities: {
          where: { isDeleted: false },
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, value, stageId, clientId, leadId, probability, expectedClose } = body;

    if (!title || !stageId) {
      return NextResponse.json({ success: false, error: "Título y etapa son obligatorios" }, { status: 400 });
    }

    const org = await prisma.organization.findFirst();
    if (!org) {
      return NextResponse.json({ success: false, error: "Organización no encontrada" }, { status: 404 });
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        organizationId: org.id,
        stageId,
        clientId: clientId || null,
        leadId: leadId || null,
        title: title.trim(),
        value: value ? parseFloat(value) : 0,
        probability: probability ? parseInt(probability) : 50,
        expectedClose: expectedClose ? new Date(expectedClose) : null,
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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, stageId, status, value, probability } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: "ID es obligatorio" }, { status: 400 });
    }

    const data: any = {};
    if (stageId) data.stageId = stageId;
    if (status) data.status = status;
    if (value !== undefined) data.value = parseFloat(value);
    if (probability !== undefined) data.probability = parseInt(probability);

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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
