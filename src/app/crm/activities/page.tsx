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
  Calendar,
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
      case "call": return <PhoneCall className="w-4 h-4 text-[#D97757]" />;
      case "meeting": return <Video className="w-4 h-4 text-purple-600" />;
      case "email": return <Mail className="w-4 h-4 text-amber-600" />;
      default: return <FileText className="w-4 h-4 text-emerald-600" />;
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
            <span className="text-[#1F1E1D] font-medium">Actividades</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1F1E1D] tracking-tight">
            Bitácora de Actividades Comerciales
          </h1>
          <p className="text-xs text-[#6B6966] mt-0.5">
            Registro de llamadas de seguimiento, reuniones virtuales y notas estratégicas del equipo.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-black-gold rounded-2xl px-4 py-2 text-xs font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4 text-[#E5C158]" />
          <span>Registrar Actividad</span>
        </button>
      </div>

      {/* Activities Timeline */}
      <div className="bg-white rounded-2xl border border-[#E8E6DF] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E8E6DF] flex items-center justify-between bg-[#FDFDFC]">
          <span className="text-xs font-semibold text-[#1F1E1D]">Historial Cronológico</span>
          <span className="text-[11px] text-[#82807C] font-mono">{activities.length} actividades</span>
        </div>

        <div className="divide-y divide-[#F0EFEA] p-2">
          {loading ? (
            <div className="py-12 text-center text-[#82807C] text-xs">Cargando bitácora de actividades...</div>
          ) : activities.length === 0 ? (
            <div className="py-12 text-center text-[#82807C] text-xs">No hay actividades registradas aún.</div>
          ) : (
            activities.map((act) => (
              <div key={act.id} className="p-4 flex items-start gap-4 hover:bg-[#FAF9F5] transition-colors rounded-xl">
                <div className="w-9 h-9 rounded-xl bg-[#F4F3EE] border border-[#E8E6DF] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getIcon(act.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-medium text-[#1F1E1D] text-xs">{act.title}</h3>
                    <span className="text-[10px] text-[#82807C] flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      {new Date(act.performedAt).toLocaleString()}
                    </span>
                  </div>

                  {act.description && (
                    <p className="text-xs text-[#6B6966] mt-1.5 leading-relaxed bg-[#FAF9F5] p-3 rounded-xl border border-[#E8E6DF]">
                      {act.description}
                    </p>
                  )}

                  <div className="flex items-center gap-3 mt-2.5 text-[10px] text-[#82807C]">
                    <span className="bg-[#F4F3EE] px-2 py-0.5 rounded text-[#4D4C48] font-medium uppercase tracking-wide">
                      {act.type}
                    </span>
                    {act.client && (
                      <span>Cliente: <strong className="text-[#1F1E1D]">{act.client.name}</strong></span>
                    )}
                    {act.lead && (
                      <span>Lead: <strong className="text-[#1F1E1D]">{act.lead.name}</strong></span>
                    )}
                    <span className="text-emerald-700 font-medium">● {act.outcome}</span>
                  </div>
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
              <h2 className="text-sm font-semibold text-[#1F1E1D]">Registrar Actividad Comercial</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#82807C] hover:text-[#1F1E1D] p-1 rounded-lg hover:bg-[#F4F3EE]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#4D4C48] mb-1">Tipo de Actividad</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                >
                  <option value="call">Llamada Telefónica</option>
                  <option value="meeting">Reunión Virtual / Presencial</option>
                  <option value="email">Correo Electrónico</option>
                  <option value="note">Nota Comercial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4D4C48] mb-1">Título / Resumen *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Llamada de validación de presupuesto"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                >
                </input>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#4D4C48] mb-1">Detalles / Acuerdos</label>
                <textarea
                  rows={3}
                  placeholder="Puntos tratados durante la conversación..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
                  className="btn-black-gold rounded-xl px-4 py-2 text-xs font-semibold"
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
