import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { getAiConfig } from "@/lib/integrations/openai";
import { clientAiAssistantSchema } from "@/lib/validations/ai-assistant";
import { getClientAiAssistant, saveClientAiAssistant } from "@/services/ai-assistant.service";
import type { ClientAiAssistantSettings } from "@/types/ai-assistant";

export const dynamic = "force-dynamic";

const NOT_FOUND = "Cliente no encontrado.";

/** Nunca se devuelve la clave: solo si está configurada y qué modelo se usa. */
function respond(settings: ClientAiAssistantSettings) {
  const { apiKey, model } = getAiConfig();
  return NextResponse.json({ success: true, settings, aiConfigured: Boolean(apiKey), model });
}

/** Asistente de IA fuera de horario del cliente. Solo admin: la base de conocimiento la carga Bunker. */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  try {
    const settings = await getClientAiAssistant(user!.organizationId, params.id);
    if (!settings) return NextResponse.json({ success: false, error: NOT_FOUND }, { status: 404 });
    return respond(settings);
  } catch (error) {
    console.error("GET /api/clients/[id]/ai-assistant error:", error);
    return NextResponse.json({ success: false, error: "Error al consultar el asistente de IA." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  const parsed = clientAiAssistantSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }

  try {
    const settings = await saveClientAiAssistant(user!.organizationId, user!.id, params.id, parsed.data);
    if (!settings) return NextResponse.json({ success: false, error: NOT_FOUND }, { status: 404 });
    return respond(settings);
  } catch (error) {
    console.error("PUT /api/clients/[id]/ai-assistant error:", error);
    return NextResponse.json({ success: false, error: "Error al guardar el asistente de IA." }, { status: 500 });
  }
}
