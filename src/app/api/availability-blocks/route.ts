import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAvailabilityBlockSchema } from "@/lib/validations/availability";
import { createUserBlock, deleteUserBlock, listUserBlocks } from "@/services/availability.service";

export const dynamic = "force-dynamic";

/** Cada vendedor ve y administra solo sus propios bloqueos: userId y organizationId salen de la sesión. */
export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const blocks = await listUserBlocks(user!.organizationId, user!.id);
    return NextResponse.json({ success: true, blocks });
  } catch (error) {
    console.error("GET /api/availability-blocks error:", error);
    return NextResponse.json({ success: false, error: "No se pudieron cargar tus bloqueos." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const parsed = createAvailabilityBlockSchema.safeParse(await req.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Datos del bloqueo no válidos." },
        { status: 400 }
      );
    }

    const block = await createUserBlock(user!.organizationId, user!.id, parsed.data);
    return NextResponse.json({ success: true, block }, { status: 201 });
  } catch (error) {
    console.error("POST /api/availability-blocks error:", error);
    return NextResponse.json({ success: false, error: "No se pudo guardar el bloqueo." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Falta el bloqueo a eliminar." }, { status: 400 });
    }

    const deleted = await deleteUserBlock(user!.organizationId, user!.id, id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Bloqueo no encontrado." }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/availability-blocks error:", error);
    return NextResponse.json({ success: false, error: "No se pudo eliminar el bloqueo." }, { status: 500 });
  }
}
