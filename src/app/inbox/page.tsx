/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  Inbox,
  Search,
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
  MessageSquare,
  Paperclip,
  ExternalLink,
  Timer,
  Volume2,
  VolumeX,
  Bell,
  Sparkles,
  Calendar,
  Copy,
  Mic,
} from "lucide-react";
import { CreateAppointmentModal } from "@/components/appointments/CreateAppointmentModal";
import { SocialNetworkIcon } from "@/components/common/SocialNetworkIcon";
import { getLeadAvatarUrl } from "@/lib/avatar";
import SlidingTabs from "@/components/ui/SlidingTabs";
import ActionMenu, { type ActionMenuItem } from "@/components/ui/ActionMenu";
import { conversationMatchesChannel, mergeConversations } from "@/lib/inbox-merge";
import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { findUnattendedChats } from "@/lib/unattended-chats";
import { playAlarmClockSound } from "@/lib/alarm-sound";
import { UnattendedChatsAlert } from "@/components/inbox/UnattendedChatsAlert";
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
    badgeCls: "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    iconType: "whatsapp",
  },
  messenger: {
    label: "Facebook Messenger",
    badgeCls: "bg-blue-50 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    iconType: "facebook",
  },
  instagram: {
    label: "Instagram Direct",
    badgeCls: "bg-pink-50 dark:bg-pink-950/60 text-pink-800 dark:text-pink-300 border-pink-200 dark:border-pink-800",
    iconType: "instagram",
  },
  sms: {
    label: "Twilio SMS",
    badgeCls: "bg-purple-50 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    iconType: "sms",
  },
  facebook_comment: {
    label: "Comentario Facebook",
    badgeCls: "bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    iconType: "facebook",
  },
  instagram_comment: {
    label: "Comentario Instagram",
    badgeCls: "bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    iconType: "instagram",
  },
};

const QUICK_REPLIES = [
  { id: "greet", label: "👋 Saludo", text: "¡Hola! Gracias por comunicarte con nosotros. ¿En qué podemos apoyarte hoy?" },
  { id: "info", label: "📋 Info y Catálogo", text: "Con gusto te comparto nuestras opciones y promociones vigentes. ¿Qué servicio te interesa principalmente?" },
  { id: "call", label: "📅 Agendar Cita", text: "¿Te parece bien si agendamos una breve llamada o reunión para darte todos los detalles y resolver tus dudas?" },
  { id: "hours", label: "📍 Horarios y Ubicación", text: "Nuestras oficinas y canales de atención están disponibles de Lunes a Sábado de 9:00 AM a 6:00 PM." },
  { id: "follow", label: "🤝 Seguimiento", text: "¡Hola! Quería darte seguimiento a nuestra conversación anterior. ¿Tuviste oportunidad de revisar la propuesta?" },
];

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

  const resolvedAvatar = getLeadAvatarUrl(name, avatarUrl);

  return (
    <div className={`relative shrink-0 ${dimCls}`}>
      {resolvedAvatar && !imageError ? (
        <img
          src={resolvedAvatar}
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
  isAudio?: boolean;
  uploading: boolean;
  uploadedUrl?: string;
  fileName: string;
  fileSize: number;
  error?: string;
}

function isImageUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  const clean = lower.split("?")[0];
  if (/\.(jpe?g|png|webp|gif|svg|bmp)$/i.test(clean)) return true;
  if (
    lower.includes("fbsbx.com") ||
    lower.includes("fbcdn.net") ||
    lower.includes("cdninstagram.com") ||
    lower.includes("profilepic") ||
    lower.includes("randomuser.me/api/portraits")
  ) {
    return true;
  }
  return false;
}

function isAudioUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.split("?")[0].toLowerCase();
  return /\.(mp3|wav|ogg|m4a|aac|opus)$/i.test(clean);
}

function isRealPhoneNumber(phone?: string | null): boolean {
  if (!phone) return false;
  const clean = phone.trim();
  if (clean.startsWith("+")) return true;
  if (/[()\s-]/.test(clean)) return true;
  if (/^\d{13,}$/.test(clean)) return false;
  return /^\d{10,12}$/.test(clean);
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

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Ruta de las URLs temporales con las que Meta entrega los archivos de WhatsApp (caducan y exigen token). */
const WHATSAPP_TEMP_MEDIA_PATH = "whatsapp_business/attachments";

function renderMessageContent(body: string, isOutbound: boolean) {
  if (!body) return null;

  // Detectar URLs en el cuerpo del mensaje
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = body.split(urlRegex);

  return (
    <div className="space-y-2">
      {parts.map((part, idx) => {
        if (/^https?:\/\/[^\s]+$/i.test(part)) {
          // Enlaces temporales de Meta guardados antes de copiar los archivos a nuestro almacenamiento: ya caducaron.
          if (part.includes(WHATSAPP_TEMP_MEDIA_PATH)) {
            return (
              <p key={idx} className="text-[11px] italic opacity-70">
                Archivo no disponible
              </p>
            );
          }
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

          const isAud = isAudioUrl(part);
          if (isAud) {
            return (
              <div key={idx} className="my-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-lg">
                <audio controls src={part} className="w-full max-w-xs h-8" preload="metadata" />
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
              className={`flex items-center gap-2.5 p-2.5 rounded-lg border text-xs font-medium transition my-1 max-w-full overflow-hidden ${isOutbound
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

const NO_BRAND_LABEL = "Sin marca";
const UNATTENDED_REMINDER_MS = 5 * 60 * 1000;
const UNATTENDED_SILENCE_MS = 10 * 60 * 1000;

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
  // Con una búsqueda activa solo se muestran los chats que respondió el servidor; el resto sigue guardado, sin perderse.
  const [searchMatchIds, setSearchMatchIds] = useState<Set<string> | null>(null);
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
  const [activeChannel, setActiveChannel] = useState<string>(() => searchParams.get("channel") || "all");
  const activeClientId = isClient ? (user?.clientId ?? "all") : (searchParams.get("clientId") ?? "all");
  // Con marca activa la API devuelve todas las marcas y asesores de la organización: aquí se recortan a la activa.
  const visibleClients = useMemo(
    () => (activeClientId === "all" ? clients : clients.filter((c) => c.id === activeClientId)),
    [clients, activeClientId]
  );
  const visibleAdvisors = useMemo(
    () => (activeClientId === "all" ? advisors : advisors.filter((a) => !a.clientId || a.clientId === activeClientId)),
    [advisors, activeClientId]
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const ch = searchParams.get("channel");
    if (ch) setActiveChannel(ch);
  }, [searchParams]);

  // Respuestas
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const voice = useVoiceRecorder();
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
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
    setSearchMatchIds(null);
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
          // Se fusiona con lo ya cargado: cambiar de pestaña no borra los chats, solo suma los nuevos.
          setConversations((prev) => mergeConversations(prev, newConvs));
          setSearchMatchIds(debouncedSearch ? new Set(newConvs.map((c) => c.id)) : null);

          if (json.stats) setStats(json.stats);
          if (json.clients) setClients(json.clients);
          if (json.advisors) setAdvisors(json.advisors);
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

  // La pestaña solo filtra lo que ya está en memoria: cambiar de canal es instantáneo y no vuelve a pedir nada.
  // En la vista de todas las marcas los chats se agrupan por marca (cada grupo conserva el orden por reciente), para que no se mezclen.
  const groupByBrand = !isClient && activeClientId === "all";
  const activeConversations = useMemo(() => {
    const visible = conversations.filter(
      (c) => conversationMatchesChannel(c.channel, activeChannel) && (!searchMatchIds || searchMatchIds.has(c.id))
    );
    if (!groupByBrand) return visible;
    const brandOf = (c: ConversationItem) => c.clientName || NO_BRAND_LABEL;
    return [...visible].sort((a, b) => brandOf(a).localeCompare(brandOf(b), "es"));
  }, [conversations, activeChannel, searchMatchIds, groupByBrand]);

  const activeConversation = useMemo(() => {
    return activeConversations.find((c) => c.id === selectedConvId) || activeConversations[0] || null;
  }, [activeConversations, selectedConvId]);

  // Fija la selección: sin esto, el chat abierto sería "el primero de la lista" y saltaría a otro cuando entra
  // un mensaje nuevo en otra conversación, justo mientras se escribe o se graba una respuesta.
  useEffect(() => {
    if (activeConversations.length > 0 && !activeConversations.some((c) => c.id === selectedConvId)) {
      setSelectedConvId(activeConversations[0].id);
    }
  }, [activeConversations, selectedConvId]);

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
    }).catch(() => { });
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
      }).catch(() => { });
    }
  }, []);

  // Una grabación a medias no debe terminar enviándose a otra persona al cambiar de chat.
  useEffect(() => {
    voice.cancel();
  }, [convId, voice.cancel]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const handleUpdateLeadStatus = async (leadId: string, newStatus: string) => {
    if (!activeConversation || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setConversations((prev) =>
          prev.map((c) => (c.leadId === leadId ? { ...c, leadStatus: newStatus } : c))
        );
        setFeedback("Estado comercial del prospecto actualizado.");
        setTimeout(() => setFeedback(null), 3000);
      } else {
        setErrorMessage(data.error || "No se pudo actualizar el estado del prospecto.");
      }
    } catch {
      setErrorMessage("Error de conexión al actualizar estado comercial.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleCopyTranscript = () => {
    if (!activeConversation?.messages?.length) return;
    const lines = activeConversation.messages
      .map(
        (m) =>
          `[${new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}] ${m.senderName}: ${m.body}`
      )
      .join("\n");
    navigator.clipboard.writeText(lines);
    setFeedback("Historial copiado al portapapeles.");
    setTimeout(() => setFeedback(null), 3000);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConversation?.messages]);

  // Acciones secundarias de la cabecera del chat. "Abrir en WhatsApp" solo se ofrece en los demás canales:
  // en una conversación de WhatsApp ya estás dentro de ella.
  const headerMenuItems: ActionMenuItem[] = [];
  if (activeConversation) {
    if (activeConversation.leadId) {
      headerMenuItems.push({
        key: "lead",
        label: "Ver expediente del prospecto",
        icon: UserCheck,
        href: `/crm/leads/${activeConversation.leadId}`,
      });
    }
    if (activeConversation.clientId) {
      headerMenuItems.push({
        key: "client",
        label: "Ver ficha de la empresa",
        icon: Building,
        href: `/crm/clients/${activeConversation.clientId}`,
      });
    }
    if (activeConversation.channel !== "whatsapp" && isRealPhoneNumber(activeConversation.leadPhone)) {
      headerMenuItems.push({
        key: "whatsapp",
        label: "Abrir en WhatsApp",
        icon: ExternalLink,
        href: `https://wa.me/${activeConversation.leadPhone!.replace(/\D/g, "")}`,
        external: true,
      });
    }
    headerMenuItems.push({ key: "copy", label: "Copiar historial del chat", icon: Copy, onSelect: handleCopyTranscript });
  }

  const attachFile = async (file: File) => {
    const isImg = file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name);
    const isAud = file.type.startsWith("audio/");
    // La vista previa local deja revisar la foto o escuchar la nota de voz antes de enviarla.
    const localPreview = isImg || isAud ? URL.createObjectURL(file) : undefined;

    setAttachedFile({
      file,
      previewUrl: localPreview,
      isImage: isImg,
      isAudio: isAud,
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) void attachFile(file);
  };

  const handleStopRecording = async () => {
    const file = await voice.stop();
    if (file) await attachFile(file);
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

  // Aviso de chats sin atender: reloj de caricatura abajo a la derecha, con sonido al aparecer, cuando entra uno nuevo y como recordatorio.
  const unattended = useMemo(() => findUnattendedChats(conversations, now), [conversations, now]);
  const [silencedUntil, setSilencedUntil] = useState(0);
  const alertedIdsRef = useRef<Set<string>>(new Set());
  const lastAlarmAtRef = useRef(0);
  const alertVisible = unattended.length > 0 && now >= silencedUntil;

  useEffect(() => {
    if (!alertVisible) {
      alertedIdsRef.current = new Set();
      lastAlarmAtRef.current = 0;
      return;
    }
    const hasNewChat = unattended.some((chat) => !alertedIdsRef.current.has(chat.id));
    const reminderDue = now - lastAlarmAtRef.current >= UNATTENDED_REMINDER_MS;
    alertedIdsRef.current = new Set(unattended.map((chat) => chat.id));
    if (!hasNewChat && !reminderDue) return;
    lastAlarmAtRef.current = now;
    if (soundEnabled) playAlarmClockSound();
  }, [alertVisible, unattended, now, soundEnabled]);

  const openOldestUnattended = () => {
    if (unattended.length === 0) return;
    setActiveChannel("all");
    setSelectedConvId(unattended[0].id);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {alertVisible && (
        <UnattendedChatsAlert
          chats={unattended}
          onOpenOldest={openOldestUnattended}
          onSilence={() => setSilencedUntil(Date.now() + UNATTENDED_SILENCE_MS)}
        />
      )}
      {/* Header Estilo Cápsula Orvion */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold text-[#121417] dark:text-white tracking-tight leading-tight flex items-center gap-2.5">
            <Inbox className="w-7 h-7 text-amber-500 shrink-0" />
            <span>Bandeja de Entrada</span>
          </h1>
          <p className="text-xs text-[#8C929D] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs animate-pulse" />
            <span>
              Atención unificada de WhatsApp, Instagram Direct, Facebook Messenger y SMS en tiempo real.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botón de Alertas Sonoras */}
          <button
            type="button"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`px-3.5 py-1.5 rounded-full border text-xs transition-all shadow-orvion flex items-center gap-1.5 font-semibold cursor-pointer ${soundEnabled
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/50"
                : "bg-white dark:bg-[#121417] text-[#8C929D] border-[#E2E5EB] dark:border-[#1F242D] hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229]"
              }`}
            title={
              soundEnabled
                ? "Alertas sonoras activas al llegar mensajes (clic para silenciar)"
                : "Silenciado (clic para activar sonido)"
            }
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-amber-500" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-[#8C929D]" />
            )}
            <span className="hidden sm:inline">{soundEnabled ? "Sonido Activo" : "Silenciado"}</span>
          </button>

          {/* Botón para solicitar Notificaciones de Escritorio */}
          {!hasNotificationPermission && (
            <button
              type="button"
              onClick={handleRequestNotificationPermission}
              className="px-3.5 py-1.5 rounded-full bg-[#121417] dark:bg-white text-white dark:text-[#121417] hover:bg-black dark:hover:bg-[#F3F4F7] text-xs font-bold shadow-orvion flex items-center gap-1.5 transition-all cursor-pointer"
              title="Recibir notificaciones de escritorio cuando lleguen mensajes nuevos"
            >
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Notificaciones</span>
            </button>
          )}

          <button
            onClick={() => fetchInbox(false, true)}
            disabled={loading}
            className="w-9 h-9 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] text-[#121417] dark:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229] transition-all shadow-orvion flex items-center justify-center cursor-pointer disabled:opacity-50"
            title="Refrescar y sincronizar conversaciones de redes sociales"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
        </div>
      </div>

      {/* Barra de Filtros de Canales & Selector de Clientes */}
      <div className="p-2 bg-white dark:bg-[#121417] rounded-[22px] border border-[#E2E5EB] dark:border-[#1F242D] flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 shadow-orvion">
        {/* Tabs de Canales */}
        <SlidingTabs
          ariaLabel="Filtrar conversaciones por canal"
          className="pb-1 lg:pb-0"
          value={activeChannel}
          onChange={(channel) => {
            if (channel === activeChannel) return;
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
        {!isClient && visibleClients.length > 1 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F8F9FA] dark:bg-[#1A1D24] rounded-full border border-[#E2E5EB] dark:border-[#2A2E37] self-end lg:self-auto shrink-0 shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
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
              className="bg-transparent text-xs text-[#121417] dark:text-white font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="dark:bg-[#1A1D24]">Todas las Marcas</option>
              {visibleClients.map((c) => (
                <option key={c.id} value={c.id} className="dark:bg-[#1A1D24]">
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
        <div className="lg:col-span-4 bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion flex flex-col overflow-hidden">
          {/* Buscador de Chats en Servidor */}
          <div className="p-3 border-b border-[#E2E5EB] dark:border-[#1F242D]">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8C929D] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar prospecto, mensaje o teléfono..."
                className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full pl-9 pr-3.5 py-2 text-xs text-[#121417] dark:text-white placeholder-[#8C929D] focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-[#121417] transition-all"
              />
            </div>
          </div>

          {/* Lista de Conversaciones con Scroll */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#E2E5EB] dark:divide-[#1F242D]">
            {loading && activeConversations.length === 0 ? (
              <div className="py-12 text-center text-[#8C929D] text-xs flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
                <span className="font-medium">Cargando conversaciones...</span>
              </div>
            ) : activeConversations.length === 0 ? (
              <div className="py-12 text-center text-[#8C929D] text-xs p-6 space-y-3">
                <Inbox className="w-10 h-10 text-[#CBD5E1] dark:text-[#334155] mx-auto" />
                <p className="font-bold text-sm text-[#121417] dark:text-white">Bandeja vacía</p>
                <p className="text-[11px] text-[#8C929D]">
                  No se encontraron mensajes en este canal o filtro seleccionado.
                </p>
                <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
                  <button
                    onClick={() => fetchInbox(false, true)}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-[#1E2229] border border-[#E2E5EB] dark:border-[#2A2E37] text-[#121417] dark:text-white text-xs font-semibold hover:bg-[#F3F4F7] transition-all shadow-xs cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                    <span>Sincronizar</span>
                  </button>
                </div>
              </div>
            ) : (
              activeConversations.map((conv, index) => {
                const isSelected = activeConversation?.id === conv.id;
                const brand = conv.clientName || NO_BRAND_LABEL;
                const startsBrand = groupByBrand && (index === 0 || brand !== (activeConversations[index - 1].clientName || NO_BRAND_LABEL));
                return (
                  <React.Fragment key={conv.id}>
                  {startsBrand && (
                    <div className="sticky top-0 z-10 px-4 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-[#1A1710] border-y border-amber-100 dark:border-amber-900/40">
                      {brand}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedConvId(conv.id);
                      if (conv.unreadCount > 0) {
                        markAsRead(conv);
                      }
                    }}
                    className={`w-full p-3.5 text-left transition-all flex items-start gap-3 relative cursor-pointer ${isSelected
                        ? "bg-[#F8F9FA] dark:bg-[#1A1D24] border-l-4 border-l-amber-500"
                        : "hover:bg-[#F8F9FA]/80 dark:hover:bg-[#1A1D24]/60"
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
                        <span className="font-bold text-xs text-[#121417] dark:text-white truncate">
                          {conv.senderName}
                        </span>
                        <span className="text-[10px] text-[#8C929D] shrink-0 font-medium">
                          {formatTimeAgo(conv.lastMessageTime)}
                        </span>
                      </div>

                      {/* Snippet de último mensaje */}
                      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] line-clamp-1 leading-normal mt-0.5">
                        {conv.lastMessageText}
                      </p>

                      {/* Una sola línea de estado: espera/respondido a la izquierda, asesor (y marca) a la derecha.
                          El canal ya se ve en el ícono del avatar, así que no se repite como etiqueta. */}
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        {conv.waitingForReply && conv.lastInboundTime ? (
                          (() => {
                            const sla = formatSlaTimer(conv.lastInboundTime, now);
                            return (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold border shrink-0 ${sla.badgeCls}`}
                                title={`Tiempo de espera del cliente: ${sla.timeStr} (${sla.label})`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${sla.dotCls}`} />
                                <Timer className="w-2.5 h-2.5 shrink-0" />
                                <span>{sla.timeStr}</span>
                              </span>
                            );
                          })()
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 dark:text-emerald-400 font-semibold shrink-0">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            <span>Respondido</span>
                          </span>
                        )}
                        <span className="text-[10px] text-[#8C929D] truncate min-w-0">
                          {[!isClient && activeClientId === "all" ? conv.clientName : null, conv.assignedAdvisorName || "Sin asignar"]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </div>
                    </div>

                    {conv.unreadCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-2" title="No leído" />
                    )}
                  </button>
                  </React.Fragment>
                );
              })
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMNA DERECHA: CONVERSACIÓN & COMPOSER (8 cols)        */}
        {/* ========================================================= */}
        <div className="lg:col-span-8 bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion flex flex-col overflow-hidden">
          {activeConversation ? (
            <>
              {/* Header Unificado, Limpio y Libre de Sobrecarga Visual */}
              <div className="px-4 py-3 border-b border-[#E2E5EB] dark:border-[#1F242D] bg-white dark:bg-[#121417] flex flex-wrap items-center justify-between gap-3">
                {/* Lado Izquierdo: Avatar, Nombre, Canal, Empresa y Cronómetro SLA */}
                <div className="flex items-center gap-3 min-w-0">
                  <ContactAvatar
                    name={activeConversation.senderName}
                    avatarUrl={activeConversation.senderAvatar}
                    channel={activeConversation.channel}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-extrabold text-sm text-[#121417] dark:text-white truncate">
                        {activeConversation.senderName}
                      </h2>
                      {activeConversation.waitingForReply && activeConversation.lastInboundTime && (
                        (() => {
                          const sla = formatSlaTimer(activeConversation.lastInboundTime, now);
                          return (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${sla.badgeCls}`}
                              title={`Tiempo de espera del cliente: ${sla.timeStr} (${sla.label})`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${sla.dotCls}`} />
                              <Timer className="w-3 h-3 shrink-0" />
                              <span>{sla.timeStr}</span>
                            </span>
                          );
                        })()
                      )}
                    </div>

                    {/* Teléfono y empresa como texto: son datos de contexto, no acciones. */}
                    <p className="text-[11px] text-[#8C929D] mt-0.5 truncate">
                      {[
                        isRealPhoneNumber(activeConversation.leadPhone) ? activeConversation.leadPhone : null,
                        !isClient && activeClientId === "all" ? activeConversation.clientName : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>

                {/* Lado Derecho: Asignación Comercial y Acciones Integradas */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Selector Compacto de Asesor */}
                  <div className="flex items-center gap-1.5 bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-2.5 py-1 text-xs">
                    <Users className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <select
                      value={activeConversation.assignedAdvisorId ?? ""}
                      disabled={assigning}
                      onChange={(e) => handleAssignAdvisor(e.target.value ? e.target.value : null)}
                      className="bg-transparent text-xs text-[#121417] dark:text-white font-semibold focus:outline-none cursor-pointer pr-1"
                    >
                      <option value="" className="dark:bg-[#121417]">Sin asignar</option>
                      {visibleAdvisors.map((adv) => (
                        <option key={adv.id} value={adv.id} className="dark:bg-[#121417]">
                          {adv.name} {user?.id === adv.id ? "(Tú)" : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selector Rápido de Estado Comercial del Lead */}
                  {activeConversation.leadId && (
                    <div className="flex items-center gap-1.5 bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-2.5 py-1 text-xs">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          (activeConversation.leadStatus || "new") === "new"
                            ? "bg-slate-400"
                            : activeConversation.leadStatus === "contacted"
                            ? "bg-blue-500"
                            : activeConversation.leadStatus === "qualified"
                            ? "bg-emerald-500"
                            : activeConversation.leadStatus === "converted"
                            ? "bg-amber-500"
                            : "bg-rose-500"
                        }`}
                      />
                      <select
                        value={activeConversation.leadStatus || "new"}
                        disabled={updatingStatus}
                        onChange={(e) => handleUpdateLeadStatus(activeConversation.leadId!, e.target.value)}
                        className="bg-transparent text-xs text-[#121417] dark:text-white font-semibold focus:outline-none cursor-pointer pr-1"
                        title="Cambiar estado del prospecto en el CRM"
                      >
                        <option value="new" className="dark:bg-[#121417]">Nuevo</option>
                        <option value="contacted" className="dark:bg-[#121417]">Contactado</option>
                        <option value="qualified" className="dark:bg-[#121417]">Calificado</option>
                        <option value="lost" className="dark:bg-[#121417]">Perdido</option>
                      </select>
                    </div>
                  )}

                  {user && !activeConversation.assignedAdvisorId && (
                    <button
                      type="button"
                      disabled={assigning}
                      onClick={() => handleAssignAdvisor(user.id)}
                      className="px-2.5 py-1 rounded-full bg-white dark:bg-[#121417] hover:bg-[#F8F9FA] text-[#121417] dark:text-white border border-[#E2E5EB] dark:border-[#2A2E37] font-bold text-xs flex items-center gap-1 shadow-2xs cursor-pointer"
                      title="Asignarme este chat"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-amber-500" />
                      <span>Tomar</span>
                    </button>
                  )}

                  {/* Acciones secundarias agrupadas en un solo menú */}
                  <ActionMenu items={headerMenuItems} />
                </div>
              </div>

              {/* Contexto de Publicación si es un Comentario Público */}
              {activeConversation.postContext && (
                <div className="px-4 py-1.5 bg-amber-50/60 dark:bg-amber-950/30 border-b border-amber-200/50 dark:border-amber-800/30 flex items-center justify-between text-xs text-amber-950 dark:text-amber-200">
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="font-semibold shrink-0">Comentario:</span>
                    <span className="truncate italic">&ldquo;{activeConversation.postContext.postTitle}&rdquo;</span>
                  </div>
                  <span className="text-[10px] bg-white dark:bg-[#121417] px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-700 font-mono shrink-0 ml-2">
                    ID: {activeConversation.postContext.postId}
                  </span>
                </div>
              )}

              {/* Historial de Mensajes / Chat Bubbles con Scroll */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F8F9FA]/60 dark:bg-[#0E1013]/60 relative">
                {loadingThread && activeConversation.messages.length === 0 ? (
                  <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-[#8C929D]">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
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
                        <div className="text-[10px] text-[#8C929D] mb-1 px-1 font-semibold">
                          {m.senderName} • {formatTimeAgo(m.createdAt)}
                        </div>
                        <div
                          className={`max-w-md sm:max-w-lg p-3.5 text-xs leading-relaxed shadow-orvion ${isOutbound
                              ? "bg-[#121417] dark:bg-white text-white dark:text-[#121417] rounded-[22px] rounded-br-xs"
                              : "bg-white dark:bg-[#1A1D24] text-[#121417] dark:text-white border border-[#E2E5EB] dark:border-[#2A2E37] rounded-[22px] rounded-bl-xs"
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
                <div className="px-4 py-2 bg-emerald-50 dark:bg-emerald-950/40 border-t border-emerald-200 dark:border-emerald-800/50 text-xs font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>{feedback}</span>
                </div>
              )}

              {/* Aviso preventivo: Ventana 24h de Meta */}
              {is24hExpired && !errorMessage && (
                <div className="px-4 py-2 bg-amber-500/10 dark:bg-amber-500/5 border-t border-amber-500/20 text-xs text-amber-900 dark:text-amber-200 flex flex-wrap items-center justify-between gap-2 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>
                      <strong>Ventana de 24h de Meta vencida:</strong> El usuario debe escribir para reanudar el chat directo.
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isRealPhoneNumber(activeConversation.leadPhone) && (
                      <>
                        <a
                          href={`https://wa.me/${activeConversation.leadPhone!.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 hover:bg-emerald-200 px-2.5 py-0.5 rounded-full transition-all"
                        >
                          <SocialNetworkIcon type="whatsapp" size="xs" className="w-3 h-3" />
                          WhatsApp
                        </a>
                        <Link
                          href={`/messaging/sms?recipient=${encodeURIComponent(activeConversation.leadPhone!)}${activeClientId !== "all" ? `&clientId=${encodeURIComponent(activeClientId)}` : ""}`}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-950/60 hover:bg-blue-200 px-2.5 py-0.5 rounded-full transition-all"
                        >
                          <MessageSquare className="w-3 h-3" />
                          SMS
                        </Link>
                      </>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsBookingModalOpen(true)}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-900 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/50 hover:bg-amber-200 px-2.5 py-0.5 rounded-full transition-all cursor-pointer"
                    >
                      <Calendar className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      Agendar Cita
                    </button>
                  </div>
                </div>
              )}

              {/* Banner de Error / Ventana 24h de Meta */}
              {errorMessage && (
                <div className="px-4 py-2.5 bg-rose-50 dark:bg-rose-950/40 border-t border-rose-200 dark:border-rose-900/50 text-xs text-rose-950 dark:text-rose-200 flex flex-col gap-1.5 animate-in fade-in">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                      <span className="leading-relaxed font-semibold">{errorMessage}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setErrorMessage(null)}
                      className="text-rose-700 dark:text-rose-400 hover:text-rose-950 p-0.5 shrink-0 cursor-pointer"
                      title="Cerrar aviso"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {isRealPhoneNumber(activeConversation.leadPhone) &&
                    (errorMessage.includes("24 horas") ||
                      errorMessage.includes("Meta bloqueó") ||
                      errorMessage.includes("#10")) && (
                      <div className="flex items-center gap-2 pt-0.5 pl-6">
                        <span className="text-[11px] font-bold text-rose-800 dark:text-rose-300">Canales alternativos:</span>
                        <a
                          href={`https://wa.me/${activeConversation.leadPhone!.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/50 hover:bg-emerald-200 px-2.5 py-0.5 rounded-full transition-all"
                        >
                          <SocialNetworkIcon type="whatsapp" size="xs" className="w-3 h-3" />
                          WhatsApp
                        </a>
                        <Link
                          href={`/messaging/sms?recipient=${encodeURIComponent(activeConversation.leadPhone!)}${activeClientId !== "all" ? `&clientId=${encodeURIComponent(activeClientId)}` : ""}`}
                          className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-800 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 hover:bg-blue-200 px-2.5 py-0.5 rounded-full transition-all"
                        >
                          <MessageSquare className="w-3 h-3" />
                          SMS
                        </Link>
                      </div>
                    )}
                </div>
              )}

              {/* Composer: Cuadro de Respuesta */}
              <form onSubmit={handleSendReply} className="p-3 border-t border-[#E2E5EB] dark:border-[#1F242D] bg-white dark:bg-[#121417]">
                {/* Barra de grabación de nota de voz */}
                {voice.state !== "idle" && (
                  <div className="mb-2 p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
                      {voice.state === "recording" ? (
                        <>
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                          <span>Grabando {formatDuration(voice.seconds)}</span>
                        </>
                      ) : (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Preparando la nota de voz...</span>
                        </>
                      )}
                    </div>
                    {voice.state === "recording" && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={voice.cancel}
                          className="px-3 py-1 rounded-full text-xs font-semibold text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleStopRecording}
                          className="px-3.5 py-1 rounded-full text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors cursor-pointer"
                        >
                          Listo
                        </button>
                      </div>
                    )}
                  </div>
                )}
                {voice.error && <p className="mb-2 text-[11px] text-rose-600 font-semibold">{voice.error}</p>}

                {/* Previsualización del archivo adjunto */}
                {attachedFile && (
                  <div className="mb-2 p-2 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] flex items-center justify-between gap-3 animate-in fade-in">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {attachedFile.isImage && attachedFile.previewUrl ? (
                        <img
                          src={attachedFile.previewUrl}
                          alt="Vista previa"
                          className="w-10 h-10 rounded-xl object-cover border border-[#E2E5EB] dark:border-[#2A2E37] shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center shrink-0">
                          {attachedFile.isAudio ? (
                            <Mic className="w-5 h-5 text-amber-500" />
                          ) : (
                            <FileText className="w-5 h-5 text-amber-500" />
                          )}
                        </div>
                      )}
                      <div className="min-w-0">
                        {attachedFile.isAudio && attachedFile.previewUrl ? (
                          <audio controls src={attachedFile.previewUrl} className="h-8 max-w-[260px]" preload="metadata" />
                        ) : (
                          <p className="text-xs font-bold text-[#121417] dark:text-white truncate max-w-[240px]">
                            {attachedFile.fileName}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5 text-[10px]">
                          {attachedFile.uploading ? (
                            <span className="text-amber-500 flex items-center gap-1 font-semibold">
                              <Loader2 className="w-3 h-3 animate-spin" /> Subiendo archivo...
                            </span>
                          ) : attachedFile.error ? (
                            <span className="text-rose-600 font-semibold">{attachedFile.error}</span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-semibold">
                              <CheckCircle2 className="w-3 h-3" /> Listo para enviar ({Math.max(1, Math.round(attachedFile.fileSize / 1024))} KB)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeAttachedFile}
                      className="p-1.5 rounded-full text-[#8C929D] hover:text-[#121417] dark:hover:text-white hover:bg-[#E2E5EB] dark:hover:bg-[#2A2E37] transition-all shrink-0 cursor-pointer"
                      title="Quitar archivo adjunto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <div className="text-[10px] text-[#8C929D] mb-1.5 text-right font-medium">Enter para enviar</div>

                {/* Plantillas de Respuestas Rápidas Comerciales */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none text-[11px]">
                  <span className="text-[10px] font-bold text-[#8C929D] shrink-0 flex items-center gap-1 pl-0.5">
                    <Sparkles className="w-3 h-3 text-amber-500" /> Rápidas:
                  </span>
                  {QUICK_REPLIES.map((qr) => (
                    <button
                      key={qr.id}
                      type="button"
                      onClick={() => setReplyText((prev) => (prev ? `${prev} ${qr.text}` : qr.text))}
                      className="px-2.5 py-0.5 rounded-full bg-[#F3F4F7] dark:bg-[#1A1D24] hover:bg-amber-50 dark:hover:bg-amber-950/40 text-[#475467] dark:text-slate-300 hover:text-amber-900 dark:hover:text-amber-300 border border-[#E2E5EB] dark:border-[#2A2E37] hover:border-amber-400 shrink-0 font-medium transition-all cursor-pointer shadow-2xs"
                      title={qr.text}
                    >
                      {qr.label}
                    </button>
                  ))}
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
                    className="p-2.5 rounded-full border border-[#E2E5EB] dark:border-[#2A2E37] bg-[#F8F9FA] dark:bg-[#1A1D24] hover:bg-[#E2E5EB] dark:hover:bg-[#2A2E37] text-[#64748B] dark:text-[#94A3B8] hover:text-[#121417] dark:hover:text-white transition-all h-[40px] w-[40px] shrink-0 flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-2xs"
                    title="Adjuntar fotografía o documento (PDF, Word, Excel, imagen)"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  {/* Nota de voz: solo en WhatsApp; los demás canales no la admiten desde aquí. */}
                  {activeConversation.channel === "whatsapp" && (
                    <button
                      type="button"
                      onClick={voice.start}
                      disabled={sending || voice.state !== "idle" || Boolean(attachedFile)}
                      className="p-2.5 rounded-full border border-[#E2E5EB] dark:border-[#2A2E37] bg-[#F8F9FA] dark:bg-[#1A1D24] hover:bg-[#E2E5EB] dark:hover:bg-[#2A2E37] text-[#64748B] dark:text-[#94A3B8] hover:text-[#121417] dark:hover:text-white transition-all h-[40px] w-[40px] shrink-0 flex items-center justify-center disabled:opacity-50 cursor-pointer shadow-2xs"
                      title="Grabar una nota de voz"
                    >
                      <Mic className="w-4 h-4" />
                    </button>
                  )}

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
                    className="flex-1 bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-2xl p-2.5 text-xs text-[#121417] dark:text-white placeholder-[#8C929D] focus:outline-none focus:border-amber-500 focus:bg-white dark:focus:bg-[#121417] resize-none transition-all"
                  />

                  <button
                    type="submit"
                    disabled={
                      sending ||
                      voice.state !== "idle" ||
                      attachedFile?.uploading ||
                      (!replyText.trim() && !attachedFile?.uploadedUrl)
                    }
                    className="btn-black-gold rounded-full px-5 py-2 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 transition-all h-[40px] shrink-0 shadow-orvion cursor-pointer"
                  >
                    <Send className={`w-3.5 h-3.5 text-amber-400 ${sending ? "animate-pulse" : ""}`} />
                    <span>{sending ? "Enviando..." : "Enviar"}</span>
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#8C929D] space-y-3">
              <Inbox className="w-12 h-12 text-[#CBD5E1] dark:text-[#334155]" />
              <h3 className="font-extrabold text-sm text-[#121417] dark:text-white">Selecciona una conversación</h3>
              <p className="text-xs text-[#8C929D] max-w-sm">
                Haz clic en cualquier mensaje de la lista izquierda para ver el historial y responder en tiempo real por WhatsApp, Messenger, Instagram, SMS o Comentarios.
              </p>
            </div>
          )}
        </div>
      </div>

      {activeConversation && (
        <CreateAppointmentModal
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
          initialLeadId={activeConversation.leadId || undefined}
          initialLeadName={activeConversation.senderName}
          initialLeadPhone={activeConversation.leadPhone || undefined}
          initialClientId={activeConversation.clientId || undefined}
          onSubmit={async (input) => {
            const res = await fetch("/api/appointments", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(input),
            });
            const data = await res.json();
            if (data.success) {
              setFeedback("✅ ¡Cita agendada con éxito!");
              setTimeout(() => setFeedback(null), 4000);
            }
            return data;
          }}
        />
      )}
    </div>
  );
}
