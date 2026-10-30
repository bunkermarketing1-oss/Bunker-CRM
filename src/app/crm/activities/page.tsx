"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
  Building2,
  AlertCircle,
} from "lucide-react";
import { useClientOptions } from "@/hooks/useClientOptions";

interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description: string | null;
  outcome: string | null;
  performedAt: string;
  user?: { id: string; name: string | null; role: string } | null;
  client?: { id: string; name: string } | null;
  lead?: { id: string; name: string | null } | null;
}

export default function ActivitiesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#667085]">Cargando bitácora de actividades...</div>}>
      <ActivitiesContent />
    </Suspense>
  );
}

function ActivitiesContent() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("clientId");
  const clients = useClientOptions();
  const activeClient = clientId && clientId !== "all" ? clients.find((c) => c.id === clientId) : null;

  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState<string>("all");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    type: "call",
    title: "",
    description: "",
    outcome: "completed",
    clientId: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Inicializar clientId en formulario según la marca seleccionada
  useEffect(() => {
    if (activeClient) {
      setFormData((prev) => ({ ...prev, clientId: activeClient.id }));
    } else {
      setFormData((prev) => ({ ...prev, clientId: "" }));
    }
  }, [activeClient]);

  const fetchActivities = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (clientId && clientId !== "all") {
        params.set("clientId", clientId);
      }
      if (selectedType && selectedType !== "all") {
        params.set("type", selectedType);
      }
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/activities${query}`);
      const json = await res.json();
      if (json.success) {
        setActivities(json.activities);
      } else {
        setFeedback({ type: "error", text: json.error || "Error al cargar actividades" });
      }
    } catch (e) {
      setFeedback({ type: "error", text: e instanceof Error ? e.message : "Error de red" });
    } finally {
      setLoading(false);
    }
  }, [clientId, selectedType]);

  useEffect(() => {
    fetchActivities();
  }, [fetchActivities]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      const payload = {
        ...formData,
        clientId: formData.clientId || undefined,
      };
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setIsModalOpen(false);
        setFormData({
          type: "call",
          title: "",
          description: "",
          outcome: "completed",
          clientId: activeClient ? activeClient.id : "",
        });
        setFeedback({ type: "success", text: "Actividad comercial registrada exitosamente." });
        fetchActivities();
      } else {
        setFeedback({ type: "error", text: json.error || "No se pudo registrar la actividad" });
      }
    } catch (e) {
      setFeedback({ type: "error", text: e instanceof Error ? e.message : "Error inesperado" });
    } finally {
      setSubmitting(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "call":
        return <PhoneCall className="w-4 h-4 text-amber-600" />;
      case "meeting":
        return <Video className="w-4 h-4 text-indigo-600" />;
      case "email":
        return <Mail className="w-4 h-4 text-sky-600" />;
      default:
        return <FileText className="w-4 h-4 text-emerald-600" />;
    }
  };

  const typeTabs = [
    { id: "all", label: "Todas" },
    { id: "call", label: "Llamadas" },
    { id: "meeting", label: "Reuniones" },
    { id: "email", label: "Correos" },
    { id: "note", label: "Notas" },
  ];

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
            Bitácora de Actividades Comerciales
          </h1>
          <p className="text-xs text-[#667085] mt-0.5">
            Registro cronológico de llamadas, reuniones y acuerdos estratégicos del equipo comercial.
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
          <span>Registrar Actividad</span>
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

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {typeTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedType(tab.id)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors shrink-0 ${
              selectedType === tab.id
                ? "bg-[#0F172A] text-white"
                : "bg-white text-[#475467] hover:bg-[#F8F9FA] border border-[#EAECF0]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Activities Timeline */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[#EAECF0] flex items-center justify-between bg-[#FDFDFC]">
          <span className="text-xs font-semibold text-[#101828]">Historial de Actividades</span>
          <span className="text-[11px] text-[#667085] font-mono">
            {activities.length} {activities.length === 1 ? "registro" : "registros"}
          </span>
        </div>

        <div className="divide-y divide-[#F2F4F7] p-2">
          {loading ? (
            <div className="py-12 text-center text-[#667085] text-xs">Cargando bitácora de actividades...</div>
          ) : activities.length === 0 ? (
            <div className="py-12 text-center text-[#667085] text-xs">
              No hay actividades registradas en esta vista.
            </div>
          ) : (
            activities.map((act) => (
              <div key={act.id} className="p-3.5 flex items-start gap-3.5 hover:bg-[#F8F9FA] transition-colors rounded-xl">
                <div className="w-8 h-8 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] flex items-center justify-center flex-shrink-0 mt-0.5">
                  {getIcon(act.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold text-[#101828] text-xs">{act.title}</h3>
                    <span className="text-[10px] text-[#667085] flex items-center gap-1 font-mono shrink-0">
                      <Clock className="w-3 h-3 text-[#98A2B3]" />
                      {new Date(act.performedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>

                  {act.description && (
                    <p className="text-xs text-[#475467] mt-1.5 leading-relaxed bg-[#F8F9FA] p-2.5 rounded-xl border border-[#EAECF0]">
                      {act.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-[#667085]">
                    <span className="bg-[#F2F4F7] px-2 py-0.5 rounded text-[#344054] font-medium uppercase tracking-wide">
                      {act.type}
                    </span>
                    {act.client && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-2.5 h-2.5 text-[#98A2B3]" />
                        Cliente: <strong className="text-[#101828]">{act.client.name}</strong>
                      </span>
                    )}
                    {act.lead && (
                      <span className="flex items-center gap-1">
                        <User className="w-2.5 h-2.5 text-[#98A2B3]" />
                        Lead: <strong className="text-[#101828]">{act.lead.name}</strong>
                      </span>
                    )}
                    {act.outcome && (
                      <span className="text-emerald-700 font-medium">● {act.outcome}</span>
                    )}
                    {act.user?.name && (
                      <span className="text-[#98A2B3] ml-auto">Por: {act.user.name}</span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#EAECF0] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#EAECF0] flex items-center justify-between bg-[#FDFDFC]">
              <div>
                <h2 className="text-sm font-semibold text-[#101828]">Registrar Actividad Comercial</h2>
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
                <label className="block text-xs font-medium text-[#344054] mb-1">Tipo de Actividad</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500"
                >
                  <option value="call">Llamada Telefónica</option>
                  <option value="meeting">Reunión Virtual / Presencial</option>
                  <option value="email">Correo Electrónico</option>
                  <option value="note">Nota Comercial</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#344054] mb-1">Título / Resumen *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Llamada de validación de presupuesto"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#344054] mb-1">Resultado</label>
                <select
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500"
                >
                  <option value="completed">Completada con éxito</option>
                  <option value="follow_up_needed">Requiere seguimiento</option>
                  <option value="no_answer">No contestó</option>
                  <option value="cancelled">Cancelada / Postergada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#344054] mb-1">Detalles / Acuerdos</label>
                <textarea
                  rows={3}
                  placeholder="Puntos tratados durante la conversación o acuerdos alcanzados..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500"
                />
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
