"use client";

import React, { useState, useEffect } from "react";
import {
  Share2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  ShieldCheck,
  Key,
  X,
  Radio,
  Check,
  Sparkles,
} from "lucide-react";
import { ACCOUNT_STATUS, INTEGRATION_STATUS } from "@/lib/constants/integrations";
import { ConnectSocialAccountModal } from "@/components/modals/ConnectSocialAccountModal";

// Proveedores que se conectan con OAuth real en lugar de claves manuales
const OAUTH_PROVIDERS: Record<string, { href: string; label: string }> = {
  meta: { href: "/api/integrations/meta/connect", label: "Conectar con Facebook" },
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  meta_ad_account: "Cuenta de anuncios Meta",
  facebook_page: "Página de Facebook",
  instagram_business: "Perfil de Instagram",
  tiktok_advertiser: "Cuenta de TikTok Ads",
};

/** Traduce mensajes técnicos o de variables de entorno a explicaciones claras para usuarios comerciales */
function humanizeStatusMessage(msg: string | null | undefined, provider: string): string {
  if (!msg) return "";
  if (msg.includes("TWILIO_ACCOUNT_SID") || msg.includes("TWILIO_AUTH_TOKEN") || provider === "twilio") {
    return "Servicio de SMS y llamadas pendiente de activar. Conecta tu cuenta de Twilio para comenzar a enviar mensajes.";
  }
  if (msg.includes("META_APP_ID") || msg.includes("META_APP_SECRET")) {
    return "Conexión oficial de Meta pendiente. Haz clic arriba en Facebook / Instagram para vincular tus cuentas de pauta.";
  }
  if (msg.includes("GOOGLE_ADS")) {
    return "Conexión de Google Ads pendiente de configurar.";
  }
  if (msg.includes("TIKTOK")) {
    return "Conexión de TikTok Ads pendiente de configurar.";
  }
  return msg;
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [credentialStatus, setCredentialStatus] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: string; message: string } | null>(null);
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Connect Modal
  const [selectedIntegration, setSelectedIntegration] = useState<any>(null);
  const [creds, setCreds] = useState({ apiKey: "", apiSecret: "", accountId: "" });
  const [connecting, setConnecting] = useState(false);

  // Social Quick Connect Modal
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [activeSocialProvider, setActiveSocialProvider] = useState<string>("meta");

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/integrations");
      const json = await res.json();
      if (json.success) {
        setIntegrations(json.integrations);
        setCredentialStatus(json.credentialStatus);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const res = await fetch("/api/clients");
      const json = await res.json();
      if (json.success) setClients(json.clients.map((c: any) => ({ id: c.id, name: c.name })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignClient = async (accountId: string, clientId: string) => {
    setAssigningId(accountId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/integrations/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: clientId || null }),
      });
      const json = await res.json();
      setFeedback({ type: json.success ? "success" : "error", message: json.success ? json.message : json.error });
      if (json.success) fetchIntegrations();
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message });
    } finally {
      setAssigningId(null);
    }
  };

  useEffect(() => {
    fetchIntegrations();
    fetchClients();

    // Resultado del flujo OAuth (redirect desde /api/integrations/*/callback)
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get("error");
    const oauthMessage = params.get("message");
    if (oauthError) setFeedback({ type: "error", message: oauthError });
    else if (oauthMessage) setFeedback({ type: "success", message: oauthMessage });
    if (oauthError || oauthMessage) window.history.replaceState(null, "", window.location.pathname);
  }, []);

  const handleSync = async (id: string) => {
    setSyncingId(id);
    setFeedback(null);
    try {
      const res = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: "success", message: json.message });
        fetchIntegrations();
      } else {
        setFeedback({ type: "error", message: json.error });
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message });
    } finally {
      setSyncingId(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    if (!confirm("¿Desconectar esta integración oficial?")) return;
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action: "disconnect" }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: "success", message: json.message });
        fetchIntegrations();
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedIntegration.id,
          action: "connect",
          credentials: creds,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSelectedIntegration(null);
        setCreds({ apiKey: "", apiSecret: "", accountId: "" });
        setFeedback({ type: "success", message: json.message });
        fetchIntegrations();
      } else {
        alert(json.error);
      }
    } catch (e: any) {
      alert("Error al conectar: " + e.message);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E6DF]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#82807C] mb-1">
            <span>Marketing</span>
            <span>/</span>
            <span className="text-[#1F1E1D] font-medium">Integraciones</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1F1E1D] tracking-tight">
            Centro de Conexiones & APIs Externas
          </h1>
          <p className="text-xs text-[#6B6966] mt-0.5">
            Integraciones oficiales con Meta Ads, Google Ads, TikTok y proveedores de mensajería SMS.
          </p>
        </div>

        <button
          onClick={fetchIntegrations}
          className="px-3.5 py-2 rounded-xl bg-white border border-[#E8E6DF] text-[#4D4C48] hover:text-[#1F1E1D] text-xs font-medium flex items-center gap-2 shadow-sm transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Verificar Estado</span>
        </button>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 ${
          feedback.type === "success"
            ? "bg-[#EBF5EE] border-[#C2E2CC] text-emerald-800"
            : "bg-[#FDF2F2] border-[#F8D7DA] text-red-800"
        }`}>
          {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-red-600" />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Barra de Conexión Rápida por Red Social */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-[#FAF9F5] via-white to-[#FAF9F5] border border-[#E8E6DF] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-[#1F1E1D] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#D97757]" />
              Conectar Cuenta de Red Social / Pauta
            </h2>
            <p className="text-xs text-[#6B6966] mt-0.5">
              Haz clic en una plataforma para vincular cuentas publicitarias o páginas al BM de la agencia o a un cliente específico (ej. Carrito Naranja).
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Botón Facebook / Meta Ads */}
          <button
            type="button"
            onClick={() => {
              setActiveSocialProvider("meta");
              setSocialModalOpen(true);
            }}
            className="p-3.5 rounded-2xl bg-white border border-[#E8E6DF] hover:border-[#1877F2] hover:shadow-md transition-all flex items-center gap-3 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#1877F2] text-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-semibold text-[#1F1E1D] group-hover:text-[#1877F2] transition-colors block">
                Facebook / Meta Ads
              </span>
              <span className="text-[11px] text-[#82807C] block">
                Cuentas publicitarias y páginas
              </span>
            </div>
          </button>

          {/* Botón Instagram */}
          <button
            type="button"
            onClick={() => {
              setActiveSocialProvider("instagram");
              setSocialModalOpen(true);
            }}
            className="p-3.5 rounded-2xl bg-white border border-[#E8E6DF] hover:border-[#E4405F] hover:shadow-md transition-all flex items-center gap-3 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#C13584] text-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-semibold text-[#1F1E1D] group-hover:text-[#E4405F] transition-colors block">
                Instagram Business
              </span>
              <span className="text-[11px] text-[#82807C] block">
                Perfil comercial y métricas
              </span>
            </div>
          </button>

          {/* Botón TikTok Ads */}
          <button
            type="button"
            onClick={() => {
              setActiveSocialProvider("tiktok");
              setSocialModalOpen(true);
            }}
            className="p-3.5 rounded-2xl bg-white border border-[#E8E6DF] hover:border-black hover:shadow-md transition-all flex items-center gap-3 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-black text-white flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
              </svg>
            </div>
            <div>
              <span className="text-xs font-semibold text-[#1F1E1D] group-hover:text-black transition-colors block">
                TikTok Ads
              </span>
              <span className="text-[11px] text-[#82807C] block">
                Pauta y conversiones
              </span>
            </div>
          </button>
        </div>
      </div>

      {/* Grid of integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {integrations.map((it) => {
          const isConnected = it.status === INTEGRATION_STATUS.CONNECTED;

          return (
            <div
              key={it.id}
              className="p-5 rounded-2xl bg-white border border-[#E8E6DF] hover:border-[#D1CFCA] transition-all flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-base text-[#1F1E1D]">
                      {it.name}
                    </h3>
                    <p className="text-xs text-[#6B6966] mt-1 leading-relaxed">
                      {it.description}
                    </p>
                  </div>

                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border uppercase flex-shrink-0 ${
                    isConnected
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    {isConnected ? "CONECTADO" : "PENDIENTE"}
                  </span>
                </div>

                {/* Status and Error Details */}
                <div className="mt-4 p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-[#82807C]">
                    <span>Última sincronización:</span>
                    <span className="text-[#1F1E1D] font-mono">
                      {it.lastSyncAt ? new Date(it.lastSyncAt).toLocaleString() : "Sin sincronizar"}
                    </span>
                  </div>

                  {!isConnected && it.errorMessage && (
                    <div className="text-amber-800 flex items-start gap-1.5 pt-1 border-t border-[#E8E6DF]">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
                      <span>{humanizeStatusMessage(it.errorMessage, it.provider)}</span>
                    </div>
                  )}

                  {isConnected && it.errorMessage && (
                    <div className="text-amber-800 flex items-start gap-1.5 pt-1 border-t border-[#E8E6DF]">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
                      <span>{humanizeStatusMessage(it.errorMessage, it.provider)}</span>
                    </div>
                  )}

                  {isConnected && !it.errorMessage && (
                    <div className="text-emerald-800 flex items-center gap-1.5 pt-1 border-t border-[#E8E6DF]">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Conexión activa y sincronizando datos</span>
                    </div>
                  )}
                </div>

                {isConnected && it.connectedAccounts?.length > 0 && (
                  <ul className="mt-3 space-y-1 text-[11px]">
                    {it.connectedAccounts.map((acc: any) => (
                      <li key={acc.id} className="px-2.5 py-1.5 rounded-lg bg-[#FAF9F5] border border-[#F0EFEA] space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[#1F1E1D] truncate">
                            <span className="text-[#82807C]">{ACCOUNT_TYPE_LABELS[acc.accountType] || "Cuenta"}:</span> {acc.accountName}
                          </span>
                          <span className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                            acc.status === ACCOUNT_STATUS.ACTIVE
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : acc.status === ACCOUNT_STATUS.EXPIRED
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            {acc.status === ACCOUNT_STATUS.ACTIVE ? "● Activa" : acc.status === ACCOUNT_STATUS.EXPIRED ? "● Reconectar" : "● Error"}
                          </span>
                        </div>
                        <label className="flex items-center gap-2 text-[#82807C]">
                          <span className="flex-shrink-0 font-medium">Asignada a:</span>
                          <select
                            value={acc.clientId || ""}
                            disabled={assigningId === acc.id}
                            onChange={(e) => handleAssignClient(acc.id, e.target.value)}
                            className="flex-1 min-w-0 bg-white border border-[#E8E6DF] rounded-lg px-2 py-1 text-[11px] text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                          >
                            <option value="">🏢 Portafolio Agencia (Bunker Agency)</option>
                            <optgroup label="👤 Clientes Comerciales:">
                              {clients.map((c) => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                              ))}
                            </optgroup>
                          </select>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-[#F0EFEA] text-xs">
                {isConnected ? (
                  <>
                    <button
                      onClick={() => handleSync(it.id)}
                      disabled={syncingId === it.id}
                      className="px-3 py-1.5 rounded-xl bg-[#F4F3EE] hover:bg-[#ECEAE3] text-[#1F1E1D] font-medium flex items-center gap-1.5 transition-all text-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingId === it.id ? "animate-spin" : ""}`} />
                      <span>{syncingId === it.id ? "Sincronizando..." : "Sincronizar"}</span>
                    </button>
                    <button
                      onClick={() => handleDisconnect(it.id)}
                      className="text-xs text-[#82807C] hover:text-red-700 font-medium"
                    >
                      Desconectar
                    </button>
                  </>
                ) : OAUTH_PROVIDERS[it.provider] ? (
                  <a
                    href={OAUTH_PROVIDERS[it.provider].href}
                    className="w-full py-2.5 rounded-2xl btn-black-gold font-semibold text-xs flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#E5C158]" />
                    <span>{OAUTH_PROVIDERS[it.provider].label}</span>
                  </a>
                ) : (
                  <button
                    onClick={() => setSelectedIntegration(it)}
                    className="w-full py-2.5 rounded-2xl btn-black-gold font-semibold text-xs flex items-center justify-center gap-2"
                  >
                    <Key className="w-3.5 h-3.5 text-[#E5C158]" />
                    <span>Configurar Credenciales</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect Modal */}
      {selectedIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white border border-[#E8E6DF] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#E8E6DF] flex items-center justify-between bg-[#FDFDFC]">
              <h2 className="text-sm font-semibold text-[#1F1E1D]">
                Conectar {selectedIntegration.name}
              </h2>
              <button
                onClick={() => setSelectedIntegration(null)}
                className="text-[#82807C] hover:text-[#1F1E1D] p-1 rounded-lg hover:bg-[#F4F3EE]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConnectSubmit} className="p-5 space-y-3.5">
              {selectedIntegration.provider === "twilio" ? (
                <>
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs">
                    💡 <strong>¿Dónde encontrar estos datos?</strong> En tu panel de control de Twilio (Console), en la pantalla principal donde dice <strong>Account SID</strong> y <strong>Auth Token</strong>.
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F1E1D] mb-1">
                      SID de Cuenta (Account SID)
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="ej. ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={creds.apiKey}
                      onChange={(e) => setCreds({ ...creds, apiKey: e.target.value })}
                      className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1F1E1D] mb-1">
                      Token Secreto de Autorización (Auth Token)
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Tu token secreto de Twilio..."
                      value={creds.apiSecret}
                      onChange={(e) => setCreds({ ...creds, apiSecret: e.target.value })}
                      className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1F1E1D] mb-1">
                      Número Remitente de SMS (Phone Number)
                    </label>
                    <input
                      type="text"
                      placeholder="ej. +1234567890"
                      value={creds.accountId}
                      onChange={(e) => setCreds({ ...creds, accountId: e.target.value })}
                      className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757] font-mono"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-[#1F1E1D] mb-1">
                      Clave de API / Token de Acceso
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Token o clave oficial..."
                      value={creds.apiKey}
                      onChange={(e) => setCreds({ ...creds, apiKey: e.target.value })}
                      className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#1F1E1D] mb-1">
                      Identificador de Cuenta (Account ID / ID de Anunciante)
                    </label>
                    <input
                      type="text"
                      placeholder="ej. act_1234567890"
                      value={creds.accountId}
                      onChange={(e) => setCreds({ ...creds, accountId: e.target.value })}
                      className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757] font-mono"
                    />
                  </div>
                </>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIntegration(null)}
                  className="px-3.5 py-2 rounded-xl bg-[#F4F3EE] border border-[#E8E6DF] text-[#4D4C48] hover:text-[#1F1E1D] text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  className="px-4 py-2 rounded-xl btn-black-gold text-xs font-semibold"
                >
                  {connecting ? "Validando..." : "Guardar & Conectar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Conexión de Cuentas de Redes Sociales (Facebook, Instagram, TikTok) */}
      <ConnectSocialAccountModal
        isOpen={socialModalOpen}
        onClose={() => setSocialModalOpen(false)}
        onSuccess={() => {
          fetchIntegrations();
          setFeedback({
            type: "success",
            message: "Cuenta conectada y vinculada exitosamente.",
          });
        }}
        clients={clients}
        initialProvider={activeSocialProvider}
      />
    </div>
  );
}
