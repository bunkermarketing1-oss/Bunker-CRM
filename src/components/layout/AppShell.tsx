"use client";

import React, { useCallback, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import CommandPalette from "./CommandPalette";
import { navigationFor } from "./navigation";
import AiAssistantModal from "@/components/modals/AiAssistantModal";
import { useAuth } from "@/context/AuthContext";
import { useLanguage } from "@/context/LanguageContext";

/** Estructura de las páginas autenticadas: menú lateral, barra superior, búsqueda ⌘K y Copiloto IA. */
export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const isClient = Boolean(user?.isClientUser);

  const closeMenu = useCallback(() => setIsMenuOpen(false), []);
  const closeSearch = useCallback(() => setIsSearchOpen(false), []);
  const openAiModal = useCallback(() => setIsAiModalOpen(true), []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="flex">
      <Sidebar isOpen={isMenuOpen} onClose={closeMenu} onOpenAiModal={openAiModal} />

      <div className="flex-1 min-w-0 lg:ml-64 flex flex-col min-h-screen">
        <Topbar onOpenMenu={() => setIsMenuOpen(true)} onOpenSearch={() => setIsSearchOpen(true)} />
        <main className="flex-1 mt-16 p-4 sm:p-6 lg:p-8 max-w-[1500px] w-full mx-auto">{children}</main>
      </div>

      <CommandPalette
        isOpen={isSearchOpen}
        onClose={closeSearch}
        sections={navigationFor(isClient)}
        language={language}
        onOpenAiModal={isClient ? undefined : openAiModal}
      />
      <AiAssistantModal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} />
    </div>
  );
}
