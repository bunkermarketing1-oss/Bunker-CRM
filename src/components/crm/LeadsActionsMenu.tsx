"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Download, RefreshCw, Users } from "lucide-react";

interface LeadsActionsMenuProps {
  syncingMeta: boolean;
  assigningRoundRobin: boolean;
  onSyncMeta: () => void;
  onRoundRobin: () => void;
  onExportCsv: () => void;
}

const ITEM_CLASS =
  "w-full flex items-start gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-[#F8F9FA] dark:hover:bg-[#1A1D24] disabled:opacity-60 transition-colors cursor-pointer";

/**
 * Agrupa las acciones secundarias de Leads en un solo menú para que la cabecera
 * muestre un único botón principal (Registrar prospecto).
 */
export default function LeadsActionsMenu({
  syncingMeta,
  assigningRoundRobin,
  onSyncMeta,
  onRoundRobin,
  onExportCsv,
}: LeadsActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cierra al hacer clic fuera o con Escape: un menú que se queda abierto estorba más que los botones que reemplaza.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="px-3.5 py-2 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] text-[#121417] dark:text-white hover:bg-[#F8F9FA] dark:hover:bg-[#1A1D24] text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
      >
        <span>Acciones</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#8C929D] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-72 z-30 p-1.5 rounded-2xl bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion"
        >
          <button type="button" role="menuitem" className={ITEM_CLASS} disabled={syncingMeta} onClick={() => run(onSyncMeta)}>
            <RefreshCw className={`w-4 h-4 mt-0.5 text-amber-500 ${syncingMeta ? "animate-spin" : ""}`} />
            <span>
              <span className="block text-xs font-bold text-[#121417] dark:text-white">
                {syncingMeta ? "Sincronizando..." : "Traer prospectos de Meta"}
              </span>
              <span className="block text-[11px] text-[#667085] dark:text-[#8C929D]">Importa los nuevos desde tus campañas</span>
            </span>
          </button>

          <button type="button" role="menuitem" className={ITEM_CLASS} disabled={assigningRoundRobin} onClick={() => run(onRoundRobin)}>
            <Users className={`w-4 h-4 mt-0.5 text-blue-500 ${assigningRoundRobin ? "animate-spin" : ""}`} />
            <span>
              <span className="block text-xs font-bold text-[#121417] dark:text-white">
                {assigningRoundRobin ? "Asignando..." : "Repartir entre asesores"}
              </span>
              <span className="block text-[11px] text-[#667085] dark:text-[#8C929D]">Asigna en partes iguales los que no tienen asesor</span>
            </span>
          </button>

          <button type="button" role="menuitem" className={ITEM_CLASS} onClick={() => run(onExportCsv)}>
            <Download className="w-4 h-4 mt-0.5 text-[#8C929D]" />
            <span>
              <span className="block text-xs font-bold text-[#121417] dark:text-white">Exportar a CSV</span>
              <span className="block text-[11px] text-[#667085] dark:text-[#8C929D]">Descarga la lista que ves en pantalla</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
