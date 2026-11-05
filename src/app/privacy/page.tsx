"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Shield, Lock, FileText, Database, UserCheck, Mail, ArrowLeft, Globe } from "lucide-react";

export default function PrivacyPolicyPage() {
  const [lang, setLang] = useState<"es" | "en">("es");

  return (
    <div className="min-h-screen bg-[#F6F5F2] text-[#141414] py-10 px-4 sm:px-6 lg:px-8">
      {/* Background Subtle Gradient Accents */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-gradient-to-tr from-[#D4AF37]/10 via-[#F3E6C4]/15 to-transparent rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-4xl mx-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-[#ECEAE3]">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#8C887E] hover:text-[#141414] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {lang === "es" ? "Volver al CRM" : "Back to CRM"}
          </Link>

          <div className="flex items-center gap-3">
            {/* Language Switcher */}
            <div className="inline-flex items-center bg-white rounded-full p-1 border border-[#ECEAE3] shadow-sm text-xs">
              <button
                type="button"
                onClick={() => setLang("es")}
                className={`px-3 py-1 rounded-full font-medium transition-all ${
                  lang === "es" ? "bg-[#141414] text-white shadow-sm" : "text-[#8C887E] hover:text-[#141414]"
                }`}
              >
                Español
              </button>
              <button
                type="button"
                onClick={() => setLang("en")}
                className={`px-3 py-1 rounded-full font-medium transition-all ${
                  lang === "en" ? "bg-[#141414] text-white shadow-sm" : "text-[#8C887E] hover:text-[#141414]"
                }`}
              >
                English
              </button>
            </div>

            <Link
              href="/data-deletion"
              className="text-xs font-medium text-[#B89025] hover:underline hidden sm:inline-block"
            >
              {lang === "es" ? "Eliminación de datos" : "Data Deletion"}
            </Link>
          </div>
        </div>

        {/* Header Hero */}
        <div className="bg-white rounded-3xl border border-[#ECEAE3] p-8 sm:p-10 shadow-sm mb-8 text-center relative overflow-hidden">
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
            <Shield className="w-3.5 h-3.5" />
            <span>Bunker Creative Agency LLC</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141414] tracking-tight">
            {lang === "es" ? "Política de Privacidad y Tratamiento de Datos" : "Privacy Policy & Data Protection"}
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-[#8C887E] max-w-2xl mx-auto font-medium">
            {lang === "es"
              ? "Información detallada sobre cómo recopilamos, procesamos y protegemos tus datos personales y los de tus prospectos en la plataforma Bunker CRM."
              : "Detailed information on how we collect, process, and protect your personal data and your prospective leads on the Bunker CRM platform."}
          </p>

          <div className="mt-4 text-[11px] text-[#A09B8F] flex items-center justify-center gap-2">
            <span>{lang === "es" ? "Última actualización:" : "Last updated:"}</span>
            <span className="font-semibold text-[#141414]">Octubre 2026</span>
          </div>
        </div>

        {/* Content Body */}
        <div className="bg-white rounded-3xl border border-[#ECEAE3] p-8 sm:p-12 shadow-sm space-y-10 text-sm leading-relaxed text-[#3B3A36]">
          {lang === "es" ? (
            <>
              {/* 1. Responsable */}
              <section>
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <Shield className="w-5 h-5 text-[#B89025]" />
                  <h2>1. Responsable del Tratamiento de Datos</h2>
                </div>
                <p>
                  <strong>Bunker Creative Agency LLC</strong> (en adelante, &ldquo;Bunker Agency&rdquo;, &ldquo;el CRM&rdquo; o &ldquo;nosotros&rdquo;) es una agencia y plataforma tecnológica dedicada a la gestión de relaciones con clientes, automatización de marketing y sincronización de pauta digital.
                </p>
                <p className="mt-2">
                  Esta Política de Privacidad regula el tratamiento de los datos recopilados a través de nuestro sitio web, aplicaciones conectadas, integraciones oficiales de Meta (Facebook, Instagram, Meta Ads), WhatsApp, Twilio y APIs de terceros.
                </p>
              </section>

              {/* 2. Datos recopilados */}
              <section>
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <Database className="w-5 h-5 text-[#B89025]" />
                  <h2>2. Datos que Recopilamos</h2>
                </div>
                <p>Recopilamos únicamente los datos necesarios para brindar los servicios del CRM y cumplir con las autorizaciones otorgadas por los usuarios y clientes:</p>
                <ul className="list-disc pl-5 mt-3 space-y-2 text-[#4A4844]">
                  <li>
                    <strong>Datos de Clientes Potenciales (Meta Lead Ads / Formularios):</strong> Nombre completo, correo electrónico, número de teléfono, nombre de empresa, ciudad y respuestas a preguntas personalizadas de formularios de anuncios de Facebook e Instagram.
                  </li>
                  <li>
                    <strong>Datos de Cuentas y Páginas Conectadas:</strong> Identificadores de cuentas publicitarias (Ad Account IDs), identificadores de Páginas de Facebook (Page IDs), perfiles comerciales de Instagram vinculados y métricas publicitarias agregadas (impresiones, clics, alcance, gasto publicitario).
                  </li>
                  <li>
                    <strong>Datos de Registro y Acceso:</strong> Correo electrónico corporativo, nombre, contraseñas debidamente encriptadas, roles de acceso y registros de auditoría de actividad dentro de la plataforma.
                  </li>
                  <li>
                    <strong>Comunicaciones:</strong> Historial de mensajes SMS, transcripciones o registros de llamadas comerciales realizados mediante proveedores autorizados (Twilio / telefonía) para seguimiento en el pipeline de ventas.
                  </li>
                </ul>
              </section>

              {/* 3. Finalidad del Tratamiento */}
              <section>
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <FileText className="w-5 h-5 text-[#B89025]" />
                  <h2>3. Finalidad del Tratamiento</h2>
                </div>
                <p>Utilizamos la información recopilada con las siguientes finalidades legítimas:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#ECEAE3]">
                    <span className="font-semibold text-[#141414] block text-xs mb-1">Sincronización de Leads</span>
                    <span className="text-xs text-[#6B675E]">Ingreso automático e instantáneo de prospectos de Meta Ads al pipeline de ventas del cliente.</span>
                  </div>
                  <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#ECEAE3]">
                    <span className="font-semibold text-[#141414] block text-xs mb-1">Reportes y Métricas</span>
                    <span className="text-xs text-[#6B675E]">Cálculo de retorno de inversión, costo por lead y rendimiento de campañas de pauta digital.</span>
                  </div>
                  <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#ECEAE3]">
                    <span className="font-semibold text-[#141414] block text-xs mb-1">Automatizaciones Comerciales</span>
                    <span className="text-xs text-[#6B675E]">Envío de mensajes de confirmación, asignación de tareas a asesores comerciales y seguimiento.</span>
                  </div>
                  <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#ECEAE3]">
                    <span className="font-semibold text-[#141414] block text-xs mb-1">Seguridad y Auditoría</span>
                    <span className="text-xs text-[#6B675E]">Prevención de fraudes, registros de accesos autorizados y cumplimiento contractual multi-inquilino.</span>
                  </div>
                </div>
              </section>

              {/* 4. Seguridad de los Datos */}
              <section>
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <Lock className="w-5 h-5 text-[#B89025]" />
                  <h2>4. Seguridad y Cifrado de Información</h2>
                </div>
                <p>
                  Bunker Agency aplica estrictos estándares de seguridad técnica y organizativa para proteger la confidencialidad e integridad de la información:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1.5 text-[#4A4844]">
                  <li>
                    <strong>Cifrado AES-256-GCM:</strong> Todos los tokens de acceso de Meta y credenciales de integración de terceros se almacenan cifrados con claves criptográficas seguras.
                  </li>
                  <li>
                    <strong>Aislamiento Multi-inquilino:</strong> La base de datos aplica políticas de seguridad por organización y cliente (RLS), garantizando que ningún usuario acceda a datos de otra empresa.
                  </li>
                  <li>
                    <strong>Transmisión Segura:</strong> Todo el tráfico entre tu navegador, Meta y nuestros servidores se efectúa mediante protocolo HTTPS/TLS con certificados de última generación.
                  </li>
                  <li>
                    <strong>No Comercialización ni Venta de Datos:</strong> Bunker Agency nunca vende, arrienda ni comercializa datos personales de usuarios o prospectos a terceros bajo ninguna circunstancia.
                  </li>
                  <li>
                    <strong>Protección de Datos Móviles (SMS / CTIA):</strong> No se compartirá información de telefonía móvil ni datos de consentimiento de suscripción (opt-in) con terceros ni afiliados para fines de marketing o promocionales. Todos los datos de consentimiento de mensajería de texto se mantienen en estricta confidencialidad y están excluidos de cualquier intercambio con terceros.
                  </li>
                </ul>
              </section>

              {/* 5. Terceros y Proveedores de Servicios */}
              <section>
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <Globe className="w-5 h-5 text-[#B89025]" />
                  <h2>5. Servicios de Terceros e Integraciones</h2>
                </div>
                <p>
                  Para prestar el servicio, el CRM interactúa exclusivamente con proveedores de infraestructura tecnológica de primer nivel bajo acuerdos de confidencialidad y procesamiento de datos:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1.5 text-[#4A4844]">
                  <li><strong>Meta Platforms, Inc. (Facebook & Instagram):</strong> Conexión vía Graph API para lectura de campañas, recepción de leads por webhook y administración autorizada.</li>
                  <li><strong>Supabase / PostgreSQL:</strong> Almacenamiento seguro en la nube y autenticación de usuarios.</li>
                  <li><strong>Twilio, Inc.:</strong> Procesamiento de mensajería SMS y telefonía VoIP para el equipo comercial.</li>
                </ul>
              </section>

              {/* 6. Derechos del Usuario y Eliminación */}
              <section>
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <UserCheck className="w-5 h-5 text-[#B89025]" />
                  <h2>6. Derechos de los Titulares y Retención de Datos</h2>
                </div>
                <p>
                  Tienes derecho a conocer, actualizar, rectificar y solicitar la supresión de tus datos personales en cualquier momento conforme a las normativas aplicables (GDPR, CCPA y leyes locales de protección de datos).
                </p>
                <div className="mt-3 p-4 bg-[#FAF9F6] rounded-2xl border border-[#ECEAE3]">
                  <p className="font-semibold text-[#141414] text-xs">
                    ¿Deseas revocar el acceso de Meta o solicitar la eliminación total de tus datos?
                  </p>
                  <p className="text-xs text-[#6B675E] mt-1">
                    Puedes consultar las instrucciones paso a paso o enviar una solicitud directa en nuestra página de{" "}
                    <Link href="/data-deletion" className="text-[#B89025] font-semibold underline">
                      Instrucciones de Eliminación de Datos de Usuario
                    </Link>.
                  </p>
                </div>
              </section>

              {/* 7. Contacto */}
              <section>
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <Mail className="w-5 h-5 text-[#B89025]" />
                  <h2>7. Contacto de Privacidad</h2>
                </div>
                <p>
                  Para cualquier duda, solicitud o ejercicio de derechos sobre tus datos personales, puedes contactar a nuestro equipo de privacidad y seguridad:
                </p>
                <div className="mt-3 inline-block p-4 bg-white rounded-xl border border-[#ECEAE3] text-xs space-y-1">
                  <p><strong>Bunker Creative Agency LLC</strong></p>
                  <p>Correo de Privacidad: <a href="mailto:privacidad@bunkeragency.com" className="text-[#B89025] underline">privacidad@bunkeragency.com</a></p>
                  <p>Soporte Técnico: <a href="mailto:soporte@bunkeragency.com" className="text-[#B89025] underline">soporte@bunkeragency.com</a></p>
                </div>
              </section>
            </>
          ) : (
            <>
              {/* English Version */}
              <section>
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <Shield className="w-5 h-5 text-[#B89025]" />
                  <h2>1. Data Controller</h2>
                </div>
                <p>
                  <strong>Bunker Creative Agency LLC</strong> (&ldquo;Bunker Agency&rdquo;, &ldquo;the CRM&rdquo;, or &ldquo;we&rdquo;) operates the Bunker CRM platform, providing client relationship management, marketing automation, and digital advertising synchronization.
                </p>
                <p className="mt-2">
                  This Privacy Policy describes how we collect, store, process, and protect information collected through our website, platform, official Meta integrations (Facebook, Instagram, Meta Ads), WhatsApp, Twilio, and third-party APIs.
                </p>
              </section>

              <section>
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <Database className="w-5 h-5 text-[#B89025]" />
                  <h2>2. Information We Collect</h2>
                </div>
                <p>We only collect data strictly necessary to deliver CRM services and in accordance with permissions granted by users:</p>
                <ul className="list-disc pl-5 mt-3 space-y-2 text-[#4A4844]">
                  <li>
                    <strong>Prospective Lead Data (Meta Lead Ads / Instant Forms):</strong> Full name, email address, phone number, company name, city, and form responses submitted through Facebook and Instagram ads.
                  </li>
                  <li>
                    <strong>Connected Accounts and Pages:</strong> Ad Account IDs, Facebook Page IDs, linked Instagram Business profiles, and aggregated performance metrics (impressions, clicks, reach, ad spend).
                  </li>
                  <li>
                    <strong>Account & Access Credentials:</strong> Corporate email, user names, securely hashed passwords, roles, and audit trail logs.
                  </li>
                  <li>
                    <strong>Communications Data:</strong> SMS records, call timestamps, and interaction logs processed via authorized telecommunication carriers (Twilio / telephony) for sales pipeline tracking.
                  </li>
                </ul>
              </section>

              <section>
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <FileText className="w-5 h-5 text-[#B89025]" />
                  <h2>3. How We Use Information</h2>
                </div>
                <p>We process collected data solely for legitimate business purposes:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#ECEAE3]">
                    <span className="font-semibold text-[#141414] block text-xs mb-1">Lead Synchronization</span>
                    <span className="text-xs text-[#6B675E]">Instant ingestion of Meta Lead Ads entries into the client’s sales pipeline.</span>
                  </div>
                  <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#ECEAE3]">
                    <span className="font-semibold text-[#141414] block text-xs mb-1">Performance Analytics</span>
                    <span className="text-xs text-[#6B675E]">Aggregating campaign insights, cost-per-lead, and digital marketing ROI.</span>
                  </div>
                  <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#ECEAE3]">
                    <span className="font-semibold text-[#141414] block text-xs mb-1">Commercial Automations</span>
                    <span className="text-xs text-[#6B675E]">Triggering automated follow-up messages and assigning leads to sales representatives.</span>
                  </div>
                  <div className="p-3.5 bg-[#FAF9F6] rounded-xl border border-[#ECEAE3]">
                    <span className="font-semibold text-[#141414] block text-xs mb-1">Security & Tenant Isolation</span>
                    <span className="text-xs text-[#6B675E]">Ensuring multi-tenant protection, preventing unauthorized access, and auditing platform actions.</span>
                  </div>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <Lock className="w-5 h-5 text-[#B89025]" />
                  <h2>4. Security & Encryption</h2>
                </div>
                <p>
                  Bunker Agency enforces industry-grade technical and organizational security safeguards:
                </p>
                <ul className="list-disc pl-5 mt-2 space-y-1.5 text-[#4A4844]">
                  <li>
                    <strong>AES-256-GCM Encryption:</strong> Meta OAuth tokens and third-party secrets are encrypted at rest using SHA-256 derived keys and authenticated AES-GCM tags.
                  </li>
                  <li>
                    <strong>Multi-tenant Isolation:</strong> Data access is strictly partitioned per organization and client account through database-level row security.
                  </li>
                  <li>
                    <strong>Data Protection Guarantee:</strong> We do not sell, rent, trade, or distribute your personal data or your leads&rsquo; data to any third party.
                  </li>
                  <li>
                    <strong>Mobile Messaging Data Privacy (CTIA / A2P 10DLC):</strong> No mobile information will be shared with third parties/affiliates for marketing/promotional purposes. All other categories exclude text messaging originator opt-in data and consent; this information will not be shared with any third parties.
                  </li>
                </ul>
              </section>

              <section>
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <UserCheck className="w-5 h-5 text-[#B89025]" />
                  <h2>5. User Rights & Data Deletion</h2>
                </div>
                <p>
                  You retain the right to access, rectify, restrict, or request the permanent deletion of your data at any time.
                </p>
                <div className="mt-3 p-4 bg-[#FAF9F6] rounded-2xl border border-[#ECEAE3]">
                  <p className="font-semibold text-[#141414] text-xs">
                    Need to remove permissions or request deletion of Facebook data?
                  </p>
                  <p className="text-xs text-[#6B675E] mt-1">
                    Follow the step-by-step instructions on our dedicated{" "}
                    <Link href="/data-deletion" className="text-[#B89025] font-semibold underline">
                      User Data Deletion Instructions Page
                    </Link>.
                  </p>
                </div>
              </section>

              <section>
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <Mail className="w-5 h-5 text-[#B89025]" />
                  <h2>6. Contact Us</h2>
                </div>
                <p>For any privacy inquiries or to exercise your data protection rights, please reach out to:</p>
                <div className="mt-3 inline-block p-4 bg-white rounded-xl border border-[#ECEAE3] text-xs space-y-1">
                  <p><strong>Bunker Creative Agency LLC</strong></p>
                  <p>Privacy Inquiries: <a href="mailto:privacy@bunkeragency.com" className="text-[#B89025] underline">privacy@bunkeragency.com</a></p>
                  <p>Technical Support: <a href="mailto:support@bunkeragency.com" className="text-[#B89025] underline">support@bunkeragency.com</a></p>
                </div>
              </section>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-[#8C887E]">
          <p>© {new Date().getFullYear()} Bunker Creative Agency LLC. Todos los derechos reservados.</p>
        </div>
      </div>
    </div>
  );
}
