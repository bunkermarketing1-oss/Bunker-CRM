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

      <div className="rounded-3xl bg-white border border-[#ECEAE3] p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-[#FAF0D7] dark:bg-[#2e2615] border border-[#F2E5C4] dark:border-[#473a1e] flex items-center justify-center mx-auto mb-4 text-[#9A7320] dark:text-[#E5C158]">
          <Construction className="w-8 h-8" />
        </div>

        <span className="inline-block px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-wider uppercase bg-[#FAF0D7] dark:bg-[#2e2615] text-[#9A7320] dark:text-[#E5C158] border border-[#F2E5C4] dark:border-[#473a1e] mb-3">
          Módulo en Construcción
        </span>

        <h2 className="text-xl sm:text-2xl font-bold text-[#141414] tracking-tight">
          Próximamente en Bunker CRM
        </h2>

        <p className="text-xs sm:text-sm text-[#6B6861] mt-2 max-w-md mx-auto leading-relaxed">
          Estamos afinando este módulo para ofrecerte una experiencia potente, estable y conectada con tus datos en tiempo real.
        </p>

        {upcomingFeatures && upcomingFeatures.length > 0 && (
          <div className="mt-6 pt-6 border-t border-[#ECEAE3] text-left">
            <p className="text-[11px] font-bold text-[#8C887E] uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              Lo que incluirá esta funcionalidad:
            </p>
            <ul className="space-y-2">
              {upcomingFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-[#4D4C48]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] mt-1.5 flex-shrink-0" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="btn-black-gold inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-semibold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Inicio</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
