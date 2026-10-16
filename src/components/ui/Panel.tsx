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

/** Tarjeta de sección con icono, título y acción opcional a la derecha. */
export default function Panel({ icon: Icon, title, action, className = "", children }: PanelProps) {
  return (
    <section className={`p-5 sm:p-6 rounded-3xl bg-white border border-[#ECEAE3] ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-5">
        <h2 className="text-sm font-bold text-[#141414] flex items-center gap-2">
          <Icon className="w-4 h-4 text-[#9A7320] dark:text-[#E5C158]" />
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Enlace "Ver todo" para la esquina de un Panel. */
export function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-[11px] font-semibold text-[#6B6861] hover:text-[#141414] underline-offset-4 hover:underline">
      {children}
    </Link>
  );
}
