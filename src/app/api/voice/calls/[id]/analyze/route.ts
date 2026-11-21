import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { scopeFromUser } from "@/lib/tenant";
import { analyzeCall } from "@/services/call-intelligence.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/voice/calls/[id]/analyze
 * Ejecuta o reintenta el análisis de inteligencia de llamada con IA (Whisper + resumen ejecutivo).
 */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  const scope = scopeFromUser(user!);
  if (!scope) {
    return NextResponse.json({ success: false, error: "Acceso no autorizado." }, { status: 403 });
  }

  // Verificar que la llamada pertenezca al scope del usuario
  const call = await prisma.call.findFirst({
    where: {
      id: params.id,
      organizationId: scope.organizationId,
      ...(scope.clientId ? { clientId: scope.clientId } : {}),
    },
    select: {
      id: true,
      recordingSid: true,
    },
  });

  if (!call) {
    return NextResponse.json({ success: false, error: "Llamada no encontrada o sin permisos de acceso." }, { status: 404 });
  }

  if (!call.recordingSid) {
    return NextResponse.json(
      { success: false, error: "La llamada no cuenta con grabación de audio disponible para analizar." },
      { status: 400 }
    );
  }

  try {
    const result = await analyzeCall(call.id);
    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error || "No se pudo completar el análisis." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      analysis: {
        summary: result.summary,
        keyTakeaways: result.keyTakeaways,
        actionItems: result.actionItems,
        sentiment: result.sentiment,
        transcription: result.transcription,
      },
    });
  } catch (error) {
    console.error(`Error en POST /api/voice/calls/${call.id}/analyze:`, error);
    const message = error instanceof Error ? error.message : "Error interno al analizar la llamada.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
