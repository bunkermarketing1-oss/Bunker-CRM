import { NextRequest, NextResponse } from "next/server";
import { publicBookingSchema } from "@/lib/validations/appointments";
import {
  getPublicBookingClientInfo,
  createPublicBooking,
} from "@/services/appointments.service";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const info = await getPublicBookingClientInfo(params.slug);
    if (!info) {
      return NextResponse.json(
        { success: false, error: "Página de citas no disponible o no encontrada." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, client: info });
  } catch (error) {
    console.error(`GET /api/public/booking/${params.slug} error:`, error);
    return NextResponse.json(
      { success: false, error: "Error al consultar disponibilidad." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed = publicBookingSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Datos incompletos o inválidos.",
        },
        { status: 400 }
      );
    }

    const appointment = await createPublicBooking(params.slug, parsed.data);

    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al procesar la reserva.";
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
