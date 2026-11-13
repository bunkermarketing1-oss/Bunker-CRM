import React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface PanelProps {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

/** Tarjeta de sección estilo cápsula Orvion con superficie flotante, esquinas redondeadas y micro-acciones */
export default function Panel({ icon: Icon, title, action, className = "", children }: PanelProps) {
  return (
    <section className={`p-6 rounded-[28px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion transition-all duration-300 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-5 pb-3 border-b border-[#F2F4F7] dark:border-[#1F242D]">
        <h2 className="text-sm font-bold text-[#121417] dark:text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-full bg-[#F3F4F7] dark:bg-[#1E2229] flex items-center justify-center text-[#121417] dark:text-[#D4F933]">
            <Icon className="w-3.5 h-3.5" />
          </span>
          <span>{title}</span>
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Enlace tipo cápsula "Ver todo" para la esquina de un Panel */
export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-[#F3F4F7] dark:bg-[#1E2229] text-[#121417] dark:text-white hover:bg-[#E2E5EB] dark:hover:bg-[#2A2E37] transition-all"
    >
      {children}
    </Link>
  );
}
