import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

const BUTTON_CLASS =
  "px-3 py-1.5 rounded-full border border-[#E2E5EB] dark:border-[#2A2E37] bg-white dark:bg-[#121417] text-xs font-semibold text-[#121417] dark:text-white flex items-center gap-1 hover:bg-[#F8F9FA] dark:hover:bg-[#1A1D24] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer";

/** Paginador presentacional: no conoce de dónde vienen los datos, solo qué página se muestra. */
export default function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // Con una sola página el paginador estorba más de lo que ayuda.
  if (total <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-[#EAECF0] dark:border-[#1F242D]">
      <p className="text-xs text-[#667085] dark:text-[#8C929D]">
        Mostrando <strong className="text-[#121417] dark:text-white">{from}–{to}</strong> de{" "}
        <strong className="text-[#121417] dark:text-white">{total}</strong>
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={BUTTON_CLASS} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Anterior</span>
        </button>
        <span className="text-xs font-semibold text-[#667085] dark:text-[#8C929D] px-1">
          Página {page} de {totalPages}
        </span>
        <button type="button" className={BUTTON_CLASS} disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <span>Siguiente</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
