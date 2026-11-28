import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { createSmsAutomationSchema } from "@/lib/validations/automation";
import {
  AutomationClientNotFoundError,
  createSmsAutomation,
  listSmsAutomations,
} from "@/services/automations.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const clientId = new URL(req.url).searchParams.get("clientId");
    const automations = await listSmsAutomations(user!.organizationId, clientId);
    return NextResponse.json({ success: true, automations });
  } catch (error) {
    console.error("GET /api/automations error:", error);
    return NextResponse.json({ success: false, error: "Error al consultar automatizaciones." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  const parsed = createSmsAutomationSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }

  try {
    const automation = await createSmsAutomation(user!.organizationId, user!.id, parsed.data);
    return NextResponse.json({ success: true, automation }, { status: 201 });
  } catch (error) {
    if (error instanceof AutomationClientNotFoundError) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 });
    }
    console.error("POST /api/automations error:", error);
    return NextResponse.json({ success: false, error: "Error al crear la automatización." }, { status: 500 });
  }
}
