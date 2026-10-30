"use client";

import React, { useState, useEffect, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  ChevronDown,
  Trash2,
} from "lucide-react";
import { ACCOUNT_STATUS, ACCOUNT_TYPE, INTEGRATION_PROVIDER, INTEGRATION_STATUS } from "@/lib/constants/integrations";
import { TwilioEnvStatusCard } from "@/components/integrations/TwilioEnvStatusCard";
import type { TwilioEnvStatus } from "@/types/integrations";
import { ConnectSocialAccountModal } from "@/components/modals/ConnectSocialAccountModal";
import { PageLeadgenStatus } from "@/components/integrations/PageLeadgenStatus";
import { ClientOnboardingWizardModal } from "@/components/modals/ClientOnboardingWizardModal";
import { SocialNetworkIcon } from "@/components/common/SocialNetworkIcon";
import { initialsOf } from "@/lib/greeting";

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
  if (msg.includes("TWILIO_ACCOUNT_SID") || msg.includes("TWILIO_AUTH_TOKEN") || provider === INTEGRATION_PROVIDER.TWILIO) {
    return "Servicio de SMS y llamadas pendiente de activar. Las credenciales de Twilio se configuran en las variables de entorno del servidor.";
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
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[#667085]">Cargando integraciones y canales...</div>}>
      <IntegrationsPageContent />
    </Suspense>
  );
}

function IntegrationsPageContent() {
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [, setCredentialStatus] = useState<any>({});
  const [twilioEnv, setTwilioEnv] = useState<TwilioEnvStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: string; message: string } | null>(null);
  const [clients, setClients] = useState<ClientItem[]>([]);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const activeClient = clientId && clientId !== "all" ? clients.find((c) => c.id === clientId) : null;

  // Vista comercial vs canales (Buffer) vs técnica
  const [activeView, setActiveView] = useState<"channels" | "clients" | "platforms">("channels");
  const [searchFilter, setSearchFilter] = useState("");
  const [channelTypeFilter, setChannelTypeFilter] = useState<"all" | "pages" | "ads" | "instagram" | "unassigned">("all");
  const [channelSearchFilter, setChannelSearchFilter] = useState("");
  const [unassignedFilter, setUnassignedFilter] = useState<"all" | "pages" | "ads" | "instagram">("all");
  const [unassignedSearch, setUnassignedSearch] = useState("");
  const [refreshingMeta, setRefreshingMeta] = useState(false);

  // Connect Modal (claves manuales)
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
        setTwilioEnv(json.twilioEnv ?? null);
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

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteAccount = async (accountId: string, accountName: string) => {
    if (!window.confirm(`¿Deseas desvincular y eliminar la cuenta "${accountName}" del CRM?`)) {
      return;
    }
    setDeletingId(accountId);
    try {
      const res = await fetch(`/api/integrations/accounts/${accountId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: "success", message: json.message });
        await fetchIntegrations();
        await fetchClients();
      } else {
        setFeedback({ type: "error", message: json.error || "No se pudo eliminar la cuenta." });
      }
    } catch {
      setFeedback({ type: "error", message: "Error de conexión al eliminar la cuenta." });
    } finally {
      setDeletingId(null);
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
    } catch (e) {
      setFeedback({ type: "error", message: "Error: " + (e instanceof Error ? e.message : "Error inesperado") });
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
        setFeedback({ type: "error", message: json.error || "No se pudo conectar la cuenta." });
      }
    } catch (e) {
      setFeedback({ type: "error", message: "Error al conectar: " + (e instanceof Error ? e.message : "Error de red") });
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

  const filteredAgencyAccounts = useMemo(() => {
    return agencyAccounts.filter((acc) => {
      if (unassignedSearch.trim()) {
        const q = unassignedSearch.toLowerCase();
        if (!acc.accountName.toLowerCase().includes(q)) return false;
      }
      if (unassignedFilter === "pages") {
        return acc.accountType === ACCOUNT_TYPE.FACEBOOK_PAGE;
      }
      if (unassignedFilter === "ads") {
        return acc.accountType === ACCOUNT_TYPE.META_AD_ACCOUNT;
      }
      if (unassignedFilter === "instagram") {
        return acc.accountType === ACCOUNT_TYPE.INSTAGRAM_BUSINESS;
      }
      return true;
    });
  }, [agencyAccounts, unassignedSearch, unassignedFilter]);

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
  }, [clients, searchFilter, clientId]);

  const metaIntegration = useMemo(() => {
    return integrations.find((it) => it.provider === INTEGRATION_PROVIDER.META);
  }, [integrations]);

  const isMetaConnected = metaIntegration?.status === INTEGRATION_STATUS.CONNECTED;

  const handleRefreshMeta = async () => {
    setRefreshingMeta(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/integrations/meta/refresh", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: "success", message: json.message });
        await fetchIntegrations();
        await fetchClients();
      } else {
        setFeedback({ type: "error", message: json.error || "No se pudo actualizar el catálogo de Meta." });
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: e?.message || "Error al actualizar catálogo de Meta." });
    } finally {
      setRefreshingMeta(false);
    }
  };

  const filteredChannelsList = useMemo(() => {
    return allConnectedAccounts.filter((acc: any) => {
      if (acc.externalId === "meta_master_user") return false;

      // Si hay una marca/cliente activa seleccionada en el CRM
      if (activeClient) {
        if (channelTypeFilter === "unassigned") {
          return !acc.clientId;
        }
        if (acc.clientId !== activeClient.id) return false;
      } else {
        if (channelTypeFilter === "unassigned") return !acc.clientId;
      }

      if (channelSearchFilter.trim()) {
        const q = channelSearchFilter.toLowerCase();
        const matchesName = acc.accountName?.toLowerCase().includes(q) ?? false;
        const matchesId = acc.externalId?.toLowerCase().includes(q) ?? false;
        const clientName = clients.find((c) => c.id === acc.clientId)?.name;
        const matchesClient = clientName?.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesId && !matchesClient) return false;
      }
      if (channelTypeFilter === "pages") return acc.accountType === ACCOUNT_TYPE.FACEBOOK_PAGE;
      if (channelTypeFilter === "ads") return acc.accountType === ACCOUNT_TYPE.META_AD_ACCOUNT;
      if (channelTypeFilter === "instagram") return acc.accountType === ACCOUNT_TYPE.INSTAGRAM_BUSINESS;
      return true;
    });
  }, [allConnectedAccounts, channelSearchFilter, channelTypeFilter, clients, activeClient]);

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

          {isMetaConnected && (
            <button
              onClick={handleRefreshMeta}
              disabled={refreshingMeta}
              className="px-3 py-2 rounded-xl bg-white border border-[#E8E6DF] hover:bg-[#FAF9F5] text-[#1F1E1D] text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
              title="Re-escanear páginas y cuentas de Meta sin re-autorizar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingMeta ? "animate-spin text-[#1877F2]" : "text-[#1877F2]"}`} />
              <span>{refreshingMeta ? "Sincronizando..." : "Sincronizar Cuentas Meta"}</span>
            </button>
          )}

          <button
            onClick={() => setWizardOpen(true)}
            className="px-3.5 py-2 rounded-xl btn-black-gold text-xs font-semibold flex items-center gap-2 shadow-sm"
          >
            <Sparkles className="w-4 h-4 text-[#E5C158]" />
            <span>+ Crear Cliente (Asistente)</span>
          </button>

          <button
            onClick={() =>
              activeClient
                ? handleOpenConnectForClient(activeClient.id, "meta")
                : handleOpenConnectGeneral("meta")
            }
            className="px-3.5 py-2 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>
              {activeClient ? `+ Vincular Red a ${activeClient.name}` : "+ Conectar Canales / Redes"}
            </span>
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

      {/* Banner de Empresa / Marca Seleccionada */}
      {activeClient && (
        <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/80 border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 text-white font-bold flex items-center justify-center text-sm shadow-2xs shrink-0">
              {initialsOf(activeClient.name, "CL")}
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold tracking-wider text-amber-900 bg-amber-100/90 border border-amber-300 px-2 py-0.5 rounded-full uppercase">
                  Marca Activa
                </span>
                <span className="text-xs text-amber-900/80 font-medium">
                  {allConnectedAccounts.filter((a) => a.clientId === activeClient.id).length} activos vinculados
                </span>
              </div>
              <h2 className="text-base font-bold text-slate-950 truncate">
                Activos y Redes de {activeClient.name}
              </h2>
              <p className="text-xs text-amber-900/80">
                Páginas de Facebook, Instagram Direct y cuentas publicitarias asignadas exclusivamente a esta marca.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleOpenConnectForClient(activeClient.id, "meta")}
              className="px-4 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-amber-400 hover:text-amber-300 text-xs font-semibold flex items-center gap-2 shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Vincular Fan Page / Red</span>
            </button>
            <Link
              href="/marketing/integrations"
              className="px-3 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-amber-300 text-amber-950 text-xs font-semibold transition-colors"
            >
              Ver Todas las Marcas
            </Link>
          </div>
        </div>
      )}

      {/* Selector de Vista: Canales (Buffer) vs Clientes vs Técnico */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-[#FAF9F5] rounded-2xl border border-[#E8E6DF]">
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveView("channels")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeView === "channels"
                ? "bg-white text-[#1F1E1D] shadow-sm border border-[#E8E6DF]"
                : "text-[#716F6A] hover:text-[#1F1E1D]"
            }`}
          >
            <Share2 className="w-4 h-4 text-[#1877F2]" />
            <span>Canales Sociales</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1877F2]/10 text-[#1877F2] font-bold">
              {allConnectedAccounts.filter((a) => a.externalId !== "meta_master_user").length}
            </span>
          </button>

          <button
            onClick={() => setActiveView("clients")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeView === "clients"
                ? "bg-white text-[#1F1E1D] shadow-sm border border-[#E8E6DF]"
                : "text-[#716F6A] hover:text-[#1F1E1D]"
            }`}
          >
            <Users className="w-4 h-4 text-[#D97757]" />
            <span>Cuentas por Empresa</span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F0EEE6] font-bold">
              {clients.length}
            </span>
          </button>

          <button
            onClick={() => setActiveView("platforms")}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
              activeView === "platforms"
                ? "bg-white text-[#1F1E1D] shadow-sm border border-[#E8E6DF]"
                : "text-[#716F6A] hover:text-[#1F1E1D]"
            }`}
          >
            <Key className="w-4 h-4 text-[#82807C]" />
            <span>APIs & Plataformas</span>
          </button>
        </div>

        {activeView === "clients" && (
          <div className="relative w-full sm:w-64 px-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#9C9890]" />
            <input
              type="text"
              placeholder="Buscar empresa..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-white border border-[#E8E6DF] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
            />
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: GESTOR DE CANALES SOCIALES & CUENTAS (BUFFER STYLE)              */}
      {/* ========================================================================= */}
      {activeView === "channels" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Si Meta no está conectado, banner inicial destacado */}
          {!isMetaConnected && (
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#1877F2]/10 via-[#FAF9F5] to-white border border-[#1877F2]/20 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-[#1877F2] text-white flex items-center justify-center font-bold text-2xl shadow-md flex-shrink-0">
                  f
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#1F1E1D]">
                    Conecta tu cuenta de Meta for Business en 1 Clic
                  </h3>
                  <p className="text-xs text-[#6B6966] mt-1 max-w-xl">
                    Importa al instante todas tus páginas de Facebook, perfiles de Instagram y cuentas publicitarias. Asigna cada cuenta a su respectivo cliente para recibir leads en tiempo real y sincronizar métricas.
                  </p>
                </div>
              </div>

              <a
                href="/api/integrations/meta/connect"
                onClick={(e) => {
                  if (typeof window !== "undefined") {
                    e.preventDefault();
                    window.location.href = `/api/integrations/meta/connect?origin=${encodeURIComponent(window.location.origin)}`;
                  }
                }}
                className="px-5 py-3 rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 flex-shrink-0"
              >
                <span>Conectar con Facebook (OAuth)</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Barra de Filtros y Búsqueda de Canales */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-[#E8E6DF] shadow-sm">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setChannelTypeFilter("all")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  channelTypeFilter === "all"
                    ? "bg-[#1F1E1D] text-white shadow-sm"
                    : "bg-[#F0EEE6] text-[#716F6A] hover:text-[#1F1E1D]"
                }`}
              >
                {activeClient ? `Activos de ${activeClient.name}` : "Todos"} (
                {
                  allConnectedAccounts.filter((a) => {
                    if (a.externalId === "meta_master_user") return false;
                    return activeClient ? a.clientId === activeClient.id : true;
                  }).length
                }
                )
              </button>
              <button
                onClick={() => setChannelTypeFilter("pages")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  channelTypeFilter === "pages"
                    ? "bg-[#1877F2] text-white shadow-sm"
                    : "bg-[#F0EEE6] text-[#716F6A] hover:text-[#1F1E1D]"
                }`}
              >
                Páginas Facebook (
                {
                  allConnectedAccounts.filter((a) => {
                    if (a.accountType !== ACCOUNT_TYPE.FACEBOOK_PAGE) return false;
                    return activeClient ? a.clientId === activeClient.id : true;
                  }).length
                }
                )
              </button>
              <button
                onClick={() => setChannelTypeFilter("ads")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  channelTypeFilter === "ads"
                    ? "bg-[#0081FB] text-white shadow-sm"
                    : "bg-[#F0EEE6] text-[#716F6A] hover:text-[#1F1E1D]"
                }`}
              >
                Cuentas Ads (
                {
                  allConnectedAccounts.filter((a) => {
                    if (a.accountType !== ACCOUNT_TYPE.META_AD_ACCOUNT || a.externalId === "meta_master_user") return false;
                    return activeClient ? a.clientId === activeClient.id : true;
                  }).length
                }
                )
              </button>
              <button
                onClick={() => setChannelTypeFilter("instagram")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  channelTypeFilter === "instagram"
                    ? "bg-[#E4405F] text-white shadow-sm"
                    : "bg-[#F0EEE6] text-[#716F6A] hover:text-[#1F1E1D]"
                }`}
              >
                Instagram (
                {
                  allConnectedAccounts.filter((a) => {
                    if (a.accountType !== ACCOUNT_TYPE.INSTAGRAM_BUSINESS) return false;
                    return activeClient ? a.clientId === activeClient.id : true;
                  }).length
                }
                )
              </button>
              <button
                onClick={() => setChannelTypeFilter("unassigned")}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  channelTypeFilter === "unassigned"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-[#F0EEE6] text-[#716F6A] hover:text-[#1F1E1D]"
                }`}
              >
                Sin Asignar ({agencyAccounts.filter((a) => a.externalId !== "meta_master_user").length})
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#9C9890]" />
              <input
                type="text"
                placeholder="Buscar canal, ID o empresa..."
                value={channelSearchFilter}
                onChange={(e) => setChannelSearchFilter(e.target.value)}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
              />
            </div>
          </div>

          {/* Grid de Canales (Estilo Buffer / Cards) */}
          {filteredChannelsList.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-white border border-dashed border-[#D1CFCA] space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto">
                <Share2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-[#1F1E1D]">
                  {activeClient
                    ? `${activeClient.name} aún no tiene activos de redes vinculados`
                    : "No se encontraron canales con este filtro"}
                </h4>
                <p className="text-xs text-[#6B6966] max-w-md mx-auto">
                  {activeClient
                    ? `Vincula la Fan Page de Facebook, cuenta de Instagram o cuenta de anuncios de ${activeClient.name} para que sus mensajes, prospectos y campañas se carguen automáticamente al seleccionarla.`
                    : isMetaConnected
                    ? "Puedes hacer clic en 'Sincronizar Cuentas Meta' para buscar páginas o cuentas creadas recientemente en Business Manager."
                    : "Conecta tu cuenta de Facebook para importar automáticamente tus canales."}
                </p>
              </div>
              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                {activeClient && (
                  <button
                    type="button"
                    onClick={() => handleOpenConnectForClient(activeClient.id, "meta")}
                    className="px-4 py-2 rounded-xl btn-black-gold text-xs font-semibold flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4 text-amber-400" />
                    <span>Vincular Red a {activeClient.name}</span>
                  </button>
                )}
                {agencyAccounts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setChannelTypeFilter("unassigned")}
                    className="px-4 py-2 rounded-xl bg-white border border-[#E8E6DF] hover:bg-[#FAF9F5] text-[#1F1E1D] text-xs font-semibold flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <span>Ver {agencyAccounts.length} activos sin asignar</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredChannelsList.map((acc: any) => {
                const isFB = acc.accountType === ACCOUNT_TYPE.FACEBOOK_PAGE;
                const isIG = acc.accountType === ACCOUNT_TYPE.INSTAGRAM_BUSINESS;
                const assignedClient = clients.find((c) => c.id === acc.clientId);
                const hasClient = Boolean(assignedClient);

                return (
                  <div
                    key={acc.id}
                    className="rounded-3xl bg-white border border-[#E8E6DF] hover:border-[#D1CFCA] shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between gap-4 overflow-hidden"
                  >
                    {/* Header de la Tarjeta del Canal */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <SocialNetworkIcon type={acc.accountType} size="lg" />

                          <div className="min-w-0">
                            <h4 className="text-sm font-bold text-[#1F1E1D] leading-tight truncate" title={acc.accountName}>
                              {acc.accountName}
                            </h4>
                            <span className="text-[11px] text-[#716F6A] block mt-0.5">
                              {ACCOUNT_TYPE_LABELS[acc.accountType] || acc.accountType || "Canal Social"}
                            </span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 flex-shrink-0 ${
                            isIG
                              ? "bg-pink-50 text-pink-700 border-pink-200"
                              : isFB
                              ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                              : "bg-blue-50 text-blue-800 border-blue-200"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isIG ? "bg-pink-500 animate-pulse" : isFB ? "bg-emerald-500 animate-pulse" : "bg-blue-500"}`}></span>
                          <span>{isIG ? "DMS & MENSAJES" : isFB ? "LEADS & MENSAJES" : "MÉTRICAS & ANUNCIOS"}</span>
                        </span>
                      </div>

                      {/* ID Externo y Acción de Eliminar */}
                      <div className="flex items-center justify-between gap-2 text-[11px] text-[#82807C] font-mono bg-[#FAF9F5] px-3 py-1.5 rounded-xl border border-[#F0EEE6]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span>ID:</span>
                          <span className="truncate text-[#1F1E1D] font-medium">{acc.externalId || acc.id}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteAccount(acc.id, acc.accountName)}
                          disabled={deletingId === acc.id}
                          className="text-[#9C9890] hover:text-red-600 transition-colors p-0.5 shrink-0 cursor-pointer"
                          title="Desvincular y eliminar esta cuenta del CRM"
                        >
                          <Trash2 className={`w-3.5 h-3.5 ${deletingId === acc.id ? "animate-pulse" : ""}`} />
                        </button>
                      </div>
                    </div>

                    {/* Asignación Rápida a Cliente (Estilo Buffer) */}
                    <div className="pt-3 border-t border-[#F0EEE6] space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[11px] font-semibold text-[#4D4C48]">
                          Cliente Asignado:
                        </span>
                        {hasClient ? (
                          <Link
                            href={`/crm/clients/${assignedClient?.id}`}
                            className="text-[11px] font-semibold text-[#D97757] hover:underline flex items-center gap-0.5"
                          >
                            <span>Ver Ficha</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </Link>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            Portafolio Agencia
                          </span>
                        )}
                      </div>

                      <div className="relative">
                        <select
                          value={acc.clientId || ""}
                          disabled={assigningId === acc.id}
                          onChange={(e) => handleAssignClient(acc.id, e.target.value)}
                          className={`w-full rounded-xl px-3 py-2 text-xs font-semibold transition-all appearance-none border focus:outline-none ${
                            hasClient
                              ? "bg-[#FAF9F5] border-[#D1CFCA] text-[#1F1E1D] focus:border-[#D97757]"
                              : "bg-white border-[#E8E6DF] text-[#716F6A] focus:border-[#D97757]"
                          }`}
                        >
                          <option value="">Portafolio Agencia (Sin empresa asignada)</option>
                          {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name} {c.companyName && c.companyName !== c.name ? `(${c.companyName})` : ""}
                            </option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#716F6A]">
                          {assigningId === acc.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D97757]" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </div>

                      {/* Acción Rápida con la Marca Activa */}
                      {activeClient && (
                        <div className="pt-1">
                          {!acc.clientId ? (
                            <button
                              type="button"
                              onClick={() => handleAssignClient(acc.id, activeClient.id)}
                              disabled={assigningId === acc.id}
                              className="w-full py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Vincular a {activeClient.name} con 1 Clic</span>
                            </button>
                          ) : acc.clientId === activeClient.id ? (
                            <div className="flex items-center justify-between text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl">
                              <span className="flex items-center gap-1 font-semibold">
                                <Check className="w-3 h-3 text-emerald-600" />
                                Vinculado a {activeClient.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAssignClient(acc.id, "")}
                                disabled={assigningId === acc.id}
                                className="text-[10px] text-slate-500 hover:text-rose-600 hover:underline cursor-pointer"
                              >
                                Desvincular
                              </button>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: DIRECTORIO ORGANIZADO POR CLIENTE (ORIENTADO A VENTAS)           */}
      {/* ========================================================================= */}
      {activeView === "clients" && (
        <div className="space-y-6">
          {/* Banner de Cuentas Pendientes por Asignar a un Cliente */}
          {agencyAccounts.length > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 mt-0.5 font-bold text-sm">
                  ⚡
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-950">
                    {agencyAccounts.length} {agencyAccounts.length === 1 ? "cuenta detectada" : "cuentas detectadas"} sin empresa asignada
                  </h4>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Asigna cada cuenta a su empresa en la lista inferior o con el asistente para vincular sus campañas y prospectos automáticamente.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleOpenConnectGeneral("meta")}
                  className="px-3.5 py-1.5 rounded-xl bg-white border border-amber-300 text-amber-950 hover:bg-amber-100/60 text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Asignar con Asistente</span>
                </button>
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
                          return (
                            <div
                              key={acc.id}
                              className="p-3.5 rounded-2xl bg-white border border-[#E8E6DF] hover:border-[#D1CFCA] transition-all space-y-2.5 shadow-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <SocialNetworkIcon type={acc.accountType} size="sm" />

                                  <div className="min-w-0">
                                    <h5 className="text-xs font-semibold text-[#1F1E1D] truncate leading-tight">
                                      {acc.accountName}
                                    </h5>
                                    <span className="text-[10px] text-[#82807C] block">
                                      {ACCOUNT_TYPE_LABELS[acc.accountType] || "Cuenta publicitaria"}
                                      {acc.externalId && ` • ID: ${acc.externalId}`}
                                    </span>
                                    <div className="text-[10px] mt-0.5">
                                      <PageLeadgenStatus status={acc.leadgen ?? null} />
                                    </div>
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
                                    <option value="">Portafolio Agencia</option>
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

          {/* Sección Cuentas Detectadas Pendientes por Asignar */}
          <div className="p-6 rounded-3xl bg-white border border-[#E8E6DF] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0EEE6]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#1F1E1D] text-white flex items-center justify-center font-bold shadow-sm">
                  <Share2 className="w-5 h-5 text-[#E5C158]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-[#1F1E1D]">
                      Cuentas y Páginas Detectadas (Pendientes por Asignar)
                    </h3>
                    {agencyAccounts.length > 0 && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                        {agencyAccounts.length} sin cliente
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#716F6A] mt-0.5">
                    Páginas de Facebook, perfiles de Instagram y cuentas de anuncios que aún no están asignadas a ningún cliente.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleOpenConnectGeneral("meta")}
                className="btn-black-gold px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#E5C158]" />
                <span>Abrir Asistente Guiado</span>
              </button>
            </div>

            {agencyAccounts.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#82807C] rounded-2xl bg-[#FAF9F5] border border-dashed border-[#E8E6DF] space-y-1">
                <p className="font-semibold text-[#1F1E1D]">✓ Todo organizado</p>
                <p className="text-[11px] text-[#6B6966]">
                  Todas las páginas y cuentas publicitarias conectadas están asignadas a clientes comerciales.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Filtro y Buscador Rápido */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
                    <button
                      type="button"
                      onClick={() => setUnassignedFilter("all")}
                      className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                        unassignedFilter === "all"
                          ? "bg-[#1F1E1D] text-white shadow-sm"
                          : "bg-[#FAF9F5] text-[#6B6966] hover:text-[#1F1E1D] hover:bg-white border border-[#E8E6DF]"
                      }`}
                    >
                      Todas ({agencyAccounts.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnassignedFilter("pages")}
                      className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                        unassignedFilter === "pages"
                          ? "bg-[#1877F2] text-white shadow-sm"
                          : "bg-[#FAF9F5] text-[#6B6966] hover:text-[#1F1E1D] hover:bg-white border border-[#E8E6DF]"
                      }`}
                    >
                      Páginas ({agencyAccounts.filter((a) => a.accountType === ACCOUNT_TYPE.FACEBOOK_PAGE).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnassignedFilter("ads")}
                      className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                        unassignedFilter === "ads"
                          ? "bg-[#0081FB] text-white shadow-sm"
                          : "bg-[#FAF9F5] text-[#6B6966] hover:text-[#1F1E1D] hover:bg-white border border-[#E8E6DF]"
                      }`}
                    >
                      Anuncios ({agencyAccounts.filter((a) => a.accountType === ACCOUNT_TYPE.META_AD_ACCOUNT).length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setUnassignedFilter("instagram")}
                      className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                        unassignedFilter === "instagram"
                          ? "bg-[#E4405F] text-white shadow-sm"
                          : "bg-[#FAF9F5] text-[#6B6966] hover:text-[#1F1E1D] hover:bg-white border border-[#E8E6DF]"
                      }`}
                    >
                      Instagram ({agencyAccounts.filter((a) => a.accountType === ACCOUNT_TYPE.INSTAGRAM_BUSINESS).length})
                    </button>
                  </div>

                  <div className="relative w-full sm:w-60">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#9C9890]" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre..."
                      value={unassignedSearch}
                      onChange={(e) => setUnassignedSearch(e.target.value)}
                      className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                {/* Lista Limpia de Cuentas */}
                <div className="divide-y divide-[#F0EEE6] rounded-2xl border border-[#E8E6DF] overflow-hidden bg-white">
                  {filteredAgencyAccounts.length === 0 ? (
                    <div className="p-6 text-center text-xs text-[#82807C]">
                      No hay cuentas que coincidan con este filtro.
                    </div>
                  ) : (
                    filteredAgencyAccounts.map((acc) => {
                      const isFB = acc.accountType === ACCOUNT_TYPE.FACEBOOK_PAGE;
                const isIG = acc.accountType === ACCOUNT_TYPE.INSTAGRAM_BUSINESS;

                      const isAd = acc.accountType === ACCOUNT_TYPE.META_AD_ACCOUNT;
                      const isTikTok = acc.provider === "tiktok" || acc.accountType?.includes("tiktok");

                      return (
                        <div
                          key={acc.id}
                          className="p-3.5 px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF9F5] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {isFB && (
                              <div className="w-8 h-8 rounded-xl bg-[#1877F2] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                                f
                              </div>
                            )}
                            {isIG && (
                              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#C13584] text-white flex items-center justify-center text-xs flex-shrink-0 shadow-xs">
                                📷
                              </div>
                            )}
                            {isAd && (
                              <div className="w-8 h-8 rounded-xl bg-[#0081FB] text-white flex items-center justify-center text-[9px] font-bold flex-shrink-0 shadow-xs">
                                ADS
                              </div>
                            )}
                            {isTikTok && (
                              <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center text-xs flex-shrink-0 shadow-xs">
                                🎵
                              </div>
                            )}

                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-semibold text-[#1F1E1D] truncate">
                                  {acc.accountName}
                                </span>
                                {isFB && (
                                  <span className="text-[10px] font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                                    Página de Facebook
                                  </span>
                                )}
                                {isIG && (
                                  <span className="text-[10px] font-medium text-pink-700 bg-pink-50 px-2 py-0.5 rounded-md border border-pink-200/60">
                                    Instagram
                                  </span>
                                )}
                                {isAd && (
                                  <span className="text-[10px] font-medium text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200/60">
                                    Cuenta de Anuncios
                                  </span>
                                )}
                                {isTikTok && (
                                  <span className="text-[10px] font-medium text-neutral-800 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                                    TikTok Ads
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-[#8C887E] block mt-0.5">
                                Pendiente por asignar a un cliente comercial
                              </span>
                            </div>
                          </div>

                          {/* Selector de Cliente Directo */}
                          <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                            <select
                              value=""
                              disabled={assigningId === acc.id}
                              onChange={(e) => {
                                if (e.target.value) handleAssignClient(acc.id, e.target.value);
                              }}
                              className="bg-white border border-[#E8E6DF] hover:border-[#1F1E1D] rounded-xl px-3 py-1.5 text-xs text-[#1F1E1D] shadow-sm font-medium focus:outline-none focus:border-[#D4AF37] cursor-pointer transition-all"
                            >
                              <option value="">Asignar a un cliente...</option>
                              {clients.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} {c.companyName ? `(${c.companyName})` : ""}
                                </option>
                              ))}
                            </select>
                            {assigningId === acc.id && (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D97757]" />
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
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
                Esta sección está pensada para administradores que necesitan vincular el Business Manager principal con OAuth, autorizar tokens de Meta Ads o revisar si las variables de Twilio para llamadas y SMS están configuradas en el servidor.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {integrations.map((it) => {
              if (it.provider === INTEGRATION_PROVIDER.TWILIO) {
                return <TwilioEnvStatusCard key={it.id} name={it.name} description={it.description} status={twilioEnv} />;
              }

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
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSync(it.id)}
                            disabled={syncingId === it.id}
                            className="px-3 py-1.5 rounded-xl bg-[#F4F3EE] hover:bg-[#ECEAE3] text-[#1F1E1D] font-medium flex items-center gap-1.5 transition-all text-xs"
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${syncingId === it.id ? "animate-spin" : ""}`} />
                            <span>{syncingId === it.id ? "Sincronizando..." : "Sincronizar"}</span>
                          </button>
                          {it.provider === INTEGRATION_PROVIDER.META && (
                            <a
                              href="/api/integrations/meta/connect"
                              className="px-3 py-1.5 rounded-xl bg-[#1877F2]/10 hover:bg-[#1877F2]/20 text-[#1877F2] font-semibold flex items-center gap-1 transition-all text-xs"
                              title="Conectar otro perfil o autorizar más cuentas publicitarias y páginas"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Vincular más cuentas</span>
                            </a>
                          )}
                        </div>
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

      {/* Modal Conexión de Credenciales manuales (Twilio no pasa por aquí: usa variables de entorno) */}
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
