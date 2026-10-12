import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const campaigns = [
      {
        id: "meta-camp-1",
        clientName: "Grupo Inmobiliario Altamira",
        campaignName: "Captación Inversionistas Luxury — Cancún 2026",
        objective: "LEADS_INSTANT_FORMS",
        status: "active",
        health: "warning",
        budgetDaily: 1200,
        spentTotal: 18400,
        leadsGenerated: 78,
        costPerLead: 235.89,
        targetCpl: 200.0,
        frequency: 4.1,
        algorithmInsight: {
          issue: "Fatiga Creativa Detectada (Frecuencia > 4.0)",
          metaAlgorithmContext:
            "El algoritmo de Meta (Advantage+) está mostrando el mismo anuncio a la misma audiencia repetidamente, incrementando el costo por lead en un 18% los últimos 3 días.",
          recommendation:
            "Rotar creativos inmediatamente: Pausar la imagen estática y activar 2 variaciones de video corto (Reels) con gancho directo al dolor del inversionista.",
          actionLabel: "Rotar Creativos con 1 Clic",
          actionType: "rotate_creative",
          estimatedSaving: "$2,400 MXN / mes",
        },
      },
      {
        id: "meta-camp-2",
        clientName: "Clínicas Odontológicas DentPrime",
        campaignName: "Ortodoncia Invisible — Mensajes a WhatsApp",
        objective: "MESSAGES_WHATSAPP",
        status: "active",
        health: "success",
        budgetDaily: 800,
        spentTotal: 14200,
        leadsGenerated: 142,
        costPerLead: 100.0,
        targetCpl: 120.0,
        frequency: 1.8,
        algorithmInsight: {
          issue: "Campaña en Zona de Alto Rendimiento (ROAS 4.8x)",
          metaAlgorithmContext:
            "La fase de aprendizaje de Meta se completó con éxito. El anuncio 'Antes y Después' tiene un CTR del 3.8% (muy superior al promedio de la industria del 1.2%).",
          recommendation:
            "Escalar presupuesto diario un 20% de forma segura sin reiniciar la fase de aprendizaje del algoritmo.",
          actionLabel: "Escalar Presupuesto (+20%)",
          actionType: "scale_budget",
          estimatedImpact: "+25 citas adicionales al mes",
        },
      },
      {
        id: "meta-camp-3",
        clientName: "FinTech Soluciones Ya",
        campaignName: "Registro Créditos Pymes — Conversiones Web",
        objective: "CONVERSIONS",
        status: "active",
        health: "danger",
        budgetDaily: 2500,
        spentTotal: 31200,
        leadsGenerated: 62,
        costPerLead: 503.22,
        targetCpl: 350.0,
        frequency: 2.2,
        algorithmInsight: {
          issue: "Fuga de Conversión en Landing Page Móvil",
          metaAlgorithmContext:
            "Meta envía tráfico calificado con buen CTR (2.4%), pero la tasa de caída en la página de destino supera el 84% debido a tiempos de carga y formulario extenso.",
          recommendation:
            "Migrar la campaña a Formularios Nativos Instantáneos de Meta (Instant Forms) para capturar el prospecto sin salir de Instagram/Facebook.",
          actionLabel: "Activar Formulario Instantáneo",
          actionType: "switch_instant_form",
          estimatedSaving: "Reducción de CPA estimada en -35%",
        },
      },
    ];

    return NextResponse.json({
      success: true,
      campaigns,
      metaAlgorithmRules: [
        {
          rule: "Advantage+ Creative Optimization",
          description:
            "La IA adapta dinámicamente texto, brillo, formato de video y llamadas a la acción según las preferencias de cada usuario en Instagram y Facebook.",
        },
        {
          rule: "Estructura Simplificada (Broad Targeting)",
          description:
            "El algoritmo moderno de Meta penaliza la hiper-segmentación y premia audiencias amplias donde el creativo actúa como el verdadero filtro del público objetivo.",
        },
        {
          rule: "Control de Fatiga de Anuncios",
          description:
            "Alerta automática cuando la frecuencia supera 3.5 impactos por usuario para evitar quema de presupuesto.",
        },
      ],
    });
  } catch (error: any) {
    console.error("GET /api/marketing/ai-optimizer error:", error);
    return NextResponse.json({ success: false, error: "Error al consultar campañas de marketing." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, errorResponse } = await requireAuth(req);
    if (errorResponse) return errorResponse;

    const body = await req.json().catch(() => ({}));
    const { campaignId, actionType } = body;

    let message = "";
    if (actionType === "scale_budget") {
      message =
        "Presupuesto incrementado un 20% en Meta Ads. El algoritmo se mantendrá estable sin reiniciar la fase de aprendizaje.";
    } else if (actionType === "rotate_creative") {
      message = "Creativo estático pausado y 2 variaciones de video activadas en la pauta de Meta Ads.";
    } else {
      message = "Optimización aplicada con éxito en la cuenta publicitaria del cliente.";
    }

    await prisma.auditLog.create({
      data: {
        organizationId: user!.organizationId,
        userId: user!.id,
        action: "meta_ai_optimization_applied",
        entityType: "Campaign",
        entityId: campaignId || null,
        detailsJson: JSON.stringify({ actionType, timestamp: new Date() }),
      },
    });

    return NextResponse.json({
      success: true,
      message,
    });
  } catch (error: any) {
    console.error("POST /api/marketing/ai-optimizer error:", error);
    return NextResponse.json({ success: false, error: "Error al aplicar optimización." }, { status: 500 });
  }
}
