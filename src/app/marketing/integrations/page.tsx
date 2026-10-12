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

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [credentialStatus, setCredentialStatus] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: string; message: string } | null>(null);

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

  useEffect(() => {
    fetchIntegrations();
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-bunker-400" />
            Centro de Conexiones & APIs Externas
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Integraciones oficiales con Meta Ads, Google Ads, TikTok y proveedores de mensajería SMS.
          </p>
        </div>

        <button
          onClick={fetchIntegrations}
          className="px-3.5 py-2 rounded-xl bg-[#141d30] border border-[#23314d] text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-2"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Verificar Estado</span>
        </button>
      </div>

      {feedback && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
          feedback.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : "bg-red-500/10 border-red-500/30 text-red-300"
        }`}>
          {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <XCircle className="w-4 h-4 text-red-400" />}
          {feedback.message}
        </div>
      )}

      {/* Grid of integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {integrations.map((it) => {
          const isConnected = it.status === "connected";

          return (
            <div
              key={it.id}
              className="p-5 rounded-2xl bg-[#0c111e] border border-[#1b2538] hover:border-[#263754] transition-all flex flex-col justify-between space-y-4 shadow-lg"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-sm flex items-center gap-2">
                      {it.name}
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      {it.description}
                    </p>
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase flex-shrink-0 ${
                    isConnected
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                  }`}>
                    {isConnected ? "CONECTADO" : "PENDIENTE"}
                  </span>
                </div>

                {/* Status and Error Details (As required: No fake success) */}
                <div className="mt-4 p-3 rounded-xl bg-[#080d16] border border-[#182338] text-[11px] space-y-1.5">
                  <div className="flex items-center justify-between text-gray-400">
                    <span>Última sincronización:</span>
                    <span className="text-white font-mono">
                      {it.lastSyncAt ? new Date(it.lastSyncAt).toLocaleString() : "Sin sincronizar"}
                    </span>
                  </div>

                  {!isConnected && it.errorMessage && (
                    <div className="text-amber-400 flex items-start gap-1.5 pt-1 border-t border-[#162033]">
                      <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      <span>{it.errorMessage}</span>
                    </div>
                  )}

                  {isConnected && (
                    <div className="text-emerald-400 flex items-center gap-1.5 pt-1 border-t border-[#162033] font-semibold">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Credenciales seguras activas en el servidor</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#172238] flex items-center justify-between">
                {isConnected ? (
                  <div className="flex items-center gap-2 w-full justify-between">
                    <button
                      onClick={() => handleSync(it.id)}
                      disabled={syncingId === it.id}
                      className="px-3 py-1.5 rounded-lg bg-bunker-600/20 hover:bg-bunker-600/40 text-bunker-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingId === it.id ? "animate-spin" : ""}`} />
                      <span>Sincronizar Datos</span>
                    </button>

                    <button
                      onClick={() => handleDisconnect(it.id)}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold"
                    >
                      Desconectar
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setSelectedIntegration(it);
                      setCreds({ apiKey: "", apiSecret: "", accountId: "" });
                    }}
                    className="w-full py-2 rounded-xl bg-bunker-600 hover:bg-bunker-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-bunker-600/20 transition-all"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>Configurar y Conectar Cuenta</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Connect Modal */}
      {selectedIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0b101d] border border-[#23314d] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#1c263c] flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Key className="w-4 h-4 text-bunker-400" />
                Conectar {selectedIntegration.name}
              </h2>
              <button onClick={() => setSelectedIntegration(null)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConnectSubmit} className="p-5 space-y-3">
              <div className="text-[11px] text-gray-400 bg-[#121929] p-3 rounded-lg border border-[#222f47] leading-relaxed">
                Ingresa las credenciales de la API oficial. Serán almacenadas únicamente de forma segura en las variables de servidor.
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Clave API / Client ID *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. meta_app_991823101..."
                  value={creds.apiKey}
                  onChange={(e) => setCreds({ ...creds, apiKey: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Clave Secreta / Client Secret *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••••••••••••••"
                  value={creds.apiSecret}
                  onChange={(e) => setCreds({ ...creds, apiSecret: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">ID de Cuenta Publicitaria (Opcional)</label>
                <input
                  type="text"
                  placeholder="act_1829038102"
                  value={creds.accountId}
                  onChange={(e) => setCreds({ ...creds, accountId: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500 font-mono"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedIntegration(null)}
                  className="px-3 py-2 rounded-lg bg-[#141d30] border border-[#23314d] text-gray-300 hover:text-white text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={connecting}
                  className="px-4 py-2 rounded-lg bg-bunker-600 hover:bg-bunker-500 text-white text-xs font-semibold shadow-md"
                >
                  {connecting ? "Validando..." : "Autorizar Conexión"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
