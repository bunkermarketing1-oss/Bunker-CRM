"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Send,
  Phone,
  MessageSquare,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { ROUTES } from "@/lib/constants/routes";
import type { TwilioConnectionTestResult, TwilioEnvStatus } from "@/types/integrations";

interface TwilioEnvStatusCardProps {
  name: string;
  description: string | null;
  status: TwilioEnvStatus | null;
}

export function TwilioEnvStatusCard({ name, description, status }: TwilioEnvStatusCardProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<TwilioConnectionTestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  // SMS de prueba
  const [testPhone, setTestPhone] = useState("");
  const [sendingSms, setSendingSms] = useState(false);
  const [smsResult, setSmsResult] = useState<{ success: boolean; message: string } | null>(null);

  // Copiado al portapapeles
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showWebhooks, setShowWebhooks] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const smsReady = status?.smsReady ?? false;
  const isConnected = testResult ? testResult.connected : smsReady;

  const handleCopy = (key: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestError(null);
    try {
      const res = await fetch("/api/integrations/twilio/test", { method: "GET" });
      const json = await res.json();
      if (json.connected) {
        setTestResult(json);
      } else {
        setTestError(json.error || "No se pudo conectar con la API de Twilio.");
        if (json.webhooks) setTestResult(json);
      }
    } catch (err) {
      setTestError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
    } finally {
      setTesting(false);
    }
  };

  const handleSendTestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPhone.trim()) return;

    setSendingSms(true);
    setSmsResult(null);
    try {
      const res = await fetch("/api/integrations/twilio/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send_test_sms", to: testPhone.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setSmsResult({
          success: true,
          message: json.message || "SMS de prueba enviado con éxito.",
        });
      } else {
        setSmsResult({
          success: false,
          message: json.error || "Error al enviar SMS de prueba.",
        });
      }
    } catch (err) {
      setSmsResult({
        success: false,
        message: err instanceof Error ? err.message : "Error de comunicación con el servidor.",
      });
    } finally {
      setSendingSms(false);
    }
  };

  const appUrl = typeof window !== "undefined" ? window.location.origin : "https://app.bunkercrm.com";
  const defaultWebhooks = testResult?.webhooks || {
    smsInboundUrl: `${appUrl}/api/integrations/twilio/sms`,
    smsStatusUrl: `${appUrl}/api/integrations/twilio/status`,
    voiceAppUrl: `${appUrl}/api/integrations/twilio/voice`,
    voiceInboundUrl: `${appUrl}/api/integrations/twilio/voice/inbound`,
    voiceStatusUrl: `${appUrl}/api/integrations/twilio/voice/status`,
  };

  return (
    <div className="p-6 rounded-2xl bg-white border border-[#E8E6DF] flex flex-col space-y-5 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 font-bold shrink-0">
            <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.8a7.2 7.2 0 1 1 0 14.4 7.2 7.2 0 0 1 0-14.4zm0 2.4a4.8 4.8 0 1 0 0 9.6 4.8 4.8 0 0 0 0-9.6zm-1.6 2.4a1.6 1.6 0 1 1 3.2 0 1.6 1.6 0 0 1-3.2 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-base text-[#1F1E1D]">{name}</h3>
            {description && <p className="text-xs text-[#6B6966] mt-0.5 leading-relaxed">{description}</p>}
          </div>
        </div>

        <span
          className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border uppercase tracking-wider shrink-0 ${
            isConnected
              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}
        >
          {isConnected ? "API LISTA" : "SIN CONFIGURAR"}
        </span>
      </div>

      {/* Variables de entorno de Twilio */}
      {status && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-medium text-[#4D4C48]">
            <span>Estado de Credenciales del Servidor:</span>
            <span className="text-[11px] text-[#82807C]">
              {status.variables.filter((v) => v.isSet).length} / {status.variables.length} configuradas
            </span>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
            {status.variables.map((v) => (
              <li
                key={v.name}
                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF]"
              >
                <span className="font-mono text-[#1F1E1D] text-[10px] truncate" title={v.name}>
                  {v.name}
                </span>
                {v.isSet ? (
                  <span className="flex items-center gap-1 text-emerald-700 font-medium shrink-0">
                    <CheckCircle2 className="w-3 h-3" /> OK
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-700 font-medium shrink-0">
                    <XCircle className="w-3 h-3" /> Falta
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Botón de Test de Diagnóstico API */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testing}
          className="w-full py-2.5 px-4 rounded-xl bg-[#1F1E1D] hover:bg-black text-white text-xs font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
          <span>{testing ? "Verificando con Twilio API..." : "Probar Conexión con Twilio API"}</span>
        </button>
      </div>

      {/* Resultado del Test de Conexión */}
      {testResult && testResult.connected && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1.5">
          <div className="flex items-center gap-2 font-semibold text-emerald-800">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Twilio API Conectada Exitosamente</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-emerald-200/60">
            <div>
              <span className="text-emerald-700">Cuenta:</span>{" "}
              <strong>{testResult.accountName}</strong> ({testResult.accountType})
            </div>
            <div>
              <span className="text-emerald-700">Estado:</span>{" "}
              <strong className="uppercase">{testResult.accountStatus}</strong>
            </div>
            {testResult.phoneNumber && (
              <div className="col-span-2">
                <span className="text-emerald-700">Número Remitente:</span>{" "}
                <span className="font-mono font-bold">{testResult.phoneNumber}</span>
                {testResult.phoneCapabilities && (
                  <span className="ml-2 text-[10px] text-emerald-700 font-normal">
                    ({testResult.phoneCapabilities.sms ? "SMS" : ""}{" "}
                    {testResult.phoneCapabilities.voice ? "• Voz" : ""})
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {testError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 space-y-1">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <span>Fallo de autenticación con Twilio</span>
          </div>
          <p className="text-[11px] leading-relaxed">{testError}</p>
        </div>
      )}

      {/* Accordion 1: Webhooks para la Consola de Twilio */}
      <div className="border border-[#E8E6DF] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowWebhooks(!showWebhooks)}
          className="w-full px-4 py-2.5 bg-[#FAF9F5] hover:bg-[#F4F3EE] text-left text-xs font-semibold text-[#1F1E1D] flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2">
            <Copy className="w-3.5 h-3.5 text-[#D97757]" />
            <span>URLs de Webhooks para la Consola de Twilio</span>
          </div>
          {showWebhooks ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showWebhooks && (
          <div className="p-4 bg-white space-y-3 text-xs border-t border-[#E8E6DF]">
            <p className="text-[11px] text-[#6B6966] leading-relaxed">
              Copia y pega estas URLs en la configuración de tus números y TwiML App en la consola de Twilio para recibir
              respuestas y eventos en tiempo real:
            </p>

            <div className="space-y-2.5">
              <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF]">
                <div className="flex items-center justify-between text-[11px] font-medium text-[#1F1E1D] mb-1">
                  <span>1. SMS Entrantes (A message comes in)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy("smsInbound", defaultWebhooks.smsInboundUrl)}
                    className="flex items-center gap-1 text-[#D97757] hover:underline text-[10px]"
                  >
                    {copiedKey === "smsInbound" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "smsInbound" ? "Copiado" : "Copiar"}</span>
                  </button>
                </div>
                <div className="font-mono text-[10px] text-[#6B6966] break-all bg-white p-1.5 rounded border border-[#E8E6DF]">
                  {defaultWebhooks.smsInboundUrl}
                </div>
                <div className="text-[10px] text-[#82807C] mt-1">Método: <strong>HTTP POST</strong></div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF]">
                <div className="flex items-center justify-between text-[11px] font-medium text-[#1F1E1D] mb-1">
                  <span>2. Status Callback de SMS</span>
                  <button
                    type="button"
                    onClick={() => handleCopy("smsStatus", defaultWebhooks.smsStatusUrl)}
                    className="flex items-center gap-1 text-[#D97757] hover:underline text-[10px]"
                  >
                    {copiedKey === "smsStatus" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "smsStatus" ? "Copiado" : "Copiar"}</span>
                  </button>
                </div>
                <div className="font-mono text-[10px] text-[#6B6966] break-all bg-white p-1.5 rounded border border-[#E8E6DF]">
                  {defaultWebhooks.smsStatusUrl}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF]">
                <div className="flex items-center justify-between text-[11px] font-medium text-[#1F1E1D] mb-1">
                  <span>3. Voice TwiML App (Llamadas salientes desde el CRM)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy("voiceApp", defaultWebhooks.voiceAppUrl)}
                    className="flex items-center gap-1 text-[#D97757] hover:underline text-[10px]"
                  >
                    {copiedKey === "voiceApp" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "voiceApp" ? "Copiado" : "Copiar"}</span>
                  </button>
                </div>
                <div className="font-mono text-[10px] text-[#6B6966] break-all bg-white p-1.5 rounded border border-[#E8E6DF]">
                  {defaultWebhooks.voiceAppUrl}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF]">
                <div className="flex items-center justify-between text-[11px] font-medium text-[#1F1E1D] mb-1">
                  <span>4. Llamadas Entrantes (A call comes in)</span>
                  <button
                    type="button"
                    onClick={() => handleCopy("voiceInbound", defaultWebhooks.voiceInboundUrl)}
                    className="flex items-center gap-1 text-[#D97757] hover:underline text-[10px]"
                  >
                    {copiedKey === "voiceInbound" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedKey === "voiceInbound" ? "Copiado" : "Copiar"}</span>
                  </button>
                </div>
                <div className="font-mono text-[10px] text-[#6B6966] break-all bg-white p-1.5 rounded border border-[#E8E6DF]">
                  {defaultWebhooks.voiceInboundUrl}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Accordion 2: Formulario de Envío de SMS de Prueba */}
      <div className="border border-[#E8E6DF] rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowGuide(!showGuide)}
          className="w-full px-4 py-2.5 bg-[#FAF9F5] hover:bg-[#F4F3EE] text-left text-xs font-semibold text-[#1F1E1D] flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2">
            <Send className="w-3.5 h-3.5 text-[#D97757]" />
            <span>Enviar SMS de Prueba para Verificar Entrega</span>
          </div>
          {showGuide ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showGuide && (
          <form onSubmit={handleSendTestSms} className="p-4 bg-white space-y-3 text-xs border-t border-[#E8E6DF]">
            <p className="text-[11px] text-[#6B6966] leading-relaxed">
              Ingresa tu número celular con código de país para verificar que el remitente y las credenciales entregan
              mensajes SMS reales.
            </p>

            <div className="flex gap-2">
              <input
                type="tel"
                required
                placeholder="+57 300 123 4567 o +52 55 1234 5678"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
                className="flex-1 bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs font-mono text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
              />
              <button
                type="submit"
                disabled={sendingSms || !testPhone.trim()}
                className="px-4 py-2 rounded-xl btn-black-gold text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                <Send className="w-3 h-3" />
                <span>{sendingSms ? "Enviando..." : "Enviar Prueba"}</span>
              </button>
            </div>

            {smsResult && (
              <div
                className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
                  smsResult.success
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {smsResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />}
                <span>{smsResult.message}</span>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Accesos rápidos a funcionalidades vinculadas a Twilio */}
      <div className="pt-3 border-t border-[#F0EEE6] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.SMS}
            className="flex items-center gap-1.5 text-[#1F1E1D] hover:text-[#D97757] font-medium transition-colors"
          >
            <MessageSquare className="w-3.5 h-3.5 text-[#D97757]" />
            <span>Módulo de Mensajería SMS</span>
          </Link>
          <span className="text-[#D1CFCA]">|</span>
          <Link
            href={ROUTES.CALLS}
            className="flex items-center gap-1.5 text-[#1F1E1D] hover:text-[#D97757] font-medium transition-colors"
          >
            <Phone className="w-3.5 h-3.5 text-amber-600" />
            <span>Central Telefónica & Líneas</span>
          </Link>
        </div>

        <Link
          href={ROUTES.SETTINGS}
          className="text-[#82807C] hover:text-[#1F1E1D] text-[11px] flex items-center gap-1 font-medium"
        >
          <span>Variables en Servidor</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
