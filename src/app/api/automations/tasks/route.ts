import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createTaskAutomationSchema } from "@/lib/validations/task-automation";
import { AutomationClientNotFoundError } from "@/services/automations.service";
import {
  createTaskAutomation,
  listPipelineStageOptions,
  listTaskAutomations,
} from "@/services/task-automations.service";

export const dynamic = "force-dynamic";

/** GET /api/automations/tasks: reglas que crean tareas y etapas del pipeline (solo admin). */
export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const clientId = new URL(req.url).searchParams.get("clientId");
    const [automations, stages] = await Promise.all([
      listTaskAutomations(user!.organizationId, clientId),
      listPipelineStageOptions(user!.organizationId),
    ]);
    return NextResponse.json({ success: true, automations, stages });
  } catch (error) {
    console.error("GET /api/automations/tasks error:", error);
    return NextResponse.json({ success: false, error: "Error al consultar automatizaciones de tareas." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  const parsed = createTaskAutomationSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }

  try {
    const automation = await createTaskAutomation(user!.organizationId, user!.id, parsed.data);
    return NextResponse.json({ success: true, automation }, { status: 201 });
  } catch (error) {
    if (error instanceof AutomationClientNotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error("POST /api/automations/tasks error:", error);
    return NextResponse.json({ success: false, error: "Error al crear la automatización." }, { status: 500 });
  }
}
