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
  ShieldCheck,
  ArrowRight,
  Loader2,
  Sparkles,
  Zap,
  TrendingUp,
  Inbox,
  BarChart3,
  Sun,
  Moon,
} from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

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

  const [activeRolePreset, setActiveRolePreset] = useState<string>("admin");

  const handleRolePreset = (role: "admin" | "director" | "client") => {
    setActiveRolePreset(role);
    setErrorMessage("");
    if (role === "admin") {
      setEmail("admin@bunkermarketing.io");
      setPassword("bunker2026");
    } else if (role === "director") {
      setEmail("director@bunkermarketing.io");
      setPassword("bunker2026");
    } else {
      setEmail("cliente@bunkermarketing.io");
      setPassword("bunker2026");
    }
  };

  const handleDemoFill = () => {
    handleRolePreset("admin");
  };

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
    <div className="bg-white dark:bg-[#121417] rounded-[32px] border border-[#E2E5EB] dark:border-[#1F242D] p-7 sm:p-9 shadow-orvion transition-all duration-300">
      <div className="flex items-center justify-between gap-2 mb-6 pb-4 border-b border-[#F2F4F7] dark:border-[#1F242D]">
        <div>
          <h2 className="text-xl font-black text-[#121417] dark:text-white tracking-tight">
            Acceso al Sistema
          </h2>
          <p className="text-xs text-[#8C929D] font-medium mt-0.5">
            Ingresa con tus credenciales asignadas
          </p>
        </div>

        {/* Botón de acceso demo rápido para presentaciones */}
        <button
          type="button"
          onClick={handleDemoFill}
          className="px-3 py-1.5 rounded-full text-[11px] font-bold bg-[#FFFBEB] dark:bg-amber-950/40 border border-amber-300/80 text-amber-900 dark:text-amber-300 hover:bg-amber-100/80 transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs group"
          title="Autocompletar con credenciales demo"
        >
          <Zap className="w-3.5 h-3.5 text-amber-500 group-hover:scale-110 transition-transform" />
          <span>Demo</span>
        </button>
      </div>

      {/* Selector Rápido de Rol para Presentaciones y Demostraciones con Clientes */}
      <div className="mb-2 p-1.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB]/80 dark:border-[#242A35] flex items-center gap-1">
        <button
          type="button"
          onClick={() => handleRolePreset("admin")}
          className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all text-center cursor-pointer ${
            activeRolePreset === "admin"
              ? "bg-[#121417] text-white dark:bg-white dark:text-[#121417] shadow-xs"
              : "text-[#667085] hover:text-[#121417] dark:hover:text-white"
          }`}
        >
          ✦ Admin
        </button>
        <button
          type="button"
          onClick={() => handleRolePreset("director")}
          className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all text-center cursor-pointer ${
            activeRolePreset === "director"
              ? "bg-[#121417] text-white dark:bg-white dark:text-[#121417] shadow-xs"
              : "text-[#667085] hover:text-[#121417] dark:hover:text-white"
          }`}
        >
          🏢 Director
        </button>
        <button
          type="button"
          onClick={() => handleRolePreset("client")}
          className={`flex-1 py-1.5 px-2 rounded-xl text-[11px] font-bold transition-all text-center cursor-pointer ${
            activeRolePreset === "client"
              ? "bg-[#121417] text-white dark:bg-white dark:text-[#121417] shadow-xs"
              : "text-[#667085] hover:text-[#121417] dark:hover:text-white"
          }`}
        >
          👤 Cliente
        </button>
      </div>

      <div className="mb-5 px-1 flex items-center justify-between text-[10px] text-[#8C929D]">
        <span>
          {activeRolePreset === "admin" && "Control global de la agencia, métricas agregadas y ajustes."}
          {activeRolePreset === "director" && "Supervisión comercial de asesores y llamadas en vivo."}
          {activeRolePreset === "client" && "Portal exclusivo de cliente, leads y retorno de pauta."}
        </span>
        <span className="font-semibold text-amber-600 dark:text-amber-400">Listo para demo</span>
      </div>

      {errorMessage && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 text-xs flex items-start gap-2.5 shadow-2xs animate-fade-in-up">
          <span className="w-2 h-2 rounded-full bg-rose-500 mt-1 shrink-0" />
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
              placeholder="tu.correo@bunkermarketing.io"
              disabled={isLoading}
              autoComplete="email"
              className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full pl-11 pr-4 py-3 text-xs text-[#121417] dark:text-white placeholder:text-[#8C929D] focus:outline-hidden focus:border-amber-400 dark:focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] focus:ring-2 focus:ring-amber-400/20 transition-all shadow-2xs"
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

        {/* Botón Principal de Acceso con Brillo Dorado */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-[#121417] hover:bg-[#1E2229] dark:bg-white dark:hover:bg-[#F3F4F7] text-white dark:text-[#121417] py-3.5 text-xs font-bold flex items-center justify-center gap-2 shadow-orvion hover:shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-4 cursor-pointer group"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-amber-400 dark:text-amber-600" />
              <span>Autenticando sesión...</span>
            </>
          ) : (
            <>
              <span>Iniciar Sesión en Bunker</span>
              <ArrowRight className="w-4 h-4 text-amber-400 dark:text-[#121417] group-hover:translate-x-1 transition-transform" />
            </>
          )}
        </button>
      </form>

      {/* Verificación de Seguridad y Cifrado */}
      <div className="mt-6 pt-5 border-t border-[#F2F4F7] dark:border-[#1F242D] flex items-center justify-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB]/60 dark:border-[#242A35] text-[11px] font-medium text-[#8C929D]">
          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
          <span>Acceso empresarial verificado con token seguro</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-[#ECEEF2] dark:bg-[#0C0D12] flex flex-col justify-between px-4 sm:px-6 lg:px-8 py-6 relative overflow-hidden transition-colors">
      {/* Luces Ambientales Doradas Flotantes */}
      <div className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-tr from-amber-500/12 via-amber-200/5 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[350px] bg-gradient-to-bl from-amber-400/10 via-transparent to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Barra Superior con Selector de Tema y Enlace a Políticas */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between relative z-20 py-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-[#667085] dark:text-[#8C929D]">
            Sistemas Bunker Operativos
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Cambiar tema de color"
            className="h-8 px-3 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-2xs text-[#121417] dark:text-white text-xs font-semibold flex items-center gap-1.5 hover:bg-[#F8F9FA] dark:hover:bg-[#1C2028] transition-colors cursor-pointer"
          >
            {theme === "dark" ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Modo Claro</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-[#667085]" />
                <span>Modo Oscuro</span>
              </>
            )}
          </button>
        </div>
      </header>

      <div className="w-full max-w-5xl mx-auto my-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-6">
        {/* Columna Izquierda: Showcase de Alto Impacto para el Cliente */}
        <div className="lg:col-span-6 space-y-6 animate-fade-in-up">
          {/* Insignia Cápsula de Plataforma */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px] font-extrabold text-[#121417] dark:text-white tracking-wide">
              Bunker Marketing Agency
            </span>
            <span className="orvion-badge-gold text-[9px] py-0.5 px-2">v2.5 Hybrid CRM</span>
          </div>

          <div className="space-y-3">
            <div className="inline-block p-3 bg-white dark:bg-[#121417] rounded-2xl border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
              <Image
                src="/bunker-logo.png"
                alt="Bunker Agency Logo"
                width={140}
                height={38}
                priority
                className="h-8 w-auto object-contain"
              />
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-black tracking-tight text-[#121417] dark:text-white leading-[1.15]">
              Infraestructura comercial y de pauta para marcas líderes.
            </h1>

            <p className="text-sm text-[#8C929D] font-medium max-w-lg leading-relaxed">
              Centraliza WhatsApp, Instagram Direct, llamadas telefónicas, campañas de Meta Ads y pipeline de ventas con automatización e inteligencia artificial.
            </p>
          </div>

          {/* 3 Tarjetas Cápsula Flotantes de Demostración */}
          <div className="space-y-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-[#121417]/90 border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion flex items-center justify-between gap-3 animate-float-slow">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 flex items-center justify-center text-amber-600">
                  <Inbox className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#121417] dark:text-white">Bandeja Multicanal en Vivo</div>
                  <div className="text-[11px] text-[#8C929D]">Meta Ads, Instagram Direct y WhatsApp integrados</div>
                </div>
              </div>
              <span className="orvion-badge-gold text-[10px]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#121417] animate-pulse" />
                En tiempo real
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-[#121417]/90 border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F3F4F7] dark:bg-[#1E2229] border border-[#E2E5EB] dark:border-[#2A2E37] flex items-center justify-center text-[#121417] dark:text-amber-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#121417] dark:text-white">Pipeline y Auditoría Comercial</div>
                  <div className="text-[11px] text-[#8C929D]">Velocidad de respuesta SLA y conversión de ventas</div>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F3F4F7] dark:bg-[#1E2229] text-[#121417] dark:text-white">
                SLA 42s
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/90 dark:bg-[#121417]/90 border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion flex items-center justify-between gap-3 animate-float-slow [animation-delay:1.5s]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-300/40 dark:border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-[#121417] dark:text-white">Retorno de Pauta & ROAS</div>
                  <div className="text-[11px] text-[#8C929D]">Atribución exacta de inversión vs ingresos reales</div>
                </div>
              </div>
              <span className="orvion-badge-gold text-[10px]">
                ROAS +4.8x
              </span>
            </div>
          </div>

          <div className="pt-1 text-xs text-[#8C929D] font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Respaldando operaciones de más de 40 empresas activas</span>
          </div>
        </div>

        {/* Columna Derecha: Tarjeta Cápsula de Acceso */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
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

          <div className="text-center text-[11px] text-[#8C929D] font-medium mt-4 flex items-center justify-center gap-2">
            <span>© {new Date().getFullYear()} Bunker Marketing Agency</span>
            <span>·</span>
            <Link href="/privacy" className="hover:text-[#121417] dark:hover:text-white transition-colors">Privacidad</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-[#121417] dark:hover:text-white transition-colors">Términos</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
