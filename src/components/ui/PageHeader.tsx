import React from "react";

interface PageHeaderProps {
  section?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

/** Encabezado estándar de página: título, descripción y acciones a la derecha (las migas ya viven en el Topbar). */
export default function PageHeader({ section: _section, title, description, actions }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-5 border-b border-[#ECEAE3]">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-[28px] font-semibold text-[#141414] tracking-tight leading-tight">{title}</h1>
        {description && <p className="text-xs text-[#6B6861] mt-1.5 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
