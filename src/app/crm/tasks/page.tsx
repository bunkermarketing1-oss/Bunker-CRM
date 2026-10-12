"use client";

import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
  Clock,
} from "lucide-react";

export default function TasksPage() {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    priority: "medium",
    dueDate: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/tasks");
      const json = await res.json();
      if (json.success) {
        setTasks(json.tasks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const handleToggle = async (task: any) => {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        fetchTasks();
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        setFormData({ title: "", priority: "medium", dueDate: "" });
        fetchTasks();
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
            <span>CRM</span>
            <span>/</span>
            <span className="text-[#1F1E1D] font-medium">Tareas</span>
          </div>
          <h1 className="text-2xl font-serif font-normal text-[#1F1E1D] tracking-tight">
            Tareas & Recordatorios Comerciales
          </h1>
          <p className="text-xs text-[#6B6966] mt-0.5">
            Seguimiento de entregables, llamadas programadas y revisiones estratégicas de cuenta.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#D97757] hover:bg-[#C86747] text-white text-xs font-medium flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Tarea</span>
        </button>
      </div>

      {/* Tasks List */}
      <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E8E6DF] flex items-center justify-between bg-[#FDFDFC]">
          <span className="text-xs font-semibold text-[#1F1E1D]">Lista de Pendientes</span>
          <span className="text-[11px] text-[#82807C] font-mono">
            {tasks.filter((t) => t.status === "completed").length} de {tasks.length} completadas
          </span>
        </div>

        <div className="divide-y divide-[#F0EFEA] p-2">
          {loading ? (
            <div className="py-12 text-center text-[#82807C] text-xs">Cargando tareas...</div>
          ) : tasks.length === 0 ? (
            <div className="py-12 text-center text-[#82807C] text-xs">No hay tareas pendientes.</div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#FAF9F5] transition-colors rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggle(task)}
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors border ${
                      task.status === "completed"
                        ? "bg-emerald-600 border-emerald-600 text-white"
                        : "border-[#D1CFCA] bg-white hover:border-[#D97757]"
                    }`}
                  >
                    {task.status === "completed" && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </button>

                  <div>
                    <div className={`text-xs font-medium ${task.status === "completed" ? "line-through text-[#9E9D99]" : "text-[#1F1E1D]"}`}>
                      {task.title}
                    </div>
                    {task.dueDate && (
                      <div className="text-[10px] text-[#82807C] flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-[#9E9D99]" />
                        <span>Vence: {new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border uppercase ${
                    task.priority === "urgent" ? "bg-red-50 text-red-700 border-red-200" :
                    task.priority === "high" ? "bg-amber-50 text-amber-700 border-amber-200" :
                    "bg-blue-50 text-blue-700 border-blue-200"
                  }`}>
                    {task.priority}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white border border-[#E8E6DF] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#E8E6DF] flex items-center justify-between bg-[#FDFDFC]">
              <h2 className="text-sm font-serif font-normal text-[#1F1E1D]">Crear Tarea Comercial</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#82807C] hover:text-[#1F1E1D] p-1 rounded-lg hover:bg-[#F4F3EE]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#4D4C48] mb-1">Título de la Tarea *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Enviar propuesta revisada de Meta Ads"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4D4C48] mb-1">Prioridad</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta</option>
                  <option value="urgent">Urgente</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4D4C48] mb-1">Fecha Límite</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
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
                  className="px-4 py-2 rounded-xl bg-[#D97757] hover:bg-[#C86747] text-white text-xs font-medium shadow-sm transition-all"
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
