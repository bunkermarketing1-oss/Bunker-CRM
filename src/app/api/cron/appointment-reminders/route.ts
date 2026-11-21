import { NextRequest, NextResponse } from "next/server";
import { isValidCronAuthorization } from "@/lib/cron";
import { processAppointmentReminders } from "@/services/appointments.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!isValidCronAuthorization(req.headers.get("authorization"))) {
    return NextResponse.json({ success: false, error: "No autorizado." }, { status: 401 });
  }

  try {
    const result = await processAppointmentReminders();
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error("POST /api/cron/appointment-reminders error:", error);
    return NextResponse.json(
      { success: false, error: "Error al procesar recordatorios de citas." },
      { status: 500 }
    );
  }
}
