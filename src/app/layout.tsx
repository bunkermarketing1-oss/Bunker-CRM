"use client";

import "./globals.css";
import React, { Suspense } from "react";
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
    pathname === ROUTES.TERMS ||
    pathname === ROUTES.DATA_DELETION ||
    pathname === ROUTES.SMS_CONSENT ||
    pathname === "/sms-consent" ||
    pathname.startsWith("/sms-consent") ||
    pathname === "/politica-de-privacidad" ||
    pathname === "/terminos-y-condiciones" ||
    pathname === "/eliminacion-de-datos" ||
    pathname.startsWith("/citas");

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
      <body className="bg-[#ECEEF2] text-[#121417] min-h-screen">
        <ThemeProvider>
          <LanguageProvider>
            <AuthProvider>
              {/* La marca activa vive en la dirección (?clientId=) y la leen la barra lateral, el buscador y casi todas las
                  pantallas con useSearchParams, que Next exige dentro de un Suspense para poder compilar las páginas. */}
              <Suspense fallback={null}>
                {isStandalonePage ? (
                  children
                ) : (
                  <AppShell>{children}</AppShell>
                )}
              </Suspense>
            </AuthProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
