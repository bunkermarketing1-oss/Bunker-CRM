"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

type Language = "es" | "en";

const COMPANY_NAME = "Bunker Creative Agency LLC";
const DBA_NAME = "Bunker Marketing Agency";
const COMPANY_ADDRESS = "1870 Pacific Avenue, Ste 1870, Dallas, TX 75201, United States";
const CONTACT_EMAIL = "soporte@bunkeragency.com";
const CONTACT_PHONE = "+1 (469) 778-3339";

const CONTENT = {
  es: {
    back: "Volver al CRM",
    badge: "Cumplimiento Regulatorio SMS A2P 10DLC",
    title: "Consentimiento de Mensajería SMS",
    subtitle:
      "Formulario oficial de suscripción y autorización de mensajes de texto conforme a los estándares de Twilio, CTIA y regulaciones de telecomunicaciones.",
    updated: "Última actualización: Noviembre 2026",
    formTitle: "Registro de Consentimiento Expreso",
    formSubtitle:
      "Completa tus datos para autorizar o revalidar la recepción de notificaciones SMS.",
    nameLabel: "Nombre completo",
    namePlaceholder: "Ej. Juan Pérez",
    phoneLabel: "Número telefónico móvil (con código de país)",
    phonePlaceholder: "+1 (469) 778-3339 o +57 300 123 4567",
    phoneHelp: "Incluye el código de país (ej. +1 para Estados Unidos, +57 para Colombia, +52 para México).",
    emailLabel: "Correo electrónico (opcional)",
    emailPlaceholder: "tu-correo@ejemplo.com",
    consentTextBefore:
      "Acepto expresamente recibir mensajes de texto (SMS) automatizados y personalizados de ",
    companyHighlight: `${COMPANY_NAME} (${DBA_NAME})`,
    consentTextMiddle:
      " sobre confirmación de citas, soporte al cliente, seguimiento de proyectos y notificaciones comerciales al número provisto. Entiendo que mi consentimiento no es una condición para comprar productos o servicios. La frecuencia de mensajes es variable. ",
    ratesNotice: "Pueden aplicarse tarifas estándar de mensajes y datos según tu operador (Msg & data rates may apply).",
    optOutNotice:
      " Puedes cancelar la suscripción en cualquier momento respondiendo con la palabra STOP a cualquiera de nuestros mensajes. Para solicitar asistencia responde con la palabra HELP o escríbenos a ",
    termsIntro: " Consulta nuestros ",
    termsLink: "Términos y Condiciones",
    andWord: " y nuestra ",
    privacyLink: "Política de Privacidad",
    dot: ".",
    submitBtn: "Registrar Consentimiento SMS",
    submittingBtn: "Procesando consentimiento...",
    successTitle: "¡Consentimiento SMS Registrado con Éxito!",
    successSubtitle:
      "Tu autorización ha sido guardada en nuestra base de datos con marca de tiempo y verificación criptográfica.",
    registeredPhone: "Número registrado:",
    timestamp: "Fecha y hora:",
    stopHelpReminder:
      "Recuerda: Puedes enviar STOP en cualquier momento para darte de baja o HELP para recibir asistencia.",
    registerAnother: "Registrar otro número",
    legalSectionTitle: "Términos del Programa de Mensajería SMS (CTIA & A2P 10DLC)",
    programNameLabel: "Nombre del Programa:",
    programNameValue: "Notificaciones y Atención al Cliente de Bunker Agency",
    carriersLabel: "Operadores soportados:",
    carriersValue:
      "Compatible con todos los principales operadores de EE.UU. (AT&T, T-Mobile, Verizon, Sprint, Boost Mobile, etc.) y operadores internacionales. Los operadores no son responsables por mensajes retrasados o no entregados.",
    sharingLabel: "Política de no divulgación móvil:",
    sharingValue:
      "No vendemos, alquilamos ni compartimos tu número de teléfono móvil ni tus datos de consentimiento con terceros ni afiliados con fines de marketing o publicidad bajo ninguna circunstancia.",
    privacyLinkText: "Política de Privacidad",
    termsLinkText: "Términos de Servicio",
  },
  en: {
    back: "Back to CRM",
    badge: "SMS A2P 10DLC Regulatory Compliance",
    title: "SMS Messaging Consent & Opt-In",
    subtitle:
      "Official opt-in verification and consent form in accordance with Twilio, CTIA, and US carrier telecommunication regulations.",
    updated: "Last updated: November 2026",
    formTitle: "Express Written Consent Form",
    formSubtitle:
      "Fill out the form below to authorize or re-confirm text message communications.",
    nameLabel: "Full Name",
    namePlaceholder: "e.g. John Doe",
    phoneLabel: "Mobile Phone Number (with country code)",
    phonePlaceholder: "+1 (469) 778-3339",
    phoneHelp: "Please include your international country code (e.g. +1 for United States, +57 for Colombia, +52 for Mexico).",
    emailLabel: "Email address (optional)",
    emailPlaceholder: "you@example.com",
    consentTextBefore:
      "I expressly consent to receive automated and personalized SMS text messages from ",
    companyHighlight: `${COMPANY_NAME} (${DBA_NAME})`,
    consentTextMiddle:
      " regarding appointment confirmations, customer support, project updates, and marketing communications at the phone number provided above. I understand that consent is not a condition of purchasing any goods or services. Message frequency varies. ",
    ratesNotice: "Message and data rates may apply.",
    optOutNotice:
      " You can unsubscribe at any time by replying STOP to any text message. For help, reply HELP or contact us at ",
    termsIntro: " View our ",
    termsLink: "Terms and Conditions",
    andWord: " and ",
    privacyLink: "Privacy Policy",
    dot: ".",
    submitBtn: "Verify & Submit SMS Consent",
    submittingBtn: "Processing consent...",
    successTitle: "SMS Consent Successfully Verified!",
    successSubtitle:
      "Your authorization has been recorded in our compliance registry with timestamp verification.",
    registeredPhone: "Verified phone number:",
    timestamp: "Timestamp:",
    stopHelpReminder:
      "Reminder: You can reply STOP at any time to cancel receiving messages, or reply HELP for assistance.",
    registerAnother: "Submit another number",
    legalSectionTitle: "SMS Program Terms & Disclosures (CTIA & A2P 10DLC)",
    programNameLabel: "Program Name:",
    programNameValue: "Bunker Agency Customer Care & Notification Alerts",
    carriersLabel: "Supported Carriers:",
    carriersValue:
      "Compatible with all major US carriers including AT&T, T-Mobile, Verizon, Boost Mobile, and international providers. Carriers are not liable for delayed or undelivered messages.",
    sharingLabel: "Mobile Information Sharing Policy:",
    sharingValue:
      "No mobile information will be shared with third parties/affiliates for marketing or promotional purposes. All the above categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.",
    privacyLinkText: "Privacy Policy",
    termsLinkText: "Terms of Service",
  },
};

export default function SmsConsentPage() {
  const [lang, setLang] = useState<Language>("es");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    phone: string;
    timestamp: string;
    message: string;
  } | null>(null);

  const t = CONTENT[lang];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(lang === "en" ? "Full name is required." : "El nombre completo es obligatorio.");
      return;
    }

    if (!phone.trim()) {
      setError(
        lang === "en"
          ? "A valid mobile phone number is required."
          : "El número telefónico es obligatorio."
      );
      return;
    }

    if (!consent) {
      setError(
        lang === "en"
          ? "You must check the consent checkbox to agree to receive SMS communications."
          : "Debes marcar la casilla para confirmar tu consentimiento de recepción de SMS."
      );
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/public/sms-consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || undefined,
          consent: true,
          language: lang,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || (lang === "en" ? "Failed to record consent." : "Error al procesar el consentimiento."));
      }

      setSuccessData({
        phone: data.phone,
        timestamp: data.timestamp,
        message: data.message,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : (lang === "en" ? "Unexpected error occurred." : "Ocurrió un error inesperado.");
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setName("");
    setPhone("");
    setEmail("");
    setConsent(false);
    setError(null);
    setSuccessData(null);
  };

  return (
    <div className="min-h-screen bg-[#ECEEF2] dark:bg-[#0C0D12] text-[#121417] dark:text-white py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation & Language Switcher */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E5EB] dark:border-[#1F242D]">
          <Link
            href={ROUTES.LOGIN}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#8C929D] hover:text-[#121417] dark:hover:text-white transition-colors px-3 py-1.5 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4 text-amber-500" />
            {t.back}
          </Link>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center bg-white dark:bg-[#121417] rounded-full p-1 border border-[#E2E5EB] dark:border-[#1F242D] shadow-2xs text-xs">
              {(["es", "en"] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setLang(code);
                    setError(null);
                  }}
                  className={`px-3 py-1 rounded-full font-bold transition-all cursor-pointer ${
                    lang === code
                      ? "bg-[#121417] text-white dark:bg-white dark:text-[#121417] shadow-xs"
                      : "text-[#8C929D] hover:text-[#121417] dark:hover:text-white"
                  }`}
                >
                  {code === "es" ? "Español" : "English"}
                </button>
              ))}
            </div>
            <Link
              href={ROUTES.PRIVACY}
              className="text-xs font-bold text-amber-600 dark:text-amber-400 hover:underline hidden sm:inline-block"
            >
              {t.privacyLinkText}
            </Link>
          </div>
        </div>

        {/* Header Hero */}
        <div className="bg-white dark:bg-[#121417] rounded-[32px] border border-[#E2E5EB] dark:border-[#1F242D] p-8 sm:p-10 shadow-orvion text-center">
          <div className="inline-flex items-center justify-center p-3 bg-[#F8F9FA] dark:bg-[#181B22] rounded-2xl border border-[#E2E5EB] dark:border-[#242A35] shadow-2xs mb-4">
            <Image
              src="/bunker-logo.png"
              alt="Bunker Agency Logo"
              width={140}
              height={40}
              priority
              className="h-8 w-auto object-contain"
            />
          </div>
          <div className="block mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>{t.badge}</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#121417] dark:text-white">
            {t.title}
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-[#8C929D] font-medium max-w-xl mx-auto">
            {t.subtitle}
          </p>
          <div className="mt-4 text-[11px] text-[#8C929D] flex items-center justify-center gap-2 font-medium">
            <span>{t.updated}</span>
            <span>•</span>
            <span className="font-bold text-[#121417] dark:text-white">{COMPANY_NAME}</span>
          </div>
        </div>

        {/* Opt-in Form or Success State */}
        <div className="bg-white dark:bg-[#121417] rounded-[32px] border border-[#E2E5EB] dark:border-[#1F242D] p-8 sm:p-12 shadow-orvion">
          {successData ? (
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-[#121417] dark:text-white">
                  {t.successTitle}
                </h2>
                <p className="text-sm text-[#8C929D] max-w-md mx-auto">
                  {t.successSubtitle}
                </p>
              </div>

              <div className="max-w-md mx-auto bg-[#F8F9FA] dark:bg-[#181B22] rounded-2xl p-5 border border-[#E2E5EB] dark:border-[#242A35] text-left space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8C929D] font-medium">{t.registeredPhone}</span>
                  <span className="font-mono font-bold text-[#121417] dark:text-white">
                    {successData.phone}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[#8C929D] font-medium">{t.timestamp}</span>
                  <span className="font-mono text-[#121417] dark:text-white text-[11px]">
                    {new Date(successData.timestamp).toLocaleString(
                      lang === "es" ? "es-US" : "en-US",
                      { timeZone: "America/Chicago" }
                    )}{" "}
                    (CT)
                  </span>
                </div>
                <div className="pt-3 border-t border-[#E2E5EB] dark:border-[#242A35] text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{t.stopHelpReminder}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold bg-[#121417] text-white dark:bg-white dark:text-[#121417] hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
              >
                {t.registerAnother}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="border-b border-[#E2E5EB] dark:border-[#1F242D] pb-4">
                <h2 className="text-lg font-black text-[#121417] dark:text-white">
                  {t.formTitle}
                </h2>
                <p className="text-xs text-[#8C929D] mt-1 font-medium">{t.formSubtitle}</p>
              </div>

              {error && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-start gap-3 text-rose-700 dark:text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Name Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#121417] dark:text-white">
                  {t.nameLabel} <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.namePlaceholder}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-[#8C929D]"
                />
              </div>

              {/* Phone Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#121417] dark:text-white">
                  {t.phoneLabel} <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder={t.phonePlaceholder}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-[#8C929D]"
                  />
                  <Phone className="w-4 h-4 text-[#8C929D] absolute right-3.5 top-3 pointer-events-none" />
                </div>
                <p className="text-[11px] text-[#8C929D]">{t.phoneHelp}</p>
              </div>

              {/* Email Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-[#121417] dark:text-white">
                  {t.emailLabel}
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t.emailPlaceholder}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/50 transition-all placeholder:text-[#8C929D]"
                  />
                  <Mail className="w-4 h-4 text-[#8C929D] absolute right-3.5 top-3 pointer-events-none" />
                </div>
              </div>

              {/* Unchecked-by-default SMS Consent Checkbox (Strict CTIA/Twilio Compliance) */}
              <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-[#181B22] border border-[#E2E5EB] dark:border-[#242A35] space-y-3">
                <label className="flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="sms-opt-in-checkbox"
                    name="sms-consent"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer accent-amber-500"
                  />
                  <span className="text-xs leading-relaxed text-[#475467] dark:text-[#94A3B8]">
                    {t.consentTextBefore}
                    <strong className="text-[#121417] dark:text-white">
                      {t.companyHighlight}
                    </strong>
                    {t.consentTextMiddle}
                    <span className="font-semibold text-amber-700 dark:text-amber-400">
                      {t.ratesNotice}
                    </span>
                    {t.optOutNotice}
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      className="underline text-amber-600 dark:text-amber-400 hover:text-amber-700"
                    >
                      {CONTACT_EMAIL}
                    </a>
                    .{t.termsIntro}
                    <Link
                      href={ROUTES.TERMS}
                      target="_blank"
                      className="underline font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 inline-flex items-center gap-0.5"
                    >
                      {t.termsLink}
                      <ExternalLink className="w-3 h-3 inline" />
                    </Link>
                    {t.andWord}
                    <Link
                      href={ROUTES.PRIVACY}
                      target="_blank"
                      className="underline font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 inline-flex items-center gap-0.5"
                    >
                      {t.privacyLink}
                      <ExternalLink className="w-3 h-3 inline" />
                    </Link>
                    {t.dot}
                  </span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || !consent}
                className="w-full py-3.5 px-6 rounded-2xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-black shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t.submittingBtn}</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>{t.submitBtn}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Regulatory Disclosures & Business Information Section */}
        <div className="bg-white dark:bg-[#121417] rounded-[32px] border border-[#E2E5EB] dark:border-[#1F242D] p-8 sm:p-10 shadow-orvion space-y-6 text-xs text-[#475467] dark:text-[#94A3B8]">
          <h3 className="text-sm font-black text-[#121417] dark:text-white tracking-tight flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-500" />
            {t.legalSectionTitle}
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#181B22] border border-[#E2E5EB] dark:border-[#242A35] space-y-1">
              <span className="font-bold text-[#121417] dark:text-white block">
                {t.programNameLabel}
              </span>
              <p>{t.programNameValue}</p>
            </div>

            <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#181B22] border border-[#E2E5EB] dark:border-[#242A35] space-y-1">
              <span className="font-bold text-[#121417] dark:text-white block">
                {t.carriersLabel}
              </span>
              <p>{t.carriersValue}</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#F8F9FA] dark:bg-[#181B22] border border-[#E2E5EB] dark:border-[#242A35] space-y-2">
            <span className="font-bold text-[#121417] dark:text-white block flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              {t.sharingLabel}
            </span>
            <p className="leading-relaxed">{t.sharingValue}</p>
          </div>

          {/* Contact & Business Identification */}
          <div className="pt-4 border-t border-[#E2E5EB] dark:border-[#1F242D] grid grid-cols-1 sm:grid-cols-3 gap-3 text-[11px]">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-amber-500 shrink-0" />
              <span>{COMPANY_ADDRESS}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-500 shrink-0" />
              <a href={`mailto:${CONTACT_EMAIL}`} className="hover:underline font-medium">
                {CONTACT_EMAIL}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-500 shrink-0" />
              <a href={`tel:${CONTACT_PHONE.replace(/\s+/g, "")}`} className="hover:underline font-medium">
                {CONTACT_PHONE}
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[#8C929D] font-medium py-4 space-y-2">
          <div className="flex items-center justify-center gap-4">
            <Link href={ROUTES.TERMS} className="hover:text-[#121417] dark:hover:text-white underline">
              {t.termsLinkText}
            </Link>
            <span>•</span>
            <Link href={ROUTES.PRIVACY} className="hover:text-[#121417] dark:hover:text-white underline">
              {t.privacyLinkText}
            </Link>
            <span>•</span>
            <Link href={ROUTES.DATA_DELETION} className="hover:text-[#121417] dark:hover:text-white underline">
              Data Deletion
            </Link>
          </div>
          <p>
            © {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
