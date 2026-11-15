"use client";

import React, { useState, useEffect, useCallback, Suspense, useMemo } from "react";
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
  Sparkles,
  Activity,
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

const DEMO_ACTIVITIES: ActivityItem[] = [
  {
    id: "act-demo-1",
    type: "call",
    title: "Llamada de Calificación SLA - Presupuesto Corporativo",
    description: "Se validó interés en paquete anual de adquisición de leads calificados por Meta Ads y Google Search. Requiere propuesta formal antes del viernes.",
    outcome: "completed",
    performedAt: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
    user: { id: "u-1", name: "Carlos Mendoza (Senior)", role: "ADMIN" },
    client: { id: "c-1", name: "Constructora Bolívar" },
    lead: { id: "l-101", name: "Arq. Roberto Gómez" },
  },
  {
    id: "act-demo-2",
    type: "meeting",
    title: "Presentación de Propuesta Comercial & Pipeline",
    description: "Reunión por Google Meet con el comité comercial. Se expuso la proyección de CPL a $3.20 USD y tasa de conversión del 18.5%. Muy buena recepción.",
    outcome: "completed",
    performedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    user: { id: "u-2", name: "Valentina Ramos (Asesora)", role: "CLIENT_OWNER" },
    client: { id: "c-2", name: "Inmobiliaria Andina" },
    lead: { id: "l-102", name: "Dra. Sofía Navarro" },
  },
  {
    id: "act-demo-3",
    type: "email",
    title: "Envío de Cotización & Términos de SLA Contractual",
    description: "Se remitió por correo el documento PDF con especificaciones técnicas del CRM Bunker, integración con WhatsApp Cloud API y número de agentes asignados.",
    outcome: "follow_up_needed",
    performedAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    user: { id: "u-3", name: "Andrés Silva", role: "CLIENT" },
    client: { id: "c-3", name: "Automotriz del Valle" },
    lead: { id: "l-103", name: "Ing. Mauricio Herrera" },
  },
  {
    id: "act-demo-4",
    type: "note",
    title: "Nota Interna: Acuerdo de Visita a Sala de Ventas",
    description: "El cliente solicitó capacitación presencial para 5 asesores de ventas el día martes 10:00 AM para el uso de la bandeja multicanal.",
    outcome: "completed",
    performedAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    user: { id: "u-1", name: "Carlos Mendoza (Senior)", role: "ADMIN" },
    client: { id: "c-4", name: "Clínica Especialistas Orales" },
    lead: { id: "l-104", name: "Dr. Camilo Restrepo" },
  },
  {
    id: "act-demo-5",
    type: "call",
    title: "Seguimiento Telefónico Post-Campaña Meta Ads",
    description: "Cliente reporta incremento de leads inbound. Se acordó ajustar el horario de respuesta en WhatsApp para no superar los 5 minutos de SLA.",
    outcome: "completed",
    performedAt: new Date(Date.now() - 32 * 3600 * 1000).toISOString(),
    user: { id: "u-2", name: "Valentina Ramos (Asesora)", role: "CLIENT_OWNER" },
    client: { id: "c-1", name: "Constructora Bolívar" },
    lead: { id: "l-105", name: "Mariana Silva" },
  },
  {
    id: "act-demo-6",
    type: "meeting",
    title: "Sesión de Cierre de Negocio & Firma Digital",
    description: "Revisión final de cláusulas contractuales y activación de cuenta de pagos recurrentes. Proyecto cerrado exitosamente.",
    outcome: "completed",
    performedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    user: { id: "u-1", name: "Carlos Mendoza (Senior)", role: "ADMIN" },
    client: { id: "c-5", name: "Grupo Empresarial Norte" },
    lead: { id: "l-106", name: "Lic. Fernando Ortiz" },
  },
];

export default function ActivitiesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-xs text-[#8C929D] font-mono animate-pulse">
          Cargando bitácora de actividades comerciales...
        </div>
      }
    >
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
  const [isDemoMode, setIsDemoMode] = useState(false);

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
        setFeedback({ type: "error", text: json.error || "Aviso al cargar actividades del servidor" });
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

  // Si no hay datos en DB y terminó de cargar, activar modo demostración para presentación comercial fluida
  const isAutoDemoFallback = !loading && activities.length === 0 && !isDemoMode;

  const displayedActivities = useMemo(() => {
    const list = isDemoMode || isAutoDemoFallback ? DEMO_ACTIVITIES : activities;
    if (selectedType === "all") return list;
    return list.filter((a) => a.type === selectedType);
  }, [isDemoMode, isAutoDemoFallback, activities, selectedType]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);

    if (isDemoMode || isAutoDemoFallback) {
      // Simulación inmediata para presentaciones comerciales sin alterar la base de datos
      const newMockActivity: ActivityItem = {
        id: `act-mock-${Date.now()}`,
        type: formData.type,
        title: formData.title,
        description: formData.description || null,
        outcome: formData.outcome,
        performedAt: new Date().toISOString(),
        user: { id: "u-me", name: "Mi Asesor Comercial", role: "ADMIN" },
        client: activeClient ? { id: activeClient.id, name: activeClient.name } : { id: "c-demo", name: "Empresa Demo" },
      };
      setActivities((prev) => [newMockActivity, ...prev]);
      setIsModalOpen(false);
      setFormData({
        type: "call",
        title: "",
        description: "",
        outcome: "completed",
        clientId: activeClient ? activeClient.id : "",
      });
      setFeedback({ type: "success", text: "Actividad registrada exitosamente (Modo Demo Activo)." });
      setSubmitting(false);
      return;
    }

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
        return <PhoneCall className="w-4 h-4 text-amber-500" />;
      case "meeting":
        return <Video className="w-4 h-4 text-blue-500" />;
      case "email":
        return <Mail className="w-4 h-4 text-purple-500" />;
      default:
        return <FileText className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getOutcomeBadge = (outcome: string | null) => {
    switch (outcome) {
      case "completed":
        return (
          <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/40">
            ✓ Completada
          </span>
        );
      case "follow_up_needed":
        return (
          <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800/40">
            ⏳ Requiere Seguimiento
          </span>
        );
      case "no_answer":
        return (
          <span className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">
            No Contestó
          </span>
        );
      default:
        return outcome ? <span className="text-[10px] text-[#8C929D]">● {outcome}</span> : null;
    }
  };

  const typeTabs = [
    { id: "all", label: "Todas las Actividades" },
    { id: "call", label: "Llamadas SLA" },
    { id: "meeting", label: "Reuniones & Demos" },
    { id: "email", label: "Correos Enviados" },
    { id: "note", label: "Notas Comerciales" },
  ];

  // Métricas rápidas
  const totalCount = displayedActivities.length;
  const callCount = displayedActivities.filter((a) => a.type === "call").length;
  const meetingCount = displayedActivities.filter((a) => a.type === "meeting").length;
  const emailCount = displayedActivities.filter((a) => a.type === "email").length;

  return (
    <div className="space-y-6">
      {/* Cabecera Estilo Cápsula Orvion con Paleta Dorado y Negro */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="orvion-badge-gold text-[10px]">
              Operaciones Comerciales
            </span>
            {isDemoMode || isAutoDemoFallback ? (
              <span className="text-[11px] font-bold text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-950/60 px-3 py-1 rounded-full border border-amber-300 dark:border-amber-700/50 flex items-center gap-1.5 shadow-2xs">
                <Sparkles className="w-3.5 h-3.5 text-amber-600 fill-current" />
                {isAutoDemoFallback ? "Métricas de Demostración Activas" : "Modo Demostrativo Activo"}
              </span>
            ) : activeClient ? (
              <span className="text-[11px] font-semibold text-[#121417] dark:text-white bg-white dark:bg-[#121417] px-3 py-1 rounded-full border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
                Marca: <strong>{activeClient.name}</strong>
              </span>
            ) : (
              <span className="text-[11px] font-medium text-[#8C929D] bg-white dark:bg-[#121417] px-3 py-1 rounded-full border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
                Todas las Marcas
              </span>
            )}
          </div>

          <h1 className="text-3xl font-extrabold text-[#121417] dark:text-white tracking-tight leading-tight">
            Bitácora de Actividades Comerciales
          </h1>
          <p className="text-xs text-[#8C929D] font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 shadow-xs animate-pulse" />
            <span>
              Auditoría cronológica de llamadas SLA, reuniones ejecutivas, correos y acuerdos de los asesores.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Switch Modo Demo Interactivo */}
          <button
            type="button"
            onClick={() => setIsDemoMode((prev) => !prev)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 shadow-orvion cursor-pointer border ${
              isDemoMode
                ? "bg-amber-400 text-[#121417] border-amber-500 shadow-amber-400/20"
                : "bg-white dark:bg-[#121417] text-[#8C929D] border-[#E2E5EB] dark:border-[#1F242D] hover:text-[#121417] dark:hover:text-white"
            }`}
            title="Ver actividades de demostración preconfiguradas"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isDemoMode ? "text-[#121417] fill-current" : "text-amber-500"}`} />
            <span>{isDemoMode ? "⚡ Modo Demo Activo" : "Modo Demo"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFeedback(null);
              setIsModalOpen(true);
            }}
            className="btn-black-gold rounded-full px-4 py-2 text-xs font-semibold flex items-center gap-2 shadow-orvion cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Registrar Actividad</span>
          </button>
        </div>
      </div>

      {/* Banner Informativo si aplica Auto-Demo */}
      {isAutoDemoFallback && (
        <div className="p-4 rounded-[28px] bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs font-medium text-amber-900 dark:text-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-orvion">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              <strong>Visualización Demostrativa Activa:</strong> Mostrando el historial comercial de ejemplo para presentación ante clientes. Puedes registrar nuevas actividades libremente.
            </span>
          </div>
          <button
            type="button"
            onClick={fetchActivities}
            className="px-3.5 py-1 rounded-full bg-white dark:bg-[#1E2229] border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 font-bold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all cursor-pointer shadow-2xs shrink-0"
          >
            Sincronizar Servidor
          </button>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-[22px] border text-xs flex items-center justify-between gap-2 shadow-orvion ${
            feedback.type === "success"
              ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40 text-emerald-800 dark:text-emerald-300"
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
            className="text-xs font-semibold hover:opacity-75 cursor-pointer px-2 py-0.5"
          >
            ✕
          </button>
        </div>
      )}

      {/* Mini Tarjetas de Métricas de Actividad */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#121417] p-4 rounded-[24px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#8C929D] uppercase tracking-wider">Total Actividades</p>
            <p className="text-xl font-extrabold text-[#121417] dark:text-white mt-0.5">{totalCount}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-amber-400/10 flex items-center justify-center text-amber-500">
            <Activity className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#121417] p-4 rounded-[24px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#8C929D] uppercase tracking-wider">Llamadas SLA</p>
            <p className="text-xl font-extrabold text-[#121417] dark:text-white mt-0.5">{callCount}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
            <PhoneCall className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#121417] p-4 rounded-[24px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#8C929D] uppercase tracking-wider">Reuniones Comerciales</p>
            <p className="text-xl font-extrabold text-[#121417] dark:text-white mt-0.5">{meetingCount}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
            <Video className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white dark:bg-[#121417] p-4 rounded-[24px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion flex items-center justify-between">
          <div>
            <p className="text-[11px] font-semibold text-[#8C929D] uppercase tracking-wider">Correos / Propuestas</p>
            <p className="text-xl font-extrabold text-[#121417] dark:text-white mt-0.5">{emailCount}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
            <Mail className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Filter Tabs en Cápsulas Orvion */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {typeTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setSelectedType(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-bold transition-all shrink-0 shadow-orvion cursor-pointer ${
              selectedType === tab.id
                ? "bg-[#121417] text-white dark:bg-amber-400 dark:text-[#121417]"
                : "bg-white dark:bg-[#121417] text-[#8C929D] hover:text-[#121417] dark:hover:text-white border border-[#E2E5EB] dark:border-[#1F242D]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timeline de Actividades en Panel Orvion */}
      <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion overflow-hidden">
        <div className="px-6 py-4 border-b border-[#E2E5EB] dark:border-[#1F242D] flex items-center justify-between bg-white dark:bg-[#121417]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-xs" />
            <span className="text-sm font-bold text-[#121417] dark:text-white">
              Historial Cronológico de Interacciones
            </span>
          </div>
          <span className="text-xs text-[#8C929D] font-mono">
            {displayedActivities.length} {displayedActivities.length === 1 ? "registro" : "registros"}
          </span>
        </div>

        <div className="divide-y divide-[#F0F2F6] dark:divide-[#1F242D] p-3">
          {loading && !isDemoMode && !isAutoDemoFallback ? (
            <div className="py-16 text-center text-[#8C929D] text-xs font-mono animate-pulse">
              Consultando registros en la base de datos...
            </div>
          ) : displayedActivities.length === 0 ? (
            <div className="py-16 text-center text-[#8C929D] text-xs">
              No hay actividades registradas en esta vista con los filtros seleccionados.
            </div>
          ) : (
            displayedActivities.map((act) => (
              <div
                key={act.id}
                className="p-4 flex items-start gap-4 hover:bg-[#F9FAFC] dark:hover:bg-[#181C22] transition-colors rounded-[22px]"
              >
                <div className="w-10 h-10 rounded-full bg-[#F3F4F7] dark:bg-[#1E2229] border border-[#E2E5EB] dark:border-[#2D333D] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  {getIcon(act.type)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <h3 className="font-bold text-[#121417] dark:text-white text-xs leading-snug">
                      {act.title}
                    </h3>
                    <span className="text-[11px] text-[#8C929D] flex items-center gap-1 font-mono shrink-0">
                      <Clock className="w-3.5 h-3.5 text-amber-500/80" />
                      {new Date(act.performedAt).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}
                    </span>
                  </div>

                  {act.description && (
                    <p className="text-xs text-[#525866] dark:text-[#A0A6B2] mt-2 leading-relaxed bg-[#F8F9FB] dark:bg-[#161A20] p-3 rounded-[16px] border border-[#E2E5EB]/60 dark:border-[#262C36]">
                      {act.description}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2.5 mt-2.5 text-[11px] text-[#8C929D]">
                    <span className="bg-[#ECEEF2] dark:bg-[#20252E] px-2.5 py-0.5 rounded-full text-[#121417] dark:text-[#C5CAD4] font-semibold text-[10px] uppercase tracking-wide">
                      {act.type}
                    </span>
                    {act.client && (
                      <span className="flex items-center gap-1 font-medium">
                        <Building2 className="w-3 h-3 text-amber-500" />
                        Cliente: <strong className="text-[#121417] dark:text-white">{act.client.name}</strong>
                      </span>
                    )}
                    {act.lead && (
                      <span className="flex items-center gap-1 font-medium">
                        <User className="w-3 h-3 text-amber-500" />
                        Prospecto: <strong className="text-[#121417] dark:text-white">{act.lead.name}</strong>
                      </span>
                    )}
                    {getOutcomeBadge(act.outcome)}
                    {act.user?.name && (
                      <span className="text-[#8C929D] ml-auto font-mono text-[10px]">
                        Por: {act.user.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal de Registro con Diseño Orvion */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] rounded-[28px] w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-[#E2E5EB] dark:border-[#1F242D] flex items-center justify-between bg-white dark:bg-[#121417]">
              <div>
                <h2 className="text-base font-extrabold text-[#121417] dark:text-white">
                  Registrar Actividad Comercial
                </h2>
                {activeClient && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold mt-0.5">
                    Asignando a: {activeClient.name}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#F3F4F7] dark:bg-[#1E2229] text-[#8C929D] hover:text-[#121417] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {/* Cliente / Marca */}
              <div>
                <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">
                  Empresa / Marca Asignada
                </label>
                <select
                  value={formData.clientId}
                  onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                  className="w-full bg-[#F8F9FA] dark:bg-[#1A1E24] border border-[#E2E5EB] dark:border-[#262C36] rounded-xl px-3.5 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-none focus:border-amber-500 shadow-2xs"
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
                <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">
                  Tipo de Actividad
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-[#F8F9FA] dark:bg-[#1A1E24] border border-[#E2E5EB] dark:border-[#262C36] rounded-xl px-3.5 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-none focus:border-amber-500 shadow-2xs"
                >
                  <option value="call">📞 Llamada Telefónica SLA</option>
                  <option value="meeting">🎥 Reunión Virtual / Demostración</option>
                  <option value="email">✉️ Correo Electrónico / Propuesta</option>
                  <option value="note">📝 Nota Interna / Acuerdo</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">
                  Título / Resumen *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Llamada de validación de presupuesto"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-[#F8F9FA] dark:bg-[#1A1E24] border border-[#E2E5EB] dark:border-[#262C36] rounded-xl px-3.5 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-none focus:border-amber-500 shadow-2xs placeholder-[#8C929D]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">
                  Resultado
                </label>
                <select
                  value={formData.outcome}
                  onChange={(e) => setFormData({ ...formData, outcome: e.target.value })}
                  className="w-full bg-[#F8F9FA] dark:bg-[#1A1E24] border border-[#E2E5EB] dark:border-[#262C36] rounded-xl px-3.5 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-none focus:border-amber-500 shadow-2xs"
                >
                  <option value="completed">✓ Completada con éxito</option>
                  <option value="follow_up_needed">⏳ Requiere seguimiento</option>
                  <option value="no_answer">✕ No contestó</option>
                  <option value="cancelled">🚫 Cancelada / Postergada</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">
                  Detalles / Acuerdos
                </label>
                <textarea
                  rows={3}
                  placeholder="Puntos tratados durante la conversación o acuerdos alcanzados..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#F8F9FA] dark:bg-[#1A1E24] border border-[#E2E5EB] dark:border-[#262C36] rounded-xl px-3.5 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-none focus:border-amber-500 shadow-2xs placeholder-[#8C929D]"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-full bg-[#F3F4F7] dark:bg-[#1E2229] border border-[#E2E5EB] dark:border-[#262C36] text-[#525866] dark:text-[#A0A6B2] hover:text-[#121417] dark:hover:text-white text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-black-gold rounded-full px-5 py-2 text-xs font-semibold cursor-pointer shadow-orvion"
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
