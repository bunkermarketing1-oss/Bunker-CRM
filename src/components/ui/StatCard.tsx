import React from "react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Línea de contexto bajo la cifra (comparación, desglose o aclaración). */
  hint?: string;
  emphasis?: boolean;
}

export default function StatCard({ label, value, icon: Icon, hint, emphasis = false }: StatCardProps) {
  return (
    <div
      className={`p-5 rounded-3xl border flex flex-col gap-3 ${
        emphasis ? "bg-[#141414] border-[#D4AF37]/40 text-[#FAF8F3] shadow-[0_4px_20px_-6px_rgba(212,175,55,0.25)]" : "bg-white border-[#ECEAE3]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`text-[11px] font-semibold uppercase tracking-wider ${emphasis ? "text-[#C5C2BA]" : "text-[#8C887E]"}`}>
          {label}
        </span>
        <span
          className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            emphasis ? "bg-[#D4AF37]/15" : "bg-[#FBF7ED] dark:bg-[#2A2415] border border-[#F2E5C4] dark:border-[#473a1e]"
          }`}
        >
          <Icon className={`w-4 h-4 ${emphasis ? "text-[#E5C158]" : "text-[#9A7320] dark:text-[#E5C158]"}`} />
        </span>
      </div>
      <div className={`text-3xl tracking-tight leading-none ${emphasis ? "text-[#FAF8F3]" : "text-[#141414]"}`}>{value}</div>
      {hint && <div className={`text-[11px] leading-snug ${emphasis ? "text-[#A09B90]" : "text-[#6B6861]"}`}>{hint}</div>}
    </div>
  );
}
