"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  Inbox,
  Search,
  MessageCircle,
  RefreshCw,
  Send,
  Building,
  CheckCircle2,
  FileText,
  Users,
  UserCheck,
  UserPlus,
} from "lucide-react";
import { SocialNetworkIcon } from "@/components/common/SocialNetworkIcon";

interface ConversationMessage {
  id: string;
  senderName: string;
  body: string;
  createdAt: string;
  direction: "inbound" | "outbound";
  status?: string;
}

interface ConversationItem {
  id: string;
  channel: "whatsapp" | "messenger" | "instagram" | "facebook_comment" | "instagram_comment";
  senderName: string;
  senderAvatar?: string | null;
  recipient: string;
  clientId: string | null;
  clientName: string | null;
  connectedAccountId: string | null;
  accountName: string | null;
  unreadCount: number;
  lastMessageText: string;
  lastMessageTime: string;
  postContext?: {
    postId: string;
    postTitle: string;
    commentId: string;
  } | null;
  messages: ConversationMessage[];
  leadId?: string | null;
  leadPhone?: string | null;
  leadEmail?: string | null;
  assignedAdvisorId?: string | null;
  assignedAdvisorName?: string | null;
}

interface AdvisorOption {
  id: string;
  name: string;
  email: string;
  role: string;
  clientId?: string | null;
}

interface InboxStats {
  total: number;
  unread: number;
  whatsapp: number;
  messenger: number;
  instagram: number;
  comments: number;
}

const CHANNEL_CONFIG: Record<
  string,
  { label: string; badgeCls: string; iconType: string }
> = {
  whatsapp: {
    label: "WhatsApp",
    badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
    iconType: "whatsapp",
  },
  messenger: {
    label: "Facebook Messenger",
    badgeCls: "bg-blue-50 text-blue-700 border-blue-200",
    iconType: "facebook",
  },
  instagram: {
    label: "Instagram Direct",
    badgeCls: "bg-pink-50 text-pink-700 border-pink-200",
    iconType: "instagram",
  },
  facebook_comment: {
    label: "Comentario Facebook",
    badgeCls: "bg-amber-50 text-amber-800 border-amber-200",
    iconType: "facebook",
  },
  instagram_comment: {
    label: "Comentario Instagram",
    badgeCls: "bg-rose-50 text-rose-800 border-rose-200",
    iconType: "instagram",
  },
};

function formatTimeAgo(isoString: string): string {
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMinutes = Math.floor(diffMs / (60 * 1000));
  if (diffMinutes < 1) return "Ahora";
  if (diffMinutes < 60) return `hace ${diffMinutes} m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  return `hace ${diffDays} d`;
}

export default function UnifiedInboxPage() {
  const { user } = useAuth();
  const isClient = Boolean(user?.isClientUser);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [stats, setStats] = useState<InboxStats>({
    total: 0,
    unread: 0,
    whatsapp: 0,
    messenger: 0,
    instagram: 0,
    comments: 0,
  });
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [advisors, setAdvisors] = useState<AdvisorOption[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  // Filtros
  const [activeChannel, setActiveChannel] = useState<string>("all");
  const [selectedClientId, setSelectedClientId] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Respuestas
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchInbox = useCallback(async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true);
      const params = new URLSearchParams();
      if (activeChannel !== "all") params.set("channel", activeChannel);
      if (!isClient && selectedClientId !== "all") params.set("clientId", selectedClientId);
      if (search.trim()) params.set("search", search.trim());

      const res = await fetch(`/api/inbox?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setConversations(json.conversations || []);
        if (json.stats) setStats(json.stats);
        if (json.clients) setClients(json.clients);
        if (json.advisors) setAdvisors(json.advisors);

        // Seleccionar automáticamente la primera si ninguna está seleccionada
        if (!selectedConvId && json.conversations?.length > 0) {
          setSelectedConvId(json.conversations[0].id);
        }
      }
    } catch (err) {
      console.error("Error al cargar la bandeja de entrada:", err);
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [activeChannel, selectedClientId, search, isClient, selectedConvId]);

  useEffect(() => {
    fetchInbox();
    const interval = setInterval(() => {
      fetchInbox(true);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchInbox]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId) || conversations[0] || null;
  }, [conversations, selectedConvId]);

  const handleAssignAdvisor = async (advisorId: string | null) => {
    if (!activeConversation || assigning) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "assign",
          conversationId: activeConversation.id,
          advisorId,
          leadId: activeConversation.leadId,
          senderName: activeConversation.senderName,
          senderPhone: activeConversation.leadPhone,
          senderEmail: activeConversation.leadEmail,
          clientId: activeConversation.clientId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation.id
              ? {
                  ...c,
                  leadId: json.leadId ?? c.leadId,
                  assignedAdvisorId: json.assignedAdvisorId,
                  assignedAdvisorName: json.assignedAdvisorName,
                }
              : c
          )
        );
        setFeedback(json.message || "Asignación comercial actualizada.");
        setTimeout(() => setFeedback(null), 3500);
      } else {
        alert(json.error || "No se pudo asignar el asesor.");
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error al asignar asesor.");
    } finally {
      setAssigning(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!replyText.trim() || !activeConversation || sending) return;

    setSending(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          channel: activeConversation.channel,
          body: replyText.trim(),
          recipient: activeConversation.recipient,
          clientId: activeConversation.clientId,
          leadId: activeConversation.leadId,
          commentId: activeConversation.postContext?.commentId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        // Agregar localmente el mensaje saliente a la conversación
        const newMsg: ConversationMessage = {
          id: `sent_${Date.now()}`,
          senderName: "Tú (Asesor)",
          body: replyText.trim(),
          createdAt: new Date().toISOString(),
          direction: "outbound",
          status: "sent",
        };

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation.id
              ? {
                  ...c,
                  lastMessageText: replyText.trim(),
                  lastMessageTime: new Date().toISOString(),
                  messages: [...c.messages, newMsg],
                }
              : c
          )
        );

        setReplyText("");
        setFeedback("¡Respuesta enviada correctamente!");
        setTimeout(() => setFeedback(null), 3000);
      } else {
        alert(json.error || "No se pudo enviar la respuesta.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error de conexión al enviar respuesta.";
      alert(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EAECF0]">
        <div>
          <h1 className="text-2xl font-semibold text-[#101828] tracking-tight flex items-center gap-2.5">
            <Inbox className="w-6 h-6 text-amber-500 shrink-0" />
            <span>Bandeja de Entrada</span>
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchInbox(false)}
            disabled={loading}
            className="p-2 rounded-xl bg-[#FFFFFF] border border-[#EAECF0] text-[#475467] hover:text-[#101828] text-xs transition-colors shadow-2xs"
            title="Refrescar bandeja"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Barra de Filtros de Canales & Selector de Clientes */}
      <div className="p-1.5 bg-white rounded-xl border border-[#EAECF0] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 shadow-2xs">
        {/* Tabs de Canales */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 lg:pb-0">
          <button
            type="button"
            onClick={() => setActiveChannel("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeChannel === "all"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-[#475467] hover:text-[#101828] hover:bg-[#F8F9FA]"
            }`}
          >
            <span>Todos los canales</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                activeChannel === "all" ? "bg-white/20 text-white font-medium" : "bg-[#F2F4F7] text-[#475467]"
              }`}
            >
              {stats.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel("whatsapp")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeChannel === "whatsapp"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-[#475467] hover:text-[#101828] hover:bg-[#F8F9FA]"
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>WhatsApp</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                activeChannel === "whatsapp" ? "bg-white/20 text-white font-medium" : "bg-[#F2F4F7] text-[#475467]"
              }`}
            >
              {stats.whatsapp}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel("messenger")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeChannel === "messenger"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-[#475467] hover:text-[#101828] hover:bg-[#F8F9FA]"
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Messenger</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                activeChannel === "messenger" ? "bg-white/20 text-white font-medium" : "bg-[#F2F4F7] text-[#475467]"
              }`}
            >
              {stats.messenger}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel("instagram")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeChannel === "instagram"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-[#475467] hover:text-[#101828] hover:bg-[#F8F9FA]"
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-pink-500" />
            <span>Instagram Direct</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                activeChannel === "instagram" ? "bg-white/20 text-white font-medium" : "bg-[#F2F4F7] text-[#475467]"
              }`}
            >
              {stats.instagram}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel("comments")}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${
              activeChannel === "comments"
                ? "bg-[#0F172A] text-white shadow-xs"
                : "text-[#475467] hover:text-[#101828] hover:bg-[#F8F9FA]"
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Comentarios</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                activeChannel === "comments" ? "bg-white/20 text-white font-medium" : "bg-[#F2F4F7] text-[#475467]"
              }`}
            >
              {stats.comments}
            </span>
          </button>
        </div>

        {/* Filtro por Cliente (Para Administradores) */}
        {!isClient && (
          <div className="flex items-center gap-2 shrink-0 px-1">
            <span className="text-xs text-[#667085] font-medium hidden sm:inline">Empresa:</span>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="bg-white border border-[#EAECF0] rounded-lg px-2.5 py-1 text-xs text-[#101828] focus:outline-none focus:border-amber-500 font-medium cursor-pointer"
            >
              <option value="all">Todas las empresas</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Bandeja Dividida en 2 Columnas (Listado + Conversación Activa) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 h-[calc(100vh-270px)] min-h-[550px] items-stretch">
        {/* ========================================================= */}
        {/* COLUMNA IZQUIERDA: LISTA DE CONVERSACIONES (4 cols)      */}
        {/* ========================================================= */}
        <div className="lg:col-span-4 bg-white rounded-xl border border-[#EAECF0] shadow-xs flex flex-col overflow-hidden">
          {/* Buscador de Chats */}
          <div className="p-2.5 border-b border-[#EAECF0]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#9C9890] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar remitente, mensaje o teléfono..."
                className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#101828] placeholder-[#9C9890] focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Lista de Conversaciones con Scroll */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#EAECF0]">
            {loading ? (
              <div className="py-12 text-center text-[#9C9890] text-xs flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
                <span>Cargando conversaciones...</span>
              </div>
            ) : conversations.length === 0 ? (
              <div className="py-12 text-center text-[#9C9890] text-xs p-6 space-y-2">
                <Inbox className="w-8 h-8 text-[#DDD9CF] mx-auto" />
                <p className="font-semibold text-[#101828]">Bandeja vacía</p>
                <p className="text-[11px] text-[#667085]">
                  No se encontraron mensajes en este canal o filtro seleccionado.
                </p>
                {!isClient && (
                  <div className="pt-2">
                    <Link
                      href="/marketing/integrations"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors shadow-xs"
                    >
                      <span>Vincular cuentas o redes</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = activeConversation?.id === conv.id;
                const channelConf = CHANNEL_CONFIG[conv.channel] || {
                  label: conv.channel,
                  badgeCls: "bg-slate-50 text-slate-700 border-slate-200",
                  iconType: "meta",
                };

                return (
                  <button
                    key={conv.id}
                    type="button"
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full p-3.5 text-left transition-colors flex items-start gap-3 relative ${
                      isSelected ? "bg-[#F8F9FA] border-l-2 border-l-amber-500" : "hover:bg-[#F8F9FA]/70"
                    }`}
                  >
                    {/* Icono de Red / Canal */}
                    <SocialNetworkIcon type={channelConf.iconType} size="sm" className="mt-0.5 shrink-0" />

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-semibold text-xs text-[#101828] truncate">{conv.senderName}</span>
                        <span className="text-[10px] text-[#9C9890] shrink-0 font-medium">
                          {formatTimeAgo(conv.lastMessageTime)}
                        </span>
                      </div>

                      {/* Badges de Canal, Cliente y Asesor */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${channelConf.badgeCls}`}>
                          {channelConf.label}
                        </span>
                        {conv.clientName && (
                          <span className="text-[9px] font-medium text-[#344054] bg-[#F2F4F7] border border-[#EAECF0] px-1.5 py-0.5 rounded truncate max-w-[120px]">
                            {conv.clientName}
                          </span>
                        )}
                        {conv.assignedAdvisorName ? (
                          <span className="text-[9px] font-medium text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 truncate max-w-[110px]">
                            <UserCheck className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                            <span className="truncate">{conv.assignedAdvisorName}</span>
                          </span>
                        ) : (
                          <span className="text-[9px] font-medium text-[#667085] bg-[#F8F9FA] border border-[#EAECF0] px-1.5 py-0.5 rounded">
                            Sin asignar
                          </span>
                        )}
                      </div>

                      {/* Snippet de último mensaje */}
                      <p className="text-[11px] text-[#475467] line-clamp-1 leading-normal mt-0.5">
                        {conv.lastMessageText}
                      </p>
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-2" title="No leído" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMNA DERECHA: CONVERSACIÓN & COMPOSER (8 cols)        */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 bg-white rounded-xl border border-[#EAECF0] shadow-xs flex flex-col overflow-hidden">
          {activeConversation ? (
            <>
              {/* Header de la Conversación Activa */}
              <div className="p-3.5 border-b border-[#EAECF0] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <SocialNetworkIcon
                    type={CHANNEL_CONFIG[activeConversation.channel]?.iconType || "meta"}
                    size="sm"
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-semibold text-sm text-[#101828] truncate">
                        {activeConversation.senderName}
                      </h2>
                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded border ${
                          CHANNEL_CONFIG[activeConversation.channel]?.badgeCls
                        }`}
                      >
                        {CHANNEL_CONFIG[activeConversation.channel]?.label}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#667085] flex items-center gap-1.5 mt-0.5 truncate">
                      <span>Cuenta: <strong>{activeConversation.accountName || "Cuenta Oficial"}</strong></span>
                      {activeConversation.clientName && (
                        <>
                          <span>•</span>
                          <span>Empresa: <strong className="text-slate-800">{activeConversation.clientName}</strong></span>
                        </>
                      )}
                    </p>
                  </div>
                </div>

                {/* Acciones de Contacto Rápido */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  {activeConversation.leadPhone && (
                    <a
                      href={`https://wa.me/${activeConversation.leadPhone.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Abrir chat directo en WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  {activeConversation.leadId && (
                    <Link
                      href={`/crm/leads?search=${encodeURIComponent(activeConversation.senderName || "")}`}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Ver prospecto en el CRM"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-amber-700" />
                      <span>Ver Prospecto</span>
                    </Link>
                  )}

                  {activeConversation.clientId && (
                    <Link
                      href={`/crm/clients/${activeConversation.clientId}`}
                      className="px-2.5 py-1.5 rounded-lg bg-[#F8F9FA] hover:bg-[#EAECF0] text-[#101828] border border-[#EAECF0] text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Ver ficha comercial de la empresa"
                    >
                      <Building className="w-3.5 h-3.5 text-[#667085]" />
                      <span>Ficha Empresa</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Barra de Asignación Comercial & Asesor Responsable */}
              <div className="px-4 py-2 bg-[#F8F9FA] border-b border-[#EAECF0] flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-[#475467] font-medium text-xs">
                    <Users className="w-3.5 h-3.5 text-[#667085] shrink-0" />
                    <span>Asesor comercial:</span>
                  </div>

                  <select
                    value={activeConversation.assignedAdvisorId ?? ""}
                    disabled={assigning}
                    onChange={(e) => handleAssignAdvisor(e.target.value ? e.target.value : null)}
                    className="bg-white border border-[#EAECF0] rounded-lg px-2.5 py-1 text-xs text-[#101828] font-medium focus:outline-none focus:border-amber-500 shadow-2xs"
                  >
                    <option value="">Sin asignar (Bandeja abierta)</option>
                    {advisors.map((adv) => (
                      <option key={adv.id} value={adv.id}>
                        {adv.name} {user?.id === adv.id ? "(Tú)" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  {user && activeConversation.assignedAdvisorId !== user.id && (
                    <button
                      type="button"
                      disabled={assigning}
                      onClick={() => handleAssignAdvisor(user.id)}
                      className="px-3 py-1 rounded-lg bg-white hover:bg-[#F8F9FA] text-[#101828] border border-[#EAECF0] font-medium text-xs flex items-center gap-1.5 transition-colors shadow-2xs disabled:opacity-50"
                      title="Asignarme esta conversación y su lead"
                    >
                      <UserPlus className={`w-3.5 h-3.5 text-amber-600 ${assigning ? "animate-spin" : ""}`} />
                      <span>Tomar chat</span>
                    </button>
                  )}

                  {user && activeConversation.assignedAdvisorId === user.id && (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium text-xs flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Atendido por ti</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Contexto de Publicación si es un Comentario Público */}
              {activeConversation.postContext && (
                <div className="px-4 py-2 bg-amber-50/60 border-b border-amber-200/50 flex items-center justify-between text-xs text-amber-950">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-medium shrink-0">Comentario en publicación:</span>
                    <span className="truncate italic">&ldquo;{activeConversation.postContext.postTitle}&rdquo;</span>
                  </div>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-amber-300 font-mono shrink-0 ml-2">
                    ID: {activeConversation.postContext.postId}
                  </span>
                </div>
              )}

              {/* Historial de Mensajes / Chat Bubbles con Scroll */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F8F9FA]/40">
                {activeConversation.messages.map((m) => {
                  const isOutbound = m.direction === "outbound";

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}
                    >
                      <div className="text-[10px] text-[#9C9890] mb-1 px-1 font-medium">
                        {m.senderName} • {formatTimeAgo(m.createdAt)}
                      </div>
                      <div
                        className={`max-w-md sm:max-w-lg p-3 rounded-xl text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                          isOutbound
                            ? "bg-[#0F172A] text-white rounded-br-xs"
                            : "bg-white text-[#101828] border border-[#EAECF0] rounded-bl-xs"
                        }`}
                      >
                        {m.body}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Toast de Envío Exitoso */}
              {feedback && (
                <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{feedback}</span>
                </div>
              )}

              {/* Composer: Cuadro de Respuesta */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-[#EAECF0] bg-white">
                <div className="text-[11px] text-[#667085] mb-1.5 flex items-center justify-between">
                  <span>
                    Respondiendo como <strong>{activeConversation.accountName || "Bunker Agency"}</strong> vía{" "}
                    <strong>{CHANNEL_CONFIG[activeConversation.channel]?.label}</strong>
                  </span>
                  <span className="text-[10px] text-[#9C9890]">Enter para enviar</span>
                </div>

                <div className="flex items-end gap-2">
                  <textarea
                    rows={2}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    placeholder={`Escribe un mensaje para ${activeConversation.senderName}...`}
                    className="flex-1 bg-[#F8F9FA] border border-[#EAECF0] rounded-lg p-2.5 text-xs text-[#101828] placeholder-[#9C9890] focus:outline-none focus:border-amber-500 focus:bg-white resize-none transition-colors"
                  />

                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="btn-black-gold rounded-lg px-4 py-2 text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50 transition-all h-[40px] shrink-0"
                  >
                    <Send className={`w-3.5 h-3.5 text-amber-400 ${sending ? "animate-pulse" : ""}`} />
                    <span>{sending ? "Enviando..." : "Enviar"}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#667085] space-y-3">
              <Inbox className="w-12 h-12 text-[#DDD9CF]" />
              <h3 className="font-bold text-sm text-[#101828]">Selecciona una conversación</h3>
              <p className="text-xs text-[#667085] max-w-sm">
                Haz clic en cualquier mensaje de la lista izquierda para ver el historial y responder en tiempo real por WhatsApp, Messenger, Instagram o Comentarios.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
