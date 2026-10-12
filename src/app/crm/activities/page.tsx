"use client";

import React, { useState, useEffect } from "react";
import {
  PhoneCall,
  Video,
  FileText,
  Mail,
  Plus,
  Clock,
  User,
  CheckCircle2,
  X,
} from "lucide-react";

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "call",
    title: "",
    description: "",
    outcome: "completed",
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/activities");
      const json = await res.json();
      if (json.success) {
        setActivities(json.activities);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        setFormData({ type: "call", title: "", description: "", outcome: "completed" });
        fetchActivities();
      } else {
        alert(json.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "call": return <PhoneCall className="w-4 h-4 text-blue-400" />;
      case "meeting": return <Video className="w-4 h-4 text-purple-400" />;
      case "email": return <Mail className="w-4 h-4 text-amber-400" />;
      default: return <FileText className="w-4 h-4 text-emerald-400" />;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <PhoneCall className="w-5 h-5 text-bunker-400" />
            Registro de Llamadas y Actividades
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Bitácora de seguimiento comercial, reuniones de descubrimiento y acuerdos con clientes.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-bunker-600 hover:bg-bunker-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-bunker-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Actividad</span>
        </button>
      </div>

      <div className="rounded-2xl bg-[#0c111e] border border-[#1b2538] overflow-hidden">
        <div className="p-4 border-b border-[#1b2538] flex items-center justify-between bg-[#090d16]">
          <span className="text-xs font-bold text-white">Historial Cronológico</span>
          <span className="text-[11px] text-gray-400">{activities.length} actividades registradas</span>
        </div>

        <div className="divide-y divide-[#162033] p-2">
          {loading ? (
            <div className="py-8 text-center text-gray-500 text-xs">Cargando bitácora...</div>
          ) : activities.length === 0 ? (
            <div className="py-8 text-center text-gray-500 text-xs">No hay actividades registradas aún.</div>
          ) : (
            activities.map((act) => (
              <div key={act.id} className="p-4 flex items-start gap-3.5 hover:bg-[#111827]/40 transition-colors rounded-xl">
                <div className="w-9 h-9 rounded-xl bg-[#131c2e] border border-[#222f47] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getIcon(act.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-white text-xs">{act.title}</h3>
                    <span className="text-[10px] text-gray-500 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(act.performedAt).toLocaleString()}
                    </span>
                  </div>

                  {act.description && (
                    <p className="text-xs text-gray-300 mt-1 leading-relaxed">{act.description}</p>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
                    <span className="bg-[#141e33] px-2 py-0.5 rounded text-gray-300 font-semibold uppercase">
                      {act.type}
                    </span>
                    {act.client && <span>Cliente: <strong>{act.client.name}</strong></span>}
                    {act.lead && <span>Lead: <strong>{act.lead.name}</strong></span>}
                    <span className="text-emerald-400 font-semibold">● {act.outcome}</span>
                  </div>
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
              <h2 className="text-sm font-bold text-white">Registrar Actividad Comercial</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Tipo de Actividad</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                >
                  <option value="call">Llamada Telefónica</option>
                  <option value="meeting">Reunión Virtual / Presencial</option>
                  <option value="email">Correo Electrónico</option>
                  <option value="note">Nota Comercial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Título / Resumen *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Llamada de validación de presupuesto"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Detalles / Acuerdos</label>
                <textarea
                  rows={3}
                  placeholder="Puntos tratados durante la conversación..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  className="px-4 py-2 rounded-lg bg-bunker-600 hover:bg-bunker-500 text-white text-xs font-semibold"
                >
                  {submitting ? "Guardando..." : "Guardar Actividad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
