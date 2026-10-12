"use client";

import React, { useState, useEffect } from "react";
import {
  CheckSquare,
  Plus,
  Calendar,
  AlertCircle,
  CheckCircle2,
  X,
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-bunker-400" />
            Tareas & Recordatorios Comerciales
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Seguimiento de entregables, llamadas programadas y revisiones de cuenta.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-bunker-600 hover:bg-bunker-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-bunker-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nueva Tarea</span>
        </button>
      </div>

      <div className="rounded-2xl bg-[#0c111e] border border-[#1b2538] overflow-hidden">
        <div className="divide-y divide-[#162033] p-2">
          {loading ? (
            <div className="py-8 text-center text-gray-500 text-xs">Cargando tareas...</div>
          ) : tasks.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-xs">No hay tareas pendientes.</div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="p-3.5 flex items-center justify-between gap-3 hover:bg-[#111827]/40 transition-colors rounded-xl"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggle(task)}
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors border ${
                      task.status === "completed"
                        ? "bg-emerald-600 border-emerald-500 text-white"
                        : "border-[#2c3d5e] bg-[#101726] hover:border-bunker-500"
                    }`}
                  >
                    {task.status === "completed" && <CheckCircle2 className="w-4 h-4" />}
                  </button>

                  <div>
                    <div className={`text-xs font-semibold ${task.status === "completed" ? "line-through text-gray-500" : "text-white"}`}>
                      {task.title}
                    </div>
                    {task.dueDate && (
                      <div className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3 text-gray-500" />
                        <span>Vence: {new Date(task.dueDate).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                    task.priority === "urgent" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                    task.priority === "high" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                    "bg-blue-500/10 text-blue-400 border-blue-500/20"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0b101d] border border-[#23314d] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#1c263c] flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">Nueva Tarea Comercial</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Título de la Tarea *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Enviar propuesta actualizada a Altamira"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Prioridad</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                  />
                </div>
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
                  className="px-4 py-2 rounded-lg bg-bunker-600 hover:bg-bunker-500 text-white text-xs font-semibold"
                >
                  {submitting ? "Guardando..." : "Guardar Tarea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
