"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import SocialNetworkIcon from "@/components/common/SocialNetworkIcon";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Plus,
  X,
  Video,
  CheckSquare,
  Sparkles,
  ChevronRight,
  MessageCircle,
  MoreHorizontal,
  FileText,
  Loader2,
  Tag,
  ArrowRightCircle,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import LeadAvatar from "@/components/crm/LeadAvatar";

interface LeadOwner {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface LeadClient {
  id: string;
  name: string;
  companyName: string | null;
}

interface OpportunityStage {
  id: string;
  name: string;
  color: string;
}

interface LeadOpportunity {
  id: string;
  title: string;
  value: number;
  probability: number;
  status: string;
  expectedClose: string | null;
  createdAt: string;
  stage: OpportunityStage | null;
}

interface LeadActivity {
  id: string;
  type: string; // call, meeting, email, note, sms
  title: string;
  description: string | null;
  outcome: string | null;
  performedAt: string;
  user: { id: string; name: string } | null;
}

interface LeadTask {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: string;
  status: string;
  completedAt: string | null;
  user: { id: string; name: string } | null;
}

interface LeadDetail {
  id: string;
  name: string;
  avatarUrl?: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  normalizedPhone: string | null;
  source: string;
  campaign: string | null;
  notes: string | null;
  smsConsent?: boolean;
  smsConsentAt?: string | null;
  smsConsentSource?: string | null;
  status: string;
  qualification: number;
  aiSummary: string | null;
  estimatedValue: number | null;
  createdAt: string;
  updatedAt: string;
  owner: LeadOwner | null;
  client: LeadClient | null;
  opportunities: LeadOpportunity[];
  activities: LeadActivity[];
  tasks: LeadTask[];
}

function fmtMoney(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Justo ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Ayer";
  return `Hace ${days} días`;
}

export default function LeadDetailPage() {
  const { user } = useAuth();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN" && !user?.isClientUser;
  const params = useParams();
  const leadId = typeof params?.id === "string" ? params.id : "";

  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Tabs de navegación
  const [activeTab, setActiveTab] = useState<"activity" | "calls" | "emails" | "tasks" | "notes">("activity");
  const [leftTab, setLeftTab] = useState<"address" | "company">("address");

  // Modales
  const [isDealModalOpen, setIsDealModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [activityType, setActivityType] = useState<"call" | "meeting" | "note" | "email">("note");
  const [converting, setConverting] = useState(false);

  // Form states
  const [dealTitle, setDealTitle] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [dealStageId, setDealStageId] = useState("");
  const [stages, setStages] = useState<{ id: string; name: string }[]>([]);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskPriority, setTaskPriority] = useState("medium");
  const [activityTitle, setActivityTitle] = useState("");
  const [activityDesc, setActivityDesc] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const fetchLead = useCallback(async () => {
    if (!leadId) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/leads/${leadId}`);
      const json = await res.json();
      if (json.success && json.lead) {
        setLead(json.lead);
      } else {
        setErrorMsg(json.error || "No se pudo cargar el prospecto.");
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Error de red al consultar prospecto.");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  // Carga etapas del pipeline para crear deals
  useEffect(() => {
    fetch("/api/pipeline")
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.stages)) {
          setStages(json.stages.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
          if (json.stages.length > 0) setDealStageId(json.stages[0].id);
        }
      })
      .catch(console.error);
  }, []);

  const showToast = (text: string, type: "success" | "error" = "success") => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  };

  const [assigningRoundRobin, setAssigningRoundRobin] = useState(false);

  const handleRoundRobinAssign = async () => {
    if (!lead) return;
    setAssigningRoundRobin(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/round-robin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ forceReassign: Boolean(lead.owner) }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.lead) {
        setLead(data.lead);
        showToast(
          data.result?.instantContactSent
            ? `Asignado a ${data.lead.owner?.name || "asesor"} y SMS de bienvenida enviado.`
            : `Asignado a ${data.lead.owner?.name || "asesor"} mediante Round-Robin.`,
          "success"
        );
        fetchLead();
      } else {
        showToast(data.error || "No se pudo asignar el asesor.", "error");
      }
    } catch {
      showToast("Error de conexión al asignar por Round-Robin.", "error");
    } finally {
      setAssigningRoundRobin(false);
    }
  };

  const handleConvert = async () => {
    if (!lead) return;
    if (!confirm(`¿Convertir a ${lead.name} en Cliente formal y abrir un negocio en el Pipeline?`)) return;
    try {
      setConverting(true);
      const res = await fetch(`/api/leads/${lead.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: lead.companyName || lead.name,
          opportunityTitle: `Negocio con ${lead.name}`,
          opportunityValue: lead.estimatedValue || 1000,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("¡Prospecto convertido exitosamente a Cliente y Negocio!", "success");
        fetchLead();
      } else {
        showToast(json.error || "Error al convertir prospecto.", "error");
      }
    } catch {
      showToast("Error de conexión al convertir prospecto.", "error");
    } finally {
      setConverting(false);
    }
  };

  const handleCreateDeal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !dealTitle.trim() || !dealStageId) return;
    try {
      setSubmittingAction(true);
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: dealTitle.trim(),
          value: parseFloat(dealValue) || 0,
          stageId: dealStageId,
          leadId: lead.id,
          probability: 60,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Negocio creado correctamente", "success");
        setIsDealModalOpen(false);
        setDealTitle("");
        setDealValue("");
        fetchLead();
      } else {
        showToast(json.error || "No se pudo crear el negocio.", "error");
      }
    } catch {
      showToast("Error al conectar con el servidor.", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !taskTitle.trim()) return;
    try {
      setSubmittingAction(true);
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle.trim(),
          leadId: lead.id,
          priority: taskPriority,
          dueDate: taskDueDate || null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Tarea registrada correctamente", "success");
        setIsTaskModalOpen(false);
        setTaskTitle("");
        setTaskDueDate("");
        fetchLead();
      } else {
        showToast(json.error || "No se pudo crear la tarea.", "error");
      }
    } catch {
      showToast("Error al conectar con el servidor.", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !activityTitle.trim()) return;
    try {
      setSubmittingAction(true);
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: activityTitle.trim(),
          description: activityDesc.trim() || null,
          type: activityType,
          leadId: lead.id,
          outcome: "completed",
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast("Actividad guardada correctamente", "success");
        setIsActivityModalOpen(false);
        setActivityTitle("");
        setActivityDesc("");
        fetchLead();
      } else {
        showToast(json.error || "No se pudo registrar la actividad.", "error");
      }
    } catch {
      showToast("Error al conectar con el servidor.", "error");
    } finally {
      setSubmittingAction(false);
    }
  };

  const handleToggleTask = async (task: LeadTask) => {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        fetchLead();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Filtrado de actividades según tab central
  const filteredActivities = useMemo(() => {
    if (!lead?.activities) return [];
    if (activeTab === "activity") return lead.activities;
    if (activeTab === "calls") return lead.activities.filter((a) => a.type === "call");
    if (activeTab === "emails") return lead.activities.filter((a) => a.type === "email");
    if (activeTab === "notes") return lead.activities.filter((a) => a.type === "note");
    return lead.activities;
  }, [lead?.activities, activeTab]);

  // Próximas actividades (tareas pendientes o reuniones)
  const upcomingTasks = useMemo(() => {
    if (!lead?.tasks) return [];
    return lead.tasks.filter((t) => t.status !== "completed");
  }, [lead?.tasks]);

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3 text-[#475467]">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
        <span className="text-sm font-medium text-[#101828]">Cargando expediente del prospecto...</span>
      </div>
    );
  }

  if (errorMsg || !lead) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
          <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
          <h2 className="text-base font-bold">Prospecto no disponible</h2>
          <p className="text-xs text-amber-800 leading-relaxed">
            {errorMsg || "El prospecto no existe o no cuentas con permisos para visualizarlo."}
          </p>
        </div>
        <Link
          href="/crm/leads"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101828] text-white text-xs font-semibold hover:bg-black"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver a prospectos</span>
        </Link>
      </div>
    );
  }

  const waNumber = lead.normalizedPhone || lead.phone?.replace(/\D/g, "");

  return (
    <div className="space-y-6 animate-in fade-in duration-200 max-w-[1600px] mx-auto pb-12">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-center justify-between shadow-sm animate-in slide-in-from-top-2 ${
            feedback.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 3-Column Architecture: InsightCRM Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* COLUMNA 1: PERFIL & DATOS RÁPIDOS (Izquierda, 3 cols)     */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 space-y-4">
          <Link
            href="/crm/leads"
            className="inline-flex items-center gap-1.5 text-xs text-[#475467] hover:text-[#101828] font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a prospectos</span>
          </Link>

          {/* Tarjeta Principal de Perfil */}
          <div className="bg-white rounded-3xl border border-[#EAECF0] p-6 shadow-xs text-center space-y-4">
            {/* Avatar Central Circular Grande */}
            <div className="relative inline-block mx-auto">
              <LeadAvatar
                name={lead.name}
                avatarUrl={lead.avatarUrl}
                size="xl"
                className="border-2 border-white shadow-md"
              />
              <span
                className={`absolute bottom-1 right-2 w-4 h-4 rounded-full border-2 border-white ${
                  lead.status === "converted"
                    ? "bg-emerald-500"
                    : lead.status === "qualified"
                    ? "bg-blue-500"
                    : "bg-amber-500"
                }`}
                title={`Estado: ${lead.status}`}
              />
            </div>

            {/* Nombre y Rol / Empresa */}
            <div className="space-y-1">
              <h1 className="text-xl font-bold text-[#101828] tracking-tight">{lead.name}</h1>
              <p className="text-xs text-[#475467] font-medium">
                {lead.companyName || "Prospecto Comercial"}
              </p>
              {isAdmin && lead.client && (
                <span className="inline-block text-[10px] bg-[#F8F9FA] text-[#101828] font-semibold px-2.5 py-0.5 rounded-full border border-[#EAECF0] mt-1">
                  {lead.client.name}
                </span>
              )}
            </div>

            {/* Botones Redondos de Acción Rápida (Mail, Phone, More) */}
            <div className="flex items-center justify-center gap-2.5 pt-1">
              {lead.email ? (
                <a
                  href={`mailto:${lead.email}`}
                  title={`Enviar correo a ${lead.email}`}
                  className="w-10 h-10 rounded-full bg-white border border-[#EAECF0] hover:border-[#101828] hover:bg-[#F8F9FA] flex items-center justify-center text-[#101828] transition-colors shadow-2xs"
                >
                  <Mail className="w-4 h-4 text-[#475467]" />
                </a>
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#F8F9FA] border border-[#EAECF0] flex items-center justify-center text-[#C7C5BE] cursor-not-allowed">
                  <Mail className="w-4 h-4" />
                </div>
              )}

              {lead.phone ? (
                <a
                  href={`tel:${lead.phone}`}
                  title={`Llamar a ${lead.phone}`}
                  className="w-10 h-10 rounded-full bg-white border border-[#EAECF0] hover:border-[#101828] hover:bg-[#F8F9FA] flex items-center justify-center text-[#101828] transition-colors shadow-2xs"
                >
                  <Phone className="w-4 h-4 text-[#475467]" />
                </a>
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#F8F9FA] border border-[#EAECF0] flex items-center justify-center text-[#C7C5BE] cursor-not-allowed">
                  <Phone className="w-4 h-4" />
                </div>
              )}

              {waNumber && (
                <a
                  href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                    `Hola ${lead.name}, te escribo de Bunker Agency para dar seguimiento a tu requerimiento.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  title="Abrir chat en WhatsApp"
                  className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 flex items-center justify-center text-emerald-700 transition-colors shadow-2xs"
                >
                  <MessageCircle className="w-4 h-4 text-emerald-600" />
                </a>
              )}

              <button
                type="button"
                onClick={() => {
                  setActivityType("note");
                  setIsActivityModalOpen(true);
                }}
                title="Registrar nota o llamada"
                className="w-10 h-10 rounded-full bg-white border border-[#EAECF0] hover:border-[#101828] hover:bg-[#F8F9FA] flex items-center justify-center text-[#475467] transition-colors shadow-2xs"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Botón Principal: Convert to contract (Convertir a Negocio) */}
            <div className="pt-2">
              {lead.status === "converted" ? (
                <div className="w-full py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center justify-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Convertido a Cliente</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConvert}
                  disabled={converting}
                  className="w-full py-3 rounded-2xl btn-black-gold text-xs font-bold tracking-wide transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {converting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRightCircle className="w-4 h-4 text-amber-400" />
                      <span>Convertir a Contrato / Negocio</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Sub-tabs: Contacto (Address) / Empresa (Company) */}
            <div className="pt-2 text-left">
              <div className="flex border-b border-[#EAECF0] text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setLeftTab("address")}
                  className={`flex-1 pb-2.5 transition-colors relative text-center ${
                    leftTab === "address" ? "text-[#101828]" : "text-[#82807C] hover:text-[#101828]"
                  }`}
                >
                  <span>Contacto & Red</span>
                  {leftTab === "address" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-yellow-400" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setLeftTab("company")}
                  className={`flex-1 pb-2.5 transition-colors relative text-center ${
                    leftTab === "company" ? "text-[#101828]" : "text-[#82807C] hover:text-[#101828]"
                  }`}
                >
                  <span>Empresa & Pauta</span>
                  {leftTab === "company" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-yellow-400" />
                  )}
                </button>
              </div>

              {leftTab === "address" ? (
                <div className="pt-4 space-y-3 text-xs">
                  <div>
                    <div className="text-[10px] text-[#82807C] uppercase tracking-wider font-semibold">
                      Teléfono / WhatsApp
                    </div>
                    <div className="font-semibold text-[#101828] mt-0.5 font-mono">
                      {lead.phone || lead.normalizedPhone || "No registrado"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-[#82807C] uppercase tracking-wider font-semibold">
                      Correo Electrónico
                    </div>
                    <div className="font-semibold text-[#101828] mt-0.5 truncate">
                      {lead.email || "No registrado"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-[#82807C] uppercase tracking-wider font-semibold">
                      Canal de Captación
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <SocialNetworkIcon provider={lead.source} size="sm" />
                      <span className="font-semibold text-[#101828] uppercase">
                        {lead.source.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>

                  {lead.campaign && (
                    <div>
                      <div className="text-[10px] text-[#82807C] uppercase tracking-wider font-semibold">
                        Campaña de Origen
                      </div>
                      <div className="font-medium text-[#101828] mt-0.5 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-amber-500" />
                        <span>{lead.campaign}</span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#EAECF0]">
                    <div className="text-[10px] text-[#82807C] uppercase tracking-wider font-semibold">
                      Consentimiento Twilio / A2P 10DLC
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span
                        className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border shadow-2xs ${
                          lead.smsConsent !== false
                            ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                            : "bg-rose-50 text-rose-800 border-rose-200"
                        }`}
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>{lead.smsConsent !== false ? "SMS Autorizado (10DLC Opt-In)" : "Sin Consentimiento"}</span>
                      </span>
                    </div>
                    {lead.smsConsentAt && (
                      <p className="text-[10px] text-[#82807C] mt-1">
                        Registrado el {new Date(lead.smsConsentAt).toLocaleDateString("es-ES")} vía {lead.smsConsentSource || "formulario"}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="pt-4 space-y-3 text-xs">
                  <div>
                    <div className="text-[10px] text-[#82807C] uppercase tracking-wider font-semibold">
                      Empresa
                    </div>
                    <div className="font-semibold text-[#101828] mt-0.5">
                      {lead.companyName || "Sin especificar"}
                    </div>
                  </div>

                  <div>
                    <div className="text-[10px] text-[#82807C] uppercase tracking-wider font-semibold">
                      Presupuesto Estimado
                    </div>
                    <div className="font-semibold text-[#101828] mt-0.5 text-sm">
                      {fmtMoney(lead.estimatedValue || 0)} USD / mes
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between">
                      <div className="text-[10px] text-[#82807C] uppercase tracking-wider font-semibold">
                        Asesor Responsable
                      </div>
                      <button
                        type="button"
                        onClick={handleRoundRobinAssign}
                        disabled={assigningRoundRobin}
                        title="Distribuir equitativamente mediante Round-Robin"
                        className="text-[11px] font-bold text-amber-600 hover:text-amber-800 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        {assigningRoundRobin ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3 h-3" />
                        )}
                        <span>{lead.owner ? "Rotar (Round-Robin)" : "Auto-asignar"}</span>
                      </button>
                    </div>
                    <div className="font-semibold text-[#101828] mt-0.5">
                      {lead.owner ? `${lead.owner.name} (${lead.owner.role})` : "Sin asignar"}
                    </div>
                  </div>

                  {/* AI Qualification Bar */}
                  <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-amber-700">
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        Scoring Bunker AI
                      </span>
                      <span>{lead.qualification || 75}/100</span>
                    </div>
                    <div className="w-full bg-white h-2 rounded-full overflow-hidden border border-amber-200">
                      <div
                        className="h-full bg-gradient-to-r from-yellow-400 via-amber-500 to-amber-600 rounded-full"
                        style={{ width: `${Math.min(lead.qualification || 75, 100)}%` }}
                      />
                    </div>
                    {lead.aiSummary && (
                      <p className="text-[10px] text-[#475467] leading-relaxed pt-1">
                        {lead.aiSummary}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMNA 2: ACTIVIDAD & TIMELINE (Centro, 6 cols)          */}
        {/* ========================================================= */}
        <div className="lg:col-span-6 space-y-6">
          {/* Header Horizontal Tabs */}
          <div className="bg-white rounded-2xl border border-[#EAECF0] px-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-6 text-xs font-semibold">
              {(
                [
                  { id: "activity", label: "Actividad" },
                  { id: "calls", label: "Llamadas" },
                  { id: "emails", label: "Correos" },
                  { id: "tasks", label: "Tareas" },
                  { id: "notes", label: "Notas" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-3.5 relative transition-colors ${
                    activeTab === tab.id ? "text-[#101828] font-bold" : "text-[#82807C] hover:text-[#101828]"
                  }`}
                >
                  <span>{tab.label}</span>
                  {activeTab === tab.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-amber-500 to-yellow-400 shadow-sm" />
                  )}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                setActivityType("note");
                setIsActivityModalOpen(true);
              }}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5 text-amber-600" />
              <span>Registrar</span>
            </button>
          </div>

          {/* SECTION: Upcoming activity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#101828] tracking-tight">
                Próximas actividades ({upcomingTasks.length})
              </h2>
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="text-xs text-[#475467] hover:text-[#101828] flex items-center gap-1 font-medium"
              >
                <Plus className="w-3.5 h-3.5 text-amber-500" />
                <span>Nueva actividad</span>
              </button>
            </div>

            {upcomingTasks.length === 0 ? (
              <div className="p-5 rounded-2xl bg-white border border-[#EAECF0] text-center text-xs text-[#82807C]">
                No hay actividades ni llamadas pendientes programadas para este prospecto.
              </div>
            ) : (
              <div className="space-y-3">
                {upcomingTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-xs space-y-3 hover:border-[#C7C5BE] transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] flex items-center justify-center text-[#101828] shrink-0 mt-0.5">
                          {t.title.toLowerCase().includes("reunión") || t.title.toLowerCase().includes("meet") ? (
                            <Video className="w-4 h-4 text-amber-600" />
                          ) : t.title.toLowerCase().includes("llamada") ? (
                            <Phone className="w-4 h-4 text-blue-600" />
                          ) : (
                            <CheckSquare className="w-4 h-4 text-amber-500" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-xs font-bold text-[#101828] leading-snug">{t.title}</h3>
                          <p className="text-[11px] text-[#82807C]">
                            Asignado a: {t.user?.name || "Sin asignar"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {t.dueDate && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-lg bg-[#F8F9FA] text-[#4D4C48] border border-[#EAECF0] flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#475467]" />
                            <span>Vence: {new Date(t.dueDate).toLocaleDateString("es-CO")}</span>
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => handleToggleTask(t)}
                          className="px-2 py-1 rounded-lg text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        >
                          Completar
                        </button>
                      </div>
                    </div>

                    {t.description && (
                      <div className="p-3 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] text-xs text-[#4D4C48] leading-relaxed">
                        {t.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECTION: Activity history */}
          <div className="space-y-3">
            <h2 className="text-sm font-bold text-[#101828] tracking-tight">Historial de actividades</h2>

            {filteredActivities.length === 0 ? (
              <div className="p-5 rounded-2xl bg-white border border-[#EAECF0] text-center text-xs text-[#82807C]">
                Aún no hay actividades registradas en esta sección.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredActivities.map((act) => (
                  <div
                    key={act.id}
                    className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-xs flex items-start gap-3 hover:border-[#C7C5BE] transition-all"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] flex items-center justify-center text-[#101828] shrink-0 mt-0.5">
                      {act.type === "call" ? (
                        <Phone className="w-4 h-4 text-blue-600" />
                      ) : act.type === "meeting" ? (
                        <Video className="w-4 h-4 text-amber-600" />
                      ) : act.type === "email" ? (
                        <Mail className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <FileText className="w-4 h-4 text-amber-500" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-[#101828] leading-tight">{act.title}</h4>
                        <span className="text-[10px] text-[#82807C] shrink-0">
                          {timeAgo(act.performedAt)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#82807C] mt-0.5">
                        Por {act.user?.name || "Asesor comercial"}
                      </p>
                      {act.description && (
                        <p className="text-xs text-[#4D4C48] mt-2 whitespace-pre-line leading-relaxed">
                          {act.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMNA 3: DEALS & TICKETS (Derecha, 3 cols)              */}
        {/* ========================================================= */}
        <div className="lg:col-span-3 space-y-6">
          {/* SECCIÓN 1: DEALS (Negocios) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#101828] tracking-tight">Deals (Negocios)</h2>
              <Link
                href="/crm/pipeline"
                className="text-xs text-[#475467] hover:text-[#101828] flex items-center gap-0.5 font-medium"
              >
                <span>Ver todos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setIsDealModalOpen(true)}
              className="w-full py-2.5 rounded-2xl bg-white border border-[#EAECF0] hover:bg-[#F8F9FA] text-[#101828] text-xs font-bold tracking-tight shadow-xs flex items-center justify-center gap-1.5 transition-colors hover:border-amber-400/50"
            >
              <Plus className="w-4 h-4 text-amber-500" />
              <span>Crear nuevo negocio</span>
            </button>

            {lead.opportunities.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] text-center text-xs text-[#82807C]">
                Sin negocios abiertos aún.
              </div>
            ) : (
              <div className="space-y-3">
                {lead.opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-xs space-y-2 hover:border-[#C7C5BE] transition-all"
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#82807C]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(opp.createdAt).toLocaleDateString("es-CO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span className="font-bold text-[#101828] text-xs">
                        {fmtMoney(opp.value)}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-[#101828]">{opp.title}</h3>

                    <div className="flex items-center justify-between pt-1 border-t border-[#F0EFEA] text-[11px]">
                      <span className="text-[#82807C] truncate">{lead.name}</span>
                      <span
                        className="font-bold px-2 py-0.5 rounded-full text-[10px]"
                        style={{
                          backgroundColor: opp.stage?.color ? `${opp.stage.color}15` : "#FEF3C7",
                          color: opp.stage?.color || "#B45309",
                        }}
                      >
                        {opp.stage?.name || "En negociación"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SECCIÓN 2: TICKETS (Tareas & Casos de Seguimiento) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-[#101828] tracking-tight">Tickets (Tareas)</h2>
              <Link
                href="/crm/tasks"
                className="text-xs text-[#475467] hover:text-[#101828] flex items-center gap-0.5 font-medium"
              >
                <span>Ver todos</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setIsTaskModalOpen(true)}
              className="w-full py-2.5 rounded-2xl bg-white border border-[#EAECF0] hover:bg-[#F8F9FA] text-[#101828] text-xs font-bold tracking-tight shadow-xs flex items-center justify-center gap-1.5 transition-colors hover:border-amber-400/50"
            >
              <Plus className="w-4 h-4 text-amber-500" />
              <span>Crear nuevo ticket</span>
            </button>

            {lead.tasks.length === 0 ? (
              <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] text-center text-xs text-[#82807C]">
                Sin tareas ni tickets registrados.
              </div>
            ) : (
              <div className="space-y-3">
                {lead.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-xs space-y-2 hover:border-[#C7C5BE] transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          task.status === "completed"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {task.status === "completed" ? "Completado" : "Pendiente"}
                      </span>
                      {task.dueDate && (
                        <span className="text-[10px] text-[#82807C] font-mono">
                          {new Date(task.dueDate).toLocaleDateString("es-CO")}
                        </span>
                      )}
                    </div>

                    <h4 className="text-xs font-bold text-[#101828] leading-snug">{task.title}</h4>

                    {task.description && (
                      <p className="text-[11px] text-[#6B6966] line-clamp-2 leading-relaxed">
                        {task.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* MODAL: CREAR DEAL (OPORTUNIDAD)                           */}
      {/* ========================================================= */}
      {isDealModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EAECF0] max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#F0EFEA] pb-3">
              <h3 className="text-base font-bold text-[#101828]">Crear nuevo negocio</h3>
              <button onClick={() => setIsDealModalOpen(false)} className="text-[#82807C] hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateDeal} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#101828] mb-1">Título del Negocio *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Campaña Meta Ads Q4"
                  value={dealTitle}
                  onChange={(e) => setDealTitle(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#101828] mb-1">Monto Estimado ($ USD) *</label>
                <input
                  type="number"
                  required
                  placeholder="ej. 5000"
                  value={dealValue}
                  onChange={(e) => setDealValue(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#101828] mb-1">Etapa del Embudo *</label>
                <select
                  value={dealStageId}
                  onChange={(e) => setDealStageId(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                >
                  {stages.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsDealModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#EAECF0] hover:bg-[#F8F9FA] font-semibold text-[#475467]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 rounded-xl btn-black-gold font-bold"
                >
                  {submittingAction ? "Guardando..." : "Crear Negocio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CREAR TICKET / TAREA                               */}
      {/* ========================================================= */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EAECF0] max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#F0EFEA] pb-3">
              <h3 className="text-base font-bold text-[#101828]">Crear nueva tarea / ticket</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-[#82807C] hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#101828] mb-1">Título de la Tarea *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Enviar propuesta comercial por WhatsApp"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#101828] mb-1">Prioridad</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs focus:outline-none"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[#101828] mb-1">Fecha Límite</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#EAECF0] hover:bg-[#F8F9FA] font-semibold text-[#475467]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 rounded-xl btn-black-gold font-bold"
                >
                  {submittingAction ? "Guardando..." : "Crear Tarea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: REGISTRAR ACTIVIDAD (LLAMADA, REUNIÓN, NOTA)       */}
      {/* ========================================================= */}
      {isActivityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EAECF0] max-w-md w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-[#F0EFEA] pb-3">
              <h3 className="text-base font-bold text-[#101828]">Registrar actividad comercial</h3>
              <button onClick={() => setIsActivityModalOpen(false)} className="text-[#82807C] hover:text-black">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateActivity} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#101828] mb-1">Tipo de Actividad</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "note", label: "Nota" },
                    { id: "call", label: "Llamada" },
                    { id: "meeting", label: "Reunión" },
                    { id: "email", label: "Correo" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setActivityType(t.id as "note" | "call" | "meeting" | "email")}
                      className={`py-2 rounded-xl font-bold border transition-all ${
                        activityType === t.id
                          ? "bg-[#101828] text-amber-400 border-amber-500/50 shadow-sm"
                          : "bg-white text-[#475467] border-[#EAECF0] hover:bg-[#F8F9FA]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#101828] mb-1">Título o Resumen *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Llamada de calificación de requerimiento"
                  value={activityTitle}
                  onChange={(e) => setActivityTitle(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#101828] mb-1">Detalle / Conclusiones</label>
                <textarea
                  rows={3}
                  placeholder="Anota acuerdos, fechas o temas clave discutidos..."
                  value={activityDesc}
                  onChange={(e) => setActivityDesc(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsActivityModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#EAECF0] hover:bg-[#F8F9FA] font-semibold text-[#475467]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-5 py-2 rounded-xl btn-black-gold font-bold"
                >
                  {submittingAction ? "Guardando..." : "Guardar Actividad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
