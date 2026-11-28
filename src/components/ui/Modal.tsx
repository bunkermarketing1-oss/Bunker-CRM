"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { Portal } from "./Portal";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Botones de acción: quedan fijos abajo mientras el contenido se desplaza. */
  footer?: React.ReactNode;
  maxWidthClass?: string;
}

/** Ventana centrada sobre toda la pantalla: título y botones siempre visibles, solo el contenido se desplaza. */
export function Modal({ open, onClose, title, children, footer, maxWidthClass = "max-w-xl" }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previousOverflow = document.body.style.overflow;
    document.addEventListener("keydown", onKeyDown);
    // La página de atrás no debe moverse mientras se llena el formulario.
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  // Clic fuera NO cierra: un toque accidental no debe borrar lo que se estaba escribiendo.
  return (
    <Portal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 bg-black/45 backdrop-blur-[2px]">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`w-full ${maxWidthClass} max-h-full flex flex-col overflow-hidden bg-white dark:bg-[#121417] rounded-[24px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-2xl`}
        >
          <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-[#E2E5EB] dark:border-[#1F242D]">
            <h2 className="text-base font-black text-[#121417] dark:text-white">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              title="Cerrar"
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#8C929D] hover:text-[#121417] dark:hover:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>

          {footer && (
            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#E2E5EB] dark:border-[#1F242D] bg-[#F8F9FA] dark:bg-[#16181F]">
              {footer}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
