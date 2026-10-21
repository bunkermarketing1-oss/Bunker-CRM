"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, CornerDownLeft, Loader2, Search, Sparkles, User, UserRound, type LucideIcon } from "lucide-react";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { SEARCH_MIN_LENGTH } from "@/lib/constants/search";
import type { SearchResultKind } from "@/types/search";
import type { NavSection } from "./navigation";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  sections: NavSection[];
  language: "es" | "en";
  onOpenAiModal?: () => void;
}

interface PaletteItem {
  key: string;
  group: string;
  icon: LucideIcon;
  title: string;
  subtitle: string | null;
  run: () => void;
}

const KIND_META: Record<SearchResultKind, { icon: LucideIcon; group: string }> = {
  lead: { icon: User, group: "Leads" },
  client: { icon: Building2, group: "Clientes" },
  contact: { icon: UserRound, group: "Contactos" },
};

const normalize = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export default function CommandPalette({ isOpen, onClose, sections, language, onOpenAiModal }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const { results, loading, error } = useGlobalSearch(isOpen ? term : "");

  useEffect(() => {
    if (!isOpen) return;
    setTerm("");
    setActiveIndex(0);
    // El modal se monta en el mismo frame: esperar uno para que el foco no se pierda.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [isOpen]);

  const items = useMemo<PaletteItem[]>(() => {
    const go = (href: string) => () => {
      onClose();
      router.push(href);
    };
    const query = normalize(term.trim());
    const pageGroup = language === "es" ? "Ir a" : "Go to";

    const pages = sections
      .flatMap((section) => section.items)
      .filter((item) => !item.disabled)
      .filter((item) => !query || normalize(item.label[language]).includes(query))
      .map<PaletteItem>((item) => ({
        key: `page:${item.href}`,
        group: pageGroup,
        icon: item.icon,
        title: item.label[language],
        subtitle: null,
        run: go(item.href),
      }));

    const actions: PaletteItem[] = [];
    if (onOpenAiModal && (!query || normalize("copiloto asistente ia ai").includes(query))) {
      actions.push({
        key: "action:ai",
        group: language === "es" ? "Acciones" : "Actions",
        icon: Sparkles,
        title: language === "es" ? "Abrir Copiloto IA" : "Open AI Copilot",
        subtitle: language === "es" ? "Calificar leads, copys y SMS" : "Score leads, copy & SMS",
        run: () => {
          onClose();
          onOpenAiModal();
        },
      });
    }

    const records = results.map<PaletteItem>((result) => ({
      key: `${result.kind}:${result.id}`,
      group: KIND_META[result.kind].group,
      icon: KIND_META[result.kind].icon,
      title: result.title,
      subtitle: result.subtitle,
      run: go(result.href),
    }));

    // Con un término de búsqueda los registros importan más que las páginas.
    return query ? [...records, ...pages, ...actions] : [...pages, ...actions];
  }, [term, results, sections, language, onOpenAiModal, onClose, router]);

  useEffect(() => {
    setActiveIndex(0);
  }, [items.length]);

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  if (!isOpen) return null;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[activeIndex]?.run();
    }
  };

  const showHint = term.trim().length > 0 && term.trim().length < SEARCH_MIN_LENGTH;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="dialog" aria-modal="true" aria-label="Buscar">
      <button type="button" aria-label="Cerrar búsqueda" onClick={onClose} className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-xl bg-white border border-[#EAECF0] rounded-3xl shadow-2xl overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        <div className="flex items-center gap-3 px-5 border-b border-[#EAECF0]">
          {loading ? (
            <Loader2 className="w-4 h-4 text-amber-500 animate-spin flex-shrink-0" />
          ) : (
            <Search className="w-4 h-4 text-[#667085] flex-shrink-0" />
          )}
          <input
            ref={inputRef}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder={language === "es" ? "Buscar leads, clientes, contactos o páginas…" : "Search leads, clients, contacts or pages…"}
            className="flex-1 bg-transparent py-4 text-sm text-[#101828] placeholder-[#98A2B3] focus:outline-none"
          />
          <kbd className="text-[10px] font-mono text-[#667085] bg-[#F8F9FA] px-1.5 py-0.5 rounded border border-[#EAECF0]">ESC</kbd>
        </div>

        <div ref={listRef} className="max-h-[50vh] overflow-y-auto p-2">
          {error && <p className="px-3 py-2 text-xs text-red-600">{error}</p>}
          {showHint && (
            <p className="px-3 py-2 text-[11px] text-[#667085]">
              {language === "es" ? `Escribe al menos ${SEARCH_MIN_LENGTH} letras para buscar registros.` : `Type at least ${SEARCH_MIN_LENGTH} letters to search records.`}
            </p>
          )}
          {items.length === 0 && !loading && (
            <p className="px-3 py-8 text-center text-xs text-[#667085]">
              {language === "es" ? "Sin resultados para" : "No results for"} <strong className="text-[#101828]">“{term}”</strong>
            </p>
          )}
          {items.map((item, index) => {
            const Icon = item.icon;
            const isActive = index === activeIndex;
            const startsGroup = index === 0 || items[index - 1].group !== item.group;
            return (
              <React.Fragment key={item.key}>
                {startsGroup && (
                  <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#667085]">{item.group}</div>
                )}
                <button
                  type="button"
                  data-index={index}
                  onClick={item.run}
                  onMouseMove={() => setActiveIndex(index)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl text-left transition-colors ${
                    isActive ? "bg-amber-50/80 dark:bg-amber-950/40" : ""
                  }`}
                >
                  <span
                    className={`w-8 h-8 rounded-xl border flex items-center justify-center flex-shrink-0 ${
                      isActive ? "border-amber-400/60 bg-white shadow-2xs" : "border-[#EAECF0] bg-[#F8F9FA]"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-amber-600 dark:text-amber-400" : "text-[#667085]"}`} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-semibold text-[#101828] truncate">{item.title}</span>
                    {item.subtitle && <span className="block text-[11px] text-[#667085] truncate">{item.subtitle}</span>}
                  </span>
                  {isActive && <CornerDownLeft className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>

        <div className="hidden sm:flex items-center gap-4 px-5 py-2.5 border-t border-[#EAECF0] bg-[#F8F9FA] text-[10px] text-[#667085]">
          <span><kbd className="font-mono">↑↓</kbd> {language === "es" ? "navegar" : "navigate"}</span>
          <span><kbd className="font-mono">↵</kbd> {language === "es" ? "abrir" : "open"}</span>
          <span><kbd className="font-mono">esc</kbd> {language === "es" ? "cerrar" : "close"}</span>
        </div>
      </div>
    </div>
  );
}
