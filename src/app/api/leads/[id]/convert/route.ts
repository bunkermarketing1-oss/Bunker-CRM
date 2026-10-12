import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const leadId = params.id;
    const body = await req.json().catch(() => ({}));

    const lead = await prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead || lead.isDeleted) {
      return NextResponse.json({ success: false, error: "Lead no encontrado" }, { status: 404 });
    }

    // 1. Create or Find Client
    const client = await prisma.client.create({
      data: {
        organizationId: lead.organizationId,
        ownerId: lead.ownerId,
        name: lead.companyName || lead.name,
        companyName: lead.companyName || lead.name,
        email: lead.email,
        phone: lead.phone,
        status: "active",
        revenue: lead.estimatedValue || 0,
        notes: `Convertido desde Lead: ${lead.name}. ${lead.aiSummary || ""}`,
        isDemo: lead.isDemo,
      },
    });

    // 2. Create Contact for Client
    await prisma.contact.create({
      data: {
        organizationId: lead.organizationId,
        clientId: client.id,
        firstName: lead.name,
        email: lead.email,
        phone: lead.phone,
        isPrimary: true,
      },
    });

    // 3. Create Opportunity in First or Specified Pipeline Stage
    const defaultStage = await prisma.pipelineStage.findFirst({
      where: { organizationId: lead.organizationId },
      orderBy: { order: "asc" },
    });

    let opportunity = null;
    if (defaultStage) {
      opportunity = await prisma.opportunity.create({
        data: {
          organizationId: lead.organizationId,
          stageId: body.stageId || defaultStage.id,
          clientId: client.id,
          title: `Negocio: ${client.name}`,
          value: lead.estimatedValue || 0,
          probability: 50,
          status: "open",
          isDemo: lead.isDemo,
        },
      });
    }

    // 4. Update Lead Status
    await prisma.lead.update({
      where: { id: leadId },
      data: { status: "converted" },
    });

    // 5. Audit Log
    await prisma.auditLog.create({
      data: {
        organizationId: lead.organizationId,
        action: "lead_converted_to_client",
        entityType: "Client",
        entityId: client.id,
        detailsJson: JSON.stringify({ leadId: lead.id, clientId: client.id, opportunityId: opportunity?.id }),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Lead convertido a cliente con éxito",
      client,
      opportunity,
    });
  } catch (error: any) {
    console.error("Convert lead error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
