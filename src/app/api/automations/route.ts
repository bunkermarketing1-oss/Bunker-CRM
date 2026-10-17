import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAutomationRules } from "@/services/automations.service";
import { createAutomationRuleSchema } from "@/lib/validations/automation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/automations
 * Lista las reglas de automatización de la organización del usuario autenticado.
 * Si no hay ninguna, inicializa las 5 reglas comerciales predeterminadas.
 */
export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const rules = await getAutomationRules(user!.organizationId);
    return NextResponse.json({ success: true, rules });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido al obtener reglas";
    console.error("GET /api/automations error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/automations
 * Registra una nueva regla de automatización validada con Zod.
 */
export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const parseResult = createAutomationRuleSchema.safeParse(body);

    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors;
      const firstError = Object.values(fieldErrors)[0]?.[0] || "Datos inválidos";
      return NextResponse.json({ success: false, error: firstError, fieldErrors }, { status: 400 });
    }

    const { name, triggerEvent, actionType, conditionJson, actionPayload, isActive } = parseResult.data;

    const created = await prisma.automationRule.create({
      data: {
        organizationId: user!.organizationId,
        name,
        triggerEvent,
        actionType,
        conditionJson: conditionJson || null,
        actionPayload: actionPayload || null,
        isActive,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: user!.organizationId,
        userId: user!.id,
        action: "automation_rule_created",
        entityType: "AutomationRule",
        entityId: created.id,
        detailsJson: JSON.stringify({ name, triggerEvent, actionType }),
      },
    });

    return NextResponse.json({ success: true, rule: created }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al crear regla de automatización";
    console.error("POST /api/automations error:", error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
