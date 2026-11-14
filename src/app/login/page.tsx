"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, Sparkles } from "lucide-react";

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

    // Abort controller para evitar esperas infinitas
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

      // Inicio exitoso -> Redirección inmediata a callbackUrl
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
    <div className="bg-white dark:bg-[#121417] rounded-[32px] border border-[#E2E5EB] dark:border-[#1F242D] p-7 sm:p-9 shadow-orvion transition-all duration-300">
      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
          <p className="leading-relaxed font-semibold">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Campo Correo Electrónico */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#121417] dark:text-white pl-1">
            Correo Electrónico
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#8C929D] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu.nombre@bunkermarketing.io"
              disabled={isLoading}
              autoComplete="email"
              className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full pl-11 pr-4 py-3 text-xs text-[#121417] dark:text-white placeholder:text-[#8C929D] focus:outline-hidden focus:border-[#121417] dark:focus:border-white focus:bg-white dark:focus:bg-[#121417] transition-all shadow-2xs"
            />
          </div>
        </div>

        {/* Campo Contraseña */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between pl-1">
            <label className="block text-xs font-bold text-[#121417] dark:text-white">
              Contraseña
            </label>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#8C929D] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={isLoading}
              autoComplete="current-password"
              className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full pl-11 pr-11 py-3 text-xs text-[#121417] dark:text-white placeholder:text-[#8C929D] focus:outline-hidden focus:border-[#121417] dark:focus:border-white focus:bg-white dark:focus:bg-[#121417] transition-all shadow-2xs"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-[#8C929D] hover:text-[#121417] dark:hover:text-white transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Botón Principal de Acceso Estilo Cápsula Orvion */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-[#121417] hover:bg-[#1E2229] dark:bg-white dark:hover:bg-[#F3F4F7] text-white dark:text-[#121417] py-3.5 text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-3 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-amber-500" />
              <span>Validando credenciales...</span>
            </>
          ) : (
            <>
              <span>Iniciar Sesión en Bunker</span>
              <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            </>
          )}
        </button>
      </form>

      {/* Verificación de Seguridad y Cifrado */}
      <div className="mt-6 pt-5 border-t border-[#F2F4F7] dark:border-[#1F242D] flex items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB]/60 dark:border-[#242A35] text-[11px] font-medium text-[#8C929D]">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span>Acceso seguro cifrado con verificación en servidor</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#ECEEF2] dark:bg-[#0C0D12] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Fondo con Sutiles Luces Ambientales Minimalistas */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-amber-500/10 via-amber-200/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Cabecera y Marca Bunker */}
        <div className="text-center space-y-3">
          {/* Píldora de Plataforma */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] font-bold text-[#121417] dark:text-white tracking-wide">
              Bunker CRM Platform
            </span>
            <span className="orvion-badge-gold text-[9px] py-0.5 px-2">v2.0</span>
          </div>

          <div className="flex justify-center pt-1 pb-1">
            <div className="p-3 bg-white dark:bg-[#121417] rounded-2xl border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion inline-flex items-center justify-center">
              <Image
                src="/bunker-logo.png"
                alt="Bunker Agency Logo"
                width={130}
                height={36}
                priority
                className="h-8 w-auto object-contain"
              />
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#121417] dark:text-white">
              Acceso Corporativo
            </h1>
            <p className="text-xs text-[#8C929D] mt-1 font-medium">
              Gestión comercial multicanal, pipeline y pauta digital
            </p>
          </div>
        </div>

        {/* Suspense Boundary con Skeleton Cápsula */}
        <Suspense
          fallback={
            <div className="bg-white dark:bg-[#121417] rounded-[32px] border border-[#E2E5EB] dark:border-[#1F242D] p-10 text-center shadow-orvion">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500 mb-2" />
              <p className="text-xs text-[#8C929D] font-medium">Cargando módulo de acceso...</p>
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Footer Minimalista */}
        <div className="text-center text-[11px] text-[#8C929D] font-medium">
          © {new Date().getFullYear()} Bunker Marketing Agency · Todos los derechos reservados.
        </div>
      </div>
    </div>
  );
}
