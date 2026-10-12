"use client";

import React, { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  Calendar,
  Send,
  Sparkles,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  X,
  Share2,
  Clock,
} from "lucide-react";

export default function PostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    content: "",
    platforms: ["instagram", "facebook"],
    scheduledFor: "",
    publishNow: false,
    mediaUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600",
  });

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/posts");
      const json = await res.json();
      if (json.success) {
        setPosts(json.posts);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        setFormData({
          content: "",
          platforms: ["instagram", "facebook"],
          scheduledFor: "",
          publishNow: false,
          mediaUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600",
        });
        setFeedback("¡Publicación registrada exitosamente!");
        setTimeout(() => setFeedback(null), 4000);
        fetchPosts();
      } else {
        alert(json.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E6DF]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#82807C] mb-1">
            <span>Marketing</span>
            <span>/</span>
            <span className="text-[#1F1E1D] font-medium">Publicaciones</span>
          </div>
          <h1 className="text-2xl font-serif font-normal text-[#1F1E1D] tracking-tight">
            Publicaciones & Creativos en Redes
          </h1>
          <p className="text-xs text-[#6B6966] mt-0.5">
            Creación, programación y revisión de publicaciones de pauta y contenido orgánico de las marcas.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-black-gold rounded-2xl px-4 py-2 text-xs font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4 text-[#E5C158]" />
          <span>Crear Publicación</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3.5 bg-[#EBF5EE] border border-[#C2E2CC] rounded-xl text-emerald-800 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Grid of posts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-[#82807C] text-xs">
            Cargando publicaciones...
          </div>
        ) : posts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-[#82807C] text-xs">
            No hay publicaciones registradas aún.
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="p-5 rounded-2xl bg-white border border-[#E8E6DF] hover:border-[#D1CFCA] transition-all flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#F4F3EE] text-[#4D4C48] uppercase">
                      {JSON.parse(post.platformsJson || "[]").join(" & ")}
                    </span>
                    {post.isDemo && (
                      <span className="text-[10px] bg-amber-50 text-amber-700 font-medium px-2 py-0.5 rounded-full border border-amber-200">
                        DEMO
                      </span>
                    )}
                  </div>

                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase border ${
                    post.status === "published" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    post.status === "scheduled" ? "bg-blue-50 text-blue-700 border-blue-200" :
                    post.status === "failed" ? "bg-red-50 text-red-700 border-red-200" :
                    "bg-gray-50 text-gray-700 border-gray-200"
                  }`}>
                    {post.status}
                  </span>
                </div>

                <p className="text-xs text-[#1F1E1D] leading-relaxed line-clamp-4 bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E8E6DF]">
                  {post.content}
                </p>

                {post.scheduledFor && (
                  <div className="text-[11px] text-[#6B6966] flex items-center gap-1.5 mt-3">
                    <Clock className="w-3.5 h-3.5 text-[#D97757]" />
                    <span>Programado: <strong className="text-[#1F1E1D]">{new Date(post.scheduledFor).toLocaleString()}</strong></span>
                  </div>
                )}

                {post.errorMessage && (
                  <div className="text-[11px] text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200 mt-2">
                    {post.errorMessage}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#F0EFEA] flex items-center justify-between text-[11px] text-[#82807C]">
                <span>Registrado: {new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white border border-[#E8E6DF] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#E8E6DF] flex items-center justify-between bg-[#FDFDFC]">
              <h2 className="text-sm font-serif font-normal text-[#1F1E1D] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#D97757]" />
                Redactar Publicación
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#82807C] hover:text-[#1F1E1D] p-1 rounded-lg hover:bg-[#F4F3EE]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#4D4C48] mb-1">Contenido / Copy *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Redacta el texto de la publicación para redes sociales..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4D4C48] mb-1">URL de Imagen / Creativo</label>
                <input
                  type="url"
                  value={formData.mediaUrl}
                  onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4D4C48] mb-1">Fecha y Hora Programada (Opcional)</label>
                <input
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#F4F3EE] border border-[#E8E6DF] text-[#4D4C48] hover:text-[#1F1E1D] text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl btn-black-gold text-xs font-semibold"
                >
                  {submitting ? "Guardando..." : "Guardar Publicación"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
