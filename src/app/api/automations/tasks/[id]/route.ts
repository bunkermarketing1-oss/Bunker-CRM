import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { updateTaskAutomationSchema } from "@/lib/validations/task-automation";
import { AutomationClientNotFoundError } from "@/services/automations.service";
import { deleteTaskAutomation, updateTaskAutomation } from "@/services/task-automations.service";

export const dynamic = "force-dynamic";

const NOT_FOUND = "Automatización no encontrada.";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  const parsed = updateTaskAutomationSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }

  try {
    const automation = await updateTaskAutomation(user!.organizationId, user!.id, params.id, parsed.data);
    if (!automation) return NextResponse.json({ success: false, error: NOT_FOUND }, { status: 404 });
    return NextResponse.json({ success: true, automation });
  } catch (error) {
    if (error instanceof AutomationClientNotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error("PATCH /api/automations/tasks/[id] error:", error);
    return NextResponse.json({ success: false, error: "Error al actualizar la automatización." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const deleted = await deleteTaskAutomation(user!.organizationId, user!.id, params.id);
    if (!deleted) return NextResponse.json({ success: false, error: NOT_FOUND }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/automations/tasks/[id] error:", error);
    return NextResponse.json({ success: false, error: "Error al eliminar la automatización." }, { status: 500 });
  }
}
