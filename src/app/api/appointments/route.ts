import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { createAppointmentSchema } from "@/lib/validations/appointments";
import { listAppointments, createAppointment } from "@/services/appointments.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId");
    const userId = searchParams.get("userId");
    const leadId = searchParams.get("leadId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const search = searchParams.get("search");

    const scope = {
      organizationId: user!.organizationId,
      clientId: user!.clientId,
      isClientUser: user!.isClientUser,
      userId: user!.id,
    };

    const result = await listAppointments(scope, {
      clientId,
      userId,
      leadId,
      status,
      startDate,
      endDate,
      search,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("GET /api/appointments error:", error);
    return NextResponse.json(
      { success: false, error: "Error al consultar las citas." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const rawBody = await req.json().catch(() => ({}));
    const parsed = createAppointmentSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Datos incompletos o inválidos.",
        },
        { status: 400 }
      );
    }

    const scope = {
      organizationId: user!.organizationId,
      clientId: user!.clientId,
      isClientUser: user!.isClientUser,
      userId: user!.id,
    };

    const appointment = await createAppointment(scope, parsed.data);

    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (error) {
    console.error("POST /api/appointments error:", error);
    return NextResponse.json(
      { success: false, error: "Error al programar la cita." },
      { status: 500 }
    );
  }
}
