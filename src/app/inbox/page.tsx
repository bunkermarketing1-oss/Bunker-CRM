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

  const fetchInbox = useCallback(async () => {
    try {
      setLoading(true);
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

        // Seleccionar automáticamente la primera si ninguna está seleccionada
        if (!selectedConvId && json.conversations?.length > 0) {
          setSelectedConvId(json.conversations[0].id);
        }
      }
    } catch (err) {
      console.error("Error al cargar la bandeja de entrada:", err);
    } finally {
      setLoading(false);
    }
  }, [activeChannel, selectedClientId, search, isClient, selectedConvId]);

  useEffect(() => {
    fetchInbox();
  }, [fetchInbox]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId) || conversations[0] || null;
  }, [conversations, selectedConvId]);

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
      {/* Header Ejecutivo */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#EAECF0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F8F9FA] border border-[#EAECF0] text-[#475467]">
              Omnicanal • Mensajería Centralizada
            </span>
            <span className="text-xs text-[#9C9890]">
              {isClient ? "• Canales de mi Empresa" : "• Meta BM & WhatsApp"}
            </span>
          </div>
          <h1 className="text-3xl font-semibold text-[#101828] tracking-tight flex items-center gap-2.5">
            <Inbox className="w-8 h-8 text-amber-500 shrink-0" />
            <span>Bandeja de Entrada Unificada</span>
          </h1>
          <p className="text-xs text-[#475467] mt-1 max-w-2xl leading-relaxed">
            Centraliza conversaciones de Facebook Messenger, Instagram Direct, WhatsApp y comentarios públicos de tus publicaciones en un solo lugar con separación automática por cliente y cuenta publicitaria.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchInbox}
            disabled={loading}
            className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#EAECF0] text-[#475467] hover:text-[#101828] text-xs transition-colors shadow-2xs"
            title="Refrescar bandeja"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Barra de Filtros de Canales & Selector de Clientes */}
      <div className="p-2 bg-[#FAF9F5] rounded-2xl border border-[#EAECF0] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Pills de Canales */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          <button
            type="button"
            onClick={() => setActiveChannel("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeChannel === "all"
                ? "bg-white text-[#101828] shadow-sm border border-[#EAECF0]"
                : "text-[#475467] hover:text-[#101828]"
            }`}
          >
            <span>Todos los Canales</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#F0EEE6] font-bold text-[#101828]">
              {stats.total}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel("whatsapp")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeChannel === "whatsapp"
                ? "bg-white text-emerald-800 shadow-sm border border-[#EAECF0]"
                : "text-[#475467] hover:text-[#101828]"
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>WhatsApp</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {stats.whatsapp}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel("messenger")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeChannel === "messenger"
                ? "bg-white text-blue-800 shadow-sm border border-[#EAECF0]"
                : "text-[#475467] hover:text-[#101828]"
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-blue-600" />
            <span>Messenger</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-800 font-bold">
              {stats.messenger}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel("instagram")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeChannel === "instagram"
                ? "bg-white text-pink-800 shadow-sm border border-[#EAECF0]"
                : "text-[#475467] hover:text-[#101828]"
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-gradient-to-tr from-orange-400 to-pink-600" />
            <span>Instagram Direct</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-pink-100 text-pink-800 font-bold">
              {stats.instagram}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveChannel("comments")}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeChannel === "comments"
                ? "bg-white text-amber-900 shadow-sm border border-[#EAECF0]"
                : "text-[#475467] hover:text-[#101828]"
            }`}
          >
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Comentarios en Posts</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
              {stats.comments}
            </span>
          </button>
        </div>

        {/* Filtro por Cliente (Para Administradores) */}
        {!isClient && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] text-[#667085] font-medium hidden sm:inline">Filtrar por Empresa:</span>
            <select
              value={selectedClientId}
              onChange={(e) => setSelectedClientId(e.target.value)}
              className="bg-white border border-[#EAECF0] rounded-xl px-3 py-1.5 text-xs text-[#101828] focus:outline-none focus:border-amber-500 font-semibold"
            >
              <option value="all">🏢 Todas las Empresas & Cuentas BM</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  👤 {c.name}
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
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#EAECF0] shadow-sm flex flex-col overflow-hidden">
          {/* Buscador de Chats */}
          <div className="p-3 border-b border-[#EAECF0]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#9C9890] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar remitente, mensaje o teléfono..."
                className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl pl-9 pr-3 py-2 text-xs text-[#101828] placeholder-[#9C9890] focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Lista de Conversaciones con Scroll */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#F0EEE6]">
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
                    className={`w-full p-4 text-left transition-colors flex items-start gap-3 relative ${
                      isSelected ? "bg-[#FAF9F5] border-l-4 border-l-amber-500" : "hover:bg-[#F8F9FA]"
                    }`}
                  >
                    {/* Icono de Red / Canal */}
                    <SocialNetworkIcon type={channelConf.iconType} size="sm" className="mt-0.5 shrink-0" />

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-xs text-[#101828] truncate">{conv.senderName}</span>
                        <span className="text-[10px] text-[#9C9890] shrink-0 font-medium">
                          {formatTimeAgo(conv.lastMessageTime)}
                        </span>
                      </div>

                      {/* Badge de Cliente asignado */}
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${channelConf.badgeCls}`}>
                          {channelConf.label}
                        </span>
                        {conv.clientName && (
                          <span className="text-[9px] font-medium text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.2 rounded truncate max-w-[140px]">
                            {conv.clientName}
                          </span>
                        )}
                      </div>

                      {/* Snippet de último mensaje */}
                      <p className="text-[11px] text-[#475467] line-clamp-2 leading-relaxed mt-0.5">
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
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#EAECF0] shadow-sm flex flex-col overflow-hidden">
          {activeConversation ? (
            <>
              {/* Header de la Conversación Activa */}
              <div className="p-4 border-b border-[#EAECF0] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <SocialNetworkIcon
                    type={CHANNEL_CONFIG[activeConversation.channel]?.iconType || "meta"}
                    size="md"
                    className="shrink-0"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-bold text-sm text-[#101828] truncate">
                        {activeConversation.senderName}
                      </h2>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          CHANNEL_CONFIG[activeConversation.channel]?.badgeCls
                        }`}
                      >
                        {CHANNEL_CONFIG[activeConversation.channel]?.label}
                      </span>
                    </div>

                    <p className="text-[11px] text-[#667085] flex items-center gap-1.5 mt-0.5 truncate">
                      <span>Cuenta BM: <strong>{activeConversation.accountName || "Cuenta Oficial"}</strong></span>
                      {activeConversation.clientName && (
                        <>
                          <span>•</span>
                          <span>Empresa Cliente: <strong className="text-amber-700">{activeConversation.clientName}</strong></span>
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
                      className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Abrir chat directo en WhatsApp"
                    >
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                      <span>WhatsApp</span>
                    </a>
                  )}

                  {activeConversation.clientId && (
                    <Link
                      href={`/crm/clients/${activeConversation.clientId}`}
                      className="px-2.5 py-1.5 rounded-xl bg-[#F8F9FA] hover:bg-[#EAECF0] text-[#101828] border border-[#EAECF0] text-xs font-semibold flex items-center gap-1 transition-colors"
                      title="Ver ficha comercial 360°"
                    >
                      <Building className="w-3.5 h-3.5 text-amber-500" />
                      <span>Ficha 360°</span>
                    </Link>
                  )}
                </div>
              </div>

              {/* Contexto de Publicación si es un Comentario Público */}
              {activeConversation.postContext && (
                <div className="px-4 py-2.5 bg-amber-50/80 border-b border-amber-200/60 flex items-center justify-between text-xs text-amber-950">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-semibold shrink-0">Comentario público en publicación:</span>
                    <span className="truncate italic">&ldquo;{activeConversation.postContext.postTitle}&rdquo;</span>
                  </div>
                  <span className="text-[10px] bg-white px-2 py-0.5 rounded border border-amber-300 font-mono shrink-0 ml-2">
                    ID: {activeConversation.postContext.postId}
                  </span>
                </div>
              )}

              {/* Historial de Mensajes / Chat Bubbles con Scroll */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FAF9F5]/40">
                {activeConversation.messages.map((m) => {
                  const isOutbound = m.direction === "outbound";

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}
                    >
                      <div className="text-[10px] text-[#9C9890] mb-1 px-1">
                        {m.senderName} • {formatTimeAgo(m.createdAt)}
                      </div>
                      <div
                        className={`max-w-md sm:max-w-lg p-3.5 rounded-2xl text-xs leading-relaxed shadow-2xs whitespace-pre-wrap ${
                          isOutbound
                            ? "bg-[#101828] text-white rounded-br-xs"
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
                <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-200 text-xs font-semibold text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{feedback}</span>
                </div>
              )}

              {/* Composer: Cuadro de Respuesta */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-[#EAECF0] bg-white">
                <div className="text-[10px] text-[#667085] mb-1 flex items-center justify-between">
                  <span>
                    Respondiendo como <strong>{activeConversation.accountName || "Bunker Agency"}</strong> vía{" "}
                    <strong>{CHANNEL_CONFIG[activeConversation.channel]?.label}</strong>
                  </span>
                  <span className="text-[9px] text-[#9C9890]">Enter para enviar</span>
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
                    className="flex-1 bg-[#F8F9FA] border border-[#EAECF0] rounded-xl p-2.5 text-xs text-[#101828] placeholder-[#9C9890] focus:outline-none focus:border-amber-500 resize-none"
                  />

                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="btn-black-gold rounded-xl px-4 py-2.5 text-xs font-semibold flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition-all h-[42px]"
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
