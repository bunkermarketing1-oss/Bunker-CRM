import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import type { TwilioEnvStatus } from "@/types/integrations";

interface TwilioEnvStatusCardProps {
  name: string;
  description: string | null;
  status: TwilioEnvStatus | null;
}

/**
 * Twilio no guarda credenciales en la base: las lee del entorno del servidor. Esta tarjeta solo
 * informa qué variables están definidas para no prometer una "conexión" que no existe.
 */
export function TwilioEnvStatusCard({ name, description, status }: TwilioEnvStatusCardProps) {
  const smsReady = status?.smsReady ?? false;
  const badge = !status
    ? { label: "SIN DATOS", className: "bg-[#F4F3EE] text-[#6B6966] border-[#E8E6DF]" }
    : smsReady
      ? { label: "CONFIGURADO", className: "bg-emerald-50 text-emerald-700 border-emerald-200" }
      : { label: "SIN CONFIGURAR", className: "bg-amber-50 text-amber-700 border-amber-200" };

  return (
    <div className="p-5 rounded-2xl bg-white border border-[#E8E6DF] flex flex-col space-y-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-base text-[#1F1E1D]">{name}</h3>
          {description && <p className="text-xs text-[#6B6966] mt-1 leading-relaxed">{description}</p>}
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border uppercase flex-shrink-0 ${badge.className}`}>
          {badge.label}
        </span>
      </div>

      {status && (
        <ul className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-[11px] space-y-1.5">
          {status.variables.map((v) => (
            <li key={v.name} className="flex items-center justify-between gap-2">
              <span className="font-mono text-[#1F1E1D]">{v.name}</span>
              {v.isSet ? (
                <span className="flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Definida
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-700">
                  <XCircle className="w-3.5 h-3.5" /> Falta
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="text-[11px] text-[#6B6966] leading-relaxed space-y-1 pt-3 border-t border-[#F0EEE6]">
        <p>
          Las credenciales de Twilio se configuran como variables de entorno del servidor (en Dokploy) y no se guardan
          en Bunker. Tras cambiarlas hay que volver a desplegar la aplicación.
        </p>
        <p>
          SMS: <strong>{smsReady ? "listo para enviar" : "requiere Account SID, Auth Token y número remitente"}</strong>.
          Llamadas: <strong>{status?.voiceReady ? "listas" : "requieren además API Key y TwiML App"}</strong>.
        </p>
        <Link href={ROUTES.SETTINGS} className="inline-block text-[#D97757] hover:underline font-medium">
          Ver todas las variables en Configuración
        </Link>
      </div>
    </div>
  );
}
