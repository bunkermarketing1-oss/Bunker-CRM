import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { clientBelongsToOrg } from "@/lib/validation-helpers";

export const dynamic = "force-dynamic";

/**
 * Asigna (o quita) una cuenta conectada (cuenta publicitaria, página, Instagram, TikTok)
 * a un cliente. El cliente verá sus campañas y métricas en el portal.
 * Body: { clientId: string | null }
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const clientId: string | null = body.clientId || null;

    const account = await prisma.connectedAccount.findFirst({
      where: { id: params.id, organizationId: user!.organizationId },
    });
    if (!account) {
      return NextResponse.json({ success: false, error: "Cuenta conectada no encontrada en su organización." }, { status: 404 });
    }

    if (clientId) {
      if (typeof clientId !== "string" || !(await clientBelongsToOrg(user!.organizationId, clientId))) {
        return NextResponse.json({ success: false, error: "El cliente especificado no pertenece a su organización." }, { status: 404 });
      }
    }

    const updated = await prisma.connectedAccount.update({
      where: { id: account.id },
      data: { clientId },
      select: { id: true, accountName: true, accountType: true, clientId: true, client: { select: { id: true, name: true } } },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user!.organizationId,
        userId: user!.id,
        action: clientId ? "connected_account_assigned" : "connected_account_unassigned",
        entityType: "ConnectedAccount",
        entityId: account.id,
        detailsJson: JSON.stringify({ accountName: account.accountName, fromClientId: account.clientId, toClientId: clientId }),
      },
    });

    return NextResponse.json({
      success: true,
      account: updated,
      message: clientId
        ? `${account.accountName} asignada a ${updated.client?.name}.`
        : `${account.accountName} ya no está asignada a ningún cliente.`,
    });
  } catch (error) {
    console.error("PATCH /api/integrations/accounts/[id] error:", error);
    return NextResponse.json({ success: false, error: "Error al asignar la cuenta." }, { status: 500 });
  }
}
