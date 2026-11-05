"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, FileText } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

type Language = "es" | "en";

interface TermsSection {
  title: string;
  paragraphs: string[];
  bullets?: string[];
}

const COMPANY_NAME = "Bunker Creative Agency LLC";
const COMPANY_ADDRESS = "1870 Pacific Avenue, Ste 1870, Dallas, TX 75201, United States";
const CONTACT_EMAIL = "soporte@bunkeragency.com";

// El texto se mantiene como datos para que ambos idiomas tengan exactamente la misma estructura.
const TERMS_CONTENT: Record<Language, TermsSection[]> = {
  es: [
    {
      title: "1. Aceptación de los términos",
      paragraphs: [
        `Estos Términos y Condiciones regulan el uso de la plataforma Bunker CRM, operada por ${COMPANY_NAME} (“Bunker Agency”, “nosotros”). Al iniciar sesión o usar la plataforma aceptas estos términos. Si no estás de acuerdo, no uses el servicio.`,
      ],
    },
    {
      title: "2. Descripción del servicio",
      paragraphs: [
        "Bunker CRM es una plataforma de gestión de relaciones con clientes y marketing que permite, entre otras funciones:",
      ],
      bullets: [
        "Centralizar prospectos, oportunidades, tareas y actividades por empresa o marca.",
        "Sincronizar campañas y formularios de Meta (Facebook e Instagram) y consultar su rendimiento.",
        "Atender conversaciones de Facebook Messenger, Instagram Direct y SMS desde una bandeja unificada.",
        "Enviar SMS y realizar llamadas mediante proveedores de telecomunicaciones como Twilio.",
      ],
    },
    {
      title: "3. Cuentas, roles y acceso",
      paragraphs: [
        "El acceso es por invitación y se asigna según el rol (administrador, asesor o cliente). Eres responsable de mantener la confidencialidad de tus credenciales y de toda la actividad realizada con tu cuenta. Debes avisarnos de inmediato si sospechas un uso no autorizado.",
        "Cada empresa o marca solo puede ver sus propios datos. Está prohibido intentar acceder a información de otras organizaciones o clientes.",
      ],
    },
    {
      title: "4. Uso aceptable",
      paragraphs: ["Te comprometes a no utilizar la plataforma para:"],
      bullets: [
        "Actividades ilegales, fraudulentas o engañosas.",
        "Enviar spam, mensajes no solicitados o contenido ofensivo.",
        "Intentar vulnerar la seguridad, extraer datos de forma masiva o interferir con el servicio.",
        "Cargar datos de personas sin tener una base legal o su consentimiento para contactarlas.",
      ],
    },
    {
      title: "5. Integraciones y comunicaciones con terceros (SMS y Telefonía)",
      paragraphs: [
        "La plataforma se conecta con servicios de terceros (Meta, Twilio, entre otros). Al conectarlos autorizas a Bunker CRM a actuar en tu nombre dentro de los permisos que otorgues, y aceptas cumplir los términos y políticas de cada proveedor, incluidos los Términos de la Plataforma de Meta y las políticas de mensajería de Twilio.",
        "Comunicaciones SMS y cumplimiento CTIA / A2P 10DLC: Al utilizar las funciones de mensajería SMS de Bunker Agency, aceptas las siguientes condiciones del servicio:",
      ],
      bullets: [
        "Propósito del programa: Los mensajes SMS se envían para confirmación de citas, notificaciones de prospectos, servicio al cliente y seguimiento comercial.",
        "Frecuencia de mensajes: La frecuencia de los mensajes varía según la interacción y el consentimiento del usuario final.",
        "Tarifas: Pueden aplicarse cargos estándar por mensajes y datos según tu plan de telefonía móvil (Msg & data rates may apply).",
        "Instrucciones de baja (Opt-out): Puedes cancelar el servicio de mensajes de texto en cualquier momento enviando un SMS con la palabra STOP a cualquiera de nuestros mensajes. Tras enviar STOP, recibirás una confirmación y no se enviarán más mensajes.",
        "Ayuda y Soporte: Si necesitas asistencia, envía un SMS con la palabra HELP o comunícate con nosotros a soporte@bunkeragency.com o llamando al +1 (469) 778-3339.",
        "Responsabilidad de los operadores: Las empresas de telecomunicaciones (incluyendo AT&T, T-Mobile, Verizon) no son responsables por mensajes retrasados o no entregados.",
        "Privacidad de datos móviles: Los datos de telefonía móvil y el consentimiento de suscripción a mensajes de texto nunca se venden, comparten ni transfieren a terceros para fines de marketing o promocionales.",
      ],
    },
    {
      title: "6. Datos de clientes y prospectos",
      paragraphs: [
        "Los datos que cargas o sincronizas en la plataforma siguen siendo tuyos. Los tratamos únicamente para prestar el servicio, conforme a nuestra Política de Privacidad. Eres responsable de la licitud de los datos que incorporas y de atender las solicitudes de las personas titulares.",
      ],
    },
    {
      title: "7. Propiedad intelectual",
      paragraphs: [
        "La plataforma, su código, diseño y marcas pertenecen a Bunker Agency o a sus licenciantes. Se te concede un derecho limitado, no exclusivo e intransferible para usarla mientras tu acceso esté vigente. No puedes copiar, revender ni crear obras derivadas del servicio.",
      ],
    },
    {
      title: "8. Disponibilidad y limitación de responsabilidad",
      paragraphs: [
        "Procuramos mantener el servicio disponible, pero se ofrece “tal cual”, sin garantía de funcionamiento ininterrumpido o libre de errores. En la medida permitida por la ley, Bunker Agency no será responsable por daños indirectos, pérdida de ingresos, de prospectos o de datos derivados del uso o la imposibilidad de uso del servicio, ni por fallas de proveedores externos.",
      ],
    },
    {
      title: "9. Suspensión y terminación",
      paragraphs: [
        "Podemos suspender o cerrar cuentas que incumplan estos términos o pongan en riesgo la seguridad del servicio. Puedes dejar de usar la plataforma en cualquier momento y solicitar la eliminación de tus datos conforme a nuestra página de eliminación de datos.",
      ],
    },
    {
      title: "10. Cambios en los términos",
      paragraphs: [
        "Podemos actualizar estos términos. La fecha de última actualización aparece al inicio de esta página y el uso continuado del servicio implica la aceptación de la versión vigente.",
      ],
    },
    {
      title: "11. Ley aplicable",
      paragraphs: [
        "Estos términos se rigen por las leyes del Estado de Texas, Estados Unidos, sin perjuicio de las normas imperativas que te sean aplicables.",
      ],
    },
    {
      title: "12. Contacto",
      paragraphs: [`${COMPANY_NAME} — ${COMPANY_ADDRESS}. Correo: ${CONTACT_EMAIL}.`],
    },
  ],
  en: [
    {
      title: "1. Acceptance of terms",
      paragraphs: [
        `These Terms and Conditions govern the use of the Bunker CRM platform, operated by ${COMPANY_NAME} (“Bunker Agency”, “we”). By signing in or using the platform you agree to these terms. If you do not agree, do not use the service.`,
      ],
    },
    {
      title: "2. Description of the service",
      paragraphs: ["Bunker CRM is a customer relationship management and marketing platform that allows, among other things:"],
      bullets: [
        "Centralizing leads, opportunities, tasks and activities per company or brand.",
        "Syncing Meta (Facebook and Instagram) campaigns and forms and reviewing their performance.",
        "Handling Facebook Messenger, Instagram Direct and SMS conversations from a unified inbox.",
        "Sending SMS and placing calls through telecommunications providers such as Twilio.",
      ],
    },
    {
      title: "3. Accounts, roles and access",
      paragraphs: [
        "Access is by invitation and is assigned by role (administrator, sales representative or client). You are responsible for keeping your credentials confidential and for all activity under your account. Notify us immediately if you suspect unauthorized use.",
        "Each company or brand can only see its own data. Attempting to access information from other organizations or clients is prohibited.",
      ],
    },
    {
      title: "4. Acceptable use",
      paragraphs: ["You agree not to use the platform to:"],
      bullets: [
        "Engage in illegal, fraudulent or deceptive activities.",
        "Send spam, unsolicited messages or offensive content.",
        "Attempt to breach security, mass-extract data or interfere with the service.",
        "Upload data of people without a legal basis or their consent to contact them.",
      ],
    },
    {
      title: "5. Third-party integrations and communications (SMS & Telephony)",
      paragraphs: [
        "The platform connects to third-party services (Meta, Twilio, among others). By connecting them you authorize Bunker CRM to act on your behalf within the permissions you grant, and you agree to comply with each provider’s terms and policies, including the Meta Platform Terms and Twilio’s messaging policies.",
        "SMS Communications & CTIA / A2P 10DLC Compliance: By using Bunker Agency's SMS messaging features, you agree to the following terms:",
      ],
      bullets: [
        "Program Description: SMS messages are sent for appointment confirmations, lead notifications, customer service, and commercial follow-ups.",
        "Message Frequency: Message frequency varies depending on user engagement and inquiry activity.",
        "Rates: Message and data rates may apply according to your wireless carrier plan (Msg & data rates may apply).",
        "Opt-out Instructions: You can cancel the SMS service at any time by texting STOP to any message received. Upon sending STOP, you will receive a confirmation message and no further text messages will be sent.",
        "Help & Support: If you need assistance, text HELP to any message or contact our support team at support@bunkeragency.com or call +1 (469) 778-3339.",
        "Carrier Liability: Wireless carriers (including AT&T, T-Mobile, Verizon) are not liable for delayed or undelivered messages.",
        "Mobile Data Protection: Mobile information and text messaging originator opt-in data will not be shared, rented, or sold to third parties for marketing purposes.",
      ],
    },
    {
      title: "6. Client and lead data",
      paragraphs: [
        "The data you upload or sync into the platform remains yours. We process it only to provide the service, in accordance with our Privacy Policy. You are responsible for the lawfulness of the data you add and for handling requests from data subjects.",
      ],
    },
    {
      title: "7. Intellectual property",
      paragraphs: [
        "The platform, its code, design and trademarks belong to Bunker Agency or its licensors. You are granted a limited, non-exclusive, non-transferable right to use it while your access is active. You may not copy, resell or create derivative works of the service.",
      ],
    },
    {
      title: "8. Availability and limitation of liability",
      paragraphs: [
        "We strive to keep the service available, but it is provided “as is”, with no guarantee of uninterrupted or error-free operation. To the extent permitted by law, Bunker Agency is not liable for indirect damages, loss of revenue, leads or data arising from the use of or inability to use the service, or for failures of third-party providers.",
      ],
    },
    {
      title: "9. Suspension and termination",
      paragraphs: [
        "We may suspend or close accounts that breach these terms or put the security of the service at risk. You may stop using the platform at any time and request deletion of your data through our data deletion page.",
      ],
    },
    {
      title: "10. Changes to the terms",
      paragraphs: [
        "We may update these terms. The last-updated date appears at the top of this page, and continued use of the service means you accept the current version.",
      ],
    },
    {
      title: "11. Governing law",
      paragraphs: [
        "These terms are governed by the laws of the State of Texas, United States, without prejudice to any mandatory rules that apply to you.",
      ],
    },
    {
      title: "12. Contact",
      paragraphs: [`${COMPANY_NAME} — ${COMPANY_ADDRESS}. Email: ${CONTACT_EMAIL}.`],
    },
  ],
};

const COPY: Record<Language, { back: string; title: string; subtitle: string; updated: string; privacy: string }> = {
  es: {
    back: "Volver al CRM",
    title: "Términos y Condiciones de Uso",
    subtitle: "Reglas de uso de la plataforma Bunker CRM.",
    updated: "Última actualización:",
    privacy: "Política de Privacidad",
  },
  en: {
    back: "Back to CRM",
    title: "Terms and Conditions of Use",
    subtitle: "Rules for using the Bunker CRM platform.",
    updated: "Last updated:",
    privacy: "Privacy Policy",
  },
};

export default function TermsPage() {
  const [lang, setLang] = useState<Language>("es");
  const copy = COPY[lang];

  return (
    <div className="min-h-screen bg-[#F6F5F2] text-[#141414] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#ECEAE3]">
          <Link
            href={ROUTES.LOGIN}
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#8C887E] hover:text-[#141414] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {copy.back}
          </Link>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center bg-white rounded-full p-1 border border-[#ECEAE3] shadow-sm text-xs">
              {(["es", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`px-3 py-1 rounded-full font-medium transition-all ${
                    lang === code ? "bg-[#141414] text-white shadow-sm" : "text-[#8C887E] hover:text-[#141414]"
                  }`}
                >
                  {code === "es" ? "Español" : "English"}
                </button>
              ))}
            </div>
            <Link href={ROUTES.PRIVACY} className="text-xs font-medium text-[#B89025] hover:underline hidden sm:inline-block">
              {copy.privacy}
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#ECEAE3] p-8 sm:p-10 shadow-sm mb-8 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl border border-[#ECEAE3] shadow-xs mb-4">
            <Image
              src="/bunker-logo.png"
              alt="Bunker Agency Logo"
              width={140}
              height={40}
              priority
              className="h-8 w-auto object-contain"
            />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/10 text-[#9E7D1A] text-xs font-semibold mb-3">
            <FileText className="w-3.5 h-3.5" />
            <span>{COMPANY_NAME}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{copy.title}</h1>
          <p className="mt-2 text-xs sm:text-sm text-[#8C887E] font-medium">{copy.subtitle}</p>
          <div className="mt-4 text-[11px] text-[#A09B8F] flex items-center justify-center gap-2">
            <span>{copy.updated}</span>
            <span className="font-semibold text-[#141414]">{lang === "es" ? "Noviembre 2026" : "November 2026"}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#ECEAE3] p-8 sm:p-12 shadow-sm space-y-8 text-sm leading-relaxed text-[#3B3A36]">
          {TERMS_CONTENT[lang].map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-bold text-[#141414] mb-3">{section.title}</h2>
              {section.paragraphs.map((text) => (
                <p key={text} className="mt-2 first:mt-0">
                  {text}
                </p>
              ))}
              {section.bullets && (
                <ul className="list-disc pl-5 mt-3 space-y-2 text-[#4A4844]">
                  {section.bullets.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        <div className="mt-8 text-center text-xs text-[#8C887E]">
          <p>
            © {new Date().getFullYear()} {COMPANY_NAME}. {lang === "es" ? "Todos los derechos reservados." : "All rights reserved."}
          </p>
        </div>
      </div>
    </div>
  );
}
