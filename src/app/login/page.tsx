"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  ShieldCheck,
} from "lucide-react";

export const dynamic = "force-dynamic";

function LoginForm() {
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl");

  // Prevent open redirect vulnerabilities: ensure callback starts with "/" and not "//"
  const callbackUrl =
    rawCallbackUrl && rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("Por favor ingresa tu correo electrónico corporativo.");
      return;
    }
    if (!password) {
      setErrorMessage("Por favor ingresa tu contraseña.");
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      setIsLoading(true);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim(), password }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Credenciales incorrectas o acceso no autorizado.");
        setIsLoading(false);
        return;
      }

      window.location.href = callbackUrl;
    } catch (err: unknown) {
      const isAbort = err instanceof Error && err.name === "AbortError";
      setErrorMessage(
        isAbort
          ? "El servidor tardó demasiado en responder. Intenta nuevamente."
          : "Error de conexión con el servidor. Intenta nuevamente."
      );
      setIsLoading(false);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  return (
    <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] p-7 sm:p-8 shadow-orvion transition-all">
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
          <p className="leading-relaxed font-semibold">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Campo Correo Electrónico */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#121417] dark:text-white pl-1">
            Correo Electrónico
          </label>
          <div className="relative group">
            <Mail className="w-4 h-4 text-[#8C929D] group-focus-within:text-amber-500 absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@empresa.com"
              disabled={isLoading}
              autoComplete="email"
              className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full pl-11 pr-4 py-3 text-xs text-[#121417] dark:text-white placeholder:text-[#8C929D] focus:outline-hidden focus:border-amber-400 dark:focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] focus:ring-2 focus:ring-amber-400/20 transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Campo Contraseña */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#121417] dark:text-white pl-1">
            Contraseña
          </label>
          <div className="relative group">
            <Lock className="w-4 h-4 text-[#8C929D] group-focus-within:text-amber-500 absolute left-4 top-1/2 -translate-y-1/2 transition-colors" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={isLoading}
              autoComplete="current-password"
              className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full pl-11 pr-11 py-3 text-xs text-[#121417] dark:text-white placeholder:text-[#8C929D] focus:outline-hidden focus:border-amber-400 dark:focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] focus:ring-2 focus:ring-amber-400/20 transition-all shadow-2xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C929D] hover:text-[#121417] dark:hover:text-white transition-colors cursor-pointer"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Botón Principal de Acceso */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-[#121417] hover:bg-[#1E2229] dark:bg-white dark:hover:bg-[#F3F4F7] text-white dark:text-[#121417] py-3 text-xs font-bold flex items-center justify-center gap-2 shadow-orvion transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-4 cursor-pointer group"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-amber-400 dark:text-amber-600" />
              <span>Autenticando...</span>
            </>
          ) : (
            <>
              <span>Iniciar Sesión</span>
              <ArrowRight className="w-4 h-4 text-amber-400 dark:text-[#121417] group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      {/* Seguridad Discreta */}
      <div className="mt-6 pt-5 border-t border-[#F2F4F7] dark:border-[#1F242D] flex items-center justify-center gap-1.5 text-[11px] text-[#8C929D]">
        <ShieldCheck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span>Acceso empresarial seguro</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#ECEEF2] dark:bg-[#0C0D12] flex flex-col justify-between px-4 sm:px-6 py-8 relative overflow-hidden transition-colors">
      {/* Contenedor Central Limpio y Minimalista */}
      <main className="w-full max-w-md mx-auto my-auto relative z-10 space-y-6 py-4">
        {/* Cabecera Centrada: Logo y Saludo */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <Image
              src="/bunker-logo.png"
              alt="Bunker"
              width={150}
              height={40}
              priority
              className="h-9 w-auto object-contain dark:brightness-0 dark:invert"
            />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#121417] dark:text-white">
              Iniciar Sesión
            </h1>
            <p className="text-xs text-[#8C929D] font-medium mt-1">
              Ingresa tus credenciales para acceder a la plataforma
            </p>
          </div>
        </div>

        {/* Tarjeta de Formulario */}
        <Suspense
          fallback={
            <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] p-10 text-center shadow-orvion">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
              <p className="text-xs text-[#8C929D] font-medium">Cargando...</p>
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </main>

      {/* Footer Minimalista */}
      <footer className="w-full max-w-md mx-auto text-center text-[11px] text-[#8C929D] font-medium py-2 flex items-center justify-center gap-2">
        <span>© {new Date().getFullYear()} Bunker Marketing</span>
        <span>·</span>
        <Link href="/privacy" className="hover:text-[#121417] dark:hover:text-white transition-colors">
          Privacidad
        </Link>
        <span>·</span>
        <Link href="/terms" className="hover:text-[#121417] dark:hover:text-white transition-colors">
          Términos
        </Link>
      </footer>
    </div>
  );
}
