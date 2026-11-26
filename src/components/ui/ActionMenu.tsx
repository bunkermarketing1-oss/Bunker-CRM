"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ActionMenuItem {
  key: string;
  label: string;
  icon: LucideIcon;
  /** Navegación interna; si falta, se usa `onSelect`. */
  href?: string;
  /** Abre `href` en otra pestaña (enlaces externos). */
  external?: boolean;
  onSelect?: () => void;
}

interface ActionMenuProps {
  items: ActionMenuItem[];
  title?: string;
}

const ITEM_CLASS =
  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-semibold text-[#121417] dark:text-white hover:bg-[#F8F9FA] dark:hover:bg-[#1A1D24] transition-colors cursor-pointer";

/** Menú "⋯" para agrupar acciones secundarias y dejar visible solo lo principal. */
export default function ActionMenu({ items, title = "Más acciones" }: ActionMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Se cierra con clic fuera o Escape para que no tape el chat.
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

  if (items.length === 0) return null;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={title}
        className="p-1.5 rounded-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] hover:bg-[#E2E5EB] dark:hover:bg-[#2A2E37] transition-all shadow-2xs cursor-pointer"
      >
        <MoreHorizontal className="w-4 h-4 text-[#667085] dark:text-[#8C929D]" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 z-30 p-1.5 rounded-2xl bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion"
        >
          {items.map(({ key, label, icon: Icon, href, external, onSelect }) => {
            const content = (
              <>
                <Icon className="w-4 h-4 text-amber-500 shrink-0" />
                <span>{label}</span>
              </>
            );
            if (href && external) {
              return (
                <a key={key} role="menuitem" href={href} target="_blank" rel="noreferrer" className={ITEM_CLASS} onClick={() => setOpen(false)}>
                  {content}
                </a>
              );
            }
            if (href) {
              return (
                <Link key={key} role="menuitem" href={href} className={ITEM_CLASS} onClick={() => setOpen(false)}>
                  {content}
                </Link>
              );
            }
            return (
              <button
                key={key}
                type="button"
                role="menuitem"
                className={ITEM_CLASS}
                onClick={() => {
                  setOpen(false);
                  onSelect?.();
                }}
              >
                {content}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
