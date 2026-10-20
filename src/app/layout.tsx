"use client";

import "./globals.css";
import React from "react";
import { usePathname } from "next/navigation";
import AppShell from "@/components/layout/AppShell";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { ROUTES } from "@/lib/constants/routes";
import { inter } from "@/lib/fonts";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isStandalonePage =
    pathname === ROUTES.LOGIN ||
    pathname === ROUTES.PRIVACY ||
    pathname === ROUTES.DATA_DELETION ||
    pathname === "/politica-de-privacidad" ||
    pathname === "/eliminacion-de-datos";

  return (
    <html lang="es" className={inter.variable}>
      <head>
        <title>Bunker Agency — CRM Híbrido con Automatización e IA</title>
        <meta
          name="description"
          content="Plataforma empresarial de Bunker Marketing para gestión comercial, pipeline, marketing multicanal e inteligencia artificial."
        />
        <link rel="icon" href="/bunker-logo.png" />
      </head>
      <body className="bg-[#F6F5F2] text-[#141414] min-h-screen">
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              {isStandalonePage ? (
                children
              ) : (
                <AppShell>{children}</AppShell>
              )}
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
