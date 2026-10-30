import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { scopeFromUser } from "@/lib/tenant";
import { clientBelongsToOrg } from "@/lib/validation-helpers";
import { startCallSchema } from "@/lib/validations/voice";
import { listCalls, listLiveCalls, startOutboundCall } from "@/services/calls.service";
import { voiceErrorResponse } from "../_errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;
  let scope = scopeFromUser(user!);
  if (!scope) return NextResponse.json({ success: true, calls: [], liveCalls: [] });

  const clientId = new URL(req.url).searchParams.get("clientId");
  if (!user!.isClientUser && clientId && clientId !== "all") {
    const belongs = await clientBelongsToOrg(user!.organizationId, clientId);
    if (!belongs) {
      return NextResponse.json(
        { success: false, error: "Cliente no pertenece a su organización." },
        { status: 404 }
      );
    }
    scope = { organizationId: user!.organizationId, clientId };
  }

  try {
    const [calls, liveCalls] = await Promise.all([
      listCalls(scope),
      // Escuchar es de Bunker y del dueño del cliente (scope ya forzado a su empresa); un asesor no.
      user!.isClientUser && !user!.isClientOwner ? Promise.resolve([]) : listLiveCalls(scope),
    ]);
    return NextResponse.json({ success: true, calls, liveCalls });
  } catch (error) {
    return voiceErrorResponse(error, "GET /api/voice/calls", "Error al consultar llamadas.");
  }
}

/** Registra una llamada saliente a un lead; el navegador conecta después con el callId. */
export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;
  const scope = scopeFromUser(user!);
  if (!scope) return NextResponse.json({ success: false, error: "Usuario cliente no tiene empresa asociada." }, { status: 403 });

  const parsed = startCallSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }

  try {
    const result = await startOutboundCall(scope, user!.id, parsed.data.leadId as string);
    return NextResponse.json({ success: true, ...result }, { status: 201 });
  } catch (error) {
    return voiceErrorResponse(error, "POST /api/voice/calls", "Error al iniciar la llamada.");
  }
}
