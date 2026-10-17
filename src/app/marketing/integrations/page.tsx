"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Share2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ExternalLink,
  Key,
  X,
  Check,
  Plus,
  Users,
  Search,
  HelpCircle,
  Sparkles,
} from "lucide-react";
import { ACCOUNT_STATUS, INTEGRATION_STATUS } from "@/lib/constants/integrations";
import { ConnectSocialAccountModal } from "@/components/modals/ConnectSocialAccountModal";
import { ClientOnboardingWizardModal } from "@/components/modals/ClientOnboardingWizardModal";

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
    return "Conexión oficial de Meta pendiente. Haz clic en Vincular Red Social para conectar tus cuentas publicitarias.";
  }
  if (msg.includes("GOOGLE_ADS")) {
    return "Conexión de Google Ads pendiente de configurar.";
  }
  if (msg.includes("TIKTOK")) {
    return "Conexión de TikTok Ads pendiente de configurar.";
  }
  return msg;
}

interface ClientItem {
  id: string;
  name: string;
  companyName?: string | null;
  industry?: string | null;
  status: string;
  revenue?: number | null;
  owner?: { id: string; name: string } | null;
  connectedAccounts?: any[];
  _count?: { leads: number };
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [, setCredentialStatus] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: string; message: string } | null>(null);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Vista comercial vs técnica
  const [activeView, setActiveView] = useState<"clients" | "platforms">("clients");
  const [searchFilter, setSearchFilter] = useState("");

  // Connect Modal (Claves manuales / Twilio)
  const [selectedIntegration, setSelectedIntegration] = useState<any>(null);
  const [creds, setCreds] = useState({ apiKey: "", apiSecret: "", accountId: "" });
  const [connecting, setConnecting] = useState(false);

  // Social Quick Connect Modal
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [activeSocialProvider, setActiveSocialProvider] = useState<string>("meta");
  const [modalClientId, setModalClientId] = useState<string>("");

  // Wizard Modal
  const [wizardOpen, setWizardOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string }[]>([]);

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
      if (json.success) {
        setClients(json.clients);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchTeam = async () => {
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.success && Array.isArray(json.users)) {
        setTeamMembers(json.users.map((u: any) => ({ id: u.id, name: u.name })));
      }
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
      if (json.success) {
        fetchIntegrations();
        fetchClients();
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message });
    } finally {
      setAssigningId(null);
    }
  };

  useEffect(() => {
    fetchIntegrations();
    fetchClients();
    fetchTeam();

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
        fetchClients();
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
        fetchClients();
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
        fetchClients();
      } else {
        alert(json.error);
      }
    } catch (e: any) {
      alert("Error al conectar: " + e.message);
    } finally {
      setConnecting(false);
    }
  };

  // Consolidar todas las cuentas conectadas a través de las integraciones
  const allConnectedAccounts = useMemo(() => {
    return integrations.flatMap((it) =>
      (it.connectedAccounts || []).map((acc: any) => ({
        ...acc,
        provider: it.provider,
        integrationName: it.name,
      }))
    );
  }, [integrations]);

  // Cuentas asignadas a cada cliente
  const clientAccountsMap = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const acc of allConnectedAccounts) {
      if (acc.clientId) {
        const list = map.get(acc.clientId) || [];
        list.push(acc);
        map.set(acc.clientId, list);
      }
    }
    return map;
  }, [allConnectedAccounts]);

  // Cuentas de la agencia (Bunker Agency) o sin asignar
  const agencyAccounts = useMemo(() => {
    return allConnectedAccounts.filter((acc) => !acc.clientId);
  }, [allConnectedAccounts]);

  // Filtrado de clientes por buscador
  const filteredClients = useMemo(() => {
    if (!searchFilter.trim()) return clients;
    const q = searchFilter.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        (c.industry && c.industry.toLowerCase().includes(q))
    );
  }, [clients, searchFilter]);

  // Clientes con al menos 1 cuenta conectada
  const activeClientsCount = useMemo(() => {
    return clients.filter((c) => (clientAccountsMap.get(c.id) || []).length > 0).length;
  }, [clients, clientAccountsMap]);

  const handleOpenConnectForClient = (clientId: string, provider: string = "meta") => {
    setModalClientId(clientId);
    setActiveSocialProvider(provider);
    setSocialModalOpen(true);
  };

  const handleOpenConnectGeneral = (provider: string = "meta") => {
    setModalClientId("");
    setActiveSocialProvider(provider);
    setSocialModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Ejecutivo */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E6DF]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#82807C] mb-1">
            <span>Marketing</span>
            <span>/</span>
            <span className="text-[#1F1E1D] font-medium">Pautas & Redes Sociales</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1F1E1D] tracking-tight">
            Centro de Redes & Pautas por Cliente
          </h1>
          <p className="text-xs text-[#6B6966] mt-0.5">
            Organiza las cuentas de Meta Ads, Instagram y TikTok de cada cliente para que sus prospectos entren en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              fetchIntegrations();
              fetchClients();
            }}
            className="px-3 py-2 rounded-xl bg-white border border-[#E8E6DF] text-[#4D4C48] hover:text-[#1F1E1D] text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all"
            title="Actualizar estado de conexiones"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refrescar</span>
          </button>

          <button
            onClick={() => setWizardOpen(true)}
            className="px-4 py-2 rounded-xl btn-black-gold text-xs font-semibold flex items-center gap-2 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-[#E5C158]" />
            <span>+ Crear Cliente & Redes (Asistente Guiado)</span>
          </button>

          <button
            onClick={() => handleOpenConnectGeneral("meta")}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#E8E6DF] hover:bg-[#FAF9F5] text-[#1F1E1D] text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4 text-[#D97757]" />
            <span>Vincular Red a Existente</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 ${
            feedback.type === "success"
              ? "bg-[#EBF5EE] border-[#C2E2CC] text-emerald-800"
              : "bg-[#FDF2F2] border-[#F8D7DA] text-red-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Selector de Vista: Vista Comercial por Cliente vs Vista Técnica por Plataforma */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-[#FAF9F5] rounded-2xl border border-[#E8E6DF]">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveView("clients")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeView === "clients"
                ? "bg-white text-[#1F1E1D] shadow-sm border border-[#E8E6DF]"
                : "text-[#716F6A] hover:text-[#1F1E1D]"
            }`}
          >
            <Users className="w-4 h-4 text-[#D97757]" />
            <span>Directorio Organizado por Cliente (Comercial)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#F0EEE6] font-bold">
              {clients.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView("platforms")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
              activeView === "platforms"
                ? "bg-white text-[#1F1E1D] shadow-sm border border-[#E8E6DF]"
                : "text-[#716F6A] hover:text-[#1F1E1D]"
            }`}
          >
            <Key className="w-4 h-4 text-[#82807C]" />
            <span>Configuración Técnica de Plataformas (APIs & BM)</span>
          </button>
        </div>

        {activeView === "clients" && (
          <div className="relative w-full sm:w-64 px-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#9C9890]" />
            <input
              type="text"
              placeholder="Buscar cliente..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-white border border-[#E8E6DF] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: DIRECTORIO ORGANIZADO POR CLIENTE (ORIENTADO A VENTAS)           */}
      {/* ========================================================================= */}
      {activeView === "clients" && (
        <div className="space-y-6">
          {/* Métricas Resumen para Dirección Comercial */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm">
              <span className="text-[11px] font-medium text-[#716F6A] block">Clientes con Pauta Activa</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-[#1F1E1D]">
                  {activeClientsCount} <span className="text-xs font-normal text-[#9C9890]">/ {clients.length}</span>
                </span>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200">
                  {Math.round((activeClientsCount / (clients.length || 1)) * 100)}% conectados
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm">
              <span className="text-[11px] font-medium text-[#716F6A] block">Cuentas Publicitarias en Clientes</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-[#1F1E1D]">
                  {allConnectedAccounts.length - agencyAccounts.length}
                </span>
                <span className="text-xs text-[#9C9890]">canales activos</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm">
              <span className="text-[11px] font-medium text-[#716F6A] block">Recepción de Prospectos (Leads)</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-sm font-bold text-emerald-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  En Tiempo Real
                </span>
                <span className="text-[11px] text-[#9C9890]">vía Webhooks</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm">
              <span className="text-[11px] font-medium text-[#716F6A] block">Cuentas Propias de Bunker</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl font-bold text-[#1F1E1D]">{agencyAccounts.length}</span>
                <span className="text-xs text-[#9C9890]">en portafolio agencia</span>
              </div>
            </div>
          </div>

          {/* Banner de Cuentas Pendientes por Asignar a un Cliente */}
          {agencyAccounts.filter((a) => !a.accountName.toLowerCase().includes("bunker")).length > 0 && (
            <div className="p-4 rounded-2xl bg-[#FFFBF0] border border-[#FDE68A] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                  ⚠️
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    Cuentas publicitarias detectadas sin cliente asignado
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Hay cuentas en tu Meta Business Suite o TikTok que aún no están asignadas a un cliente. Asígnalas a su respectiva empresa para que sus leads no se pierdan.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <span className="text-xs font-semibold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-lg">
                  {agencyAccounts.filter((a) => !a.accountName.toLowerCase().includes("bunker")).length} por asignar
                </span>
              </div>
            </div>
          )}

          {/* Tarjetas por Cliente */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {filteredClients.map((client) => {
              const accounts = clientAccountsMap.get(client.id) || [];
              const hasAccounts = accounts.length > 0;
              const leadsCount = client._count?.leads ?? 0;

              return (
                <div
                  key={client.id}
                  className="rounded-3xl bg-white border border-[#E8E6DF] hover:border-[#D1CFCA] shadow-sm transition-all flex flex-col justify-between overflow-hidden"
                >
                  {/* Cabecera del Cliente */}
                  <div className="p-5 border-b border-[#F0EEE6] space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#1F1E1D] to-[#3A3835] text-white flex items-center justify-center font-bold text-sm shadow-sm flex-shrink-0">
                          {client.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-base text-[#1F1E1D] leading-tight">
                              {client.name}
                            </h3>
                          </div>
                          <span className="text-xs text-[#716F6A] block mt-0.5">
                            {client.companyName || "Empresa registrada"}
                            {client.industry && ` • ${client.industry}`}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider flex items-center gap-1.5 flex-shrink-0 ${
                          hasAccounts
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-[#FAF9F5] text-[#9C9890] border-[#E8E6DF]"
                        }`}
                      >
                        {hasAccounts ? (
                          <>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                            <span>LEADS EN VIVO</span>
                          </>
                        ) : (
                          <span>SIN REDES</span>
                        )}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-[#716F6A] pt-1">
                      <span>
                        Asesor: <strong className="text-[#1F1E1D]">{client.owner?.name || "Sin asignar"}</strong>
                      </span>
                      <span className="text-[11px] font-semibold text-[#D97757]">
                        🔥 {leadsCount} leads registrados
                      </span>
                    </div>
                  </div>

                  {/* Cuerpo: Canales Conectados del Cliente */}
                  <div className="p-5 space-y-3 flex-1 bg-[#FAF9F5]/40">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-[#1F1E1D]">
                        Redes Sociales & Cuentas Vinculadas ({accounts.length})
                      </span>
                      <button
                        onClick={() => handleOpenConnectForClient(client.id, "meta")}
                        className="text-[11px] font-semibold text-[#D97757] hover:underline flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Vincular otra red</span>
                      </button>
                    </div>

                    {!hasAccounts ? (
                      <div className="p-5 rounded-2xl bg-white border border-dashed border-[#D1CFCA] text-center space-y-3">
                        <div className="w-10 h-10 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DF] text-[#9C9890] flex items-center justify-center mx-auto">
                          <Share2 className="w-5 h-5" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold text-[#1F1E1D]">
                            Este cliente aún no tiene pauta conectada
                          </h4>
                          <p className="text-[11px] text-[#716F6A] max-w-xs mx-auto">
                            Vincula su cuenta de Facebook Ads, Instagram o TikTok para que sus prospectos entren automáticamente a su CRM comercial.
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenConnectForClient(client.id, "meta")}
                          className="px-3.5 py-1.5 rounded-xl btn-black-gold text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#E5C158]" />
                          <span>Vincular Red a {client.name}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {accounts.map((acc: any) => {
                          const isMeta = acc.provider === "meta" || acc.accountType?.includes("meta") || acc.accountType?.includes("facebook");
                          const isInstagram = acc.accountType === "instagram_business";
                          const isTikTok = acc.provider === "tiktok" || acc.accountType?.includes("tiktok");
                          const isGoogle = acc.provider === "google_ads";

                          return (
                            <div
                              key={acc.id}
                              className="p-3.5 rounded-2xl bg-white border border-[#E8E6DF] hover:border-[#D1CFCA] transition-all space-y-2.5 shadow-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {isMeta && !isInstagram && (
                                    <div className="w-7 h-7 rounded-lg bg-[#1877F2] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                                      f
                                    </div>
                                  )}
                                  {isInstagram && (
                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#FD1D1D] to-[#C13584] text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                                      ig
                                    </div>
                                  )}
                                  {isTikTok && (
                                    <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                                      tt
                                    </div>
                                  )}
                                  {isGoogle && (
                                    <div className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center font-bold text-xs flex-shrink-0">
                                      G
                                    </div>
                                  )}

                                  <div className="min-w-0">
                                    <h5 className="text-xs font-semibold text-[#1F1E1D] truncate leading-tight">
                                      {acc.accountName}
                                    </h5>
                                    <span className="text-[10px] text-[#82807C] block">
                                      {ACCOUNT_TYPE_LABELS[acc.accountType] || "Cuenta publicitaria"}
                                      {acc.externalId && ` • ID: ${acc.externalId}`}
                                    </span>
                                  </div>
                                </div>

                                <span
                                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                                    acc.status === ACCOUNT_STATUS.ACTIVE
                                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                      : "bg-amber-50 text-amber-700 border-amber-200"
                                  }`}
                                >
                                  ● {acc.status === ACCOUNT_STATUS.ACTIVE ? "Activa" : acc.status}
                                </span>
                              </div>

                              {/* Asignación rápida de cliente */}
                              <div className="flex items-center justify-between pt-2 border-t border-[#F0EEE6] text-[11px] text-[#716F6A]">
                                <span className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                                  <Check className="w-3 h-3 text-emerald-600" />
                                  Webhook activo
                                </span>

                                <label className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-[#9C9890]">Asignado:</span>
                                  <select
                                    value={acc.clientId || ""}
                                    disabled={assigningId === acc.id}
                                    onChange={(e) => handleAssignClient(acc.id, e.target.value)}
                                    className="bg-[#FAF9F5] border border-[#E8E6DF] rounded-md px-1.5 py-0.5 text-[10px] text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                                  >
                                    <option value="">🏢 Portafolio Agencia</option>
                                    <optgroup label="Clientes Comerciales:">
                                      {clients.map((c) => (
                                        <option key={c.id} value={c.id}>
                                          {c.name}
                                        </option>
                                      ))}
                                    </optgroup>
                                  </select>
                                </label>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Pie de la Tarjeta del Cliente */}
                  <div className="p-4 bg-white border-t border-[#F0EEE6] flex items-center justify-between text-xs">
                    <button
                      onClick={() => handleOpenConnectForClient(client.id, "meta")}
                      className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] hover:bg-[#F4F3EE] text-[#1F1E1D] font-medium flex items-center gap-1.5 transition-colors text-xs"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#D97757]" />
                      <span>Conectar Red</span>
                    </button>

                    <Link
                      href={`/crm/clients/${client.id}`}
                      className="text-xs font-semibold text-[#D97757] hover:underline flex items-center gap-1"
                    >
                      <span>Ver Ficha 360° & Leads</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sección Cuentas Propias de Bunker Agency */}
          <div className="p-6 rounded-3xl bg-white border border-[#E8E6DF] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EEE6]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DF] text-[#1F1E1D] flex items-center justify-center font-bold">
                  🏢
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-[#1F1E1D]">
                    Cuentas Oficiales de Bunker Agency (Propias de la Agencia)
                  </h3>
                  <p className="text-xs text-[#716F6A]">
                    Estas son las cuentas administradoras de pauta de la agencia matriz (no asignadas a ningún cliente comercial).
                  </p>
                </div>
              </div>

              <button
                onClick={() => handleOpenConnectGeneral("meta")}
                className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] hover:bg-[#F4F3EE] text-xs font-medium text-[#1F1E1D] flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5 text-[#D97757]" />
                <span>Agregar Cuenta a la Agencia</span>
              </button>
            </div>

            {agencyAccounts.length === 0 ? (
              <div className="p-6 text-center text-xs text-[#9C9890] rounded-2xl bg-[#FAF9F5] border border-dashed border-[#E8E6DF]">
                No hay cuentas asignadas exclusivamente a la agencia. Todas las cuentas conectadas están distribuidas en clientes comerciales.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {agencyAccounts.map((acc: any) => (
                  <div
                    key={acc.id}
                    className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#1F1E1D] truncate">
                        {acc.accountName}
                      </span>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        ● Activa
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-[#716F6A] pt-1 border-t border-[#E8E6DF]">
                      <span className="text-[10px] text-[#9C9890]">Asignar a un cliente:</span>
                      <select
                        value=""
                        disabled={assigningId === acc.id}
                        onChange={(e) => handleAssignClient(acc.id, e.target.value)}
                        className="bg-white border border-[#E8E6DF] rounded-md px-1.5 py-0.5 text-[10px] text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                      >
                        <option value="">(Permanecer en Agencia)</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            👤 Asignar a {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: CONFIGURACIÓN TÉCNICA POR PLATAFORMA (META, GOOGLE, TIKTOK, TWILIO) */}
      {/* ========================================================================= */}
      {activeView === "platforms" && (
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Panel Técnico de Conexión de Plataformas</p>
              <p className="mt-0.5 text-blue-800">
                Esta sección está pensada para administradores que necesitan vincular el Business Manager principal con OAuth, autorizar tokens de Meta Ads o configurar las credenciales de Twilio para llamadas y SMS.
              </p>
            </div>
          </div>

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
                        <h3 className="font-semibold text-base text-[#1F1E1D]">{it.name}</h3>
                        <p className="text-xs text-[#6B6966] mt-1 leading-relaxed">
                          {it.description}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full border uppercase flex-shrink-0 ${
                          isConnected
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {isConnected ? "CONECTADO" : "PENDIENTE"}
                      </span>
                    </div>

                    {/* Status Details */}
                    <div className="mt-4 p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-[11px] space-y-1.5">
                      <div className="flex items-center justify-between text-[#82807C]">
                        <span>Última sincronización:</span>
                        <span className="text-[#1F1E1D] font-mono">
                          {it.lastSyncAt ? new Date(it.lastSyncAt).toLocaleString() : "Sin sincronizar"}
                        </span>
                      </div>

                      {it.errorMessage && (
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
                  </div>

                  {/* Botones de acción técnica */}
                  <div className="flex items-center justify-between pt-3 border-t border-[#F0EEE6] text-xs">
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
        </div>
      )}

      {/* Modal Conexión de Credenciales (Twilio / Manual) */}
      {selectedIntegration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
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
                    💡 <strong>¿Dónde encontrar estos datos?</strong> En tu consola de Twilio, en la pantalla principal donde dice <strong>Account SID</strong> y <strong>Auth Token</strong>.
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

      {/* Modal de Conexión Guiada de Cuentas de Redes Sociales */}
      <ConnectSocialAccountModal
        isOpen={socialModalOpen}
        onClose={() => setSocialModalOpen(false)}
        onSuccess={() => {
          fetchIntegrations();
          fetchClients();
          setFeedback({
            type: "success",
            message: "Cuenta conectada y vinculada exitosamente.",
          });
        }}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        initialProvider={activeSocialProvider}
        initialClientId={modalClientId}
      />

      {/* Asistente Guiado de Creación de Cliente + Vinculación de Redes */}
      <ClientOnboardingWizardModal
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onSuccess={() => {
          fetchIntegrations();
          fetchClients();
          setFeedback({
            type: "success",
            message: "¡Cliente creado y redes vinculadas exitosamente con el Asistente Guiado!",
          });
        }}
        teamMembers={teamMembers}
      />
    </div>
  );
}
