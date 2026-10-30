"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Share2,
  Plus,
  RefreshCw,
  Clock,
  CheckCircle2,
  Trash2,
  X,
  Image as ImageIcon,
  Send,
  Eye,
  Heart,
  MessageCircle,
} from "lucide-react";
import { SocialNetworkIcon } from "@/components/common/SocialNetworkIcon";
import { useClientOptions } from "@/hooks/useClientOptions";

interface SocialPostItem {
  id: string;
  content: string;
  mediaUrlsJson?: string | null;
  platformsJson?: string | null;
  scheduledFor?: string | null;
  publishedAt?: string | null;
  status: "draft" | "scheduled" | "in_progress" | "published" | "failed";
  errorMessage?: string | null;
  createdAt: string;
  connectedAccount?: {
    id: string;
    accountName: string;
    accountType: string;
    status: string;
  } | null;
}

interface ConnectedAccountOption {
  id: string;
  accountName: string;
  accountType: string;
  provider: string;
  clientId?: string | null;
}

export default function PostsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[#667085]">Cargando publicaciones...</div>}>
      <PostsPageContent />
    </Suspense>
  );
}

function PostsPageContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const clients = useClientOptions();
  const activeClient = clientId && clientId !== "all" ? clients.find((c) => c.id === clientId) : null;

  const [posts, setPosts] = useState<SocialPostItem[]>([]);
  const [accounts, setAccounts] = useState<ConnectedAccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Modal de Crear Publicación
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [content, setContent] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "facebook"]);
  const [mediaUrl, setMediaUrl] = useState("");
  const [scheduleType, setScheduleType] = useState<"now" | "schedule">("now");
  const [scheduledDateTime, setScheduledDateTime] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (clientId && clientId !== "all") params.set("clientId", clientId);
      const url = params.toString() ? `/api/posts?${params.toString()}` : "/api/posts";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setPosts(json.posts || []);
      } else {
        setError(json.error || "Error al cargar publicaciones.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, clientId]);

  const fetchAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations");
      const json = await res.json();
      if (json.success && Array.isArray(json.integrations)) {
        interface RawAccount {
          id: string;
          accountName: string;
          accountType?: string;
          clientId?: string | null;
        }
        interface RawIntegration {
          provider: string;
          connectedAccounts?: RawAccount[];
        }
        const accs: ConnectedAccountOption[] = [];
        (json.integrations as RawIntegration[]).forEach((it) => {
          (it.connectedAccounts || []).forEach((acc) => {
            if (
              acc.accountType === "facebook_page" ||
              acc.accountType === "instagram_business" ||
              acc.accountType?.includes("tiktok")
            ) {
              accs.push({
                id: acc.id,
                accountName: acc.accountName,
                accountType: acc.accountType,
                provider: it.provider,
                clientId: acc.clientId,
              });
            }
          });
        });
        setAccounts(accs);
        if (accs.length > 0 && !selectedAccountId) {
          setSelectedAccountId(accs[0].id);
        }
      }
    } catch (err) {
      console.error("Error al cargar cuentas sociales:", err);
    }
  }, [selectedAccountId]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleTogglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setSubmitting(true);
    try {
      const payload: {
        content: string;
        platforms: string[];
        connectedAccountId?: string;
        mediaUrl?: string;
        publishNow: boolean;
        scheduledFor?: string;
      } = {
        content: content.trim(),
        platforms: selectedPlatforms,
        connectedAccountId: selectedAccountId || undefined,
        mediaUrl: mediaUrl.trim() || undefined,
        publishNow: scheduleType === "now",
      };

      if (scheduleType === "schedule" && scheduledDateTime) {
        payload.scheduledFor = new Date(scheduledDateTime).toISOString();
      }

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        setContent("");
        setMediaUrl("");
        setScheduleType("now");
        setScheduledDateTime("");
        setFeedback("¡Publicación registrada con éxito!");
        setTimeout(() => setFeedback(null), 3500);
        fetchPosts();
      } else {
        alert(json.error || "No se pudo registrar la publicación.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al guardar publicación.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta publicación?")) return;
    try {
      const res = await fetch(`/api/posts?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert(json.error || "Error al eliminar.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error de red.");
    }
  };

  const filteredPosts = useMemo(() => {
    if (!activeClient) return posts;
    return posts.filter((p) => {
      // Si la cuenta asociada pertenece al cliente activo
      const acc = accounts.find((a) => a.id === p.connectedAccount?.id);
      return !acc?.clientId || acc.clientId === activeClient.id;
    });
  }, [posts, accounts, activeClient]);

  const targetAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EAECF0]">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-[#101828] tracking-tight flex items-center gap-2.5">
              <Share2 className="w-6 h-6 text-amber-500 shrink-0" />
              <span>Publicaciones Sociales & Redes</span>
            </h1>
            {activeClient && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-300">
                {activeClient.name}
              </span>
            )}
          </div>
          <p className="text-xs text-[#667085] mt-1 max-w-2xl">
            {activeClient
              ? `Crea, programa y publica en Instagram y Facebook para ${activeClient.name}.`
              : "Programación y publicación multicanal en redes sociales conectadas de la agencia."}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchPosts}
            className="p-2.5 rounded-xl bg-white border border-[#EAECF0] text-[#475467] hover:text-[#101828] text-xs transition-colors shadow-2xs"
            title="Refrescar publicaciones"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn-black-gold rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Crear Publicación</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
          {error}
        </div>
      )}

      {/* Filtros de Estado */}
      <div className="flex items-center gap-1.5 p-1 bg-[#F8F9FA] border border-[#EAECF0] rounded-xl w-fit">
        {[
          { id: "all", label: "Todas" },
          { id: "scheduled", label: "Programadas" },
          { id: "published", label: "Publicadas" },
          { id: "draft", label: "Borradores" },
          { id: "failed", label: "Fallidas" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              statusFilter === tab.id ? "bg-white text-[#101828] shadow-xs" : "text-[#667085] hover:text-[#101828]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lista de Publicaciones */}
      {filteredPosts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-dashed border-[#EAECF0] bg-white space-y-3">
          <Share2 className="w-10 h-10 text-[#D0D5DD] mx-auto" />
          <div className="text-sm font-semibold text-[#101828]">No hay publicaciones registradas</div>
          <p className="text-xs text-[#667085] max-w-sm mx-auto">
            Comienza a redactar o programar copies e imágenes para tus perfiles de Instagram y Facebook.
          </p>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="btn-black-gold rounded-xl px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Nueva Publicación</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPosts.map((post) => {
            let platforms: string[] = [];
            try {
              if (post.platformsJson) platforms = JSON.parse(post.platformsJson);
            } catch {
              platforms = ["instagram"];
            }

            let mediaUrls: string[] = [];
            try {
              if (post.mediaUrlsJson) mediaUrls = JSON.parse(post.mediaUrlsJson);
            } catch {
              mediaUrls = [];
            }

            const statusColors = {
              draft: "bg-slate-100 text-slate-700 border-slate-200",
              scheduled: "bg-amber-50 text-amber-800 border-amber-200",
              in_progress: "bg-blue-50 text-blue-800 border-blue-200",
              published: "bg-emerald-50 text-emerald-800 border-emerald-200",
              failed: "bg-rose-50 text-rose-800 border-rose-200",
            };

            const statusLabels = {
              draft: "Borrador",
              scheduled: "Programada",
              in_progress: "Publicando...",
              published: "Publicada",
              failed: "Error al publicar",
            };

            return (
              <div
                key={post.id}
                className="p-5 rounded-2xl bg-white border border-[#EAECF0] hover:border-[#D0D5DD] shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  {/* Header de la tarjeta */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      {platforms.map((p) => (
                        <SocialNetworkIcon key={p} type={p} size="xs" />
                      ))}
                      <span className="text-xs font-bold text-[#101828] truncate ml-1">
                        {post.connectedAccount?.accountName || "Cuenta Social"}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        statusColors[post.status] || statusColors.draft
                      }`}
                    >
                      {statusLabels[post.status] || post.status}
                    </span>
                  </div>

                  {/* Imagen si la tiene */}
                  {mediaUrls.length > 0 && (
                    <div className="w-full h-44 rounded-xl overflow-hidden bg-slate-100 border border-[#EAECF0]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={mediaUrls[0]}
                        alt="Media post"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    </div>
                  )}

                  {/* Contenido del copy */}
                  <p className="text-xs text-[#344054] leading-relaxed whitespace-pre-line line-clamp-4 font-normal">
                    {post.content}
                  </p>
                </div>

                {/* Footer de la tarjeta con fecha y borrar */}
                <div className="pt-3 border-t border-[#F2F4F7] flex items-center justify-between text-[11px] text-[#667085]">
                  <div className="flex items-center gap-1.5">
                    {post.status === "scheduled" && post.scheduledFor ? (
                      <span className="flex items-center gap-1 text-amber-700 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(post.scheduledFor).toLocaleDateString()} {new Date(post.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </span>
                    ) : (
                      <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDeletePost(post.id)}
                    className="text-[#98A2B3] hover:text-rose-600 transition-colors p-1"
                    title="Eliminar publicación"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal / Compositor de Publicación */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-[#EAECF0] w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-[#EAECF0] flex items-center justify-between bg-[#F8F9FA]">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-semibold text-[#101828]">Crear Publicación para Redes</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#667085] hover:text-[#101828] p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-5 grid grid-cols-1 md:grid-cols-12 gap-6">
              {/* Formulario Izquierda (7 cols) */}
              <div className="md:col-span-7 space-y-4">
                {/* Selector de Cuenta */}
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Cuenta o Página Conectada *
                  </label>
                  <select
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    required
                    className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500"
                  >
                    {accounts.length === 0 ? (
                      <option value="">Sin cuentas conectadas</option>
                    ) : (
                      accounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.accountName} ({a.accountType})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Plataformas */}
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    Canales de Publicación
                  </label>
                  <div className="flex items-center gap-2">
                    {[
                      { id: "instagram", label: "Instagram" },
                      { id: "facebook", label: "Facebook" },
                      { id: "tiktok", label: "TikTok" },
                    ].map((p) => {
                      const isSelected = selectedPlatforms.includes(p.id);
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleTogglePlatform(p.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                            isSelected
                              ? "bg-amber-50 text-amber-900 border-amber-300 font-semibold"
                              : "bg-white text-[#667085] border-[#EAECF0] hover:bg-[#F8F9FA]"
                          }`}
                        >
                          <SocialNetworkIcon type={p.id} size="xs" />
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Texto del Copy */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-[#344054]">
                      Texto del Contenido (Copy) *
                    </label>
                    <span className="text-[10px] text-[#98A2B3]">{content.length} caracteres</span>
                  </div>
                  <textarea
                    rows={5}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    required
                    placeholder="Escribe el copy de tu publicación con llamadas a la acción, emojis y hashtags..."
                    className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl p-3 text-xs text-[#101828] focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>

                {/* URL de Imagen */}
                <div>
                  <label className="block text-xs font-semibold text-[#344054] mb-1.5">
                    URL de Imagen o Creativo Visual (opcional)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="url"
                      placeholder="https://ejemplo.com/imagen.jpg"
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                      className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Publicar vs Programar */}
                <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#EAECF0] space-y-3">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-medium text-[#344054] cursor-pointer">
                      <input
                        type="radio"
                        name="scheduleType"
                        checked={scheduleType === "now"}
                        onChange={() => setScheduleType("now")}
                        className="text-amber-500"
                      />
                      <span>Publicar Inmediatamente</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium text-[#344054] cursor-pointer">
                      <input
                        type="radio"
                        name="scheduleType"
                        checked={scheduleType === "schedule"}
                        onChange={() => setScheduleType("schedule")}
                        className="text-amber-500"
                      />
                      <span>Programar Fecha y Hora</span>
                    </label>
                  </div>

                  {scheduleType === "schedule" && (
                    <div>
                      <input
                        type="datetime-local"
                        value={scheduledDateTime}
                        onChange={(e) => setScheduledDateTime(e.target.value)}
                        required={scheduleType === "schedule"}
                        className="w-full bg-white border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>

                {/* Botones de acción */}
                <div className="pt-2 flex justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#EAECF0] text-xs font-medium text-[#344054] hover:bg-[#F8F9FA]"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !content.trim()}
                    className="btn-black-gold rounded-xl px-5 py-2 text-xs font-semibold flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send className={`w-3.5 h-3.5 text-amber-400 ${submitting ? "animate-pulse" : ""}`} />
                    <span>{submitting ? "Guardando..." : scheduleType === "now" ? "Publicar Ahora" : "Programar"}</span>
                  </button>
                </div>
              </div>

              {/* Previsualización Derecha (5 cols) */}
              <div className="md:col-span-5 bg-[#F8F9FA] rounded-xl p-4 border border-[#EAECF0] flex flex-col justify-between">
                <div>
                  <div className="text-[11px] font-bold text-[#667085] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    <span>Vista Previa en Feed</span>
                  </div>

                  {/* Mock Post Card */}
                  <div className="bg-white rounded-xl border border-[#EAECF0] overflow-hidden shadow-2xs space-y-2.5 p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-[10px]">
                        {targetAccount?.accountName ? targetAccount.accountName.charAt(0).toUpperCase() : "B"}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#101828] truncate">
                          {targetAccount?.accountName || "Tu Marca Oficial"}
                        </div>
                        <div className="text-[9px] text-[#98A2B3]">Publicidad / Orgánico</div>
                      </div>
                    </div>

                    {mediaUrl ? (
                      <div className="w-full h-44 rounded-lg overflow-hidden bg-slate-100 border border-[#EAECF0]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mediaUrl} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-full h-28 rounded-lg bg-[#FAF9F5] border border-dashed border-[#EAECF0] flex flex-col items-center justify-center text-[#98A2B3] text-[11px] gap-1">
                        <ImageIcon className="w-5 h-5" />
                        <span>Sin imagen adjunta</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-1 text-[#667085]">
                      <Heart className="w-4 h-4" />
                      <MessageCircle className="w-4 h-4" />
                      <Send className="w-4 h-4" />
                    </div>

                    <p className="text-[11px] text-[#344054] whitespace-pre-line leading-relaxed">
                      {content.trim() ? content : "Aquí se mostrará el copy de tu publicación en tiempo real conforme vayas escribiendo..."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 text-[10px] text-[#98A2B3] text-center">
                  Simulación de renderizado en Instagram Feed y Facebook Page.
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
