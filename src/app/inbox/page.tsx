/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Inbox,
  Search,
  MessageCircle,
  RefreshCw,
  Send,
  Building,
  Building2,
  CheckCircle2,
  FileText,
  Users,
  UserCheck,
  UserPlus,
  Loader2,
  AlertTriangle,
  X,
  Clock,
  PhoneCall,
  MessageSquare,
  Paperclip,
  ExternalLink,
  Timer,
  Volume2,
  VolumeX,
  Bell,
} from "lucide-react";
import { SocialNetworkIcon } from "@/components/common/SocialNetworkIcon";
import SlidingTabs from "@/components/ui/SlidingTabs";
import type {
  ConversationItem,
  ConversationMessage,
  AdvisorOption,
  InboxStats,
} from "@/types/inbox";

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
  sms: {
    label: "Twilio SMS",
    badgeCls: "bg-purple-50 text-purple-700 border-purple-200",
    iconType: "sms",
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

function ContactAvatar({
  name,
  avatarUrl,
  channel,
  size = "md",
}: {
  name: string;
  avatarUrl?: string | null;
  channel: string;
  size?: "sm" | "md" | "lg";
}) {
  const [imageError, setImageError] = useState(false);
  const channelConf = CHANNEL_CONFIG[channel] || {
    label: channel,
    badgeCls: "bg-slate-50 text-slate-700 border-slate-200",
    iconType: "meta",
  };

  const dimCls =
    size === "sm"
      ? "w-8 h-8 text-[11px]"
      : size === "lg"
      ? "w-11 h-11 text-sm"
      : "w-10 h-10 text-xs";

  const badgeCls =
    size === "sm"
      ? "w-3.5 h-3.5 -bottom-0.5 -right-0.5"
      : size === "lg"
      ? "w-4 h-4 -bottom-0.5 -right-0.5"
      : "w-3.5 h-3.5 -bottom-0.5 -right-0.5";

  const cleanName = (name || "").trim();
  const initials = cleanName
    ? cleanName
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() || "")
        .join("") || "?"
    : "?";

  return (
    <div className={`relative shrink-0 ${dimCls}`}>
      {avatarUrl && !imageError ? (
        <img
          src={avatarUrl}
          alt={name}
          onError={() => setImageError(true)}
          className={`${dimCls} rounded-full object-cover border border-[#EAECF0] shadow-2xs`}
        />
      ) : (
        <div
          className={`${dimCls} rounded-full bg-gradient-to-br from-slate-700 to-slate-900 text-amber-300 font-semibold flex items-center justify-center border border-[#EAECF0] shadow-2xs`}
        >
          {initials}
        </div>
      )}

      {/* Badge del canal superpuesto */}
      <div
        className={`absolute ${badgeCls} rounded-full bg-white p-0.5 shadow-xs flex items-center justify-center border border-white`}
      >
        <SocialNetworkIcon type={channelConf.iconType} size="xs" />
      </div>
    </div>
  );
}

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

interface AttachedFile {
  file: File;
  previewUrl?: string;
  isImage: boolean;
  uploading: boolean;
  uploadedUrl?: string;
  fileName: string;
  fileSize: number;
  error?: string;
}

function isImageUrl(url: string): boolean {
  const clean = url.split("?")[0].toLowerCase();
  return /\.(jpe?g|png|webp|gif|svg)$/i.test(clean);
}

function getFilenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/");
    const last = segments[segments.length - 1];
    return decodeURIComponent(last) || "Archivo adjunto";
  } catch {
    return "Archivo adjunto";
  }
}

function renderMessageContent(body: string, isOutbound: boolean) {
  if (!body) return null;

  // Detectar URLs en el cuerpo del mensaje
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = body.split(urlRegex);

  return (
    <div className="space-y-2">
      {parts.map((part, idx) => {
        if (/^https?:\/\/[^\s]+$/i.test(part)) {
          const isImg = isImageUrl(part);
          if (isImg) {
            return (
              <div key={idx} className="relative group/img my-1">
                <img
                  src={part}
                  alt="Fotografía adjunta"
                  className="rounded-lg max-h-72 w-auto max-w-full object-cover border border-black/10 cursor-pointer hover:opacity-95 transition-opacity shadow-xs"
                  onClick={() => window.open(part, "_blank")}
                  loading="lazy"
                />
                <button
                  type="button"
                  onClick={() => window.open(part, "_blank")}
                  className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white rounded-md px-2 py-1 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center gap-1 text-[10px]"
                  title="Ver imagen en tamaño completo"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Ampliar</span>
                </button>
              </div>
            );
          }

          // Es un documento u otro archivo
          const fileName = getFilenameFromUrl(part);
          return (
            <a
              key={idx}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium transition my-1 max-w-full overflow-hidden ${
                isOutbound
                  ? "bg-white/10 hover:bg-white/20 text-white border-white/20"
                  : "bg-[#F8F9FA] hover:bg-[#F2F4F7] text-[#101828] border-[#EAECF0]"
              }`}
            >
              <div className="w-8 h-8 rounded-md bg-amber-500/10 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-amber-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate font-semibold text-[11px]">{fileName}</p>
                <p className="text-[10px] opacity-70">Clic para abrir o descargar</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 opacity-60 shrink-0" />
            </a>
          );
        }

        // Texto regular (si no está vacío)
        const trimmed = part.trim();
        if (!trimmed) return null;
        return (
          <p key={idx} className="whitespace-pre-wrap leading-relaxed">
            {part}
          </p>
        );
      })}
    </div>
  );
}

function playNotificationSound() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const nowTime = ctx.currentTime;

    // Nota 1 (Re5 - 587.33 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, nowTime);
    gain1.gain.setValueAtTime(0.18, nowTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, nowTime + 0.3);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(nowTime);
    osc1.stop(nowTime + 0.3);

    // Nota 2 (La5 - 880 Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, nowTime + 0.1);
    gain2.gain.setValueAtTime(0.2, nowTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, nowTime + 0.45);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(nowTime + 0.1);
    osc2.stop(nowTime + 0.45);
  } catch {
    // Silencioso si el navegador bloquea audio antes de la primera interacción
  }
}

function formatSlaTimer(isoDate: string, currentNow: number) {
  const diffSec = Math.max(0, Math.floor((currentNow - new Date(isoDate).getTime()) / 1000));
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  const timeStr = mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${pad(mins)}:${pad(secs)}`;

  if (diffSec < 300) {
    // Menos de 5 minutos: Óptimo (Verde)
    return {
      timeStr,
      seconds: diffSec,
      level: "optimal" as const,
      label: "Óptimo",
      badgeCls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      dotCls: "bg-emerald-500",
    };
  } else if (diffSec < 900) {
    // De 5 a 15 minutos: Atención prioritaria (Amarillo)
    return {
      timeStr,
      seconds: diffSec,
      level: "warning" as const,
      label: "Prioritario",
      badgeCls: "bg-amber-50 text-amber-800 border-amber-200",
      dotCls: "bg-amber-500",
    };
  } else {
    // Más de 15 minutos: Urgente / SLA vencido (Rojo parpadeante)
    return {
      timeStr,
      seconds: diffSec,
      level: "danger" as const,
      label: "Urgente",
      badgeCls: "bg-rose-50 text-rose-700 border-rose-200 animate-pulse",
      dotCls: "bg-rose-500 animate-ping",
    };
  }
}

export default function UnifiedInboxPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[#667085]">Cargando bandeja de entrada...</div>}>
      <UnifiedInboxPageContent />
    </Suspense>
  );
}

function UnifiedInboxPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isClient = Boolean(user?.isClientUser);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [stats, setStats] = useState<InboxStats>({
    total: 0,
    unread: 0,
    whatsapp: 0,
    messenger: 0,
    instagram: 0,
    sms: 0,
    comments: 0,
  });
  const [clients, setClients] = useState<{ id: string; name: string }[]>([]);
  const [advisors, setAdvisors] = useState<AdvisorOption[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingThread, setLoadingThread] = useState(false);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);

  // Filtros
  const [activeChannel, setActiveChannel] = useState<string>("all");
  const activeClientId = isClient ? (user?.clientId ?? "all") : (searchParams.get("clientId") ?? "all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Respuestas
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cronómetro en vivo (tick de 1 segundo)
  const [now, setNow] = useState<number>(Date.now());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [hasNotificationPermission, setHasNotificationPermission] = useState<boolean>(false);
  const prevWaitingCountRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setHasNotificationPermission(Notification.permission === "granted");
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Alerta sonora y actualización dinámica del título de pestaña al llegar mensajes nuevos
  useEffect(() => {
    const waitingList = conversations.filter((c) => c.waitingForReply);
    const waitingCount = waitingList.length;

    if (prevWaitingCountRef.current !== null && waitingCount > prevWaitingCountRef.current) {
      if (soundEnabled) {
        playNotificationSound();
      }

      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        const newest = waitingList[0];
        if (newest) {
          try {
            new Notification(`🚨 Nuevo mensaje en ${newest.accountName || "Bunker CRM"}`, {
              body: `${newest.senderName}: ${newest.lastMessageText}`,
              icon: newest.senderAvatar || undefined,
            });
          } catch {
            // Silencioso
          }
        }
      }
    }

    prevWaitingCountRef.current = waitingCount;

    if (waitingCount > 0) {
      document.title = `(${waitingCount}) ⏱️ ¡Mensajes pendientes! • Bunker CRM`;
    } else {
      document.title = "Bandeja de Entrada • Bunker CRM";
    }
  }, [conversations, soundEnabled]);

  const handleRequestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      try {
        const perm = await Notification.requestPermission();
        setHasNotificationPermission(perm === "granted");
        if (perm === "granted" && soundEnabled) {
          playNotificationSound();
        }
      } catch {
        // Silencioso
      }
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isFetchingRef = useRef(false);

  // Debounce del input de búsqueda para no saturar consultas en servidor
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 350);
    return () => clearTimeout(handler);
  }, [search]);

  // Limpiar y resetear el listado y selección al cambiar de cliente para no mostrar conversaciones de otra empresa
  useEffect(() => {
    setSelectedConvId(null);
    setConversations([]);
    setLoading(true);
  }, [activeClientId]);

  const fetchInbox = useCallback(
    async (isSilent = false, triggerSync = false) => {
      // Si es un sondeo silencioso de fondo y ya hay una petición corriendo, no sobrecargar
      if (isSilent && isFetchingRef.current) return;

      // Si es una acción del usuario (cambio de cliente, canal o búsqueda), cancelar la anterior en curso
      if (!isSilent && abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;
      isFetchingRef.current = true;

      try {
        if (!isSilent) setLoading(true);
        const params = new URLSearchParams();
        if (activeChannel !== "all") params.set("channel", activeChannel);
        if (!isClient && activeClientId !== "all") params.set("clientId", activeClientId);
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (triggerSync) params.set("sync", "true");

        const res = await fetch(`/api/inbox?${params.toString()}`, {
          signal: controller.signal,
        });
        const json = await res.json();
        // Si mientras tanto el usuario cambió de pestaña o cliente, esta respuesta ya es vieja: se descarta.
        if (abortControllerRef.current !== controller) return;
        if (json.success) {
          const newConvs: ConversationItem[] = json.conversations || [];
          setConversations(newConvs);

          if (json.stats) setStats(json.stats);
          if (json.clients) setClients(json.clients);
          if (json.advisors) setAdvisors(json.advisors);

          // Preservar la conversación seleccionada si pertenece al nuevo lote o seleccionar la primera
          setSelectedConvId((current) => {
            if (current && newConvs.some((c) => c.id === current)) return current;
            return newConvs.length > 0 ? newConvs[0].id : null;
          });
        }
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        console.error("Error al cargar la bandeja de entrada:", err);
      } finally {
        // Una petición cancelada por otra más nueva no debe apagar el spinner ni liberar el candado de la nueva.
        isFetchingRef.current = false;
        if (abortControllerRef.current === controller) {
          if (!isSilent) setLoading(false);
        }
      }
    },
    [activeChannel, activeClientId, debouncedSearch, isClient]
  );

  // Carga inicial ultra rápida desde base de datos y sondeo periódico en segundo plano
  useEffect(() => {
    fetchInbox(false, false);
    const interval = setInterval(() => {
      fetchInbox(true, false);
    }, 10000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchInbox]);

  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === selectedConvId) || conversations[0] || null;
  }, [conversations, selectedConvId]);

  const lastInboundMsg = useMemo(() => {
    if (!activeConversation?.messages || activeConversation.messages.length === 0) return null;
    return [...activeConversation.messages].reverse().find((m) => m.direction === "inbound") || null;
  }, [activeConversation?.messages]);

  const isMetaChannel = activeConversation?.channel === "messenger" || activeConversation?.channel === "instagram";

  const is24hExpired = useMemo(() => {
    if (!isMetaChannel || !lastInboundMsg?.createdAt) return false;
    const diffHours = (Date.now() - new Date(lastInboundMsg.createdAt).getTime()) / (1000 * 60 * 60);
    return diffHours > 24;
  }, [isMetaChannel, lastInboundMsg?.createdAt]);

  useEffect(() => {
    setErrorMessage(null);
  }, [selectedConvId]);

  // Alternativa temporal: cada clic en conversación cuenta como actividad y actualiza estado del vendedor
  const lastInboxHeartbeatRef = useRef(0);
  useEffect(() => {
    if (!selectedConvId) return;
    const now = Date.now();
    if (now - lastInboxHeartbeatRef.current < 30000) return;
    lastInboxHeartbeatRef.current = now;
    fetch("/api/team/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "heartbeat" }),
    }).catch(() => {});
  }, [selectedConvId]);

  const convId = activeConversation?.id;
  const convChannel = activeConversation?.channel;
  const recipient = activeConversation?.recipient;
  const leadId = activeConversation?.leadId || "";
  const msgCount = activeConversation?.messages.length ?? 0;

  const markAsRead = useCallback((conv: ConversationItem) => {
    if (conv.unreadCount > 0) {
      // 1. Quitar el punto en estado local de inmediato para respuesta visual instantánea
      setConversations((prev) =>
        prev.map((c) => (c.id === conv.id ? { ...c, unreadCount: 0 } : c))
      );
      setStats((prev) => ({
        ...prev,
        unread: Math.max(0, prev.unread - 1),
      }));

      // 2. Persistir en base de datos en segundo plano
      fetch("/api/inbox", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_read",
          conversationId: conv.id,
          recipient: conv.recipient,
          leadId: conv.leadId || undefined,
          channel: conv.channel,
          clientId: conv.clientId || undefined,
        }),
      }).catch(() => {});
    }
  }, []);

  // Al abrir o cambiar de conversación activa, remover el punto de pendiente si no está leída
  useEffect(() => {
    if (activeConversation && activeConversation.unreadCount > 0) {
      markAsRead(activeConversation);
    }
  }, [activeConversation, markAsRead]);

  // Cargar el historial cronológico completo del hilo cuando se selecciona una conversación
  useEffect(() => {
    if (!convId || !recipient) return;

    let isCancelled = false;

    // Si ya tiene más de 1 mensaje cargado, evitar spinner invasivo pero sincronizar
    if (msgCount <= 1) {
      setLoadingThread(true);
    }

    const params = new URLSearchParams({
      thread: "true",
      recipient,
      ...(convChannel ? { channel: convChannel } : {}),
      ...(leadId ? { leadId } : {}),
      ...(activeClientId !== "all" ? { clientId: activeClientId } : {}),
    });

    fetch(`/api/inbox?${params.toString()}`)
      .then((res) => res.json())
      .then((json) => {
        if (!isCancelled && json.success && Array.isArray(json.messages) && json.messages.length > 0) {
          setConversations((prev) =>
            prev.map((c) => (c.id === convId ? { ...c, messages: json.messages, unreadCount: 0 } : c))
          );
        }
      })
      .catch((err) => console.error("Error al cargar historial completo del hilo:", err))
      .finally(() => {
        if (!isCancelled) setLoadingThread(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [convId, convChannel, recipient, leadId, msgCount, activeClientId]);

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
          clientId: activeConversation.clientId || (activeClientId !== "all" ? activeClientId : null),
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
        setErrorMessage(json.error || "No se pudo asignar el asesor.");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Error al asignar asesor.");
    } finally {
      setAssigning(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImg = file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name);
    let localPreview: string | undefined;
    if (isImg) {
      localPreview = URL.createObjectURL(file);
    }

    setAttachedFile({
      file,
      previewUrl: localPreview,
      isImage: isImg,
      uploading: true,
      fileName: file.name,
      fileSize: file.size,
    });

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/inbox/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success && data.url) {
        setAttachedFile((prev) =>
          prev
            ? {
                ...prev,
                uploading: false,
                uploadedUrl: data.url,
                fileName: data.fileName || prev.fileName,
                isImage: data.isImage ?? prev.isImage,
              }
            : null
        );
      } else {
        setAttachedFile((prev) =>
          prev
            ? {
                ...prev,
                uploading: false,
                error: data.error || "No se pudo subir el archivo.",
              }
            : null
        );
      }
    } catch {
      setAttachedFile((prev) =>
        prev
          ? {
              ...prev,
              uploading: false,
              error: "Error de conexión al subir el archivo.",
            }
          : null
      );
    }
  };

  const removeAttachedFile = () => {
    if (attachedFile?.previewUrl) {
      URL.revokeObjectURL(attachedFile.previewUrl);
    }
    setAttachedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSendReply = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (
      (!replyText.trim() && !attachedFile?.uploadedUrl) ||
      !activeConversation ||
      sending ||
      attachedFile?.uploading
    ) {
      return;
    }

    setSending(true);
    setFeedback(null);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/inbox", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: activeConversation.id,
          channel: activeConversation.channel,
          body: replyText.trim(),
          imageUrl: attachedFile?.uploadedUrl || null,
          mediaUrl: attachedFile?.uploadedUrl || null,
          fileName: attachedFile?.fileName || null,
          recipient: activeConversation.recipient,
          clientId: activeConversation.clientId || (activeClientId !== "all" ? activeClientId : null),
          leadId: activeConversation.leadId,
          commentId: activeConversation.postContext?.commentId,
        }),
      });
      const json = await res.json();
      if (json.success) {
        const messageBody = replyText.trim() && attachedFile?.uploadedUrl
          ? `${replyText.trim()}\n${attachedFile.uploadedUrl}`
          : (attachedFile?.uploadedUrl || replyText.trim());

        const newMsg: ConversationMessage = {
          id: json.reply?.id || `sent_${Date.now()}`,
          senderName: "Tú (Asesor)",
          body: messageBody,
          createdAt: new Date().toISOString(),
          direction: "outbound",
          status: "sent",
          channel: activeConversation.channel,
        };

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConversation.id
              ? {
                  ...c,
                  waitingForReply: false,
                  unreadCount: 0,
                  lastMessageText: messageBody,
                  lastMessageTime: new Date().toISOString(),
                  messages: [...c.messages, newMsg],
                }
              : c
          )
        );

        setReplyText("");
        removeAttachedFile();

        const respSec = json.reply?.responseTimeSec;
        let successMsg = "¡Respuesta enviada correctamente!";
        if (typeof respSec === "number") {
          const mins = Math.floor(respSec / 60);
          const secs = respSec % 60;
          const timeText = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
          successMsg = `¡Respuesta enviada en ${timeText}! ⚡`;
        }
        setFeedback(successMsg);
        setTimeout(() => setFeedback(null), 3500);
      } else {
        setErrorMessage(json.error || "No se pudo enviar la respuesta.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error de conexión al enviar respuesta.";
      setErrorMessage(msg);
    } finally {
      setSending(false);
    }
  };

  const activeClient = activeClientId !== "all" ? clients.find((c) => c.id === activeClientId) : null;

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EAECF0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Mensajería Omnicanal
            </span>
            {activeClient ? (
              <span className="text-[11px] font-semibold text-[#101828] bg-[#F8F9FA] px-2.5 py-0.5 rounded-md border border-[#EAECF0] flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-amber-600" />
                Marca: <strong>{activeClient.name}</strong>
              </span>
            ) : !isClient ? (
              <span className="text-[11px] text-[#667085] bg-[#F8F9FA] px-2 py-0.5 rounded-md border border-[#EAECF0]">
                Todas las Marcas
              </span>
            ) : null}
          </div>
          <h1 className="text-2xl font-semibold text-[#101828] tracking-tight flex items-center gap-2.5">
            <Inbox className="w-6 h-6 text-amber-500 shrink-0" />
            <span>Bandeja de Entrada Omnicanal</span>
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Atención unificada de WhatsApp, Facebook Messenger, Instagram Direct y SMS en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Botón de Alertas Sonoras */}
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs transition-colors shadow-2xs flex items-center gap-1.5 font-medium cursor-pointer ${
              soundEnabled
                ? "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100"
                : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
            title={
              soundEnabled
                ? "Alertas sonoras activas al llegar mensajes (clic para silenciar)"
                : "Silenciado (clic para activar sonido)"
            }
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            )}
            <span className="hidden sm:inline">{soundEnabled ? "Sonido Activo" : "Silenciado"}</span>
          </button>

          {/* Botón para solicitar Notificaciones de Escritorio */}
          {!hasNotificationPermission && (
            <button
              type="button"
              onClick={handleRequestNotificationPermission}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-semibold shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Recibir notificaciones de escritorio cuando lleguen mensajes nuevos"
            >
              <Bell className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Activar Notificaciones</span>
            </button>
          )}

          <button
            onClick={() => fetchInbox(false, true)}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-[#FFFFFF] border border-[#EAECF0] text-[#475467] hover:text-[#101828] text-xs transition-colors shadow-2xs flex items-center gap-1.5 font-medium cursor-pointer"
            title="Refrescar y sincronizar conversaciones de redes sociales"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-500" : ""}`} />
            <span>Sincronizar</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros de Canales & Selector de Clientes */}
      <div className="p-1.5 bg-white rounded-xl border border-[#EAECF0] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 shadow-2xs">
        {/* Tabs de Canales */}
        <SlidingTabs
          ariaLabel="Filtrar conversaciones por canal"
          className="pb-1 lg:pb-0"
          value={activeChannel}
          onChange={(channel) => {
            if (channel === activeChannel) return;
            // Se vacía la lista para no mostrar conversaciones de otro canal bajo la pestaña nueva mientras carga.
            setConversations([]);
            setSelectedConvId(null);
            setLoading(true);
            setActiveChannel(channel);
          }}
          options={[
            { value: "all", label: "Todos", count: stats.total },
            { value: "whatsapp", label: "WhatsApp", count: stats.whatsapp, dotClassName: "bg-emerald-500" },
            { value: "messenger", label: "Messenger", count: stats.messenger, dotClassName: "bg-blue-500" },
            { value: "instagram", label: "Instagram Direct", count: stats.instagram, dotClassName: "bg-pink-500" },
            { value: "sms", label: "SMS", count: stats.sms, dotClassName: "bg-purple-500" },
            { value: "comments", label: "Comentarios", count: stats.comments, dotClassName: "bg-amber-500" },
          ]}
        />

        {/* Selector de Marca (solo para administradores) */}
        {!isClient && clients.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F9FAFB] rounded-xl border border-[#EAECF0] self-end lg:self-auto shrink-0 shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <select
              value={activeClientId}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "all") {
                  router.push("/inbox");
                } else {
                  router.push(`/inbox?clientId=${encodeURIComponent(val)}`);
                }
              }}
              className="bg-transparent text-xs text-[#101828] font-medium focus:outline-none cursor-pointer"
            >
              <option value="all">Todas las Marcas</option>
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
          {/* Buscador de Chats en Servidor */}
          <div className="p-2.5 border-b border-[#EAECF0]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#9C9890] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar prospecto, mensaje o teléfono..."
                className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-lg pl-9 pr-3 py-1.5 text-xs text-[#101828] placeholder-[#9C9890] focus:outline-none focus:border-amber-500 focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Lista de Conversaciones con Scroll */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#EAECF0]">
            {loading && conversations.length === 0 ? (
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
                <div className="pt-2 flex items-center justify-center gap-2">
                  <button
                    onClick={() => fetchInbox(false, true)}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors shadow-xs cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    <span>Sincronizar ahora</span>
                  </button>
                  {!isClient && (
                    <Link
                      href="/marketing/integrations"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-colors shadow-xs"
                    >
                      <span>Vincular cuentas o redes</span>
                    </Link>
                  )}
                </div>
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
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      if (conv.unreadCount > 0) {
                        markAsRead(conv);
                      }
                    }}
                    className={`w-full p-3.5 text-left transition-colors flex items-start gap-3 relative ${
                      isSelected ? "bg-[#F8F9FA] border-l-2 border-l-amber-500" : "hover:bg-[#F8F9FA]/70"
                    }`}
                  >
                    {/* Icono de Red / Canal */}
                    <ContactAvatar
                      name={conv.senderName}
                      avatarUrl={conv.senderAvatar}
                      channel={conv.channel}
                      size="md"
                    />

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

                      {/* Cronómetro en vivo SLA si está esperando respuesta del asesor */}
                      {conv.waitingForReply && conv.lastInboundTime ? (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {(() => {
                            const sla = formatSlaTimer(conv.lastInboundTime, now);
                            return (
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold border ${sla.badgeCls}`}
                                title={`Tiempo de espera del cliente: ${sla.timeStr} (${sla.label})`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${sla.dotCls}`} />
                                <Timer className="w-2.5 h-2.5 shrink-0" />
                                <span>{sla.timeStr}</span>
                                <span className="text-[8px] font-sans opacity-75 uppercase tracking-wider ml-0.5">
                                  {sla.label}
                                </span>
                              </span>
                            );
                          })()}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 pt-0.5 text-[9px] text-emerald-700 font-medium">
                          <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                          <span>Respondido</span>
                        </div>
                      )}
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
                  <ContactAvatar
                    name={activeConversation.senderName}
                    avatarUrl={activeConversation.senderAvatar}
                    channel={activeConversation.channel}
                    size="md"
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
                      <span>
                        Canal: <strong>{activeConversation.accountName || "Línea Oficial"}</strong>
                      </span>
                      {activeConversation.clientName && (
                        <>
                          <span>•</span>
                          <span>
                            Empresa: <strong className="text-slate-800">{activeConversation.clientName}</strong>
                          </span>
                        </>
                      )}
                      {activeConversation.leadPhone && (
                        <>
                          <span>•</span>
                          <span>
                            Tel: <strong className="text-slate-800 font-mono">{activeConversation.leadPhone}</strong>
                          </span>
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

              {/* Barra de Cronómetro y SLA en Vivo */}
              {activeConversation.waitingForReply && activeConversation.lastInboundTime ? (
                (() => {
                  const sla = formatSlaTimer(activeConversation.lastInboundTime, now);
                  return (
                    <div
                      className={`px-4 py-2 border-b flex items-center justify-between gap-3 text-xs transition-colors ${
                        sla.level === "optimal"
                          ? "bg-emerald-50/90 border-emerald-200 text-emerald-950"
                          : sla.level === "warning"
                          ? "bg-amber-50/95 border-amber-200 text-amber-950"
                          : "bg-rose-50 border-rose-200 text-rose-950"
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-2 h-2 rounded-full ${sla.dotCls}`} />
                        <Timer className="w-4 h-4 text-slate-700 shrink-0" />
                        <span>
                          <strong>Cronómetro de Atención:</strong> Prospecto esperando respuesta hace{" "}
                          <span className="font-mono font-bold text-xs bg-white/90 px-1.5 py-0.5 rounded border border-black/10">
                            {sla.timeStr}
                          </span>{" "}
                          <span className="font-semibold text-[11px] opacity-90">({sla.label})</span>
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 hidden sm:inline font-medium">
                        Meta Speed-to-Lead: &lt; 5 minutos
                      </span>
                    </div>
                  );
                })()
              ) : (
                <div className="px-4 py-1.5 bg-slate-50 border-b border-[#EAECF0] flex items-center justify-between text-[11px] text-[#475467]">
                  <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Conversación al día (última respuesta tuya enviada)</span>
                  </div>
                  <span className="text-[10px] text-[#9C9890] hidden sm:inline">Esperando nuevo mensaje del prospecto</span>
                </div>
              )}

              {/* Historial de Mensajes / Chat Bubbles con Scroll */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F8F9FA]/40 relative">
                {loadingThread && activeConversation.messages.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[#9C9890]">
                    <Loader2 className="w-5 h-5 animate-spin text-amber-500" />
                    <span>Cargando historial de la conversación...</span>
                  </div>
                ) : (
                  activeConversation.messages.map((m) => {
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
                          className={`max-w-md sm:max-w-lg p-3 rounded-xl text-xs leading-relaxed shadow-2xs ${
                            isOutbound
                              ? "bg-[#0F172A] text-white rounded-br-xs"
                              : "bg-white text-[#101828] border border-[#EAECF0] rounded-bl-xs"
                          }`}
                        >
                          {renderMessageContent(m.body, isOutbound)}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Toast de Envío Exitoso */}
              {feedback && (
                <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{feedback}</span>
                </div>
              )}

              {/* Aviso preventivo: Ventana 24h de Meta */}
              {is24hExpired && !errorMessage && (
                <div className="px-4 py-2.5 bg-amber-50/90 border-t border-amber-200 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Ventana de 24h de Meta vencida:</strong> Las políticas de Meta exigen que el usuario vuelva a escribir primero.
                    </span>
                  </div>
                  {activeConversation.leadPhone && (
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://wa.me/${activeConversation.leadPhone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2.5 py-1 rounded-md transition-colors"
                      >
                        <SocialNetworkIcon type="whatsapp" size="xs" className="w-3.5 h-3.5" />
                        WhatsApp
                      </a>
                      <Link
                        href={`/messaging/sms?recipient=${encodeURIComponent(activeConversation.leadPhone)}${activeClientId !== "all" ? `&clientId=${encodeURIComponent(activeClientId)}` : ""}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-800 bg-blue-100 hover:bg-blue-200 px-2.5 py-1 rounded-md transition-colors"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        SMS
                      </Link>
                      <Link
                        href={`/messaging/calls?phone=${encodeURIComponent(activeConversation.leadPhone)}${activeClientId !== "all" ? `&clientId=${encodeURIComponent(activeClientId)}` : ""}`}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-1 rounded-md transition-colors"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        Llamar
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* Banner de Error / Ventana 24h de Meta */}
              {errorMessage && (
                <div className="px-4 py-3 bg-rose-50 border-t border-rose-200 text-xs text-rose-950 flex flex-col gap-2 animate-in fade-in">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-medium">{errorMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="text-rose-700 hover:text-rose-950 p-0.5 shrink-0"
                      title="Cerrar aviso"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {activeConversation.leadPhone &&
                    (errorMessage.includes("24 horas") ||
                      errorMessage.includes("Meta bloqueó") ||
                      errorMessage.includes("#10")) && (
                      <div className="flex items-center gap-2 pt-1 pl-6">
                        <span className="text-[11px] font-semibold text-rose-800">Canales alternativos:</span>
                        <a
                          href={`https://wa.me/${activeConversation.leadPhone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-2 py-0.5 rounded transition-colors"
                        >
                          <SocialNetworkIcon type="whatsapp" size="xs" className="w-3 h-3" />
                          Abrir WhatsApp
                        </a>
                        <Link
                          href={`/messaging/sms?recipient=${encodeURIComponent(activeConversation.leadPhone)}${activeClientId !== "all" ? `&clientId=${encodeURIComponent(activeClientId)}` : ""}`}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-blue-800 bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded transition-colors"
                        >
                          <MessageSquare className="w-3 h-3" />
                          Enviar SMS
                        </Link>
                        <Link
                          href={`/messaging/calls?phone=${encodeURIComponent(activeConversation.leadPhone)}${activeClientId !== "all" ? `&clientId=${encodeURIComponent(activeClientId)}` : ""}`}
                          className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded transition-colors"
                        >
                          <PhoneCall className="w-3 h-3" />
                          Llamar
                        </Link>
                      </div>
                    )}
                </div>
              )}

              {/* Composer: Cuadro de Respuesta */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-[#EAECF0] bg-white">
                {/* Previsualización del archivo adjunto */}
                {attachedFile && (
                  <div className="mb-2 p-2 rounded-lg bg-[#F8F9FA] border border-[#EAECF0] flex items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {attachedFile.isImage && attachedFile.previewUrl ? (
                        <img
                          src={attachedFile.previewUrl}
                          alt="Vista previa"
                          className="w-10 h-10 rounded-md object-cover border border-[#EAECF0] shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-amber-50 border border-amber-200 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5 text-amber-600" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-[#101828] truncate max-w-[240px]">
                          {attachedFile.fileName}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px]">
                          {attachedFile.uploading ? (
                            <span className="text-amber-600 flex items-center gap-1 font-medium">
                              <Loader2 className="w-3 h-3 animate-spin" /> Subiendo archivo...
                            </span>
                          ) : attachedFile.error ? (
                            <span className="text-rose-600 font-medium">{attachedFile.error}</span>
                          ) : (
                            <span className="text-emerald-600 flex items-center gap-1 font-medium">
                              <CheckCircle2 className="w-3 h-3" /> Listo para enviar ({Math.max(1, Math.round(attachedFile.fileSize / 1024))} KB)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeAttachedFile}
                      className="p-1.5 rounded-md text-[#9C9890] hover:text-[#101828] hover:bg-[#EAECF0] transition-colors shrink-0"
                      title="Quitar archivo adjunto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="text-[11px] text-[#667085] mb-1.5 flex items-center justify-between">
                  <span>
                    Respondiendo como <strong>{activeConversation.accountName || "Bunker Agency"}</strong> vía{" "}
                    <strong>{CHANNEL_CONFIG[activeConversation.channel]?.label}</strong>
                  </span>
                  <span className="text-[10px] text-[#9C9890]">Enter para enviar</span>
                </div>

                <div className="flex items-end gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sending || attachedFile?.uploading}
                    className="p-2.5 rounded-lg border border-[#EAECF0] bg-[#F8F9FA] hover:bg-[#EAECF0] text-[#667085] hover:text-[#101828] transition-colors h-[40px] shrink-0 flex items-center justify-center disabled:opacity-50"
                    title="Adjuntar fotografía o documento (PDF, Word, Excel, imagen)"
                  >
                    <Paperclip className="w-4 h-4 text-[#475467]" />
                  </button>

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
                    disabled={
                      sending ||
                      attachedFile?.uploading ||
                      (!replyText.trim() && !attachedFile?.uploadedUrl)
                    }
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
                Haz clic en cualquier mensaje de la lista izquierda para ver el historial y responder en tiempo real por WhatsApp, Messenger, Instagram, SMS o Comentarios.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
