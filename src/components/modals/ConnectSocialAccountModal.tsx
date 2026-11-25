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
  ChevronDown,
  Trash2,
  LogOut,
  Copy,
  MessageCircle,
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

type ChannelFilterType = "all" | "pages" | "ads" | "instagram" | "unassigned";

export function ConnectSocialAccountModal({
  isOpen,
  onClose,
  onSuccess,
  clients,
  initialProvider = "meta",
  initialClientId = "",
}: ConnectSocialAccountModalProps) {
  const [activeTab, setActiveTab] = useState<"meta" | "tiktok" | "whatsapp" | "manual">(
    initialProvider === "tiktok" ? "tiktok" : initialProvider === "whatsapp" ? "whatsapp" : "meta"
  );
  const [targetClientId, setTargetClientId] = useState<string>(initialClientId);
  const [channels, setChannels] = useState<ChannelItem[]>([]);
  const [isMetaConnected, setIsMetaConnected] = useState<boolean>(false);
  const [metaIntegrationId, setMetaIntegrationId] = useState<string | null>(null);
  const [disconnectingMeta, setDisconnectingMeta] = useState<boolean>(false);
  const [deletingChannelId, setDeletingChannelId] = useState<string | null>(null);
  const [loadingChannels, setLoadingChannels] = useState<boolean>(false);
  const [refreshingCatalog, setRefreshingCatalog] = useState<boolean>(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilterType>("all");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [copiedWaWebhook, setCopiedWaWebhook] = useState(false);
  const [copiedWaToken, setCopiedWaToken] = useState(false);

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

  const getMetaConnectUrl = (reauth: boolean = false) => {
    const params = new URLSearchParams();
    if (typeof window !== "undefined") {
      params.set("origin", window.location.origin);
    }
    if (targetClientId && targetClientId !== "all") {
      params.set("clientId", targetClientId);
    }
    if (reauth) {
      params.set("reauth", "true");
    }
    return `/api/integrations/meta/connect?${params.toString()}`;
  };

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
        setMetaIntegrationId(metaInt?.id || null);
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
      setActiveTab(
        initialProvider === "tiktok" ? "tiktok" : initialProvider === "whatsapp" ? "whatsapp" : "meta"
      );
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

  // Desconectar integración completa de Meta para iniciar sesión desde cero con otro perfil
  const handleDisconnectMeta = async () => {
    const confirmed = window.confirm(
      "¿Deseas desconectar tu cuenta de Meta del CRM?\n\nEsta acción desvinculará todas las páginas, cuentas de anuncios e Instagram conectados actualmente, permitiéndote iniciar sesión desde cero con otro perfil de Facebook o cuenta publicitaria."
    );
    if (!confirmed) return;

    setDisconnectingMeta(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: metaIntegrationId || undefined,
          provider: !metaIntegrationId ? INTEGRATION_PROVIDER.META : undefined,
          action: "disconnect",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({
          type: "success",
          message: "Cuenta de Meta desconectada. Ahora puedes iniciar sesión con otro perfil de Facebook o cuenta de anuncios.",
        });
        setIsMetaConnected(false);
        setChannels([]);
        onSuccess();
      } else {
        setFeedback({ type: "error", message: json.error || "No se pudo desconectar la integración de Meta." });
      }
    } catch {
      setFeedback({ type: "error", message: "Error al desconectar la cuenta de Meta." });
    } finally {
      setDisconnectingMeta(false);
    }
  };

  // Eliminar un activo individual del CRM (Página, Perfil IG, Cuenta Ads)
  const handleDeleteChannel = async (accountId: string, accountName: string) => {
    const confirmed = window.confirm(
      `¿Eliminar "${accountName}" del CRM?\n\nEste activo se desvinculará y se retirará del listado del CRM.`
    );
    if (!confirmed) return;

    setDeletingChannelId(accountId);
    setFeedback(null);
    try {
      const res = await fetch(`/api/integrations/accounts/${accountId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setFeedback({ type: "success", message: json.message || "Activo eliminado del CRM." });
        setChannels((prev) => prev.filter((ch) => ch.id !== accountId));
        onSuccess();
      } else {
        setFeedback({ type: "error", message: json.error || "No se pudo eliminar el activo." });
      }
    } catch {
      setFeedback({ type: "error", message: "Error de red al eliminar el activo." });
    } finally {
      setDeletingChannelId(null);
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
  const handleManualSubmit = async (
    e?: React.FormEvent,
    overrides?: { provider?: AdProvider; accountType?: AccountType; clientId?: string | null }
  ) => {
    if (e) e.preventDefault();
    if (!manualAccountName.trim() || !manualExternalId.trim()) {
      setFeedback({ type: "error", message: "Nombre e identificador externo son obligatorios." });
      return;
    }
    const targetProvider = overrides?.provider ?? manualProvider;
    const targetAccountType = overrides?.accountType ?? manualAccountType;
    const targetClient =
      overrides?.clientId !== undefined
        ? overrides.clientId
        : manualTargetType === "client"
        ? targetClientId || null
        : null;

    const result = await connectManual({
      provider: targetProvider,
      accountType: targetAccountType,
      accountName: manualAccountName.trim(),
      externalId: manualExternalId.trim(),
      clientId: targetClient,
      accessToken: manualAccessToken.trim() || null,
    });
    if (result.success) {
      setFeedback({ type: "success", message: result.message || "Cuenta registrada exitosamente." });
      setManualAccountName("");
      setManualExternalId("");
      setManualAccessToken("");
      await loadChannels();
      onSuccess();
    } else {
      setFeedback({
        type: "error",
        message: result.error || "No se pudo conectar la cuenta. Revisa los datos ingresados.",
      });
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

  // Líneas de WhatsApp visibles según filtro de cliente/marca
  const waChannelsForView = useMemo(() => {
    const allWa = channels.filter((c) => c.accountType === ACCOUNT_TYPE.WHATSAPP_BUSINESS);
    if (targetClientId) {
      return allWa.filter((c) => c.clientId === targetClientId);
    }
    return allWa;
  }, [channels, targetClientId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col max-h-[88vh]">
        {/* Cabecera Limpia & Minimalista */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Layers className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 tracking-tight">
                Vincular Redes & Activos
              </h2>
              <p className="text-xs text-slate-500">
                {activeClient ? (
                  <>Asignar activos para <strong className="text-slate-900 font-semibold">{activeClient.name}</strong></>
                ) : (
                  "Asigna cada página, Instagram o cuenta de anuncios a su empresa"
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            title="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`mx-6 mt-3 p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all ${feedback.type === "success"
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

        {/* Barra de Plataformas Unificada */}
        <div className="px-6 pt-3 pb-3 border-b border-slate-100 bg-white flex items-center justify-between gap-3 flex-wrap">
          <div className="inline-flex p-1 bg-slate-100/90 rounded-2xl">
            <button
              onClick={() => setActiveTab("meta")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "meta"
                ? "bg-white text-slate-900 font-semibold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-[#1877F2] flex items-center justify-center text-white text-[8px] font-bold">
                f
              </div>
              <span>Meta</span>
              {channels.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-700 font-semibold">
                  {channels.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("tiktok")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "tiktok"
                ? "bg-white text-slate-900 font-semibold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <span className="text-xs">🎵</span>
              <span>TikTok Ads</span>
            </button>

            <button
              onClick={() => setActiveTab("whatsapp")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${activeTab === "whatsapp"
                ? "bg-white text-slate-900 font-semibold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-[#25D366] flex items-center justify-center text-white">
                <MessageCircle className="w-2.5 h-2.5 text-white" />
              </div>
              <span>WhatsApp Cloud</span>
              {channels.some((c) => c.accountType === ACCOUNT_TYPE.WHATSAPP_BUSINESS) && (
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                  {targetClientId
                    ? channels.filter((c) => c.accountType === ACCOUNT_TYPE.WHATSAPP_BUSINESS && c.clientId === targetClientId).length
                    : channels.filter((c) => c.accountType === ACCOUNT_TYPE.WHATSAPP_BUSINESS).length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab("manual")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${activeTab === "manual"
                ? "bg-white text-slate-900 font-semibold shadow-xs"
                : "text-slate-600 hover:text-slate-900"
                }`}
            >
              <span>Token Manual</span>
            </button>
          </div>

          {activeTab === "meta" && isMetaConnected && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDisconnectMeta}
                disabled={disconnectingMeta}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100/80 border border-rose-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Desconectar cuenta actual de Meta para conectar otro perfil o cuenta publicitaria"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{disconnectingMeta ? "Desconectando..." : "Desconectar cuenta"}</span>
              </button>

              <button
                onClick={handleRefreshMetaCatalog}
                disabled={refreshingCatalog}
                className="px-2.5 py-1.5 rounded-xl text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors flex items-center gap-1.5 cursor-pointer"
                title="Detectar activos nuevos de Meta"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshingCatalog ? "animate-spin text-blue-600" : ""}`} />
                <span>{refreshingCatalog ? "Buscando..." : "Sincronizar"}</span>
              </button>

              <a
                href={getMetaConnectUrl(true)}
                onClick={(e) => {
                  if (typeof window !== "undefined") {
                    e.preventDefault();
                    window.location.href = getMetaConnectUrl(true);
                  }
                }}
                className="text-xs text-slate-500 hover:text-blue-600 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors flex items-center gap-1"
                title="Conectar otra cuenta de Facebook / Cambiar de usuario"
              >
                <span>Cambiar cuenta</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>

        {/* Contenido Dinámico */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* ========================================================= */}
          {/* PESTAÑA 1: META (FACEBOOK, INSTAGRAM, ADS)                */}
          {/* ========================================================= */}
          {activeTab === "meta" && (
            <div className="space-y-4">
              {!isMetaConnected ? (
                <div className="p-8 rounded-3xl bg-gradient-to-br from-[#1877F2]/10 via-[#FAF9F5] to-white border border-[#1877F2]/20 text-center space-y-4 shadow-sm">
                  <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-[#1877F2] to-[#0081FB] text-white flex items-center justify-center mx-auto shadow-md ring-8 ring-blue-50">
                    <svg className="w-8 h-8 fill-current" viewBox="0 0 24 24">
                      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                    </svg>
                  </div>

                  <div className="space-y-2 max-w-md mx-auto">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                      <span>App Oficial Verificada en Vivo • Meta Marketing API</span>
                    </div>
                    <h3 className="text-lg font-bold text-[#1F1E1D]">
                      Conectar Cuenta de Meta for Business
                    </h3>
                    <p className="text-xs text-[#6B6966] leading-relaxed">
                      Conecta cualquier cuenta de Facebook para importar automáticamente tus
                      <strong> páginas, perfiles de Instagram y cuentas de anuncios</strong> en 1 solo clic.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <a
                      href={getMetaConnectUrl(false)}
                      onClick={(e) => {
                        if (typeof window !== "undefined") {
                          e.preventDefault();
                          window.location.href = getMetaConnectUrl(false);
                        }
                      }}
                      className="px-6 py-3 rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      <span>{activeClient ? `Vincular Facebook / Meta a ${activeClient.name}` : "Continuar con Facebook / Meta"}</span>
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
                <div className="space-y-3.5">
                  {/* Conectar otra cuenta de Meta / Socio */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-blue-50/80 border border-blue-200/90 rounded-2xl">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-[#1877F2] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                        f
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {activeClient
                            ? `¿Conectar otra cuenta de Meta para ${activeClient.name}?`
                            : "Conectar otra cuenta de Meta o Socio"}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate">
                          Inicia sesión con otro usuario de Facebook para importar más páginas o activos.
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handleDisconnectMeta}
                        disabled={disconnectingMeta}
                        className="px-3 py-1.5 rounded-xl bg-white hover:bg-rose-50 text-rose-700 hover:text-rose-800 border border-rose-200 text-xs font-semibold flex items-center gap-1.5 shadow-2xs shrink-0 transition-colors cursor-pointer"
                        title="Desconectar cuenta actual de Facebook para conectar otro perfil"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{disconnectingMeta ? "Desconectando..." : "Desconectar cuenta"}</span>
                      </button>

                      <a
                        href={getMetaConnectUrl(true)}
                        onClick={(e) => {
                          if (typeof window !== "undefined") {
                            e.preventDefault();
                            window.location.href = getMetaConnectUrl(true);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs shrink-0 transition-colors"
                        title="Permite iniciar sesión con otro usuario en Facebook"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Conectar otra cuenta</span>
                        <ExternalLink className="w-3 h-3 opacity-80" />
                      </a>
                    </div>
                  </div>

                  {/* Barra de Filtros y Búsqueda */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                      {(
                        [
                          { id: "all", label: "Todas", count: channels.length },
                          { id: "pages", label: "Páginas", count: channels.filter((c) => c.accountType === ACCOUNT_TYPE.FACEBOOK_PAGE).length },
                          { id: "instagram", label: "Instagram", count: channels.filter((c) => c.accountType === ACCOUNT_TYPE.INSTAGRAM_BUSINESS).length },
                          { id: "ads", label: "Anuncios", count: channels.filter((c) => c.accountType === ACCOUNT_TYPE.META_AD_ACCOUNT).length },
                          { id: "unassigned", label: "Sin asignar", count: channels.filter((c) => !c.clientId).length },
                        ] as const
                      ).map((f) => {
                        const active = channelFilter === f.id;
                        return (
                          <button
                            key={f.id}
                            onClick={() => setChannelFilter(f.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${active
                              ? "bg-slate-900 text-white font-semibold shadow-xs"
                              : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                              }`}
                          >
                            <span>{f.label}</span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded-full ${active ? "bg-white/20 text-white" : "bg-slate-200/80 text-slate-600"
                                }`}
                            >
                              {f.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative w-full sm:w-48 shrink-0">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Buscar activo..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-slate-400 focus:ring-1 focus:ring-slate-400/20 transition-all"
                      />
                    </div>
                  </div>

                  {/* Lista Limpia de Cuentas */}
                  <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                    {loadingChannels ? (
                      <div className="py-12 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                        <span>Cargando cuentas vinculadas...</span>
                      </div>
                    ) : filteredChannels.length === 0 ? (
                      <div className="py-10 text-center text-xs text-slate-400 bg-slate-50/80 rounded-2xl border border-dashed border-slate-200">
                        No se encontraron activos con el filtro seleccionado
                      </div>
                    ) : (
                      filteredChannels.map((ch) => {
                        const isFBPage = ch.accountType === ACCOUNT_TYPE.FACEBOOK_PAGE;
                        const isIG = ch.accountType === ACCOUNT_TYPE.INSTAGRAM_BUSINESS;
                        const isAd = ch.accountType === ACCOUNT_TYPE.META_AD_ACCOUNT;
                        const assignedClient = ch.client || (ch.clientId ? clients.find((c) => c.id === ch.clientId) : null);
                        const isAssigned = Boolean(ch.clientId && assignedClient);

                        return (
                          <div
                            key={ch.id}
                            className={`px-4 py-3 rounded-2xl border transition-all flex items-center justify-between gap-3 ${isAssigned
                              ? "bg-white border-slate-200/90 hover:border-slate-300 shadow-2xs"
                              : "bg-slate-50/60 border-slate-200/60 hover:bg-white hover:border-slate-300"
                              }`}
                          >
                            {/* Left: Icon & Info */}
                            <div className="flex items-center gap-3 min-w-0">
                              <SocialNetworkIcon type={ch.accountType} size="md" className="rounded-xl shadow-2xs shrink-0" />

                              <div className="min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs font-semibold text-slate-900 truncate" title={ch.accountName}>
                                    {ch.accountName}
                                  </h4>

                                  {isFBPage && (
                                    <span className="text-[10px] font-medium text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full shrink-0">
                                      Página
                                    </span>
                                  )}
                                  {isIG && (
                                    <span className="text-[10px] font-medium text-pink-700 bg-pink-50 border border-pink-100 px-2 py-0.5 rounded-full shrink-0">
                                      Instagram
                                    </span>
                                  )}
                                  {isAd && (
                                    <span className="text-[10px] font-medium text-sky-700 bg-sky-50 border border-sky-100 px-2 py-0.5 rounded-full shrink-0">
                                      Anuncios
                                    </span>
                                  )}
                                </div>

                                {ch.externalId && (
                                  <p className="text-[10px] font-mono text-slate-400 truncate max-w-[200px]">
                                    ID: {ch.externalId}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Right: Sleek Assignment Control */}
                            <div className="flex items-center gap-2 shrink-0">
                              {targetClientId ? (
                                ch.clientId === targetClientId ? (
                                  <div className="flex items-center gap-1.5">
                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-xl">
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      <span>Vinculada</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleAssignChannel(ch.id, null)}
                                      disabled={assigningId === ch.id}
                                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Desvincular"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => handleAssignChannel(ch.id, targetClientId)}
                                    disabled={assigningId === ch.id}
                                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                                  >
                                    {assigningId === ch.id ? (
                                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Plus className="w-3.5 h-3.5" />
                                    )}
                                    <span>Asignar</span>
                                  </button>
                                )
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <div className="relative">
                                    <select
                                      value={ch.clientId || ""}
                                      onChange={(e) => handleAssignChannel(ch.id, e.target.value || null)}
                                      disabled={assigningId === ch.id}
                                      className={`appearance-none text-xs font-semibold rounded-xl pl-3 pr-7 py-1.5 border transition-all cursor-pointer focus:outline-none ${isAssigned
                                        ? "bg-emerald-50/80 hover:bg-emerald-100/70 text-emerald-900 border-emerald-200/90"
                                        : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                                        }`}
                                    >
                                      <option value="" className="text-slate-400 font-normal">
                                        Asignar a empresa...
                                      </option>
                                      {clients.map((c) => (
                                        <option key={c.id} value={c.id} className="text-slate-900 font-medium">
                                          {c.name}
                                        </option>
                                      ))}
                                      {ch.clientId && (
                                        <option value="" className="text-rose-600 font-medium">
                                          ✕ Quitar asignación
                                        </option>
                                      )}
                                    </select>
                                    <ChevronDown
                                      className={`w-3.5 h-3.5 pointer-events-none absolute right-2 top-2 ${isAssigned ? "text-emerald-700" : "text-slate-400"
                                        }`}
                                    />
                                  </div>

                                  {isAssigned && (
                                    <button
                                      type="button"
                                      onClick={() => handleAssignChannel(ch.id, null)}
                                      disabled={assigningId === ch.id}
                                      className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                                      title="Quitar asignación"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {assigningId === ch.id && (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-500" />
                                  )}
                                </div>
                              )}
                              {/* Botón para eliminar activo individual del CRM */}
                              <button
                                type="button"
                                onClick={() => handleDeleteChannel(ch.id, ch.accountName)}
                                disabled={deletingChannelId === ch.id}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer ml-1"
                                title={`Eliminar "${ch.accountName}" del CRM`}
                              >
                                {deletingChannelId === ch.id ? (
                                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs text-slate-500">
                    <span className="text-[11px] text-slate-500">
                      ¿No encuentras una página o cuenta publicitaria?
                    </span>
                    <a
                      href="/api/integrations/meta/connect"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Conectar otro perfil de Meta</span>
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
            <div className="space-y-4 max-h-[62vh] overflow-y-auto pr-1">
              <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-black border border-slate-700 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    🎵
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">TikTok for Business & Ads Manager</h3>
                    <p className="text-xs text-slate-300">
                      Conecta tus cuentas publicitarias de TikTok para capturar clientes potenciales en tiempo real y sincronizar métricas.
                    </p>
                  </div>
                </div>

                {/* Webhook URL de TikTok Lead Gen */}
                <div className="pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-[11px] font-semibold text-amber-400">
                      URL del Webhook de Leads (Instant Forms):
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const url = `${typeof window !== "undefined" ? window.location.origin : ""}/api/integrations/tiktok/webhook`;
                        navigator.clipboard.writeText(url);
                        setCopiedWebhook(true);
                        setTimeout(() => setCopiedWebhook(false), 2500);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                    >
                      {copiedWebhook ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copiar URL</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-2 rounded-xl bg-black/60 font-mono text-[11px] text-slate-300 select-all break-all border border-slate-800">
                    {typeof window !== "undefined" ? `${window.location.origin}/api/integrations/tiktok/webhook` : "/api/integrations/tiktok/webhook"}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Pega esta URL en el Webhook de TikTok Developers o en la automatización de tus Instant Forms para recibir prospectos de inmediato (SLA &lt; 60s con auto-asignación Round-Robin).
                  </p>
                </div>
              </div>

              {/* Formulario de Vinculación */}
              <div className="p-4 rounded-2xl bg-white border border-[#E8E6DF] space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-[#1F1E1D]">
                    Vincular Cuenta Publicitaria de TikTok
                  </h4>
                  {activeClient && (
                    <span className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                      Asignando a: {activeClient.name}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-[#6B6966] mb-1">
                      Nombre de la Cuenta:
                    </label>
                    <input
                      type="text"
                      placeholder="ej. Campañas TikTok Carrito Naranja"
                      value={manualAccountName}
                      onChange={(e) => setManualAccountName(e.target.value)}
                      className="w-full bg-white border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-[#6B6966] mb-1">
                      Advertiser ID (TikTok Ads Manager):
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

                <div>
                  <label className="block text-[11px] font-medium text-[#6B6966] mb-1">
                    Token de Acceso (Access Token de TikTok Marketing API) — Opcional:
                  </label>
                  <input
                    type="password"
                    placeholder="Generado en TikTok for Business Developers o Ads Manager"
                    value={manualAccessToken}
                    onChange={(e) => setManualAccessToken(e.target.value)}
                    className="w-full bg-white border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                  <p className="text-[10px] text-[#82807C] mt-1">
                    Si agregas el Token de Acceso, Bunker CRM podrá sincronizar automáticamente el gasto, impresiones, clics y campañas activas.
                  </p>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setManualProvider(INTEGRATION_PROVIDER.TIKTOK);
                      setManualAccountType(ACCOUNT_TYPE.TIKTOK_ADVERTISER);
                      handleManualSubmit({ preventDefault: () => { } } as React.FormEvent);
                    }}
                    disabled={manualSubmitting || !manualAccountName.trim() || !manualExternalId.trim()}
                    className="px-4 py-2 rounded-xl btn-black-gold text-xs font-semibold flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#E5C158]" />
                    <span>{manualSubmitting ? "Vinculando..." : "Vincular Cuenta de TikTok Ads"}</span>
                  </button>
                </div>
              </div>

              {/* Cuentas de TikTok ya vinculadas */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-800">
                  Cuentas de TikTok Ads Vinculadas ({channels.filter((c) => c.accountType === ACCOUNT_TYPE.TIKTOK_ADVERTISER).length})
                </h4>
                {channels.filter((c) => c.accountType === ACCOUNT_TYPE.TIKTOK_ADVERTISER).length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 text-center">
                    No hay cuentas de TikTok Ads vinculadas todavía.
                  </div>
                ) : (
                  channels
                    .filter((c) => c.accountType === ACCOUNT_TYPE.TIKTOK_ADVERTISER)
                    .map((ch) => {
                      return (
                        <div
                          key={ch.id}
                          className="px-4 py-3 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center font-bold text-xs shrink-0">
                              🎵
                            </div>
                            <div className="min-w-0">
                              <h5 className="text-xs font-semibold text-slate-900 truncate">{ch.accountName}</h5>
                              <p className="text-[10px] text-slate-500">ID: {ch.externalId || "—"}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <select
                              value={ch.clientId || ""}
                              onChange={(e) => handleAssignChannel(ch.id, e.target.value || null)}
                              disabled={assigningId === ch.id}
                              className="text-xs border border-slate-200 rounded-xl px-2 py-1 bg-slate-50 text-slate-700"
                            >
                              <option value="">Portafolio Agencia</option>
                              {clients.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => handleDeleteChannel(ch.id, ch.accountName)}
                              disabled={deletingChannelId === ch.id}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                              title={`Eliminar "${ch.accountName}"`}
                            >
                              {deletingChannelId === ch.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 3: WHATSAPP BUSINESS CLOUD API (META OFICIAL)     */}
          {/* ========================================================= */}
          {activeTab === "whatsapp" && (
            <div className="space-y-4 max-h-[62vh] overflow-y-auto pr-1">
              {/* Cabecera Limpia */}
              <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40">
                <div className="w-9 h-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center font-bold text-base shadow-2xs shrink-0">
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-bold text-[#121417] dark:text-white flex items-center gap-2">
                    <span>Conectar WhatsApp Business</span>
                    <span className="text-[10px] font-semibold bg-[#25D366]/20 text-emerald-800 dark:text-emerald-300 px-2 py-0.2 rounded-full border border-emerald-300 dark:border-emerald-700">
                      Oficial Meta
                    </span>
                  </h3>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-300">
                    Recibe y responde mensajes de WhatsApp directamente desde la Bandeja de Entrada.
                  </p>
                </div>
              </div>

              {/* Datos de Webhook para Meta (Copiado rápido) */}
              <div className="p-3 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 min-w-0 text-[11px]">
                  <span className="font-bold text-[#121417] dark:text-white shrink-0">Webhook Meta:</span>
                  <code className="px-2 py-0.5 rounded bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#2A2E37] font-mono text-[10px] truncate max-w-[260px]">
                    {typeof window !== "undefined" ? `${window.location.origin}/api/integrations/meta/webhook` : "/api/integrations/meta/webhook"}
                  </code>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const url = `${typeof window !== "undefined" ? window.location.origin : ""}/api/integrations/meta/webhook`;
                      navigator.clipboard.writeText(url);
                      setCopiedWaWebhook(true);
                      setTimeout(() => setCopiedWaWebhook(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#121417] hover:bg-[#F3F4F7] text-[11px] font-semibold text-[#121417] dark:text-white border border-[#E2E5EB] dark:border-[#2A2E37] transition-all cursor-pointer shadow-2xs"
                  >
                    {copiedWaWebhook ? "✓ URL Copiada" : "Copiar URL"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText("bunker_meta_webhook_verify_2026");
                      setCopiedWaToken(true);
                      setTimeout(() => setCopiedWaToken(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-[#121417] hover:bg-[#F3F4F7] text-[11px] font-semibold text-[#121417] dark:text-white border border-[#E2E5EB] dark:border-[#2A2E37] transition-all cursor-pointer shadow-2xs"
                  >
                    {copiedWaToken ? "✓ Token Copiado" : "Copiar Token"}
                  </button>
                </div>
              </div>

              {/* Formulario Simplificado de Conexión */}
              <div className="p-4 rounded-2xl bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#2A2E37] space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-[#121417] dark:text-white">
                    Datos de la Línea
                  </h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-[#64748B] dark:text-slate-400 font-medium">
                      Asignar a:
                    </span>
                    <select
                      value={targetClientId || ""}
                      onChange={(e) => setTargetClientId(e.target.value)}
                      className="text-xs border border-emerald-300 dark:border-emerald-700 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 font-semibold rounded-xl px-2.5 py-1 focus:outline-none cursor-pointer"
                    >
                      <option value="">Portafolio General (Agencia)</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] dark:text-slate-300 mb-1">
                      Nombre de la línea:
                    </label>
                    <input
                      type="text"
                      placeholder="ej. WhatsApp Ventas (+1 214...)"
                      value={manualAccountName}
                      onChange={(e) => setManualAccountName(e.target.value)}
                      className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-xl px-3 py-2 text-xs text-[#121417] dark:text-white focus:outline-none focus:border-[#25D366] transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748B] dark:text-slate-300 mb-1">
                      Phone Number ID de Meta:
                    </label>
                    <input
                      type="text"
                      placeholder="ej. 104829104829104"
                      value={manualExternalId}
                      onChange={(e) => setManualExternalId(e.target.value)}
                      className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-xl px-3 py-2 text-xs text-[#121417] dark:text-white focus:outline-none focus:border-[#25D366] transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#64748B] dark:text-slate-300 mb-1">
                    Token de Acceso (Temporal o Permanente):
                  </label>
                  <input
                    type="password"
                    placeholder="Pega el token de Meta (empieza con EAAG...)"
                    value={manualAccessToken}
                    onChange={(e) => setManualAccessToken(e.target.value)}
                    className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-xl px-3 py-2 text-xs text-[#121417] dark:text-white focus:outline-none focus:border-[#25D366] transition-all"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      handleManualSubmit(undefined, {
                        provider: INTEGRATION_PROVIDER.META,
                        accountType: ACCOUNT_TYPE.WHATSAPP_BUSINESS,
                        clientId: targetClientId || null,
                      });
                    }}
                    disabled={manualSubmitting || !manualAccountName.trim() || !manualExternalId.trim()}
                    className="px-5 py-2.5 rounded-full bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-bold flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    <MessageCircle className="w-4 h-4 text-white" />
                    <span>{manualSubmitting ? "Vinculando..." : "Conectar WhatsApp"}</span>
                  </button>
                </div>
              </div>

              {/* Líneas ya vinculadas */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-white">
                    {activeClient
                      ? `Líneas de WhatsApp de ${activeClient.name} (${waChannelsForView.length})`
                      : `Líneas de WhatsApp Vinculadas (${waChannelsForView.length})`}
                  </h4>
                  {targetClientId && (
                    <button
                      type="button"
                      onClick={() => setTargetClientId("")}
                      className="text-[11px] text-amber-600 hover:text-amber-700 hover:underline font-medium cursor-pointer"
                    >
                      Ver todas las marcas ({channels.filter((c) => c.accountType === ACCOUNT_TYPE.WHATSAPP_BUSINESS).length})
                    </button>
                  )}
                </div>
                {waChannelsForView.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs text-slate-500 text-center">
                    {activeClient
                      ? `No hay líneas de WhatsApp conectadas para ${activeClient.name} todavía.`
                      : "No hay líneas de WhatsApp conectadas todavía."}
                  </div>
                ) : (
                  waChannelsForView.map((ch) => (
                      <div
                        key={ch.id}
                        className="px-4 py-3 rounded-2xl border border-slate-200 bg-white flex items-center justify-between gap-3 shadow-2xs"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-[#25D366] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                            <MessageCircle className="w-4 h-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <h5 className="text-xs font-semibold text-slate-900 truncate">{ch.accountName}</h5>
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-100">
                                WhatsApp Cloud
                              </span>
                              {ch.client?.name && (
                                <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.2 rounded-full">
                                  {ch.client.name}
                                </span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-500 font-mono">ID: {ch.externalId || "—"}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <select
                            value={ch.clientId || ""}
                            onChange={(e) => handleAssignChannel(ch.id, e.target.value || null)}
                            disabled={assigningId === ch.id}
                            className="text-xs border border-slate-200 rounded-xl px-2 py-1 bg-slate-50 text-slate-700 font-medium"
                          >
                            <option value="">Portafolio Agencia</option>
                            {clients.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            onClick={() => handleDeleteChannel(ch.id, ch.accountName)}
                            disabled={deletingChannelId === ch.id}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title={`Eliminar "${ch.accountName}"`}
                          >
                            {deletingChannelId === ch.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-rose-500" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* PESTAÑA 4: REGISTRO MANUAL AVANZADO (TOKEN / CLAVES)      */}
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

        {/* Footer Minimalista */}
        <div className="px-6 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            <span>
              {channels.length} {channels.length === 1 ? "activo vinculado" : "activos vinculados"}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}
