import { NextResponse } from "next/server";
import { CallError } from "@/services/calls.service";

// Respuesta común de las rutas de voz (no es una ruta: no se llama route.ts).
export function voiceErrorResponse(error: unknown, context: string, fallback: string) {
  if (error instanceof CallError) {
    return NextResponse.json({ success: false, error: error.message }, { status: error.status });
  }
  console.error(`${context} error:`, error);
  return NextResponse.json({ success: false, error: fallback }, { status: 500 });
}
