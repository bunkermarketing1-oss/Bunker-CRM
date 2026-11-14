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
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-3 border-b border-[#E2E5EB] dark:border-[#1F242D]">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#121417] dark:text-white tracking-tight leading-tight">{title}</h1>
        {description && <p className="text-xs text-[#8C929D] font-medium mt-1 max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
