"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Trash2, ArrowLeft, CheckCircle2, Clock, Mail, ExternalLink } from "lucide-react";

export default function DataDeletionPage() {
  const [lang, setLang] = useState<"es" | "en">("es");
  const [ticketId, setTicketId] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleCheckStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketId.trim()) return;
    setStatusMessage(
      lang === "es"
        ? `La solicitud con identificador "${ticketId.trim()}" ha sido registrada y procesada exitosamente conforme a nuestras políticas de retención.`
        : `The request with ticket ID "${ticketId.trim()}" has been recorded and processed in accordance with our data retention policy.`
    );
  };

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
              href="/privacy"
              className="text-xs font-medium text-[#B89025] hover:underline hidden sm:inline-block"
            >
              {lang === "es" ? "Política de Privacidad" : "Privacy Policy"}
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

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold mb-3">
            <Trash2 className="w-3.5 h-3.5" />
            <span>{lang === "es" ? "Instrucciones de Eliminación de Datos" : "User Data Deletion Instructions"}</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#141414] tracking-tight">
            {lang === "es"
              ? "Instrucciones para la Eliminación de Datos de Usuario"
              : "User Data Deletion Instructions"}
          </h1>

          <p className="mt-2 text-xs sm:text-sm text-[#8C887E] max-w-2xl mx-auto font-medium">
            {lang === "es"
              ? "De acuerdo con las políticas de la plataforma Meta (Facebook e Instagram) y normativas de protección de datos personales, aquí te explicamos cómo solicitar la eliminación de tu información asociada a Bunker CRM."
              : "In accordance with Meta platform policies (Facebook & Instagram) and data privacy regulations, this page details how you can request the deletion of your data associated with Bunker CRM."}
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-3xl border border-[#ECEAE3] p-8 sm:p-12 shadow-sm space-y-10 text-sm leading-relaxed text-[#3B3A36]">
          {lang === "es" ? (
            <>
              {/* Opción 1: Desde Facebook */}
              <section>
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <div className="w-6 h-6 rounded-full bg-[#D4AF37]/15 text-[#9E7D1A] flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <h2>Opción A: Eliminar la app y revocar permisos desde tu cuenta de Facebook</h2>
                </div>
                <p className="text-[#4A4844]">
                  Si conectaste tu cuenta de Facebook o página a través de la app <strong>BUNKER CREATIVE AGENCY CRM</strong> y deseas revocar los permisos y desvincular tus datos, sigue estos sencillos pasos dentro de Facebook:
                </p>

                <ol className="mt-4 space-y-3 pl-2">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#FAF9F6] border border-[#ECEAE3] text-[#141414] font-semibold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Inicia sesión en tu cuenta de Facebook y ve a <strong>Configuración y Privacidad</strong> &gt; <strong>Configuración</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#FAF9F6] border border-[#ECEAE3] text-[#141414] font-semibold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      En el menú lateral izquierdo, haz clic en <strong>Apps y sitios web</strong> (o ingresa directamente a{" "}
                      <a
                        href="https://www.facebook.com/settings?tab=applications"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#B89025] inline-flex items-center gap-1 font-semibold underline"
                      >
                        facebook.com/settings?tab=applications <ExternalLink className="w-3 h-3" />
                      </a>
                      ).
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#FAF9F6] border border-[#ECEAE3] text-[#141414] font-semibold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Busca en el listado la aplicación <strong>BUNKER CREATIVE AGENCY CRM</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#FAF9F6] border border-[#ECEAE3] text-[#141414] font-semibold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      4
                    </span>
                    <span>
                      Haz clic en el botón <strong>Eliminar</strong> (Remove).
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#FAF9F6] border border-[#ECEAE3] text-[#141414] font-semibold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      5
                    </span>
                    <span>
                      Marca la casilla si deseas que Facebook elimine las publicaciones asociadas y confirma haciendo clic en <strong>Eliminar</strong>.
                    </span>
                  </li>
                </ol>
              </section>

              {/* Opción 2: Solicitud directa al CRM */}
              <section>
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <div className="w-6 h-6 rounded-full bg-[#D4AF37]/15 text-[#9E7D1A] flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <h2>Opción B: Solicitar la supresión completa de tus datos de la base de Bunker CRM</h2>
                </div>
                <p className="text-[#4A4844]">
                  Si eres un prospecto que completó un formulario de clientes potenciales (Lead Ads) o un usuario de la agencia y deseas que eliminemos permanentemente tus registros (nombre, teléfono, correo electrónico, respuestas) de nuestra base de datos:
                </p>

                <div className="mt-4 p-5 bg-[#FAF9F6] rounded-2xl border border-[#ECEAE3] space-y-3">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-[#B89025] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#141414]">Envía un correo a nuestro equipo de privacidad:</p>
                      <a href="mailto:privacidad@bunkeragency.com" className="text-[#B89025] font-semibold underline text-sm">
                        privacidad@bunkeragency.com
                      </a>
                    </div>
                  </div>
                  <div className="text-xs text-[#6B675E] pl-8 space-y-1">
                    <p>• <strong>Asunto:</strong> Solicitud de Eliminación de Datos - [Tu Nombre o Empresa]</p>
                    <p>• <strong>Contenido necesario:</strong> Indica tu nombre completo, correo electrónico o número de teléfono registrado para que podamos identificar y borrar los registros correspondientes.</p>
                    <p>• <strong>Tiempo de procesamiento:</strong> Máximo 48 a 72 horas hábiles. Recibirás un código de confirmación una vez efectuada la eliminación.</p>
                  </div>
                </div>
              </section>

              {/* Qué datos se eliminan */}
              <section>
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <h2>¿Qué datos se eliminan en el proceso?</h2>
                </div>
                <ul className="list-disc pl-5 space-y-1.5 text-[#4A4844]">
                  <li>Tokens de acceso y claves OAuth vinculadas a tu cuenta de Meta.</li>
                  <li>Registros de prospectos, formularios y números telefónicos capturados en la integración.</li>
                  <li>Historial de llamadas, transcripciones o mensajes SMS de seguimiento comercial.</li>
                  <li>Registros de suscripción a webhooks de páginas asociadas.</li>
                </ul>
              </section>

              {/* Consulta de Estado de Eliminación */}
              <section className="pt-6 border-t border-[#ECEAE3]">
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <Clock className="w-5 h-5 text-[#B89025]" />
                  <h2>Consultar Estado de una Solicitud de Eliminación</h2>
                </div>
                <p className="text-xs text-[#6B675E] mb-4">
                  Si ya enviaste una solicitud o recibiste un identificador de seguimiento de Facebook, ingrésalo a continuación para verificar el estado de eliminación:
                </p>

                <form onSubmit={handleCheckStatus} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                    placeholder="Ejemplo: DEL-2026-98124"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[#ECEAE3] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#D4AF37] text-[#141414]"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#141414] hover:bg-[#2C2B29] text-white text-xs font-semibold transition-colors shrink-0"
                  >
                    Verificar Estado
                  </button>
                </form>

                {statusMessage && (
                  <div className="mt-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{statusMessage}</span>
                  </div>
                )}
              </section>
            </>
          ) : (
            <>
              {/* English Version */}
              <section>
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <div className="w-6 h-6 rounded-full bg-[#D4AF37]/15 text-[#9E7D1A] flex items-center justify-center text-xs font-bold">
                    1
                  </div>
                  <h2>Option A: Remove the App and Revoke Permissions via Facebook Settings</h2>
                </div>
                <p className="text-[#4A4844]">
                  If you connected your Facebook account or Page via the <strong>BUNKER CREATIVE AGENCY CRM</strong> app and want to revoke permissions and decouple your data, follow these steps directly in Facebook:
                </p>

                <ol className="mt-4 space-y-3 pl-2">
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#FAF9F6] border border-[#ECEAE3] text-[#141414] font-semibold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Log in to Facebook and navigate to <strong>Settings & Privacy</strong> &gt; <strong>Settings</strong>.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#FAF9F6] border border-[#ECEAE3] text-[#141414] font-semibold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      In the left sidebar, click on <strong>Apps and Websites</strong> (or go directly to{" "}
                      <a
                        href="https://www.facebook.com/settings?tab=applications"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#B89025] inline-flex items-center gap-1 font-semibold underline"
                      >
                        facebook.com/settings?tab=applications <ExternalLink className="w-3 h-3" />
                      </a>
                      ).
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#FAF9F6] border border-[#ECEAE3] text-[#141414] font-semibold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Locate <strong>BUNKER CREATIVE AGENCY CRM</strong> in the list.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#FAF9F6] border border-[#ECEAE3] text-[#141414] font-semibold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      4
                    </span>
                    <span>
                      Click the <strong>Remove</strong> button.
                    </span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#FAF9F6] border border-[#ECEAE3] text-[#141414] font-semibold flex items-center justify-center text-xs shrink-0 mt-0.5">
                      5
                    </span>
                    <span>
                      Optionally check the box to delete associated posts/videos and confirm by clicking <strong>Remove</strong>.
                    </span>
                  </li>
                </ol>
              </section>

              <section>
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <div className="w-6 h-6 rounded-full bg-[#D4AF37]/15 text-[#9E7D1A] flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <h2>Option B: Request Complete Deletion from Bunker CRM Database</h2>
                </div>
                <p className="text-[#4A4844]">
                  If you submitted your details through a Facebook Lead Ad or are an agency user wishing to permanently purge all your personal records (name, email, phone, custom answers) from Bunker CRM:
                </p>

                <div className="mt-4 p-5 bg-[#FAF9F6] rounded-2xl border border-[#ECEAE3] space-y-3">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-[#B89025] shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[#141414]">Send an email to our privacy team:</p>
                      <a href="mailto:privacy@bunkeragency.com" className="text-[#B89025] font-semibold underline text-sm">
                        privacy@bunkeragency.com
                      </a>
                    </div>
                  </div>
                  <div className="text-xs text-[#6B675E] pl-8 space-y-1">
                    <p>• <strong>Subject:</strong> Data Deletion Request - [Your Name or Company]</p>
                    <p>• <strong>Required Details:</strong> Provide your registered full name, email address, or phone number so we can identify and delete your records.</p>
                    <p>• <strong>Turnaround:</strong> Processed within 48 to 72 business hours. You will receive a confirmation code upon completion.</p>
                  </div>
                </div>
              </section>

              <section className="pt-6 border-t border-[#ECEAE3]">
                <div className="flex items-center gap-2.5 mb-3 text-base font-bold text-[#141414]">
                  <Clock className="w-5 h-5 text-[#B89025]" />
                  <h2>Check Data Deletion Request Status</h2>
                </div>
                <p className="text-xs text-[#6B675E] mb-4">
                  If you submitted a request or received a deletion tracking ID from Facebook, enter it below to verify completion:
                </p>

                <form onSubmit={handleCheckStatus} className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={ticketId}
                    onChange={(e) => setTicketId(e.target.value)}
                    placeholder="E.g., DEL-2026-98124"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[#ECEAE3] bg-white text-xs focus:outline-none focus:ring-2 focus:ring-[#D4AF37] text-[#141414]"
                  />
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-[#141414] hover:bg-[#2C2B29] text-white text-xs font-semibold transition-colors shrink-0"
                  >
                    Check Status
                  </button>
                </form>

                {statusMessage && (
                  <div className="mt-3 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    <span>{statusMessage}</span>
                  </div>
                )}
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
