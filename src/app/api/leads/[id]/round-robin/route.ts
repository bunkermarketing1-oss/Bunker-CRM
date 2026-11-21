import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { scopeFromUser } from "@/lib/tenant";
import { assignLeadRoundRobin } from "@/services/round-robin.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/leads/[id]/round-robin
 * Ejecuta o fuerza la auto-asignación por Round-Robin del prospecto.
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  const scope = scopeFromUser(user!);
  if (!scope) {
    return NextResponse.json({ success: false, error: "Acceso no autorizado." }, { status: 403 });
  }

  const lead = await prisma.lead.findFirst({
    where: {
      id: params.id,
      organizationId: scope.organizationId,
      ...(scope.clientId ? { clientId: scope.clientId } : {}),
      isDeleted: false,
    },
    select: { id: true },
  });

  if (!lead) {
    return NextResponse.json({ success: false, error: "Prospecto no encontrado." }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const forceReassign = Boolean(body.forceReassign);
  const triggerInstantContact = body.triggerInstantContact !== undefined ? Boolean(body.triggerInstantContact) : true;

  try {
    const result = await assignLeadRoundRobin(lead.id, { forceReassign, triggerInstantContact });
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "No se pudo asignar el prospecto." }, { status: 400 });
    }

    const updatedLead = await prisma.lead.findUnique({
      where: { id: lead.id },
      include: {
        owner: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    return NextResponse.json({
      success: true,
      result,
      lead: updatedLead,
    });
  } catch (error) {
    console.error(`Error en POST /api/leads/${lead.id}/round-robin:`, error);
    const message = error instanceof Error ? error.message : "Error al procesar auto-asignación.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
