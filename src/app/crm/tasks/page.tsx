"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  Building2,
  User,
} from "lucide-react";
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
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#667085]">Cargando tareas comerciales...</div>}>
      <TasksContent />
    </Suspense>
  );
}

function TasksContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
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

  // Preseleccionar el cliente en el modal cuando hay una marca activa
  useEffect(() => {
    if (activeClient) {
      setFormData((prev) => ({ ...prev, clientId: activeClient.id }));
    } else {
      setFormData((prev) => ({ ...prev, clientId: "" }));
    }
  }, [activeClient]);

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (clientId && clientId !== "all") {
        params.set("clientId", clientId);
      }
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/tasks${query}`);
      const json = await res.json();
      if (json.success) {
        setTasks(json.tasks);
      } else {
        setFeedback({ type: "error", text: json.error || "Error al cargar las tareas" });
      }
    } catch (e) {
      setFeedback({ type: "error", text: e instanceof Error ? e.message : "Error de red" });
    } finally {
      setLoading(false);
    }
  }, [clientId, statusFilter]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleToggle = async (task: TaskItem) => {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setTasks((prev) =>
          prev.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t))
        );
      } else {
        setFeedback({ type: "error", text: json.error || "No se pudo actualizar la tarea" });
      }
    } catch (e) {
      setFeedback({ type: "error", text: e instanceof Error ? e.message : "Error inesperado" });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        title: formData.title,
        description: formData.description || undefined,
        priority: formData.priority,
        dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
        clientId: formData.clientId || undefined,
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
          clientId: activeClient ? activeClient.id : "",
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

  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAECF0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
              Operaciones CRM
            </span>
            {activeClient ? (
              <span className="text-[11px] font-semibold text-[#101828] bg-[#F8F9FA] px-2.5 py-0.5 rounded-md border border-[#EAECF0] flex items-center gap-1.5">
                <Building2 className="w-3 h-3 text-amber-600" />
                Marca: <strong>{activeClient.name}</strong>
              </span>
            ) : (
              <span className="text-[11px] text-[#667085] bg-[#F8F9FA] px-2 py-0.5 rounded-md border border-[#EAECF0]">
                Todas las Marcas
              </span>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">
            Tareas & Recordatorios Comerciales
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Seguimiento de entregables, llamadas programadas y revisiones estratégicas de cuenta.
          </p>
        </div>

        <button
          onClick={() => {
            setFeedback(null);
            setIsModalOpen(true);
          }}
          className="btn-black-gold rounded-2xl px-4 py-2 text-xs font-semibold flex items-center gap-2 shadow-2xs self-start sm:self-auto"
        >
          <Plus className="w-4 h-4 text-amber-400" />
          <span>Nueva Tarea</span>
        </button>
      </div>

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-2 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold hover:opacity-75"
          >
            ✕
          </button>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { id: "all", label: "Todas" },
          { id: "pending", label: "Pendientes" },
          { id: "completed", label: "Completadas" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 ${
              statusFilter === tab.id
                ? "bg-[#0F172A] text-white"
                : "bg-white text-[#475467] hover:bg-[#F8F9FA] border border-[#EAECF0]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#EAECF0] flex items-center justify-between bg-[#FDFDFC]">
          <span className="text-xs font-semibold text-[#101828]">Lista de Pendientes</span>
          <span className="text-[11px] text-[#667085] font-mono">
            {completedCount} de {tasks.length} completadas
          </span>
        </div>

        <div className="divide-y divide-[#F2F4F7] p-2">
          {loading ? (
            <div className="py-12 text-center text-[#667085] text-xs">Cargando tareas...</div>
          ) : tasks.length === 0 ? (
            <div className="py-12 text-center text-[#667085] text-xs">
              No hay tareas en esta vista.
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#F8F9FA] transition-colors rounded-xl"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <button
                    onClick={() => handleToggle(task)}
                    aria-label={task.status === "completed" ? "Marcar como pendiente" : "Marcar como completada"}
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors border shrink-0 mt-0.5 ${
                      task.status === "completed"
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-[#D1CFCA] bg-white hover:border-amber-500"
                    }`}
                  >
                    {task.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>

                  <div className="min-w-0">
                    <div
                      className={`text-xs font-medium truncate ${
                        task.status === "completed"
                          ? "line-through text-[#98A2B3]"
                          : "text-[#101828]"
                      }`}
                    >
                      {task.title}
                    </div>

                    {task.description && (
                      <p className="text-[11px] text-[#667085] mt-0.5 line-clamp-1">
                        {task.description}
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[10px] text-[#667085]">
                      {task.dueDate && (
                        <span className="flex items-center gap-1 font-mono text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded">
                          <Calendar className="w-3 h-3 text-amber-600" />
                          Vence: {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {task.client && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-2.5 h-2.5 text-[#98A2B3]" />
                          {task.client.name}
                        </span>
                      )}
                      {task.lead && (
                        <span className="flex items-center gap-1">
                          <User className="w-2.5 h-2.5 text-[#98A2B3]" />
                          {task.lead.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[9px] font-semibold px-2 py-0.5 rounded-md border uppercase ${
                      task.priority === "urgent"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : task.priority === "high"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {task.priority}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal Crear Tarea */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#EAECF0] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#EAECF0] flex items-center justify-between bg-[#FDFDFC]">
              <div>
                <h2 className="text-sm font-semibold text-[#101828]">Crear Tarea Comercial</h2>
                {activeClient && (
                  <p className="text-[11px] text-amber-700 font-medium">
                    Asignando a: {activeClient.name}
                  </p>
                )}
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#667085] hover:text-[#101828] p-1 rounded-lg hover:bg-[#F2F4F7]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-3.5">
              {/* Cliente / Marca */}
              <div>
                <label className="block text-xs font-medium text-[#344054] mb-1">Empresa / Marca Asignada</label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500"
                >
                  <option value="">Sin cliente específico (General)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#344054] mb-1">Título de la Tarea *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Enviar propuesta revisada de Meta Ads"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#344054] mb-1">Descripción / Notas</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre lo que se debe hacer..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#344054] mb-1">Prioridad</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#344054] mb-1">Fecha Límite</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl bg-[#F2F4F7] border border-[#EAECF0] text-[#344054] hover:text-[#101828] text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-black-gold rounded-xl px-4 py-2 text-xs font-semibold"
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
