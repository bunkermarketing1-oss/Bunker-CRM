"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import {
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  Building2,
  User,
  CheckSquare,
  RefreshCw,
  Clock,
} from "lucide-react";
import { useActiveClientId } from "@/hooks/useActiveClientId";
import { useClientOptions } from "@/hooks/useClientOptions";

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  user?: { id: string; name: string | null } | null;
  client?: { id: string; name: string } | null;
  lead?: { id: string; name: string | null } | null;
}

export default function TasksPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-xs font-semibold text-[#8C929D] flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
          <span>Cargando tareas comerciales...</span>
        </div>
      }
    >
      <TasksContent />
    </Suspense>
  );
}

function TasksContent() {
  const clientId = useActiveClientId();
  const clients = useClientOptions();
  const activeClient = clientId && clientId !== "all" ? clients.find((c) => c.id === clientId) : null;

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    priority: "medium",
    dueDate: "",
    clientId: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setFormData((prev) => ({ ...prev, clientId: clientId ?? "" }));
  }, [clientId]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const url = clientId && clientId !== "all" ? `/api/tasks?clientId=${encodeURIComponent(clientId)}` : "/api/tasks";
      const res = await fetch(url);
      const json = await res.json();
      if (json.success && Array.isArray(json.tasks)) {
        setTasks(json.tasks);
      } else {
        setTasks([]);
      }
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleToggle = async (task: TaskItem) => {
    try {
      const newStatus = task.status === "completed" ? "pending" : "completed";
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, status: newStatus, completedAt: newStatus === "completed" ? new Date().toISOString() : null } : t
          )
        );
      }
    } catch {
      setFeedback({ type: "error", text: "Error al actualizar estado de la tarea." });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    setSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        clientId: clientId ?? (formData.clientId || undefined),
      };
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        setFormData({
          title: "",
          description: "",
          priority: "medium",
          dueDate: "",
          clientId: clientId ?? "",
        });
        setFeedback({ type: "success", text: "Tarea creada correctamente." });
        fetchTasks();
      } else {
        setFeedback({ type: "error", text: json.error || "Error al crear tarea" });
      }
    } catch (e) {
      setFeedback({ type: "error", text: e instanceof Error ? e.message : "Error inesperado" });
    } finally {
      setSubmitting(false);
    }
  };

  const activeTaskList = useMemo(() => {
    if (statusFilter === "pending") return tasks.filter((t) => t.status !== "completed");
    if (statusFilter === "completed") return tasks.filter((t) => t.status === "completed");
    return tasks;
  }, [tasks, statusFilter]);

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const pendingCount = tasks.length - completedCount;

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Cabecera Estilo Cápsula Orvion */}
      <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] p-6 shadow-orvion">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="orvion-badge-gold">
                <CheckSquare className="w-3.5 h-3.5 text-amber-500" />
                <span>Operaciones CRM</span>
              </span>
              {activeClient ? (
                <span className="text-[11px] font-bold text-[#121417] dark:text-white bg-[#F8F9FA] dark:bg-[#1A1D24] px-3 py-1 rounded-full border border-[#E2E5EB] dark:border-[#242A35] flex items-center gap-1.5 shadow-2xs">
                  <Building2 className="w-3.5 h-3.5 text-amber-500" />
                  Marca: <strong>{activeClient.name}</strong>
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-[#F8F9FA] dark:bg-[#1A1D24] text-[#8C929D] border border-[#E2E5EB] dark:border-[#242A35]">
                  Todas las Marcas
                </span>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#121417] dark:text-white tracking-tight flex items-center gap-2.5">
              <CheckSquare className="w-6 h-6 text-amber-500 shrink-0" />
              <span>Tareas & Recordatorios Comerciales</span>
            </h1>
            <p className="text-xs text-[#8C929D] font-medium max-w-2xl leading-relaxed">
              Seguimiento operativo de entregables, llamadas programadas y compromisos de cuenta para garantizar conversión y cumplimiento.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setFeedback(null);
                setIsModalOpen(true);
              }}
              className="btn-black-gold rounded-full px-5 py-2.5 text-xs font-bold flex items-center gap-2 shadow-orvion cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              <span>Nueva Tarea</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards de Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-[24px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion space-y-1">
          <div className="flex items-center justify-between text-xs text-[#8C929D] font-medium">
            <span>Total de Tareas</span>
            <CheckSquare className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-[#121417] dark:text-white">{tasks.length}</div>
          <div className="text-[11px] text-[#8C929D] font-medium">Asignadas a la cuenta</div>
        </div>

        <div className="p-4 rounded-[24px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion space-y-1">
          <div className="flex items-center justify-between text-xs text-[#8C929D] font-medium">
            <span>Pendientes por Realizar</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-amber-500">{pendingCount}</div>
          <div className="text-[11px] text-[#8C929D] font-medium">Compromisos activos</div>
        </div>

        <div className="p-4 rounded-[24px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion space-y-1">
          <div className="flex items-center justify-between text-xs text-[#8C929D] font-medium">
            <span>Completadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{completedCount}</div>
          <div className="text-[11px] text-[#8C929D] font-medium">Registradas con éxito</div>
        </div>
      </div>

      {/* Banner de Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-[24px] border text-xs font-semibold flex items-center justify-between gap-2 shadow-2xs ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300"
              : "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-800 dark:text-red-300"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[#8C929D] hover:text-[#121417] dark:hover:text-white p-1 rounded-full cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filtros por Estado */}
      <div className="flex items-center gap-1.5 p-1 bg-white dark:bg-[#121417] rounded-full border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion w-fit">
        {[
          { id: "all", label: `Todas (${tasks.length})` },
          { id: "pending", label: `Pendientes (${pendingCount})` },
          { id: "completed", label: `Completadas (${completedCount})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              statusFilter === tab.id
                ? "bg-[#121417] text-white dark:bg-white dark:text-[#121417] shadow-xs"
                : "text-[#8C929D] hover:text-[#121417] dark:hover:text-white hover:bg-[#F3F4F7] dark:hover:bg-[#1E2229]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Lista de Tareas */}
      <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E5EB] dark:border-[#1F242D] flex items-center justify-between bg-[#F8F9FA] dark:bg-[#16191F]">
          <span className="text-xs font-extrabold text-[#121417] dark:text-white">Lista de Tareas Asignadas</span>
          <span className="text-[11px] text-[#8C929D] font-mono font-medium">
            {completedCount} de {tasks.length} completadas
          </span>
        </div>

        <div className="divide-y divide-[#E2E5EB] dark:divide-[#1F242D] p-2">
          {loading && tasks.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8C929D] font-medium flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
              <span>Cargando tareas comerciales...</span>
            </div>
          ) : activeTaskList.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#8C929D] font-medium space-y-2">
              <CheckSquare className="w-8 h-8 text-[#CBD5E1] dark:text-[#334155] mx-auto" />
              <p className="font-bold text-sm text-[#121417] dark:text-white">Sin tareas en esta vista</p>
              <p>No tienes recordatorios pendientes en este filtro.</p>
            </div>
          ) : (
            activeTaskList.map((task) => (
              <div
                key={task.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-[#F8F9FA] dark:hover:bg-[#1A1D24] transition-colors rounded-2xl cursor-pointer"
                onClick={() => handleToggle(task)}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggle(task);
                    }}
                    aria-label={task.status === "completed" ? "Marcar como pendiente" : "Marcar como completada"}
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all border shrink-0 mt-0.5 cursor-pointer ${
                      task.status === "completed"
                        ? "bg-emerald-500 border-emerald-500 text-white"
                        : "border-[#E2E5EB] dark:border-[#2A2E37] bg-white dark:bg-[#1A1D24] hover:border-amber-500"
                    }`}
                  >
                    {task.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0">
                    <div
                      className={`text-xs font-bold truncate ${
                        task.status === "completed"
                          ? "line-through text-[#8C929D]"
                          : "text-[#121417] dark:text-white"
                      }`}
                    >
                      {task.title}
                    </div>

                    {task.description && (
                      <p className="text-[11px] text-[#64748B] dark:text-[#94A3B8] mt-0.5 line-clamp-1 font-medium">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[10px]">
                      {task.dueDate && (
                        <span className="flex items-center gap-1 font-mono font-bold text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 px-2 py-0.5 rounded-full">
                          <Calendar className="w-3 h-3 text-amber-500" />
                          Vence: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {task.client && (
                        <span className="flex items-center gap-1 text-[#8C929D] font-medium bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] px-2 py-0.5 rounded-full">
                          <Building2 className="w-2.5 h-2.5 text-amber-500" />
                          {task.client.name}
                        </span>
                      )}
                      {task.lead && (
                        <span className="flex items-center gap-1 text-[#8C929D] font-medium bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] px-2 py-0.5 rounded-full">
                          <User className="w-2.5 h-2.5 text-amber-500" />
                          Lead: {task.lead.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[9px] font-bold px-2.5 py-0.5 rounded-full border uppercase ${
                      task.priority === "urgent"
                        ? "bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900/50"
                        : task.priority === "high"
                        ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800/50"
                        : "bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800/50"
                    }`}
                  >
                    {task.priority === "urgent" ? "Urgente" : task.priority === "high" ? "Alta" : "Media"}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Crear Tarea */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] rounded-[28px] w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#E2E5EB] dark:border-[#1F242D] flex items-center justify-between bg-[#F8F9FA] dark:bg-[#16191F]">
              <div>
                <h2 className="text-sm font-extrabold text-[#121417] dark:text-white">Nueva Tarea Comercial</h2>
                {activeClient && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                    Asignando a: {activeClient.name}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#8C929D] hover:text-[#121417] dark:hover:text-white p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {!clientId && (
              <div>
                <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">Empresa / Marca Asignada</label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-2xl px-3.5 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
                >
                  <option value="" className="dark:bg-[#1A1D24]">Sin empresa específica (General)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id} className="dark:bg-[#1A1D24]">
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              )}

              <div>
                <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">Título de la Tarea *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Enviar propuesta revisada de Meta Ads"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-2xl px-3.5 py-2.5 text-xs text-[#121417] dark:text-white placeholder:text-[#8C929D] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">Descripción / Notas</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre lo que se debe hacer..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-2xl px-3.5 py-2.5 text-xs text-[#121417] dark:text-white placeholder:text-[#8C929D] focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">Prioridad</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-2xl px-3.5 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
                  >
                    <option value="low" className="dark:bg-[#1A1D24]">Baja</option>
                    <option value="medium" className="dark:bg-[#1A1D24]">Media</option>
                    <option value="high" className="dark:bg-[#1A1D24]">Alta</option>
                    <option value="urgent" className="dark:bg-[#1A1D24]">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">Fecha Límite</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-2xl px-3.5 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-white dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] text-xs font-bold text-[#121417] dark:text-white hover:bg-[#F8F9FA] cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-black-gold rounded-full px-5 py-2 text-xs font-bold shadow-orvion cursor-pointer"
                >
                  {submitting ? "Creando..." : "Crear Tarea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
