import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { toggleRuleStatus, updateAutomationRule } from "@/services/automations.service";
import { updateAutomationRuleSchema } from "@/lib/validations/automation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/automations/[id]
 * Modifica o activa/desactiva una regla existente de la organización.
 */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));

    // Si solo viene { isActive: boolean }, toggle directo
    if (typeof body.isActive === "boolean" && Object.keys(body).length === 1) {
      const updated = await toggleRuleStatus(
        user!.organizationId,
        params.id,
        body.isActive,
        user!.id
      );

      if (!updated) {
        return NextResponse.json(
          { success: false, error: "Regla de automatización no encontrada." },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, rule: updated });
    }

    // Validación completa con Zod si se actualizan más campos
    const parseResult = updateAutomationRuleSchema.safeParse(body);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0] || "Datos inválidos";
      return NextResponse.json({ success: false, error: firstError, fieldErrors }, { status: 400 });
    }

    const updated = await updateAutomationRule(
      user!.organizationId,
      params.id,
      parseResult.data,
      user!.id
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Regla de automatización no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, rule: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar regla";
    console.error("PATCH /api/automations/[id] error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * DELETE /api/automations/[id]
 * Elimina una regla perteneciente a la organización del usuario.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const rule = await prisma.automationRule.findFirst({
      where: { id: params.id, organizationId: user!.organizationId },
    });

    if (!rule) {
      return NextResponse.json(
        { success: false, error: "Regla no encontrada en su organización." },
        { status: 404 }
      );
    }

    await prisma.automationRule.delete({
      where: { id: rule.id },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user!.organizationId,
        userId: user!.id,
        action: "automation_rule_deleted",
        entityType: "AutomationRule",
        entityId: rule.id,
        detailsJson: JSON.stringify({ name: rule.name }),
      },
    });

    return NextResponse.json({ success: true, message: "Regla eliminada exitosamente." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar regla";
    console.error("DELETE /api/automations/[id] error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
