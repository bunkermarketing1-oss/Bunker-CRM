import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { validateAndNormalizePhone } from "@/lib/phone";
import { sendTwilioSms, testTwilioConnection } from "@/lib/integrations/twilio";

export const dynamic = "force-dynamic";

const testActionSchema = z.object({
  action: z.enum(["test_connection", "send_test_sms"]).default("test_connection"),
  to: z.string().optional(),
  credentials: z
    .object({
      accountSid: z.string().trim().optional(),
      authToken: z.string().trim().optional(),
      fromPhone: z.string().trim().optional(),
    })
    .optional(),
});

/**
 * GET /api/integrations/twilio/test
 * Verifica la conectividad de Twilio con las credenciales activas del servidor
 * y devuelve el estado, capacidades y URLs de webhooks.
 */
export async function GET(req: NextRequest) {
  try {
    const { errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const host = req.headers.get("host") ?? undefined;
    const testResult = await testTwilioConnection();

    return NextResponse.json({
      success: testResult.connected,
      ...testResult,
    });
  } catch (error) {
    console.error("GET /api/integrations/twilio/test error:", error);
    const message = error instanceof Error ? error.message : "Error al verificar conexión con Twilio.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/integrations/twilio/test
 * - action "test_connection": prueba credenciales específicas o las del entorno.
 * - action "send_test_sms": envía un SMS de prueba al número indicado para validar entrega real.
 */
export async function POST(req: NextRequest) {
  try {
    const { errorResponse } = await requireAdmin(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const parsed = testActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || "Datos inválidos." },
        { status: 400 }
      );
    }

    const { action, to, credentials } = parsed.data;

    if (action === "send_test_sms") {
      if (!to) {
        return NextResponse.json(
          { success: false, error: "Debes especificar un número de teléfono en formato internacional (ej: +52 55 1234 5678)." },
          { status: 400 }
        );
      }

      const phoneVal = validateAndNormalizePhone(to);
      if (!phoneVal.isValid || !phoneVal.normalized) {
        return NextResponse.json(
          { success: false, error: phoneVal.error || "El número no es válido o no cumple con el formato internacional E.164 (ej: +573001234567)." },
          { status: 400 }
        );
      }

      const sendResult = await sendTwilioSms(
        phoneVal.normalized,
        "Mensaje de prueba de Bunker CRM: La API de Twilio está conectada y funcionando correctamente."
      );

      if (sendResult.status !== "sent") {
        return NextResponse.json(
          {
            success: false,
            error: sendResult.errorMessage || "Twilio no pudo entregar el SMS de prueba.",
            isDemo: sendResult.isDemo,
          },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        message: `SMS de prueba enviado con éxito a ${phoneVal.normalized}.`,
        providerMsgId: sendResult.providerMsgId,
        isDemo: sendResult.isDemo,
      });
    }

    // action: "test_connection"
    const testResult = await testTwilioConnection(credentials);

    return NextResponse.json({
      success: testResult.connected,
      ...testResult,
    });
  } catch (error) {
    console.error("POST /api/integrations/twilio/test error:", error);
    const message = error instanceof Error ? error.message : "Error al procesar prueba de Twilio.";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
