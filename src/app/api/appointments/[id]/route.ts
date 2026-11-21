import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { updateAppointmentSchema } from "@/lib/validations/appointments";
import {
  getAppointmentById,
  updateAppointment,
  deleteAppointment,
} from "@/services/appointments.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const scope = {
      organizationId: user!.organizationId,
      clientId: user!.clientId,
      isClientUser: user!.isClientUser,
    };

    const appointment = await getAppointmentById(scope, params.id);
    if (!appointment) {
      return NextResponse.json(
        { success: false, error: "Cita no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, appointment });
  } catch (error) {
    console.error(`GET /api/appointments/${params.id} error:`, error);
    return NextResponse.json(
      { success: false, error: "Error al consultar la cita." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const rawBody = await req.json().catch(() => ({}));
    const parsed = updateAppointmentSchema.safeParse(rawBody);

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
    };

    const appointment = await updateAppointment(scope, params.id, parsed.data);

    return NextResponse.json({ success: true, appointment });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar la cita.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const scope = {
      organizationId: user!.organizationId,
      clientId: user!.clientId,
      isClientUser: user!.isClientUser,
    };

    await deleteAppointment(scope, params.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar la cita.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
