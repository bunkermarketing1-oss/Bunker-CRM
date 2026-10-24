"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  X,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  ExternalLink,
  Sparkles,
  Layers,
  ArrowRight,
  ShieldCheck,
  Check,
  Plus,
} from "lucide-react";
import {
  ACCOUNT_TYPE,
  INTEGRATION_PROVIDER,
  type AccountType,
  type AdProvider,
} from "@/lib/constants/integrations";
import { useConnectSocialAccount } from "@/hooks/useConnectSocialAccount";
import { SocialNetworkIcon } from "@/components/common/SocialNetworkIcon";

export interface ClientOption {
  id: string;
  name: string;
}

interface ConnectSocialAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: ClientOption[];
  initialProvider?: string;
  initialClientId?: string;
}

interface ChannelItem {
  id: string;
  accountName: string;
  accountType: string;
  externalId: string | null;
  status: string;
  clientId: string | null;
  client?: { id: string; name: string } | null;
  leadgen?: { activeForms?: number; isSubscribed?: boolean } | null;
}

export function ConnectSocialAccountModal({
  isOpen,
  onClose,
  onSuccess,
  clients,
  initialProvider = "meta",
  initialClientId = "",
}: ConnectSocialAccountModalProps) {
  const [activeTab, setActiveTab] = useState<"meta" | "tiktok" | "manual">(
    initialProvider === "tiktok" ? "tiktok" : "meta"
  );
  const [targetClientId, setTargetClientId] = useState<string>(initialClientId);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [isMetaConnected, setIsMetaConnected] = useState<boolean>(false);
  const [loadingChannels, setLoadingChannels] = useState<boolean>(false);
  const [refreshingCatalog, setRefreshingCatalog] = useState<boolean>(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<"all" | "pages" | "ads" | "instagram" | "unassigned">("all");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Formulario manual avanzado
  const [manualAccountName, setManualAccountName] = useState("");
  const [manualExternalId, setManualExternalId] = useState("");
  const [manualAccessToken, setManualAccessToken] = useState("");
  const [manualProvider, setManualProvider] = useState<AdProvider>(INTEGRATION_PROVIDER.META);
  const [manualAccountType, setManualAccountType] = useState<AccountType>(ACCOUNT_TYPE.META_AD_ACCOUNT);
  const [manualTargetType, setManualTargetType] = useState<"client" | "agency">("client");

  const { connect: connectManual, submitting: manualSubmitting, error: manualError } = useConnectSocialAccount();

  const activeClient = useMemo(() => {
    return clients.find((c) => c.id === targetClientId);
  }, [clients, targetClientId]);

  // Cargar canales existentes e info de conexión
  const loadChannels = useCallback(async () => {
    try {
      setLoadingChannels(true);
      const res = await fetch("/api/integrations");
      const json = await res.json();
      if (json.success && Array.isArray(json.integrations)) {
        const metaInt = json.integrations.find(
          (it: { provider: string }) => it.provider === INTEGRATION_PROVIDER.META
        );
        setIsMetaConnected(metaInt?.status === "connected");
        const allAccs: ChannelItem[] = json.integrations.flatMap(
          (it: { connectedAccounts?: ChannelItem[] }) => it.connectedAccounts || []
        );
        setChannels(allAccs);
      }
    } catch (e) {
      console.error("Error al cargar canales:", e);
    } finally {
      setLoadingChannels(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTargetClientId(initialClientId);
      setActiveTab(initialProvider === "tiktok" ? "tiktok" : "meta");
      setFeedback(null);
      setSearchQuery("");
      setChannelFilter("all");
      loadChannels();
    }
  }, [isOpen, initialClientId, initialProvider, loadChannels]);

  // Re-escanear catálogo de Meta con 1 clic (sin OAuth)
  const handleRefreshMetaCatalog = async () => {
    setRefreshingCatalog(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/integrations/meta/refresh", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: "success", message: json.message });
        await loadChannels();
        onSuccess();
      } else {
        setFeedback({ type: "error", message: json.error || "No se pudo actualizar el catálogo de Meta." });
      }
    } catch {
      setFeedback({ type: "error", message: "Error de red al actualizar catálogo de Meta." });
    } finally {
      setRefreshingCatalog(false);
    }
  };

  // Asignar o desasignar canal con 1 clic
  const handleAssignChannel = async (accountId: string, newClientId: string | null) => {
    setAssigningId(accountId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/integrations/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: newClientId }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: "success", message: json.message });
        setChannels((prev) =>
          prev.map((ch) =>
            ch.id === accountId
              ? {
                  ...ch,
                  clientId: newClientId,
                  client: newClientId ? clients.find((c) => c.id === newClientId) || null : null,
                }
              : ch
          )
        );
        onSuccess();
      } else {
        setFeedback({ type: "error", message: json.error || "Error al asignar canal." });
      }
    } catch {
      setFeedback({ type: "error", message: "Error de conexión al asignar el canal." });
    } finally {
      setAssigningId(null);
    }
  };

  // Enviar formulario manual para casos avanzados
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualAccountName.trim() || !manualExternalId.trim()) {
      setFeedback({ type: "error", message: "Nombre e identificador externo son obligatorios." });
      return;
    }
    const success = await connectManual({
      provider: manualProvider,
      accountType: manualAccountType,
      accountName: manualAccountName.trim(),
      externalId: manualExternalId.trim(),
      clientId: manualTargetType === "client" ? targetClientId || null : null,
      accessToken: manualAccessToken.trim() || null,
    });
    if (success) {
      setFeedback({ type: "success", message: "Cuenta registrada exitosamente." });
      setManualAccountName("");
      setManualExternalId("");
      setManualAccessToken("");
      await loadChannels();
      onSuccess();
    }
  };

  // Filtrar canales según búsqueda y tipo
  const filteredChannels = useMemo(() => {
    return channels.filter((ch) => {
      // Excluir registros técnicos maestros
      if (ch.externalId === "meta_master_user") return false;

      // Filtro de texto
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = ch.accountName.toLowerCase().includes(q);
        const matchesId = ch.externalId?.toLowerCase().includes(q) ?? false;
        const matchesClient = ch.client?.name.toLowerCase().includes(q) ?? false;
        if (!matchesName && !matchesId && !matchesClient) return false;
      }

      // Filtro por tipo de canal
      if (channelFilter === "pages") return ch.accountType === ACCOUNT_TYPE.FACEBOOK_PAGE;
      if (channelFilter === "ads") return ch.accountType === ACCOUNT_TYPE.META_AD_ACCOUNT;
      if (channelFilter === "instagram") return ch.accountType === ACCOUNT_TYPE.INSTAGRAM_BUSINESS;
      if (channelFilter === "unassigned") return !ch.clientId;

      return true;
    });
  }, [channels, searchQuery, channelFilter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Cabecera Limpia */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Vincular Redes & Activos
              </h2>
              <p className="text-[11px] text-slate-500">
                {activeClient ? (
                  <>Asigna páginas y cuentas para <strong className="text-slate-900 font-semibold">{activeClient.name}</strong></>
                ) : (
                  "Asigna cada página, Instagram o cuenta de anuncios a su empresa."
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-5 mt-3 p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all ${
              feedback.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
            )}
            <span className="flex-1">{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Barra de Plataformas + Acciones Rápidas */}
        <div className="px-5 pt-3 pb-2 flex items-center justify-between border-b border-slate-100 bg-white gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab("meta")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === "meta"
                  ? "bg-blue-50 text-blue-700 border border-blue-200 font-semibold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-[8px] font-bold">
                f
              </div>
              <span>Meta</span>
              {channels.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-semibold">
                  {channels.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("tiktok")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                activeTab === "tiktok"
                  ? "bg-slate-900 text-white font-semibold"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              <span className="text-[10px]">🎵</span>
              <span>TikTok Ads</span>
            </button>

            <button
              onClick={() => setActiveTab("manual")}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                activeTab === "manual"
                  ? "bg-amber-50 text-amber-800 border border-amber-200 font-semibold"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              <span>Token Manual</span>
            </button>
          </div>

          {activeTab === "meta" && isMetaConnected && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleRefreshMetaCatalog}
                disabled={refreshingCatalog}
                className="px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium flex items-center gap-1.5 transition-colors"
                title="Detectar nuevas páginas o cuentas"
              >
                <RefreshCw className={`w-3 h-3 ${refreshingCatalog ? "animate-spin text-blue-600" : ""}`} />
                <span>{refreshingCatalog ? "Buscando..." : "Buscar nuevas páginas"}</span>
              </button>

              <a
                href="/api/integrations/meta/connect"
                onClick={(e) => {
                  if (typeof window !== "undefined") {
                    e.preventDefault();
                    window.location.href = `/api/integrations/meta/connect?origin=${encodeURIComponent(window.location.origin)}`;
                  }
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1"
                title="Reconectar otra cuenta de Facebook"
              >
                <span>Reconectar</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Contenido Dinámico */}
        <div className="p-5 overflow-y-auto flex-1">
          {/* ========================================================= */}
          {/* PESTAÑA 1: META (FACEBOOK, INSTAGRAM, ADS)                */}
          {/* ========================================================= */}
          {activeTab === "meta" && (
            <div className="space-y-4">
              {/* CASO A: META NO ESTÁ CONECTADO AÚN */}
              {!isMetaConnected ? (
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#1877F2]/10 via-[#FAF9F5] to-white border border-[#1877F2]/20 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#1877F2] to-[#0081FB] text-white flex items-center justify-center mx-auto shadow-md ring-8 ring-blue-50">
                    <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>

                  <div className="space-y-1.5 max-w-md mx-auto">
                    <h3 className="text-lg font-bold text-[#1F1E1D]">
                      Conectar Cuenta de Meta for Business
                    </h3>
                    <p className="text-xs text-[#6B6966] leading-relaxed">
                      Conecta tu cuenta de Facebook para detectar automáticamente todas tus
                      <strong> páginas, perfiles de Instagram y cuentas de anuncios</strong> sin configuraciones manuales.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href="/api/integrations/meta/connect"
                      onClick={(e) => {
                        if (typeof window !== "undefined") {
                          e.preventDefault();
                          window.location.href = `/api/integrations/meta/connect?origin=${encodeURIComponent(window.location.origin)}`;
                        }
                      }}
                      className="px-6 py-3 rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      <span>Continuar con Facebook / Meta</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-[#82807C]">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Cifrado seguro AES-256
                    </span>
                    <span>•</span>
                    <span>Tokens automáticos de 60 días</span>
                  </div>
                </div>
              ) : (
                /* CASO B: META YA ESTÁ CONECTADO (VISTA SIMPLE Y CLARA) */
                <div className="space-y-3">
                  {/* Barra de Filtros y Búsqueda */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
                      <button
                        onClick={() => setChannelFilter("all")}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                          channelFilter === "all"
                            ? "bg-slate-900 text-white font-medium"
                            : "bg-slate-100 text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Todas ({channels.length})
                      </button>
                      <button
                        onClick={() => setChannelFilter("pages")}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                          channelFilter === "pages"
                            ? "bg-slate-900 text-white font-medium"
                            : "bg-slate-100 text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Páginas ({channels.filter((c) => c.accountType === ACCOUNT_TYPE.FACEBOOK_PAGE).length})
                      </button>
                      <button
                        onClick={() => setChannelFilter("instagram")}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                          channelFilter === "instagram"
                            ? "bg-slate-900 text-white font-medium"
                            : "bg-slate-100 text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Instagram ({channels.filter((c) => c.accountType === ACCOUNT_TYPE.INSTAGRAM_BUSINESS).length})
                      </button>
                      <button
                        onClick={() => setChannelFilter("ads")}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                          channelFilter === "ads"
                            ? "bg-slate-900 text-white font-medium"
                            : "bg-slate-100 text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Anuncios ({channels.filter((c) => c.accountType === ACCOUNT_TYPE.META_AD_ACCOUNT).length})
                      </button>
                      <button
                        onClick={() => setChannelFilter("unassigned")}
                        className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                          channelFilter === "unassigned"
                            ? "bg-amber-600 text-white font-medium"
                            : "bg-slate-100 text-slate-600 hover:text-slate-900"
                        }`}
                      >
                        Sin asignar ({channels.filter((c) => !c.clientId).length})
                      </button>
                    </div>

                    <div className="relative w-full sm:w-48">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:bg-white"
                      />
                    </div>
                  </div>

                  {/* Lista Limpia de Cuentas */}
                  <div className="space-y-1.5 max-h-[48vh] overflow-y-auto pr-0.5">
                    {loadingChannels ? (
                      <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Cargando cuentas...</span>
                      </div>
                    ) : filteredChannels.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No se encontraron cuentas con este filtro
                      </div>
                    ) : (
                      filteredChannels.map((ch) => {
                        const isFBPage = ch.accountType === ACCOUNT_TYPE.FACEBOOK_PAGE;
                        const isIG = ch.accountType === ACCOUNT_TYPE.INSTAGRAM_BUSINESS;
                        const isAd = ch.accountType === ACCOUNT_TYPE.META_AD_ACCOUNT;
                        const isAssigned = Boolean(ch.clientId && ch.client);

                        return (
                          <div
                            key={ch.id}
                            className={`px-3 py-2.5 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                              isAssigned
                                ? "bg-white border-slate-200 hover:border-slate-300"
                                : "bg-slate-50/70 border-slate-200/80 hover:bg-white hover:border-slate-300"
                            }`}
                          >
                            {/* Icono + Nombre + Tipo */}
                            <div className="flex items-center gap-2.5 min-w-0">
                              <SocialNetworkIcon type={ch.accountType} size="sm" />

                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-xs font-semibold text-slate-900 truncate">
                                    {ch.accountName}
                                  </h4>
                                  {isFBPage && (
                                    <span className="text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded">
                                      Página
                                    </span>
                                  )}
                                  {isIG && (
                                    <span className="text-[10px] font-medium text-pink-600 bg-pink-50 px-1.5 py-0.2 rounded">
                                      Instagram
                                    </span>
                                  )}
                                  {isAd && (
                                    <span className="text-[10px] font-medium text-sky-600 bg-sky-50 px-1.5 py-0.2 rounded">
                                      Anuncios
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] mt-0.5">
                                  {ch.clientId && ch.client ? (
                                    <span className="text-emerald-700 font-medium">
                                      Asignada a: <strong>{ch.client.name}</strong>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400">
                                      Sin asignar
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Selector de Asignación Directa */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {targetClientId ? (
                                ch.clientId === targetClientId ? (
                                  <button
                                    onClick={() => handleAssignChannel(ch.id, null)}
                                    disabled={assigningId === ch.id}
                                    className="px-2.5 py-1 rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 text-xs font-medium transition-colors flex items-center gap-1"
                                  >
                                    {assigningId === ch.id ? (
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <X className="w-3 h-3" />
                                    )}
                                    <span>Desvincular</span>
                                  </button>
                                ) : (
                                  <button
                                    onClick={() => handleAssignChannel(ch.id, targetClientId)}
                                    disabled={assigningId === ch.id}
                                    className="px-3 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors flex items-center gap-1"
                                  >
                                    {assigningId === ch.id ? (
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Check className="w-3 h-3" />
                                    )}
                                    <span>Vincular a {activeClient?.name}</span>
                                  </button>
                                )
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={ch.clientId || ""}
                                    onChange={(e) => handleAssignChannel(ch.id, e.target.value || null)}
                                    disabled={assigningId === ch.id}
                                    className={`rounded-lg px-2.5 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                                      ch.clientId
                                        ? "bg-white text-slate-800 border-slate-300"
                                        : "bg-white text-slate-500 border-slate-200 hover:border-slate-400"
                                    }`}
                                  >
                                    <option value="">Asignar a empresa...</option>
                                    {clients.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name}
                                      </option>
                                    ))}
                                    {ch.clientId && (
                                      <option value="">✕ Desvincular (dejar libre)</option>
                                    )}
                                  </select>
                                  {assigningId === ch.id && (
                                    <RefreshCw className="w-3 h-3 animate-spin text-amber-500" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
                    <span className="text-[11px] text-slate-500">
                      ¿Deseas autorizar más páginas o cuentas publicitarias de otro perfil de Facebook?
                    </span>
                    <a
                      href="/api/integrations/meta/connect"
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold flex items-center gap-1.5 transition-colors text-xs shrink-0"
                      title="Autorizar o sumar cuentas de Meta con Facebook"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Conectar otra cuenta de Meta</span>
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 2: TIKTOK ADS                                     */}
          {/* ========================================================= */}
          {activeTab === "tiktok" && (
            <div className="p-6 rounded-3xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  🎵
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#1F1E1D]">TikTok for Business</h3>
                  <p className="text-xs text-[#6B6966]">
                    Conecta tus cuentas de TikTok Ads Manager para capturar leads y sincronizar métricas de campañas.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-[#E8E6DF] space-y-3">
                <p className="text-xs text-[#1F1E1D]">
                  Para vincular una cuenta de anunciante de TikTok, ingresa el <strong>Advertiser ID</strong> del cliente.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#6B6966] mb-1">
                      Nombre de la Cuenta:
                    </label>
                    <input
                      type="text"
                      placeholder="ej. Carrito Naranja TikTok Ads"
                      value={manualAccountName}
                      onChange={(e) => setManualAccountName(e.target.value)}
                      className="w-full bg-white border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#6B6966] mb-1">
                      Advertiser ID de TikTok:
                    </label>
                    <input
                      type="text"
                      placeholder="ej. 709123847561829"
                      value={manualExternalId}
                      onChange={(e) => setManualExternalId(e.target.value)}
                      className="w-full bg-white border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setManualProvider(INTEGRATION_PROVIDER.TIKTOK);
                    setManualAccountType(ACCOUNT_TYPE.TIKTOK_ADVERTISER);
                    handleManualSubmit({ preventDefault: () => {} } as React.FormEvent);
                  }}
                  disabled={manualSubmitting}
                  className="px-4 py-2 rounded-xl btn-black-gold text-xs font-semibold flex items-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#E5C158]" />
                  <span>Vincular Cuenta de TikTok Ads</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 3: REGISTRO MANUAL AVANZADO (TOKEN / CLAVES)      */}
          {/* ========================================================= */}
          {activeTab === "manual" && (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#FFFBF0] border border-[#FDE68A] text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Modo Desarrollador / Claves Directas:</strong>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Utiliza este modo únicamente si necesitas conectar manualmente una cuenta con un token de acceso propio o externo.
                  </p>
                </div>
              </div>

              {manualError && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span>{manualError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1F1E1D] mb-1">
                    Plataforma
                  </label>
                  <select
                    value={manualProvider}
                    onChange={(e) => setManualProvider(e.target.value as AdProvider)}
                    className="w-full bg-white border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  >
                    <option value={INTEGRATION_PROVIDER.META}>Meta (Facebook & Instagram)</option>
                    <option value={INTEGRATION_PROVIDER.TIKTOK}>TikTok</option>
                    <option value={INTEGRATION_PROVIDER.GOOGLE_ADS}>Google Ads</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F1E1D] mb-1">
                    Tipo de Cuenta
                  </label>
                  <select
                    value={manualAccountType}
                    onChange={(e) => setManualAccountType(e.target.value as AccountType)}
                    className="w-full bg-white border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  >
                    <option value={ACCOUNT_TYPE.META_AD_ACCOUNT}>Cuenta de anuncios Meta</option>
                    <option value={ACCOUNT_TYPE.FACEBOOK_PAGE}>Página de Facebook</option>
                    <option value={ACCOUNT_TYPE.INSTAGRAM_BUSINESS}>Perfil de Instagram</option>
                    <option value={ACCOUNT_TYPE.TIKTOK_ADVERTISER}>Cuenta de TikTok Ads</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1F1E1D] mb-1">
                    Nombre Descriptivo
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Campañas Principales"
                    value={manualAccountName}
                    onChange={(e) => setManualAccountName(e.target.value)}
                    required
                    className="w-full bg-white border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1F1E1D] mb-1">
                    Identificador Externo (ID)
                  </label>
                  <input
                    type="text"
                    placeholder="ej. act_123456789 o ID de Página"
                    value={manualExternalId}
                    onChange={(e) => setManualExternalId(e.target.value)}
                    required
                    className="w-full bg-white border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F1E1D] mb-1">
                  Destino de la cuenta
                </label>
                <select
                  value={manualTargetType}
                  onChange={(e) => setManualTargetType(e.target.value as "client" | "agency")}
                  className="w-full bg-white border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                >
                  <option value="client">
                    {activeClient ? `Asignar a cliente: ${activeClient.name}` : "Asignar a Cliente Seleccionado"}
                  </option>
                  <option value="agency">Portafolio BM Agencia (Sin cliente)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1F1E1D] mb-1">
                  Token de Acceso (Opcional, se cifra con AES-256)
                </label>
                <input
                  type="password"
                  placeholder="EAAG..."
                  value={manualAccessToken}
                  onChange={(e) => setManualAccessToken(e.target.value)}
                  className="w-full bg-white border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={manualSubmitting}
                  className="px-4 py-2 rounded-xl btn-black-gold text-xs font-semibold flex items-center gap-2 shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#E5C158]" />
                  <span>{manualSubmitting ? "Registrando..." : "Guardar Cuenta Manual"}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Limpio */}
        <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs text-slate-500">
            {channels.length} {channels.length === 1 ? "cuenta disponible" : "cuentas disponibles"}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors shadow-xs"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
