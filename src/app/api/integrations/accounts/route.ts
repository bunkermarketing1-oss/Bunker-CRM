import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { connectAccountSchema } from "@/lib/validations/integrations";
import { ConnectedAccountError, connectAccount } from "@/services/integrations.service";

export const dynamic = "force-dynamic";

/**
 * POST /api/integrations/accounts
 * Conecta o registra manualmente una cuenta publicitaria o página social
 * (Facebook, Instagram, TikTok) y permite vincularla directamente
 * a un cliente o dejarla asignada al Portafolio BM de la Agencia.
 */
export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireAdmin(req);
  if (errorResponse) return errorResponse;

  const parsed = connectAccountSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || "Datos inválidos." }, { status: 400 });
  }

  try {
    const { account, clientName } = await connectAccount(
      { organizationId: user!.organizationId, userId: user!.id },
      parsed.data
    );

    return NextResponse.json({
      success: true,
      account,
      message: clientName
        ? `Cuenta "${account.accountName}" (${account.externalId}) vinculada exitosamente al cliente ${clientName}.`
        : `Cuenta "${account.accountName}" vinculada exitosamente al Portafolio BM de la Agencia.`,
    });
  } catch (error) {
    if (error instanceof ConnectedAccountError) {
      return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    }
    console.error("POST /api/integrations/accounts error:", error);
    return NextResponse.json({ success: false, error: "Error al conectar la cuenta." }, { status: 500 });
  }
}
