"use client";

import React, { useState, Suspense } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Lock, Mail, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

export const dynamic = "force-dynamic";

function LoginForm() {
  const router = useRouter();
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
      setErrorMessage("Por favor ingrese su correo electrónico institucional.");
      return;
    }
    if (!password) {
      setErrorMessage("Por favor ingrese su contraseña.");
      return;
    }

    try {
      setIsLoading(true);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.error || "Credenciales incorrectas o acceso no autorizado.");
        setIsLoading(false);
        return;
      }

      // Successful login -> Redirect to dashboard or callbackUrl
      router.push(callbackUrl);
      router.refresh();
    } catch (err: any) {
      setErrorMessage("Error de conexión con el servidor. Intente nuevamente.");
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#ECEAE3] p-7 sm:p-9 shadow-xl shadow-stone-200/50 backdrop-blur-sm">
      {errorMessage && (
        <div className="mb-5 p-3.5 rounded-2xl bg-red-50 border border-red-200/80 text-red-700 text-xs flex items-start gap-2.5">
          <span className="text-sm font-bold">⚠️</span>
          <p className="leading-relaxed font-medium">{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Email Field */}
        <div>
          <label className="block text-xs font-semibold text-[#3D3A34] mb-1.5">
            Correo Electrónico
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-[#8C887E] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ejemplo@bunkermarketing.io"
              disabled={isLoading}
              autoComplete="email"
              className="w-full bg-[#FAF9F5] border border-[#ECEAE3] rounded-2xl pl-10 pr-4 py-2.5 text-xs text-[#141414] placeholder-[#8C887E] focus:outline-none focus:border-[#D4AF37] focus:bg-white transition-all shadow-inner"
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-[#3D3A34]">
              Contraseña
            </label>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-[#8C887E] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              disabled={isLoading}
              autoComplete="current-password"
              className="w-full bg-[#FAF9F5] border border-[#ECEAE3] rounded-2xl pl-10 pr-10 py-2.5 text-xs text-[#141414] placeholder-[#8C887E] focus:outline-none focus:border-[#D4AF37] focus:bg-white transition-all shadow-inner"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#8C887E] hover:text-[#141414] transition-colors"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-black-gold rounded-2xl py-3 text-xs font-semibold flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#E5C158]" />
              <span>Validando credenciales...</span>
            </>
          ) : (
            <>
              <span>Iniciar Sesión en Bunker CRM</span>
              <ArrowRight className="w-4 h-4 text-[#E5C158]" />
            </>
          )}
        </button>
      </form>

      {/* Security Assurance Notice */}
      <div className="mt-6 pt-5 border-t border-[#ECEAE3] flex items-center justify-center gap-2 text-[11px] text-[#8C887E]">
        <ShieldCheck className="w-4 h-4 text-[#2E7D32]" />
        <span>Sesión encriptada con verificación en servidor</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#F6F5F2] flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 selection:bg-[#E5C158] selection:text-[#141414]">
      {/* Background Subtle Gradient Accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-[#D4AF37]/10 via-[#F3E6C4]/15 to-transparent rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo and Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-3xl border border-[#ECEAE3] shadow-sm mb-4">
            <Image
              src="/bunker-logo.png"
              alt="Bunker Agency Logo"
              width={140}
              height={40}
              priority
              className="h-9 w-auto object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#141414]">
            Acceso Corporativo
          </h1>
          <p className="text-xs text-[#8C887E] mt-1.5 font-medium">
            Plataforma SaaS Comercial & Automatización de Pauta
          </p>
        </div>

        {/* Suspense Boundary for useSearchParams */}
        <Suspense
          fallback={
            <div className="bg-white rounded-3xl border border-[#ECEAE3] p-12 text-center shadow-xl">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#D4AF37] mb-2" />
              <p className="text-xs text-[#8C887E]">Cargando módulo de acceso...</p>
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        {/* Footer info */}
        <div className="text-center mt-6 text-[11px] text-[#8C887E]">
          © {new Date().getFullYear()} Bunker Agency CRM. Todos los derechos reservados.
        </div>
      </div>
    </div>
  );
}
