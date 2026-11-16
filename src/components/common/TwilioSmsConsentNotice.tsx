"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ShieldCheck, Info, ChevronDown, ChevronUp } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";

interface TwilioSmsConsentNoticeProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  brandName?: string;
  className?: string;
  id?: string;
}

export default function TwilioSmsConsentNotice({
  checked,
  onChange,
  disabled = false,
  brandName = "Bunker Agency",
  className = "",
  id = "sms-consent-checkbox",
}: TwilioSmsConsentNoticeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`rounded-2xl border p-3.5 transition-all ${
        checked
          ? "bg-amber-500/5 dark:bg-amber-400/5 border-amber-500/30 dark:border-amber-400/20"
          : "bg-[#F8F9FA] dark:bg-[#1A1D24] border-[#E2E5EB] dark:border-[#2A2E37]"
      } ${className}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center h-5 mt-0.5">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
            className="w-4 h-4 rounded-md border-gray-300 text-amber-500 focus:ring-amber-400 dark:border-gray-700 dark:bg-[#121417] cursor-pointer"
          />
        </div>
        <div className="flex-1 text-xs leading-relaxed">
          <label
            htmlFor={id}
            className="font-bold text-[#121417] dark:text-white flex items-center gap-1.5 cursor-pointer select-none"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <span>Consentimiento de Mensajería SMS & Telefonía (Cumplimiento Twilio A2P 10DLC / CTIA)</span>
          </label>
          <p className="text-[11px] text-[#475467] dark:text-[#94A3B8] mt-1">
            Autorizo a <strong>{brandName}</strong> a enviar notificaciones operativas, confirmaciones de servicio y seguimiento comercial vía SMS y llamadas al número telefónico ingresado. La frecuencia de mensajes es variable. Aplican tarifas de mensajes y datos (Msg & data rates may apply).
          </p>
          <p className="text-[11px] text-[#475467] dark:text-[#94A3B8] mt-1">
            Responde <strong>STOP</strong> en cualquier momento para cancelar la recepción de mensajes o <strong>HELP</strong> para recibir asistencia. Consulta nuestros{" "}
            <Link
              href={ROUTES.TERMS}
              target="_blank"
              className="text-amber-600 dark:text-amber-400 font-semibold underline hover:text-amber-700"
            >
              Términos de Servicio
            </Link>{" "}
            y{" "}
            <Link
              href={ROUTES.PRIVACY}
              target="_blank"
              className="text-amber-600 dark:text-amber-400 font-semibold underline hover:text-amber-700"
            >
              Política de Privacidad
            </Link>.
          </p>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 hover:underline cursor-pointer"
          >
            <Info className="w-3 h-3" />
            <span>{isExpanded ? "Ocultar cláusula de privacidad móvil" : "Ver cláusula de privacidad móvil"}</span>
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {isExpanded && (
            <div className="mt-2 p-2.5 rounded-xl bg-white/80 dark:bg-[#121417]/80 border border-[#E2E5EB] dark:border-[#2A2E37] text-[10px] text-[#667085] dark:text-[#8C929D] space-y-1">
              <p>
                <strong>Protección estricta de datos móviles:</strong> La información de telefonía móvil y los datos de suscripción/consentimiento (opt-in) nunca serán vendidos, alquilados ni transferidos a terceros ni afiliados para fines de mercadotecnia o publicidad.
              </p>
              <p>
                Registro verificado conforme a los estándares de la CTIA y los requisitos de operadores móviles de Estados Unidos y Latinoamérica.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
