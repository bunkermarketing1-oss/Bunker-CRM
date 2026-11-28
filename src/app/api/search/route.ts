import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { scopeFromUser } from "@/lib/tenant";
import { SEARCH_MAX_LENGTH, SEARCH_MIN_LENGTH } from "@/lib/constants/search";
import { clientBelongsToOrg } from "@/lib/validation-helpers";
import { searchEverything } from "@/services/search.service";

export const dynamic = "force-dynamic";

/**
 * Búsqueda global (paleta ⌘K). Query: q (mín. 2 caracteres).
 * Un usuario CLIENT solo encuentra registros de su empresa: el scope se fuerza en servidor.
 * Un administrador con una marca activa (?clientId=) solo encuentra registros de esa marca.
 */
export async function GET(req: NextRequest) {
  const { user, errorResponse } = await requireAuth(req);
  if (errorResponse) return errorResponse;

  const term = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, SEARCH_MAX_LENGTH);
  const sessionScope = scopeFromUser(user!);
  const requestedClientId = new URL(req.url).searchParams.get("clientId");
  // El administrador solo puede acotar a una marca de su organización; al usuario CLIENT nunca se le amplía el alcance.
  const scope =
    sessionScope && !user!.isClientUser && requestedClientId && (await clientBelongsToOrg(user!.organizationId, requestedClientId))
      ? { ...sessionScope, clientId: requestedClientId }
      : sessionScope;
  if (term.length < SEARCH_MIN_LENGTH || !scope) {
    return NextResponse.json({ success: true, results: [] });
  }

  try {
    const results = await searchEverything(scope, term);
    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error("GET /api/search error:", error);
    return NextResponse.json({ success: false, error: "Error al buscar." }, { status: 500 });
  }
}
