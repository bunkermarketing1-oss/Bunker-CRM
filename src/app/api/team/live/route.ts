import { NextRequest, NextResponse } from "next/server";
import { requireSupervisor } from "@/lib/auth";
import { scopeFromUser } from "@/lib/tenant";
import { clientBelongsToOrg } from "@/lib/validation-helpers";
import { teamLiveQuerySchema } from "@/lib/validations/team";
import { getTeamLiveView } from "@/services/team-live.service";
import type { TenantScope } from "@/types/tenant";

export const dynamic = "force-dynamic";

/**
 * Vista en vivo del equipo comercial. Bunker ve todos los clientes (o filtra uno con
 * `?clientId=`); el dueño solo su empresa, ignorando cualquier `clientId` del navegador.
 * Un asesor recibe 403 (requireSupervisor).
 */
export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireSupervisor(req);
  if (errorResponse) return errorResponse;

  const sessionScope = scopeFromUser(user!);
  if (!sessionScope) {
    return NextResponse.json({ success: false, error: "Usuario cliente no tiene empresa asociada." }, { status: 403 });
  }

  const parsed = teamLiveQuerySchema.safeParse({ clientId: req.nextUrl.searchParams.get("clientId") || undefined });
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }

  let scope: TenantScope = sessionScope;
  if (!user!.isClientUser && parsed.data.clientId) {
    if (!(await clientBelongsToOrg(user!.organizationId, parsed.data.clientId))) {
      return NextResponse.json({ success: false, error: "Cliente no pertenece a su organización." }, { status: 404 });
    }
    scope = { organizationId: user!.organizationId, clientId: parsed.data.clientId };
  }

  try {
    const view = await getTeamLiveView(scope);
    return NextResponse.json({ success: true, ...view });
  } catch (error) {
    console.error("GET /api/team/live error:", error);
    return NextResponse.json({ success: false, error: "Error al consultar la actividad del equipo." }, { status: 500 });
  }
}
