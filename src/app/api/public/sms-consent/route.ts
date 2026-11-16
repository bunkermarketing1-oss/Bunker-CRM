import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { validateAndNormalizePhone } from "@/lib/phone";
import { LEAD_STATUS } from "@/lib/constants/crm";

const publicSmsConsentSchema = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres."),
  phone: z.string().trim().min(7, "El número telefónico es obligatorio."),
  email: z.string().trim().email("Formato de correo electrónico inválido.").optional().or(z.literal("")),
  consent: z.boolean().refine((val) => val === true, {
    message: "Debes aceptar los términos de consentimiento SMS para continuar.",
  }),
  language: z.enum(["es", "en"]).default("es"),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const parsed = publicSmsConsentSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message || "Datos incompletos o inválidos.",
        },
        { status: 400 }
      );
    }

    const { name, phone, email, language } = parsed.data;

    // Validar teléfono E.164
    const phoneCheck = validateAndNormalizePhone(phone);
    if (!phoneCheck.isValid || !phoneCheck.normalized) {
      return NextResponse.json(
        {
          success: false,
          error:
            language === "en"
              ? "Please provide a valid phone number with country code (e.g. +1 469 778 3339)."
              : "Por favor proporciona un número de teléfono válido con código de país (ej. +1 469 778 3339 o +57 300 123 4567).",
        },
        { status: 400 }
      );
    }

    const normalizedPhone = phoneCheck.normalized;

    // Buscar la organización de Bunker
    const org =
      (await prisma.organization.findFirst({ where: { slug: "bunker-agency" } })) ||
      (await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } }));

    if (!org) {
      return NextResponse.json(
        { success: false, error: "Servicio temporalmente no disponible." },
        { status: 500 }
      );
    }

    // 1. Si el número estaba en la lista de bajas (SmsOptOut), eliminarlo ya que el usuario
    // está otorgando opt-in explícito
    await prisma.smsOptOut
      .deleteMany({
        where: { phone: normalizedPhone },
      })
      .catch(() => {});

    // 2. Buscar o crear el Lead en la base de datos
    const now = new Date();
    const existingLead = await prisma.lead.findFirst({
      where: {
        organizationId: org.id,
        normalizedPhone,
      },
    });

    let leadId: string;
    if (existingLead) {
      const updated = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          name,
          email: email || existingLead.email,
          smsConsent: true,
          smsConsentAt: now,
          smsConsentSource: "sms_consent_page",
          smsOptOutAt: null,
          notes: existingLead.notes
            ? `${existingLead.notes}\n[${now.toISOString()}] Opt-in SMS renovado en /sms-consent`
            : `[${now.toISOString()}] Consentimiento SMS otorgado en /sms-consent`,
        },
        select: { id: true },
      });
      leadId = updated.id;
    } else {
      const created = await prisma.lead.create({
        data: {
          organizationId: org.id,
          name,
          email: email || null,
          phone: phoneCheck.formatted || phone,
          normalizedPhone,
          source: "website",
          status: LEAD_STATUS.NEW,
          smsConsent: true,
          smsConsentAt: now,
          smsConsentSource: "sms_consent_page",
          notes: `[${now.toISOString()}] Consentimiento SMS registrado en https://bunkervip.com/sms-consent`,
        },
        select: { id: true },
      });
      leadId = created.id;
    }

    // 3. Registrar auditoría del consentimiento legal
    await prisma.auditLog
      .create({
        data: {
          organizationId: org.id,
          action: "sms_consent_granted",
          entityType: "Lead",
          entityId: leadId,
          detailsJson: JSON.stringify({
            phone: normalizedPhone,
            name,
            email,
            ip: req.headers.get("x-forwarded-for") || "unknown",
            userAgent: req.headers.get("user-agent") || "unknown",
            sourceUrl: "https://bunkervip.com/sms-consent",
            timestamp: now.toISOString(),
            compliance: "Twilio_A2P_10DLC_CTIA",
          }),
        },
      })
      .catch(() => {});

    return NextResponse.json({
      success: true,
      message:
        language === "en"
          ? "Thank you! Your SMS subscription and consent have been verified."
          : "¡Muchas gracias! Tu suscripción y consentimiento de SMS han sido registrados con éxito.",
      phone: normalizedPhone,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("POST /api/public/sms-consent error:", error);
    return NextResponse.json(
      { success: false, error: "Error al procesar el consentimiento." },
      { status: 500 }
    );
  }
}
