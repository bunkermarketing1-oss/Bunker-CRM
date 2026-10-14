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
} from "lucide-react";
import { ACCOUNT_STATUS, INTEGRATION_STATUS } from "@/lib/constants/integrations";

// Proveedores que se conectan con OAuth real en lugar de claves manuales
const OAUTH_PROVIDERS: Record<string, { href: string; label: string }> = {
  meta: { href: "/api/integrations/meta/connect", label: "Conectar con Facebook" },
};

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  meta_ad_account: "Cuenta publicitaria",
  facebook_page: "Página de Facebook",
  instagram_business: "Instagram",
  tiktok_advertiser: "TikTok Ads",
};

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
          <h1 className="text-2xl font-serif font-normal text-[#1F1E1D] tracking-tight">
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
                    <h3 className="font-serif font-normal text-base text-[#1F1E1D]">
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
                      <span>{it.errorMessage}</span>
                    </div>
                  )}

                  {isConnected && it.errorMessage && (
                    <div className="text-amber-800 flex items-start gap-1.5 pt-1 border-t border-[#E8E6DF]">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-amber-600" />
                      <span>{it.errorMessage}</span>
                    </div>
                  )}

                  {isConnected && !it.errorMessage && (
                    <div className="text-emerald-800 flex items-center gap-1.5 pt-1 border-t border-[#E8E6DF]">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Credenciales activas y respondiendo</span>
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
                          <span className={`flex-shrink-0 uppercase text-[10px] font-medium ${
                            acc.status === ACCOUNT_STATUS.ACTIVE ? "text-emerald-700" : "text-red-700"
                          }`}>
                            {acc.status === ACCOUNT_STATUS.ACTIVE ? "activa" : acc.status === ACCOUNT_STATUS.EXPIRED ? "token expirado" : "error"}
                          </span>
                        </div>
                        <label className="flex items-center gap-2 text-[#82807C]">
                          <span className="flex-shrink-0">Cliente:</span>
                          <select
                            value={acc.clientId || ""}
                            disabled={assigningId === acc.id}
                            onChange={(e) => handleAssignClient(acc.id, e.target.value)}
                            className="flex-1 min-w-0 bg-white border border-[#E8E6DF] rounded-lg px-2 py-1 text-[11px] text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                          >
                            <option value="">Sin asignar (solo Bunker)</option>
                            {clients.map((c) => (
                              <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
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
              <h2 className="text-sm font-serif font-normal text-[#1F1E1D]">
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
              <div>
                <label className="block text-xs font-medium text-[#4D4C48] mb-1">API Key / Access Token</label>
                <input
                  type="password"
                  required
                  placeholder="Token de acceso oficial..."
                  value={creds.apiKey}
                  onChange={(e) => setCreds({ ...creds, apiKey: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4D4C48] mb-1">Account ID / ID de Cuenta Publicitaria</label>
                <input
                  type="text"
                  placeholder="ej. act_1234567890"
                  value={creds.accountId}
                  onChange={(e) => setCreds({ ...creds, accountId: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757] font-mono"
                />
              </div>

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
    </div>
  );
}
