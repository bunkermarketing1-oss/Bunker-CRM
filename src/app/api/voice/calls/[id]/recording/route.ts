import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { scopeFromUser } from "@/lib/tenant";
import { getTwilioConfig } from "@/lib/integrations/twilio";
import { ensureTwilioRuntimeConfig } from "@/services/integrations.service";

export const dynamic = "force-dynamic";

/**
 * GET /api/voice/calls/[id]/recording
 * Transmite de forma segura el audio MP3 de la grabación de la llamada
 * verificando los permisos de la organización/cliente del usuario.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  const scope = scopeFromUser(user!);
  if (!scope) {
    return NextResponse.json({ success: false, error: "Acceso no autorizado." }, { status: 403 });
  }

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

  if (!call || !call.recordingSid) {
    return NextResponse.json(
      { success: false, error: "No hay grabación disponible para esta llamada." },
      { status: 404 }
    );
  }

  await ensureTwilioRuntimeConfig();
  const cfg = getTwilioConfig();
  if (!cfg) {
    return NextResponse.json(
      { success: false, error: "Twilio no está configurado en el servidor." },
      { status: 503 }
    );
  }

  try {
    const authHeader = "Basic " + Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64");
    const recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Recordings/${call.recordingSid}.mp3`;

    const twilioRes = await fetch(recordingUrl, {
      method: "GET",
      headers: {
        Authorization: authHeader,
      },
      redirect: "follow",
    });

    if (!twilioRes.ok || !twilioRes.body) {
      return NextResponse.json(
        { success: false, error: "No se pudo recuperar el archivo de audio de Twilio." },
        { status: twilioRes.status || 502 }
      );
    }

    const contentType = twilioRes.headers.get("content-type") || "audio/mpeg";
    const contentLength = twilioRes.headers.get("content-length");

    const responseHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=86400",
      "Content-Disposition": `inline; filename="grabacion-${call.id}.mp3"`,
      "Accept-Ranges": "bytes",
    };
    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength;
    }

    return new Response(twilioRes.body, {
      status: 200,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`Error al transmitir grabación de llamada ${call.id}:`, error);
    const message = error instanceof Error ? error.message : "Error al procesar el audio de la llamada.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

