"use client";

import "./globals.css";
import React, { useState } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import AiAssistantModal from "@/components/modals/AiAssistantModal";
import { AuthProvider } from "@/context/AuthContext";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const isLoginPage = pathname === "/login";

  return (
    <html lang="es">
      <head>
        <title>Bunker Agency — CRM Híbrido con Automatización e IA</title>
        <meta
          name="description"
          content="Plataforma empresarial de Bunker Marketing para gestión comercial, pipeline, marketing multicanal e inteligencia artificial."
        />
        <link rel="icon" href="/bunker-logo.png" />
      </head>
      <body className="bg-[#F6F5F2] text-[#141414] min-h-screen">
        <AuthProvider>
          {isLoginPage ? (
            children
          ) : (
            <div className="flex">
              {/* Claude Style Sidebar */}
              <Sidebar onOpenAiModal={() => setIsAiModalOpen(true)} />

              {/* Main Area */}
              <div className="flex-1 ml-64 flex flex-col min-h-screen">
                <Topbar onOpenAiModal={() => setIsAiModalOpen(true)} />

                <main className="flex-1 mt-16 p-6 lg:p-8 max-w-[1500px] w-full mx-auto">
                  {children}
                </main>
              </div>

              {/* Global AI Assistant Modal */}
              <AiAssistantModal
                isOpen={isAiModalOpen}
                onClose={() => setIsAiModalOpen(false)}
              />
            </div>
          )}
        </AuthProvider>
      </body>
    </html>
  );
}
