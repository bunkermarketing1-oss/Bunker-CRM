"use client";

import "./globals.css";
import React, { useState } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import AiAssistantModal from "@/components/modals/AiAssistantModal";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [currentRole, setCurrentRole] = useState("admin");
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);

  return (
    <html lang="es">
      <head>
        <title>Bunker Agency — CRM Híbrido con Automatización e IA</title>
        <meta name="description" content="Plataforma empresarial de Bunker Marketing para gestión comercial, pipeline, marketing multicanal e inteligencia artificial." />
        <link rel="icon" href="/bunker-logo.png" />
      </head>
      <body className="bg-[#F6F5F2] text-[#141414] min-h-screen">
        <div className="flex">
          {/* Claude Style Sidebar */}
          <Sidebar onOpenAiModal={() => setIsAiModalOpen(true)} />

          {/* Main Area */}
          <div className="flex-1 ml-64 flex flex-col min-h-screen">
            <Topbar
              currentRole={currentRole}
              onRoleChange={setCurrentRole}
              onOpenAiModal={() => setIsAiModalOpen(true)}
            />

            <main className="flex-1 mt-16 p-8 max-w-6xl w-full mx-auto">
              {children}
            </main>
          </div>
        </div>

        {/* Global AI Assistant Modal */}
        <AiAssistantModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
        />
      </body>
    </html>
  );
}
