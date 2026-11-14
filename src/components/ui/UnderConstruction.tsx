import React from "react";
import Link from "next/link";
import { Construction, ArrowLeft, Sparkles } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";

interface UnderConstructionProps {
  section: string;
  title: string;
  description: string;
  upcomingFeatures?: string[];
}

export default function UnderConstruction({
  section,
  title,
  description,
  upcomingFeatures,
}: UnderConstructionProps) {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <PageHeader section={section} title={title} description={description} />

      <div className="rounded-[28px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-orvion">
        <div className="w-16 h-16 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center mx-auto mb-4 text-amber-500 shadow-orvion">
          <Construction className="w-8 h-8" />
        </div>

        <span className="orvion-badge-gold text-[10px] mb-3">
          Módulo en Construcción
        </span>

        <h2 className="text-xl sm:text-2xl font-extrabold text-[#121417] dark:text-white tracking-tight">
          Próximamente en Bunker CRM
        </h2>

        <p className="text-xs sm:text-sm text-[#8C929D] font-medium mt-2 max-w-md mx-auto leading-relaxed">
          Estamos afinando este módulo para ofrecerte una experiencia potente, estable y conectada con tus datos en tiempo real.
        </p>

        {upcomingFeatures && upcomingFeatures.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[#E2E5EB] dark:border-[#1F242D] text-left">
            <p className="text-[11px] font-bold text-[#8C929D] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Lo que incluirá esta funcionalidad:
            </p>
            <ul className="space-y-2">
              {upcomingFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#121417] dark:text-slate-300 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="btn-black-gold inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-xs font-bold shadow-orvion"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Inicio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
