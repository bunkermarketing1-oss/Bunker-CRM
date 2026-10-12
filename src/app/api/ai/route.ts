import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { task, data } = body;

    if (!task) {
      return NextResponse.json({ success: false, error: "Tarea de IA no especificada." }, { status: 400 });
    }

    if (task === "qualify_lead") {
      const { name, companyName, source, estimatedValue, industry, notes } = data || {};
      const val = parseFloat(estimatedValue) || 0;

      let score = 65;
      const reason = [];

      if (val > 50000) {
        score += 20;
        reason.push("Presupuesto de inversión superior al promedio ($50K+ MXN)");
      } else if (val > 25000) {
        score += 10;
        reason.push("Presupuesto viable para servicios de pauta y contenido");
      }

      if (source === "referral") {
        score += 15;
        reason.push("Origen por recomendación directa (mayor tasa de cierre)");
      } else if (source === "google_ads" || source === "meta_ads") {
        score += 10;
        reason.push("Lead con intención activa captado mediante pauta digital");
      }

      if (companyName) {
        score += 5;
        reason.push("Empresa formalmente identificada");
      }

      score = Math.min(score, 98);

      const summary = `Lead de ${score}/100 de potencial. ${reason.join(
        ". "
      )}. Recomendación: Agendar videollamada de descubrimiento en las próximas 24 horas y enviar propuesta técnica de embudo híbrido.`;

      return NextResponse.json({
        success: true,
        score,
        summary,
        recommendedAction: "Agendar reunión de presentación técnica",
      });
    }

    if (task === "generate_copy") {
      const { topic, platform, tone, clientName } = data || {};
      const platformName = platform || "Instagram & Facebook";

      const variations = [
        `🚀 ¿Sigues perdiendo prospectos por tardar horas en responder? En ${
          clientName || "Bunker Agency"
        } implementamos embudos comerciales híbridos con IA que califican y agendan tus reuniones automáticamente. Dale clic al enlace del perfil y prueba una demo sin costo. #GrowthMarketing #VentasB2B #InteligenciaArtificial`,
        `📈 Multiplicar la facturación no requiere duplicar el equipo comercial: requiere automatización inteligente. Si tu negocio factura más de $20,000 USD/mes y quieres escalar tus conversiones de pauta en Meta y Google, esto es para ti. Déjanos un mensaje directo o comenta "ESCALAR" para enviarte la auditoría.`,
        `🎯 De 100 leads que llegan a tu campaña, ¿cuántos realmente cierran? La diferencia entre una agencia tradicional y un partner de crecimiento es la integración de CRM en tiempo real. Agenda tu sesión estratégica esta semana con nuestro equipo.`,
      ];

      return NextResponse.json({
        success: true,
        copies: variations,
      });
    }

    if (task === "generate_sms") {
      const { leadName, purpose, date } = data || {};
      const templates = [
        `Hola ${leadName || "estimado cliente"}, te confirmamos tu sesión estratégica con Bunker Agency para ${
          date || "mañana a las 11:00 AM"
        }. Responde 1 para confirmar.`,
        `Hola ${
          leadName || ""
        }, revisamos la información de tu empresa y preparamos una propuesta de pauta híbrida a tu medida. ¿Tienes 10 min hoy para revisarla?`,
        `Recordatorio Bunker: Tu reunión de análisis de campañas inicia en 1 hora. Te esperamos en el enlace enviado a tu correo.`,
      ];

      return NextResponse.json({
        success: true,
        templates,
      });
    }

    return NextResponse.json({ success: false, error: "Tarea no soportada." }, { status: 400 });
  } catch (error: any) {
    console.error("AI API error:", error);
    return NextResponse.json({ success: false, error: "Error al procesar solicitud de IA." }, { status: 500 });
  }
}
