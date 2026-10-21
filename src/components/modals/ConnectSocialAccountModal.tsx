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
} from "lucide-react";
import {
  ACCOUNT_TYPE,
  INTEGRATION_PROVIDER,
  type AccountType,
  type AdProvider,
} from "@/lib/constants/integrations";
import { useConnectSocialAccount } from "@/hooks/useConnectSocialAccount";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-[#E8E6DF] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera Principal */}
        <div className="px-6 py-4 bg-gradient-to-b from-[#FAF9F5] to-white border-b border-[#E8E6DF] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1F1E1D] text-white flex items-center justify-center shadow-sm">
              <Layers className="w-5 h-5 text-[#E5C158]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#1F1E1D]">
                  Conectar Canales Sociales & Pauta
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#FAF0E6] text-[#D97757] border border-[#F2D6C6]">
                  Detección Automática
                </span>
              </div>
              <p className="text-xs text-[#6B6966] mt-0.5">
                {activeClient ? (
                  <>
                    Vincula páginas o cuentas de anuncios para{" "}
                    <strong className="text-[#1F1E1D] font-semibold">{activeClient.name}</strong>
                  </>
                ) : (
                  "Selecciona y asigna cuentas publicitarias y páginas a los clientes de tu agencia."
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-[#82807C] hover:text-[#1F1E1D] hover:bg-[#F0EEE6] transition-colors"
            title="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-4 p-3 rounded-2xl text-xs font-medium flex items-center gap-2.5 transition-all ${
              feedback.type === "success"
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span className="flex-1">{feedback.message}</span>
            <button
              onClick={() => setFeedback(null)}
              className="text-[#82807C] hover:text-[#1F1E1D] text-xs font-semibold"
            >
              ✕
            </button>
          </div>
        )}

        {/* Selector de Pestañas Superiores */}
        <div className="px-6 pt-3 pb-2 flex items-center justify-between border-b border-[#F0EEE6] bg-white gap-2">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab("meta")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === "meta"
                  ? "bg-[#1877F2]/10 text-[#1877F2] border border-[#1877F2]/25 shadow-sm"
                  : "text-[#6B6966] hover:text-[#1F1E1D] hover:bg-[#FAF9F5]"
              }`}
            >
              <div className="w-4 h-4 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-[9px] font-bold">
                f
              </div>
              <span>Meta (Facebook & Instagram)</span>
            </button>

            <button
              onClick={() => setActiveTab("tiktok")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 ${
                activeTab === "tiktok"
                  ? "bg-black/10 text-black border border-black/20 shadow-sm"
                  : "text-[#6B6966] hover:text-[#1F1E1D] hover:bg-[#FAF9F5]"
              }`}
            >
              <span className="text-[11px]">🎵</span>
              <span>TikTok Ads</span>
            </button>

            <button
              onClick={() => setActiveTab("manual")}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                activeTab === "manual"
                  ? "bg-[#FAF0E6] text-[#D97757] font-semibold border border-[#F2D6C6]"
                  : "text-[#82807C] hover:text-[#1F1E1D]"
              }`}
            >
              <span>Avanzado / Token</span>
            </button>
          </div>

          {activeTab === "meta" && isMetaConnected && (
            <button
              onClick={handleRefreshMetaCatalog}
              disabled={refreshingCatalog}
              className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] hover:bg-white text-[#4D4C48] hover:text-[#1F1E1D] text-xs font-medium flex items-center gap-1.5 shadow-sm transition-all"
              title="Re-escanear catálogo de Facebook sin volver a iniciar sesión"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshingCatalog ? "animate-spin text-[#1877F2]" : ""}`} />
              <span className="hidden sm:inline">
                {refreshingCatalog ? "Sincronizando..." : "Buscar nuevas páginas"}
              </span>
            </button>
          )}
        </div>

        {/* Contenido Dinámico */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
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
                      Al conectar tu cuenta de Facebook, Bunker CRM detectará automáticamente todas tus
                      <strong> páginas de Facebook, perfiles de Instagram y cuentas de anuncios</strong> sin
                      que tengas que copiar tokens ni escribir IDs manuales.
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
                      <span>Continuar con Facebook / Meta (OAuth)</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>

                  <div className="pt-2 flex items-center justify-center gap-4 text-[11px] text-[#82807C]">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                      Cifrado AES-256
                    </span>
                    <span>•</span>
                    <span>Tokens de larga duración (~60 días)</span>
                    <span>•</span>
                    <span>Leads en tiempo real</span>
                  </div>
                </div>
              ) : (
                /* CASO B: META YA ESTÁ CONECTADO (EXPERIENCIA BUFFER) */
                <div className="space-y-4">
                  {/* Banner de Estado Conectado */}
                  <div className="p-4 rounded-2xl bg-[#EBF5EE] border border-[#C2E2CC] flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 font-bold shadow-sm">
                        <Check className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-emerald-950">
                            Meta Business Manager Conectado
                          </h4>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        </div>
                        <p className="text-[11px] text-emerald-800 mt-0.5">
                          {channels.length} canales detectados en tu cuenta. Asígnalos a tus clientes con un clic.
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
                      className="text-[11px] font-semibold text-emerald-800 hover:text-emerald-950 underline self-start sm:self-auto flex items-center gap-1"
                      title="Re-autorizar con otra cuenta de Facebook"
                    >
                      <span>Reconectar otra cuenta de Meta</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {/* Barra de Filtros y Búsqueda de Canales */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                      <button
                        onClick={() => setChannelFilter("all")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          channelFilter === "all"
                            ? "bg-[#1F1E1D] text-white"
                            : "bg-[#F0EEE6] text-[#716F6A] hover:text-[#1F1E1D]"
                        }`}
                      >
                        Todos ({channels.length})
                      </button>
                      <button
                        onClick={() => setChannelFilter("pages")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          channelFilter === "pages"
                            ? "bg-[#1877F2] text-white"
                            : "bg-[#F0EEE6] text-[#716F6A] hover:text-[#1F1E1D]"
                        }`}
                      >
                        Páginas (
                        {channels.filter((c) => c.accountType === ACCOUNT_TYPE.FACEBOOK_PAGE).length})
                      </button>
                      <button
                        onClick={() => setChannelFilter("ads")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          channelFilter === "ads"
                            ? "bg-[#0081FB] text-white"
                            : "bg-[#F0EEE6] text-[#716F6A] hover:text-[#1F1E1D]"
                        }`}
                      >
                        Ads ({channels.filter((c) => c.accountType === ACCOUNT_TYPE.META_AD_ACCOUNT).length})
                      </button>
                      <button
                        onClick={() => setChannelFilter("instagram")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          channelFilter === "instagram"
                            ? "bg-[#E4405F] text-white"
                            : "bg-[#F0EEE6] text-[#716F6A] hover:text-[#1F1E1D]"
                        }`}
                      >
                        Instagram (
                        {channels.filter((c) => c.accountType === ACCOUNT_TYPE.INSTAGRAM_BUSINESS).length})
                      </button>
                      <button
                        onClick={() => setChannelFilter("unassigned")}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          channelFilter === "unassigned"
                            ? "bg-amber-600 text-white"
                            : "bg-[#F0EEE6] text-[#716F6A] hover:text-[#1F1E1D]"
                        }`}
                      >
                        Sin asignar ({channels.filter((c) => !c.clientId).length})
                      </button>
                    </div>

                    <div className="relative w-full sm:w-56">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#9C9890]" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                      />
                    </div>
                  </div>

                  {/* Grid / Lista de Canales Detectados (Buffer Style) */}
                  <div className="space-y-2.5 max-h-[46vh] overflow-y-auto pr-1">
                    {loadingChannels ? (
                      <div className="p-8 text-center text-xs text-[#82807C] flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-[#1877F2]" />
                        <span>Cargando canales de Meta...</span>
                      </div>
                    ) : filteredChannels.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-[#FAF9F5] border border-dashed border-[#D1CFCA] text-center space-y-2">
                        <p className="text-xs font-semibold text-[#1F1E1D]">
                          No se encontraron canales con este filtro
                        </p>
                        <p className="text-[11px] text-[#82807C]">
                          Haz clic en &quot;Buscar nuevas páginas&quot; si creaste recientemente una página o cuenta en tu Meta Business Manager.
                        </p>
                      </div>
                    ) : (
                      filteredChannels.map((ch) => {
                        const isFBPage = ch.accountType === ACCOUNT_TYPE.FACEBOOK_PAGE;
                        const isIG = ch.accountType === ACCOUNT_TYPE.INSTAGRAM_BUSINESS;
                        const isAd = ch.accountType === ACCOUNT_TYPE.META_AD_ACCOUNT;
                        const isAssignedToCurrent = Boolean(
                          targetClientId && ch.clientId === targetClientId
                        );
                        const isAssignedToOther = Boolean(
                          targetClientId && ch.clientId && ch.clientId !== targetClientId
                        );

                        return (
                          <div
                            key={ch.id}
                            className={`p-3.5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                              isAssignedToCurrent
                                ? "bg-emerald-50/60 border-emerald-300 ring-1 ring-emerald-300/40"
                                : "bg-white border-[#E8E6DF] hover:border-[#D1CFCA] hover:shadow-sm"
                            }`}
                          >
                            {/* Icono de Red + Información */}
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Icono */}
                              {isFBPage && (
                                <div className="w-10 h-10 rounded-xl bg-[#1877F2] text-white flex items-center justify-center font-bold text-sm flex-shrink-0 shadow-sm">
                                  f
                                </div>
                              )}
                              {isIG && (
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#C13584] text-white flex items-center justify-center text-sm flex-shrink-0 shadow-sm">
                                  📷
                                </div>
                              )}
                              {isAd && (
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0081FB] to-[#0668E1] text-white flex items-center justify-center text-xs flex-shrink-0 font-bold shadow-sm">
                                  ADS
                                </div>
                              )}

                              <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <h4 className="text-xs font-bold text-[#1F1E1D] truncate">
                                    {ch.accountName}
                                  </h4>
                                  {isFBPage && (
                                    <span className="text-[10px] font-semibold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                                      Página Facebook
                                    </span>
                                  )}
                                  {isIG && (
                                    <span className="text-[10px] font-semibold text-pink-800 bg-pink-50 px-2 py-0.5 rounded-full border border-pink-200">
                                      Instagram Business
                                    </span>
                                  )}
                                  {isAd && (
                                    <span className="text-[10px] font-semibold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
                                      Cuenta de Anuncios
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-[#82807C] mt-0.5">
                                  <span className="font-mono text-[10px]">
                                    {ch.externalId || ch.id}
                                  </span>
                                  <span>•</span>
                                  {ch.clientId ? (
                                    <span className="font-medium text-[#1F1E1D]">
                                      Asignada a:{" "}
                                      <strong className="text-[#D97757]">
                                        {ch.client?.name || "Cliente del CRM"}
                                      </strong>
                                    </span>
                                  ) : (
                                    <span className="text-amber-700 font-medium">
                                      Portafolio Agencia (Sin cliente)
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Controles de Asignación en 1 Clic */}
                            <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                              {/* Modo 1: Abierto desde un cliente específico */}
                              {targetClientId ? (
                                isAssignedToCurrent ? (
                                  <button
                                    onClick={() => handleAssignChannel(ch.id, null)}
                                    disabled={assigningId === ch.id}
                                    className="px-3 py-1.5 rounded-xl bg-white border border-red-200 text-red-700 hover:bg-red-50 text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5"
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
                                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                                      isAssignedToOther
                                        ? "bg-amber-100 border border-amber-300 text-amber-900 hover:bg-amber-200"
                                        : "btn-black-gold"
                                    }`}
                                  >
                                    {assigningId === ch.id ? (
                                      <RefreshCw className="w-3 h-3 animate-spin" />
                                    ) : (
                                      <Sparkles className="w-3.5 h-3.5 text-[#E5C158]" />
                                    )}
                                    <span>
                                      {isAssignedToOther
                                        ? `Reasignar a ${activeClient?.name}`
                                        : `+ Vincular a ${activeClient?.name}`}
                                    </span>
                                  </button>
                                )
                              ) : (
                                /* Modo 2: Selector General de Clientes */
                                <div className="flex items-center gap-1.5">
                                  <select
                                    value={ch.clientId || ""}
                                    onChange={(e) => handleAssignChannel(ch.id, e.target.value || null)}
                                    disabled={assigningId === ch.id}
                                    className="bg-white border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757] shadow-sm max-w-[200px]"
                                  >
                                    <option value="">Portafolio Agencia</option>
                                    {clients.map((c) => (
                                      <option key={c.id} value={c.id}>
                                        {c.name}
                                      </option>
                                    ))}
                                  </select>
                                  {assigningId === ch.id && (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D97757]" />
                                  )}
                                </div>
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

        {/* Footer del Modal */}
        <div className="px-6 py-3.5 bg-[#FAF9F5] border-t border-[#E8E6DF] flex items-center justify-between">
          <span className="text-[11px] text-[#82807C]">
            💡 Los prospectos de formularios Lead Ads entrarán en tiempo real vía Webhook.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-white border border-[#E8E6DF] hover:bg-[#F0EEE6] text-[#1F1E1D] text-xs font-semibold transition-all shadow-sm"
          >
            Listo / Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
