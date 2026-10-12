import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { stageBelongsToOrg } from "@/lib/validation-helpers";

export const dynamic = "force-dynamic";

class AlreadyConvertedError extends Error {}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const leadId = params.id;
    const body = await req.json().catch(() => ({}));
    const requestedStageId: string | undefined =
      typeof body?.stageId === "string" && body.stageId.trim() !== "" ? body.stageId : undefined;

    const lead = await prisma.lead.findFirst({
      where: {
        id: leadId,
        organizationId: user!.organizationId,
        isDeleted: false,
      },
    });

    if (!lead) {
      return NextResponse.json({ success: false, error: "Prospecto no encontrado en su organización." }, { status: 404 });
    }

    // Idempotency (fast path): already converted, or already linked to an opportunity.
    const alreadyLinked = await prisma.opportunity.findFirst({
      where: { organizationId: user!.organizationId, leadId: lead.id, isDeleted: false },
      select: { id: true },
    });
    if (lead.status === "converted" || alreadyLinked) {
      return NextResponse.json(
        { success: false, alreadyConverted: true, error: "Este prospecto ya fue convertido a cliente." },
        { status: 409 }
      );
    }

    // The stage must belong to the authenticated user's organization (never trust the client).
    let stageId: string | null = null;
    if (requestedStageId) {
      if (!(await stageBelongsToOrg(user!.organizationId, requestedStageId))) {
        return NextResponse.json(
          { success: false, error: "Etapa de pipeline no válida para su organización." },
          { status: 400 }
        );
      }
      stageId = requestedStageId;
    } else {
      const defaultStage = await prisma.pipelineStage.findFirst({
        where: { organizationId: user!.organizationId },
        orderBy: { order: "asc" },
      });
      stageId = defaultStage?.id ?? null;
    }

    // All-or-nothing: Client + Contact + Opportunity + status change + audit trail.
    // The status update acts as an atomic "claim": only one concurrent request can win it.
    const result = await prisma.$transaction(
      async (tx) => {
        const claim = await tx.lead.updateMany({
          where: {
            id: lead.id,
            organizationId: user!.organizationId,
            isDeleted: false,
            status: { not: "converted" },
          },
          data: { status: "converted" },
        });

        if (claim.count === 0) {
          throw new AlreadyConvertedError();
        }

        const client = await tx.client.create({
          data: {
            organizationId: user!.organizationId,
            ownerId: lead.ownerId || user!.id,
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

        await tx.contact.create({
          data: {
            organizationId: user!.organizationId,
            clientId: client.id,
            leadId: lead.id,
            firstName: lead.name,
            email: lead.email,
            phone: lead.phone,
            isPrimary: true,
          },
        });

        let opportunity = null;
        if (stageId) {
          opportunity = await tx.opportunity.create({
            data: {
              organizationId: user!.organizationId,
              stageId,
              clientId: client.id,
              leadId: lead.id,
              title: `Negocio: ${client.name}`,
              value: lead.estimatedValue || 0,
              probability: 50,
              status: "open",
              isDemo: lead.isDemo,
            },
          });
        }

        await tx.auditLog.create({
          data: {
            organizationId: user!.organizationId,
            userId: user!.id,
            action: "lead_converted_to_client",
            entityType: "Client",
            entityId: client.id,
            detailsJson: JSON.stringify({ leadId: lead.id, clientId: client.id, opportunityId: opportunity?.id }),
          },
        });

        return { client, opportunity };
      },
      { maxWait: 10000, timeout: 20000 }
    );

    return NextResponse.json({
      success: true,
      message: "Lead convertido a cliente con éxito",
      client: result.client,
      opportunity: result.opportunity,
    });
  } catch (error: any) {
    if (error instanceof AlreadyConvertedError) {
      return NextResponse.json(
        { success: false, alreadyConverted: true, error: "Este prospecto ya fue convertido a cliente." },
        { status: 409 }
      );
    }
    console.error("Convert lead error:", error);
    return NextResponse.json({ success: false, error: "Error al convertir prospecto." }, { status: 500 });
  }
}
