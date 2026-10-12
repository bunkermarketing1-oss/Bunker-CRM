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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-bunker-400" />
            Publicaciones & Contenido en Redes
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Creación, programación y auditoría de publicaciones en cuentas oficiales de clientes.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-bunker-600 hover:bg-bunker-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-bunker-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Crear Publicación</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {feedback}
        </div>
      )}

      {/* Grid of posts */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-gray-500 text-xs">
            Cargando publicaciones...
          </div>
        ) : posts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 text-xs">
            No hay publicaciones registradas aún.
          </div>
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="p-5 rounded-2xl bg-[#0c111e] border border-[#1b2538] hover:border-[#263754] transition-all flex flex-col justify-between space-y-4 shadow-md"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-[#162033] text-gray-300 uppercase">
                      {JSON.parse(post.platformsJson || "[]").join(" & ")}
                    </span>
                    {post.isDemo && (
                      <span className="text-[9px] bg-amber-500/10 text-amber-400 font-semibold px-1.5 py-0.5 rounded border border-amber-500/20">
                        DEMO
                      </span>
                    )}
                  </div>

                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                    post.status === "published" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                    post.status === "scheduled" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                    post.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                    "bg-gray-500/10 text-gray-300 border-gray-500/20"
                  }`}>
                    {post.status}
                  </span>
                </div>

                <p className="text-xs text-gray-200 leading-relaxed line-clamp-4 bg-[#111726] p-3 rounded-xl border border-[#1a2336]">
                  {post.content}
                </p>

                {post.scheduledFor && (
                  <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-3">
                    <Clock className="w-3.5 h-3.5 text-blue-400" />
                    <span>Programado para: <strong>{new Date(post.scheduledFor).toLocaleString()}</strong></span>
                  </div>
                )}

                {post.errorMessage && (
                  <div className="text-[10px] text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20 mt-2">
                    {post.errorMessage}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-[#172238] flex items-center justify-between text-[11px] text-gray-500">
                <span>Registrado: {new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0b101d] border border-[#23314d] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#1c263c] flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-bunker-400" />
                Redactar Publicación
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePost} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Contenido / Copy *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Redacta el texto de la publicación para redes sociales..."
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">URL de Imagen / Creativo</label>
                <input
                  type="url"
                  value={formData.mediaUrl}
                  onChange={(e) => setFormData({ ...formData, mediaUrl: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Fecha y Hora Programada (Opcional)</label>
                <input
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={(e) => setFormData({ ...formData, scheduledFor: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-lg bg-[#141d30] border border-[#23314d] text-gray-300 hover:text-white text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-bunker-600 hover:bg-bunker-500 text-white text-xs font-semibold shadow-md"
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
