import React from "react";

interface PageHeaderProps {
  section: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/** Encabezado estándar de página: migas, título serif, descripción y acciones a la derecha. */
export default function PageHeader({ section, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#ECEAE3]">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] text-[#8C887E] mb-1.5">
          <span>{section}</span>
          <span aria-hidden>/</span>
          <span className="text-[#141414] font-medium">{title}</span>
        </div>
        <h1 className="text-2xl sm:text-[28px] font-semibold text-[#141414] tracking-tight leading-tight">{title}</h1>
        {description && <p className="text-xs text-[#6B6861] mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
