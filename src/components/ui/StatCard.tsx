import React from "react";
import type { LucideIcon } from "lucide-react";

export interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Línea de contexto bajo la cifra (comparación, desglose o aclaración). */
  hint?: string;
  emphasis?: boolean;
  /** Badge opcional estilo cápsula Orvion (ej: "+12.4%", "Activo", "En meta") */
  badgeText?: string;
  badgeVariant?: "gold" | "lime" | "dark" | "pill";
  /** Etiqueta de periodo o subtítulo (ej: "Esta semana", "Total histórico") */
  subPeriod?: string;
  /** Indicador visual decorativo estilo Orvion */
  showMiniChart?: boolean;
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  hint,
  emphasis = false,
  badgeText,
  badgeVariant = "gold",
  subPeriod,
  showMiniChart = true,
}: StatCardProps) {
  return (
    <div
      className={`relative overflow-hidden p-5 rounded-[28px] border transition-all duration-300 flex flex-col justify-between group ${
        emphasis
          ? "bg-white dark:bg-[#121417] border-[#121417] dark:border-white/20 shadow-orvion hover:shadow-lg"
          : "bg-white dark:bg-[#121417] border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion hover:shadow-lg hover:-translate-y-0.5"
      }`}
    >
      {/* Cabecera de la tarjeta: Título y píldora con icono */}
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C929D]">
            {label}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-8 h-8 rounded-full bg-[#F3F4F7] dark:bg-[#1E2229] flex items-center justify-center text-[#121417] dark:text-white transition-colors group-hover:scale-105">
              <Icon className="w-4 h-4 text-[#121417] dark:text-[#F59E0B]" />
            </span>
          </div>
        </div>

        {subPeriod && (
          <p className="text-[11px] font-medium text-[#8C929D] mt-1">
            {subPeriod}
          </p>
        )}

        {/* Cifra grande y píldora de crecimiento / estado en Dorado y Negro */}
        <div className="flex items-baseline justify-between gap-2 mt-3">
          <div className="text-3xl font-black tracking-tight text-[#121417] dark:text-white leading-none">
            {value}
          </div>
          {badgeText && (
            <span
              className={
                badgeVariant === "dark"
                  ? "orvion-badge-dark"
                  : "orvion-badge-gold"
              }
            >
              {badgeText}
            </span>
          )}
        </div>
      </div>

      {/* Micro-gráfica decorativa en dorado Bunker y texto de soporte */}
      <div className="mt-4 pt-2 border-t border-[#F2F4F7] dark:border-[#1F242D]/50">
        {showMiniChart && (
          <div className="flex items-end gap-1 h-3 mb-2 opacity-60 group-hover:opacity-100 transition-opacity">
            <div className="w-1.5 h-1.5 rounded-full bg-[#E2E5EB] dark:bg-[#2A2E37]" />
            <div className="w-1.5 h-2 rounded-full bg-[#E2E5EB] dark:bg-[#2A2E37]" />
            <div className="w-1.5 h-2.5 rounded-full bg-[#E2E5EB] dark:bg-[#2A2E37]" />
            <div className="w-1.5 h-2 rounded-full bg-[#E2E5EB] dark:bg-[#2A2E37]" />
            <div className="w-1.5 h-3 rounded-full bg-[#F59E0B]" />
            <div className="w-1.5 h-2 rounded-full bg-[#F59E0B]/60" />
            <div className="w-1.5 h-2.5 rounded-full bg-[#FBBF24]" />
          </div>
        )}
        {hint && (
          <div className="text-xs text-[#8C929D] font-medium leading-snug">
            {hint}
          </div>
        )}
      </div>
    </div>
  );
}
