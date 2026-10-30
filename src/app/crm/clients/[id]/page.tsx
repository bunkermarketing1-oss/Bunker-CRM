"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ROUTES, leadSearchRoute } from "@/lib/constants/routes";
import { useAuth } from "@/context/AuthContext";
import { useClientPortalUsers } from "@/hooks/useClientPortalUsers";
import { ClientPortalUsersPanel } from "@/components/clients/ClientPortalUsersPanel";
import { useParams, useRouter } from "next/navigation";
import { ClientAiAssistantPanel } from "@/components/clients/ClientAiAssistantPanel";
import { SocialNetworkIcon } from "@/components/common/SocialNetworkIcon";
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  Globe,
  User,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Plus,
  Edit,
  Trash2,
  X,
  Star,
  MessageSquare,
  Video,
  FileText,
  Send,
  Briefcase,
  CheckSquare,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Shield,
  Tag,
  Check,
  AlertCircle,
  Sparkles,
  Share2,
  Camera,
  Upload,
} from "lucide-react";

interface ConnectedAccountItem {
  id: string;
  accountName: string;
  accountType: string | null;
  externalId: string | null;
  status: string;
  integration?: { provider: string; name: string } | null;
}

interface ClientLeadItem {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
  qualification: number;
  status: string;
  campaign: string | null;
  createdAt: string;
}

interface Contact {
  id: string;
  clientId: string | null;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  isPrimary: boolean;
  createdAt: string;
}

interface PipelineStage {
  id: string;
  name: string;
  color: string;
  order?: number;
}

interface Opportunity {
  id: string;
  title: string;
  value: number;
  probability: number;
  expectedClose: string | null;
  status: string; // open, won, lost
  createdAt: string;
  stageId: string;
  stage?: PipelineStage;
}

interface ActivityItem {
  id: string;
  type: string; // call, meeting, email, note, follow_up, sms
  title: string;
  description: string | null;
  outcome: string | null;
  performedAt: string;
  createdAt: string;
  user?: { id: string; name: string; role?: string } | null;
}

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: string; // low, medium, high, urgent
  status: string; // pending, completed, cancelled
  completedAt: string | null;
  createdAt: string;
  user?: { id: string; name: string } | null;
}

interface ClientDetail {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  logoUrl?: string | null;
  status: string; // active, on_hold, churned
  revenue: number | null;
  notes: string | null;
  isDemo: boolean;
  createdAt: string;
  updatedAt: string;
  ownerId: string | null;
  owner?: { id: string; name: string; email: string; role?: string } | null;
  contacts?: Contact[];
  opportunities?: Opportunity[];
  activities?: ActivityItem[];
  tasks?: TaskItem[];
  connectedAccounts?: ConnectedAccountItem[];
  leads?: ClientLeadItem[];
}

interface UserMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ClientProfile360Page() {
  const params = useParams();
  const router = useRouter();
  const clientId = params?.id as string;
  const { user } = useAuth();
  // Solo Bunker ve la pestaña del asistente de IA y asigna roles del portal (asesor ↔ dueño);
  // las APIs también lo exigen.
  const isBunkerUser = Boolean(user && !user.isClientUser);
  const isAdmin = isBunkerUser;
  const portalUsers = useClientPortalUsers(clientId, isBunkerUser);

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // 3-Column Layout Tabs: Left profile sub-tab & Center feed tab
  const [leftTab, setLeftTab] = useState<"contact" | "company" | "portal">("contact");
  const [centerTab, setCenterTab] = useState<"activity" | "calls" | "meetings" | "notes" | "ads_leads" | "ai_assistant">("activity");

  // Auxiliary data
  const [teamMembers, setTeamMembers] = useState<UserMember[]>([]);
  const [pipelineStages, setPipelineStages] = useState<PipelineStage[]>([]);

  // Modals state
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [editClientData, setEditClientData] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    website: "",
    logoUrl: "",
    industry: "",
    status: "active",
    revenue: "0",
    notes: "",
    ownerId: "",
  });
  const [submittingClientEdit, setSubmittingClientEdit] = useState(false);

  // Contact modal state
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactFormData, setContactFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    isPrimary: false,
  });
  const [submittingContact, setSubmittingContact] = useState(false);

  // Quick Activity form state
  const [newActivity, setNewActivity] = useState({
    type: "call",
    title: "",
    description: "",
  });
  const [submittingActivity, setSubmittingActivity] = useState(false);

  // Opportunity modal state
  const [isOppModalOpen, setIsOppModalOpen] = useState(false);
  const [oppFormData, setOppFormData] = useState({
    title: "",
    value: "2500",
    stageId: "",
    probability: "50",
    expectedClose: "",
  });
  const [submittingOpp, setSubmittingOpp] = useState(false);

  // Task modal state
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium",
  });
  const [submittingTask, setSubmittingTask] = useState(false);

  // Load Client Details
  const fetchClientData = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/clients/${clientId}`);
      const json = await res.json();
      if (res.status === 404 || !json.success) {
        setErrorMsg(json.error || "Cliente no encontrado o no pertenece a su organización.");
        setClient(null);
      } else {
        setClient(json.client);
        setEditClientData({
          name: json.client.name || "",
          companyName: json.client.companyName || "",
          email: json.client.email || "",
          phone: json.client.phone || "",
          website: json.client.website || "",
          logoUrl: json.client.logoUrl || "",
          industry: json.client.industry || "General",
          status: json.client.status || "active",
          revenue: String(json.client.revenue || 0),
          notes: json.client.notes || "",
          ownerId: json.client.ownerId || "",
        });
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error al cargar la ficha del cliente.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  // Load Team Members & Pipeline Stages
  useEffect(() => {
    fetchClientData();

    // Fetch team
    fetch("/api/users?scope=bunker")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.users)) setTeamMembers(j.users);
      })
      .catch(() => {});

    // Fetch pipeline stages
    fetch("/api/pipeline")
      .then((r) => r.json())
      .then((j) => {
        if (j.success && Array.isArray(j.stages)) {
          setPipelineStages(j.stages);
          if (j.stages.length > 0) {
            setOppFormData((prev) => ({ ...prev, stageId: j.stages[0].id }));
          }
        }
      })
      .catch(() => {});
  }, [fetchClientData]);

  // Toast feedback helper
  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4500);
  };

  // 1. Edit Client Details (PUT /api/clients/[id])
  const handleSaveClientDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingClientEdit(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editClientData.name,
          companyName: editClientData.companyName,
          email: editClientData.email,
          phone: editClientData.phone,
          website: editClientData.website,
          logoUrl: editClientData.logoUrl || null,
          industry: editClientData.industry,
          status: editClientData.status,
          revenue: editClientData.revenue,
          notes: editClientData.notes,
          ownerId: editClientData.ownerId || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsEditClientOpen(false);
        showFeedback("Ficha del cliente actualizada exitosamente.");
        fetchClientData();
      } else {
        showFeedback(json.error || "No se pudo actualizar la ficha.", "error");
      }
    } catch (e) {
      showFeedback("Error: " + (e instanceof Error ? e.message : "Error inesperado"), "error");
    } finally {
      setSubmittingClientEdit(false);
    }
  };

  // 2. Save Contact (Create / Edit via /api/contacts)
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingContact(true);
    try {
      const isEditing = Boolean(editingContact);
      const url = "/api/contacts";
      const method = isEditing ? "PUT" : "POST";
      const payload: any = {
        firstName: contactFormData.firstName,
        lastName: contactFormData.lastName,
        email: contactFormData.email,
        phone: contactFormData.phone,
        jobTitle: contactFormData.jobTitle,
        isPrimary: contactFormData.isPrimary,
      };

      if (isEditing) {
        payload.id = editingContact!.id;
      } else {
        payload.clientId = clientId;
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setIsContactModalOpen(false);
        setEditingContact(null);
        showFeedback(isEditing ? "Contacto actualizado." : "Nuevo contacto asociado con éxito.");
        fetchClientData();
      } else {
        showFeedback(json.error || "Error al guardar contacto.", "error");
      }
    } catch (e) {
      showFeedback("Error: " + (e instanceof Error ? e.message : "Error inesperado"), "error");
    } finally {
      setSubmittingContact(false);
    }
  };

  const handleMakePrimaryContact = async (contactId: string) => {
    try {
      const res = await fetch("/api/contacts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: contactId, isPrimary: true }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback("Contacto designado como principal.");
        fetchClientData();
      } else {
        showFeedback(json.error || "Error al actualizar contacto principal.", "error");
      }
    } catch (e) {
      showFeedback("Error: " + (e instanceof Error ? e.message : "Error inesperado"), "error");
    }
  };

  const handleDeleteContact = async (contactId: string, name: string) => {
    if (!confirm(`¿Eliminar al contacto "${name}" de esta cuenta?`)) return;
    try {
      const res = await fetch(`/api/contacts?id=${contactId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showFeedback("Contacto eliminado.");
        fetchClientData();
      } else {
        showFeedback(json.error || "No se pudo eliminar el contacto.", "error");
      }
    } catch (e) {
      showFeedback("Error: " + (e instanceof Error ? e.message : "Error inesperado"), "error");
    }
  };

  // 3. Register Activity (POST /api/activities)
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActivity.title.trim()) return;
    setSubmittingActivity(true);
    try {
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          type: newActivity.type,
          title: newActivity.title.trim(),
          description: newActivity.description.trim() || null,
          outcome: "completed",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNewActivity({ type: "call", title: "", description: "" });
        showFeedback("Actividad registrada en la cronología 360°.");
        fetchClientData();
      } else {
        showFeedback(json.error || "Error al guardar actividad.", "error");
      }
    } catch (e) {
      showFeedback("Error: " + (e instanceof Error ? e.message : "Error inesperado"), "error");
    } finally {
      setSubmittingActivity(false);
    }
  };

  // 4. Create Opportunity (POST /api/pipeline)
  const handleCreateOpportunity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!oppFormData.title.trim() || !oppFormData.stageId) return;
    setSubmittingOpp(true);
    try {
      const res = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          title: oppFormData.title.trim(),
          stageId: oppFormData.stageId,
          value: parseFloat(oppFormData.value) || 0,
          probability: parseInt(oppFormData.probability, 10) || 50,
          expectedClose: oppFormData.expectedClose || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsOppModalOpen(false);
        setOppFormData({
          title: "",
          value: "2500",
          stageId: pipelineStages[0]?.id || "",
          probability: "50",
          expectedClose: "",
        });
        showFeedback("Oportunidad registrada y vinculada al pipeline.");
        fetchClientData();
      } else {
        showFeedback(json.error || "Error al registrar oportunidad.", "error");
      }
    } catch (e) {
      showFeedback("Error: " + (e instanceof Error ? e.message : "Error inesperado"), "error");
    } finally {
      setSubmittingOpp(false);
    }
  };

  // Update opportunity status (open, won, lost)
  const handleUpdateOppStatus = async (oppId: string, nextStatus: "open" | "won" | "lost") => {
    try {
      const res = await fetch("/api/pipeline", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: oppId, status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback(`Oportunidad marcada como "${nextStatus.toUpperCase()}".`);
        fetchClientData();
      } else {
        showFeedback(json.error || "Error al actualizar oportunidad.", "error");
      }
    } catch (e) {
      showFeedback("Error: " + (e instanceof Error ? e.message : "Error inesperado"), "error");
    }
  };

  // 5. Create Task (POST /api/tasks)
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskFormData.title.trim()) return;
    setSubmittingTask(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          title: taskFormData.title.trim(),
          description: taskFormData.description.trim() || null,
          dueDate: taskFormData.dueDate || null,
          priority: taskFormData.priority,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsTaskModalOpen(false);
        setTaskFormData({ title: "", description: "", dueDate: "", priority: "medium" });
        showFeedback("Tarea comercial agendada.");
        fetchClientData();
      } else {
        showFeedback(json.error || "Error al agendar tarea.", "error");
      }
    } catch (e) {
      showFeedback("Error: " + (e instanceof Error ? e.message : "Error inesperado"), "error");
    } finally {
      setSubmittingTask(false);
    }
  };

  // Toggle Task Completion
  const handleToggleTask = async (task: TaskItem) => {
    const nextStatus = task.status === "completed" ? "pending" : "completed";
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        showFeedback(nextStatus === "completed" ? "Tarea completada." : "Tarea reabierta.");
        fetchClientData();
      } else {
        showFeedback(json.error || "Error al actualizar tarea.", "error");
      }
    } catch (e) {
      showFeedback("Error: " + (e instanceof Error ? e.message : "Error inesperado"), "error");
    }
  };

  // Metrics summary for this specific client
  const clientMetrics = useMemo(() => {
    if (!client) return { openOppsCount: 0, openOppsValue: 0, wonOppsValue: 0, pendingTasksCount: 0 };
    const openOpps = client.opportunities?.filter((o) => o.status === "open") || [];
    const wonOpps = client.opportunities?.filter((o) => o.status === "won") || [];
    const pendingTasks = client.tasks?.filter((t) => t.status === "pending") || [];

    const openOppsValue = openOpps.reduce((sum, o) => sum + (o.value || 0), 0);
    const wonOppsValue = wonOpps.reduce((sum, o) => sum + (o.value || 0), 0);

    return {
      openOppsCount: openOpps.length,
      openOppsValue,
      wonOppsValue,
      pendingTasksCount: pendingTasks.length,
    };
  }, [client]);

  

  // Pending tasks & filtered activities for the 3-column feed
  const pendingTasks = useMemo(() => {
    return (client?.tasks || []).filter((t) => t.status !== "completed");
  }, [client?.tasks]);

  const activitiesToDisplay = useMemo(() => {
    const list = client?.activities || [];
    if (centerTab === "calls") return list.filter((a) => a.type === "call");
    if (centerTab === "meetings") return list.filter((a) => a.type === "meeting");
    if (centerTab === "notes") return list.filter((a) => a.type === "note");
    return list;
  }, [client?.activities, centerTab]);

  // Loading Screen
  if (loading) {
    return (
      <div className="py-24 text-center text-[#9C9890] text-xs flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-amber-500" />
        <span>Cargando Ficha Comercial 360° del Cliente...</span>
      </div>
    );
  }

  // Error / Tenant Not Found Safe Screen (Fase I & C)
  if (errorMsg || !client) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center space-y-4">
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 space-y-2">
          <Shield className="w-8 h-8 text-rose-600 mx-auto" />
          <h2 className="font-semibold text-base text-rose-900">Acceso No Disponible</h2>
          <p className="text-xs text-rose-700 leading-relaxed">
            {errorMsg || "El cliente solicitado no existe o no pertenece a la organización autenticada."}
          </p>
        </div>
        <Link
          href="/crm/clients"
          className="btn-black-gold inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Volver al Directorio de Clientes</span>
        </Link>
      </div>
    );
  }

  // Status Styling Badge
  let statusBadge = { label: "ACTIVO", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
  if (client.status === "on_hold") {
    statusBadge = { label: "EN PAUSA", cls: "bg-amber-50 text-amber-700 border-amber-200" };
  } else if (client.status === "churned") {
    statusBadge = { label: "CANCELADO", cls: "bg-rose-50 text-rose-700 border-rose-200" };
  }

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Toast Feedback */}
      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-xs ${
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

      {/* 3-Column Modern Architecture (InsightCRM Style) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* ========================================================= */}
        {/* COLUMNA 1: PERFIL & DATOS RÁPIDOS (Izquierda, 3 cols)     */}
        {/* ========================================================= */}
        <div className="xl:col-span-3 space-y-4">
          <Link
            href="/crm/clients"
            className="inline-flex items-center gap-1.5 text-xs text-[#475467] hover:text-[#101828] font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a clientes</span>
          </Link>

          <div className="bg-white rounded-2xl border border-[#EAECF0] p-5 shadow-xs text-center space-y-4">
            {/* Avatar Central Grande con Badge de Estado y Botón de Foto */}
            <div className="relative inline-block mx-auto group">
              {client.logoUrl ? (
                <img
                  src={client.logoUrl}
                  alt={client.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md mx-auto"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-[#0F172A] to-slate-800 border-2 border-white shadow-md flex items-center justify-center text-2xl font-bold text-amber-400 mx-auto">
                  {client.name.charAt(0).toUpperCase()}
                </div>
              )}
              <span
                className={`absolute bottom-0 right-1 w-4 h-4 rounded-full border-2 border-white ${
                  client.status === "active"
                    ? "bg-emerald-500"
                    : client.status === "on_hold"
                    ? "bg-amber-500"
                    : "bg-rose-500"
                }`}
                title={`Estado: ${statusBadge.label}`}
              />
              <button
                type="button"
                onClick={() => setIsEditClientOpen(true)}
                className="absolute inset-0 bg-black/55 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[10px] font-medium transition-opacity cursor-pointer shadow-sm"
                title="Cambiar foto o información"
              >
                <Camera className="w-5 h-5 text-amber-400 mb-0.5" />
                <span>Foto</span>
              </button>
            </div>

            {/* Nombre y Cargo/Empresa */}
            <div className="space-y-0.5">
              <h1 className="text-base font-bold text-[#101828] tracking-tight">
                {client.name}
              </h1>
              <p className="text-xs text-[#475467] font-medium truncate">
                {client.companyName && client.companyName.trim().toLowerCase() !== client.name.trim().toLowerCase()
                  ? client.companyName
                  : client.industry || "Cliente Comercial"}
              </p>
              {client.isDemo && (
                <span className="inline-block text-[9px] bg-[#FBF1ED] text-[#C15F3C] font-semibold px-2 py-0.5 rounded-full border border-[#F3D6CB] mt-1">
                  DEMO
                </span>
              )}
            </div>

            {/* Botones Redondos de Acción Rápida */}
            <div className="flex items-center justify-center gap-2 pt-1">
              {client.email ? (
                <a
                  href={`mailto:${client.email}`}
                  title={`Enviar correo a ${client.email}`}
                  className="w-9 h-9 rounded-full bg-white border border-[#EAECF0] hover:border-[#101828] hover:bg-[#F8F9FA] flex items-center justify-center text-[#101828] transition-colors shadow-2xs"
                >
                  <Mail className="w-4 h-4 text-[#475467]" />
                </a>
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#F8F9FA] border border-[#EAECF0] flex items-center justify-center text-[#C7C5BE] cursor-not-allowed">
                  <Mail className="w-4 h-4" />
                </div>
              )}

              {client.phone ? (
                <a
                  href={`tel:${client.phone}`}
                  title={`Llamar a ${client.phone}`}
                  className="w-9 h-9 rounded-full bg-white border border-[#EAECF0] hover:border-[#101828] hover:bg-[#F8F9FA] flex items-center justify-center text-[#101828] transition-colors shadow-2xs"
                >
                  <Phone className="w-4 h-4 text-[#475467]" />
                </a>
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#F8F9FA] border border-[#EAECF0] flex items-center justify-center text-[#C7C5BE] cursor-not-allowed">
                  <Phone className="w-4 h-4" />
                </div>
              )}

              {client.website ? (
                <a
                  href={client.website}
                  target="_blank"
                  rel="noreferrer"
                  title={`Visitar ${client.website}`}
                  className="w-9 h-9 rounded-full bg-white border border-[#EAECF0] hover:border-[#101828] hover:bg-[#F8F9FA] flex items-center justify-center text-[#101828] transition-colors shadow-2xs"
                >
                  <Globe className="w-4 h-4 text-[#475467]" />
                </a>
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#F8F9FA] border border-[#EAECF0] flex items-center justify-center text-[#C7C5BE] cursor-not-allowed">
                  <Globe className="w-4 h-4" />
                </div>
              )}

              <button
                type="button"
                onClick={() => setIsEditClientOpen(true)}
                title="Editar datos del cliente"
                className="w-9 h-9 rounded-full bg-white border border-[#EAECF0] hover:border-[#101828] hover:bg-[#F8F9FA] flex items-center justify-center text-[#101828] transition-colors shadow-2xs"
              >
                <Edit className="w-4 h-4 text-[#475467]" />
              </button>
            </div>

            {/* Botón Principal (Convertir a Oportunidad / Nueva Oportunidad) */}
            <button
              type="button"
              onClick={() => setIsOppModalOpen(true)}
              className="w-full py-2.5 px-4 rounded-xl bg-[#101828] hover:bg-[#222222] text-[#F8F9FA] text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-amber-500" />
              <span>Nueva Oportunidad</span>
            </button>

            {/* Sub-Pestañas: Contacto | Empresa | Portal */}
            <div className="pt-2 border-t border-[#F0EEE8]">
              <div className="flex items-center justify-around border-b border-[#F0EEE8] pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setLeftTab("contact")}
                  className={`pb-1 font-semibold transition-colors border-b-2 ${
                    leftTab === "contact"
                      ? "border-[#101828] text-[#101828]"
                      : "border-transparent text-[#667085] hover:text-[#101828]"
                  }`}
                >
                  Contacto
                </button>
                <button
                  type="button"
                  onClick={() => setLeftTab("company")}
                  className={`pb-1 font-semibold transition-colors border-b-2 ${
                    leftTab === "company"
                      ? "border-[#101828] text-[#101828]"
                      : "border-transparent text-[#667085] hover:text-[#101828]"
                  }`}
                >
                  Empresa
                </button>
                {isBunkerUser && (
                  <button
                    type="button"
                    onClick={() => setLeftTab("portal")}
                    className={`pb-1 font-semibold transition-colors border-b-2 ${
                      leftTab === "portal"
                        ? "border-[#101828] text-[#101828]"
                        : "border-transparent text-[#667085] hover:text-[#101828]"
                    }`}
                  >
                    Portal ({portalUsers.users.length})
                  </button>
                )}
              </div>

              {/* Contenido Clave-Valor sin textos innecesarios */}
              <div className="pt-3 text-left">
                {leftTab === "contact" && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block">
                        Correo
                      </span>
                      <span className="text-[#101828] font-medium break-all">
                        {client.email || "Sin registrar"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block">
                        Teléfono
                      </span>
                      <span className="text-[#101828] font-medium">
                        {client.phone || "Sin registrar"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block">
                        Brand Manager en Bunker
                      </span>
                      {isBunkerUser ? (
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[#101828] font-semibold">
                            {client.owner?.name || "Sin asignar (Agencia General)"}
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEditClientOpen(true)}
                            className="text-[10px] text-amber-600 hover:text-amber-800 underline font-medium"
                          >
                            Asignar / Cambiar
                          </button>
                        </div>
                      ) : (
                        <span className="text-[#101828] font-medium">
                          {client.owner?.name || "Equipo de Bunker Agency"}
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block">
                        Cliente Desde
                      </span>
                      <span className="text-[#101828] font-medium">
                        {new Date(client.createdAt).toLocaleDateString("es-MX", { dateStyle: "medium" })}
                      </span>
                    </div>
                  </div>
                )}

                {leftTab === "company" && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block">
                        Razón Social
                      </span>
                      <span className="text-[#101828] font-medium">
                        {client.companyName || client.name}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block">
                        Industria / Sector
                      </span>
                      <span className="text-[#101828] font-medium">
                        {client.industry || "General"}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block">
                        Facturación Mensual
                      </span>
                      <span className="text-[#101828] font-bold text-sm">
                        ${(client.revenue || 0).toLocaleString("en-US")} USD
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block">
                        Pipeline Activo
                      </span>
                      <span className="text-blue-900 font-bold">
                        ${clientMetrics.openOppsValue.toLocaleString("en-US")} USD
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block">
                        ARR Anualizado
                      </span>
                      <span className="text-emerald-700 font-bold">
                        ${((client.revenue || 0) * 12).toLocaleString("en-US")} USD
                      </span>
                    </div>
                    {client.notes && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block">
                          Notas
                        </span>
                        <p className="text-[#475467] text-[11px] whitespace-pre-wrap mt-0.5 leading-relaxed bg-[#F8F9FA] p-2 rounded-lg border border-[#EAECF0]">
                          {client.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {leftTab === "portal" && (
                  <div className="space-y-2">
                    <ClientPortalUsersPanel
                      clientId={client?.id || clientId}
                      clientName={client?.name || client?.companyName || ""}
                      users={portalUsers.users}
                      error={portalUsers.error}
                      savingId={portalUsers.savingId}
                      onSetRole={portalUsers.setRole}
                      onCreateUser={portalUsers.createUser}
                      onGenerateResetLink={portalUsers.generateResetLink}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================= */}
        {/* COLUMNA 2: ACTIVIDAD & FEED CENTRAL (Centro, 6 cols)      */}
        {/* ========================================================= */}
        <div className="xl:col-span-6 space-y-4 min-w-0">
          {/* Pestañas Horizontales Superiores */}
          <div className="flex items-center gap-6 border-b border-[#EAECF0] pb-2 text-xs font-semibold overflow-x-auto no-scrollbar">
            {[
              { key: "activity", label: "Actividad", count: client.activities?.length || 0 },
              { key: "calls", label: "Llamadas", count: client.activities?.filter((a) => a.type === "call").length || 0 },
              { key: "meetings", label: "Reuniones", count: client.activities?.filter((a) => a.type === "meeting").length || 0 },
              { key: "notes", label: "Notas", count: client.activities?.filter((a) => a.type === "note").length || 0 },
              { key: "ads_leads", label: "Pautas & Leads", count: client.leads?.length || (client.connectedAccounts?.length || 0) },
              ...(isAdmin ? [{ key: "ai_assistant", label: "Asistente IA", count: null }] : []),
            ].map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setCenterTab(t.key as any)}
                className={`pb-2 transition-colors relative whitespace-nowrap ${
                  centerTab === t.key
                    ? "text-[#101828] font-bold border-b-2 border-[#101828]"
                    : "text-[#667085] hover:text-[#101828] border-b-2 border-transparent"
                }`}
              >
                <span>{t.label}</span>
                {t.count !== null && t.count > 0 && (
                  <span className="ml-1.5 text-[10px] font-normal text-[#667085]">
                    ({t.count})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Vistas del Feed */}
          {centerTab === "ads_leads" ? (
            /* Vista de Pautas y Leads en Vivo */
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white border border-[#EAECF0] shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE6]">
                  <h3 className="font-bold text-xs text-[#101828] flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    Cuentas Publicitarias Conectadas ({client.connectedAccounts?.length || 0})
                  </h3>
                  <Link
                    href={`/marketing/integrations?clientId=${client.id}`}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline"
                  >
                    + Vincular
                  </Link>
                </div>

                {(!client.connectedAccounts || client.connectedAccounts.length === 0) ? (
                  <p className="text-xs text-[#667085] text-center py-4">
                    No hay cuentas publicitarias de Meta o TikTok asignadas a este cliente.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {client.connectedAccounts.map((acc) => (
                      <div
                        key={acc.id}
                        className="p-3 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] flex items-center justify-between gap-2.5"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <SocialNetworkIcon type={acc.accountType || "meta_ad_account"} size="sm" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#101828] truncate">{acc.accountName}</p>
                            <span className="text-[10px] text-[#667085]">ID: {acc.externalId || "—"}</span>
                          </div>
                        </div>
                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex-shrink-0">
                          ● Activa
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Leads Recibidos */}
              <div className="p-5 rounded-2xl bg-white border border-[#EAECF0] shadow-xs space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-[#F0EEE6]">
                  <h3 className="font-bold text-xs text-[#101828] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-600" />
                    Leads Entrantes ({client.leads?.length || 0})
                  </h3>
                  <Link
                    href={ROUTES.LEADS}
                    className="text-xs font-semibold text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1"
                  >
                    <span>Ver todos</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                {(!client.leads || client.leads.length === 0) ? (
                  <p className="text-xs text-[#667085] text-center py-4">
                    Aún no se han captado leads de formularios para esta cuenta.
                  </p>
                ) : (
                  <div className="divide-y divide-[#F0EEE6]">
                    {client.leads.slice(0, 10).map((lead) => (
                      <div key={lead.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                        <div className="min-w-0">
                          <Link href={leadSearchRoute(lead.name)} className="font-bold text-[#101828] hover:text-amber-600 block truncate">
                            {lead.name}
                          </Link>
                          <span className="text-[10px] text-[#667085]">
                            {lead.campaign || lead.source} • {new Date(lead.createdAt).toLocaleDateString("es-MX", { dateStyle: "short" })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            ⚡ {lead.qualification}/100
                          </span>
                          {lead.phone && (
                            <a
                              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-semibold"
                            >
                              WhatsApp
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : centerTab === "ai_assistant" && isAdmin ? (
            /* Vista Asistente IA */
            <ClientAiAssistantPanel clientId={clientId} />
          ) : (
            /* Vista Principal de Actividad, Llamadas, Reuniones, Notas */
            <div className="space-y-5">
              {/* Registro Rápido de Interacción */}
              <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-[#F0EEE8]">
                  <Send className="w-3.5 h-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-[#101828]">Registrar Nueva Interacción</span>
                </div>
                <form onSubmit={handleCreateActivity} className="space-y-2.5">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <select
                      value={newActivity.type}
                      onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                      className="bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-2.5 py-1.5 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="call">📞 Llamada</option>
                      <option value="meeting">🤝 Reunión</option>
                      <option value="email">✉️ Correo</option>
                      <option value="note">📝 Nota interna</option>
                      <option value="follow_up">🎯 Seguimiento</option>
                    </select>
                    <input
                      type="text"
                      required
                      placeholder="Título o asunto..."
                      value={newActivity.title}
                      onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                      className="sm:col-span-2 bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-1.5 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <textarea
                    rows={2}
                    placeholder="Acuerdos, notas o próximos pasos..."
                    value={newActivity.description}
                    onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                    className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-1.5 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={submittingActivity}
                      className="btn-black-gold rounded-xl px-3.5 py-1.5 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                    >
                      <Send className="w-3 h-3 text-amber-500" />
                      <span>{submittingActivity ? "Guardando..." : "Guardar Actividad"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Próximas Actividades (Upcoming Activity - InsightCRM Style) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-[#101828]">Próximas Actividades</h3>
                  <span className="text-[11px] text-[#667085]">
                    {pendingTasks.length} {pendingTasks.length === 1 ? "tarea pendiente" : "tareas pendientes"}
                  </span>
                </div>

                {pendingTasks.length === 0 ? (
                  <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] text-xs text-[#667085] text-center">
                    No hay compromisos pendientes programados.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {pendingTasks.map((t) => (
                      <div
                        key={t.id}
                        className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-xs space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] flex items-center justify-center text-[#101828] shrink-0 font-bold text-xs">
                              <Clock className="w-4 h-4 text-amber-500" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-bold text-[#101828] truncate">{t.title}</h4>
                              <p className="text-[10px] text-[#667085]">
                                Asignado a: {t.user?.name || "Asesor"}
                              </p>
                            </div>
                          </div>
                          {t.dueDate && (
                            <span className="text-[10px] font-semibold text-[#475467] bg-[#F8F9FA] px-2 py-0.5 rounded-md border border-[#EAECF0] shrink-0">
                              Vence: {new Date(t.dueDate).toLocaleDateString("es-MX", { dateStyle: "short" })}
                            </span>
                          )}
                        </div>
                        {t.description && (
                          <div className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#F0EEE8] text-xs text-[#475467] leading-relaxed">
                            {t.description}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Historial de Actividades (Activity History - InsightCRM Timeline) */}
              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-sm text-[#101828]">Historial de Actividades</h3>

                {activitiesToDisplay.length === 0 ? (
                  <div className="p-6 rounded-2xl bg-white border border-[#EAECF0] text-xs text-[#667085] text-center">
                    No hay actividades registradas en esta categoría.
                  </div>
                ) : (
                  <div className="space-y-3 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-[#EAECF0]">
                    {activitiesToDisplay.map((act) => (
                      <div key={act.id} className="relative pl-10">
                        <div className="absolute left-1.5 top-2.5 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-[#101828] flex items-center justify-center shadow-xs">
                          {act.type === "call" && <Phone className="w-3 h-3 text-[#101828]" />}
                          {act.type === "meeting" && <Video className="w-3 h-3 text-[#101828]" />}
                          {act.type === "email" && <Mail className="w-3 h-3 text-[#101828]" />}
                          {act.type === "note" && <FileText className="w-3 h-3 text-[#101828]" />}
                          {act.type === "follow_up" && <TrendingUp className="w-3 h-3 text-[#101828]" />}
                        </div>
                        <div className="p-3.5 rounded-2xl bg-white border border-[#EAECF0] shadow-xs space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-[#101828]">{act.title}</span>
                            <span className="text-[10px] text-[#667085] shrink-0">
                              {new Date(act.performedAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#667085]">
                            Registrado por: {act.user?.name || "Asesor"}
                          </p>
                          {act.description && (
                            <p className="text-xs text-[#475467] pt-1 leading-relaxed bg-[#F8F9FA] p-2.5 rounded-xl border border-[#F0EEE8]">
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
          )}
        </div>

        {/* ========================================================= */}
        {/* COLUMNA 3: DEALS, TAREAS & CONTACTOS (Derecha, 3 cols)    */}
        {/* ========================================================= */}
        <div className="xl:col-span-3 space-y-4">
          {/* Bloque 1: Deals (Oportunidades) */}
          <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#101828]">Deals</h3>
              <button
                type="button"
                onClick={() => setIsOppModalOpen(true)}
                className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 hover:underline"
              >
                + Nuevo
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsOppModalOpen(true)}
              className="w-full py-2 px-3 rounded-xl border border-dashed border-[#DDD9CF] hover:border-[#101828] text-xs font-semibold text-[#101828] flex items-center justify-center gap-1.5 transition-colors bg-[#F8F9FA]"
            >
              <Plus className="w-3.5 h-3.5 text-amber-500" />
              <span>Crear nuevo deal</span>
            </button>

            {(!client.opportunities || client.opportunities.length === 0) ? (
              <p className="text-xs text-[#667085] text-center py-2">
                Sin deals registrados.
              </p>
            ) : (
              <div className="space-y-2">
                {client.opportunities.map((opp) => (
                  <div
                    key={opp.id}
                    className="p-3 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px] text-[#667085]">
                      <span>{new Date(opp.createdAt).toLocaleDateString("es-MX", { dateStyle: "short" })}</span>
                      <span className="font-bold text-[#101828] text-xs">
                        ${opp.value.toLocaleString("en-US")}$
                      </span>
                    </div>
                    <h4 className="text-xs font-bold text-[#101828] leading-snug">
                      {opp.title}
                    </h4>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-[#475467]">
                        {opp.stage?.name || "Pipeline"}
                      </span>
                      <div className="flex items-center gap-1">
                        {opp.status === "open" && (
                          <button
                            type="button"
                            onClick={() => handleUpdateOppStatus(opp.id, "won")}
                            className="text-[9px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-1.5 py-0.5 rounded border border-emerald-200 transition-colors"
                            title="Marcar Ganada"
                          >
                            ✓ Ganar
                          </button>
                        )}
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            opp.status === "won"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : opp.status === "lost"
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-amber-50 text-amber-800 border-amber-300"
                          }`}
                        >
                          {opp.status === "won" ? "Ganada" : opp.status === "lost" ? "Perdida" : "Abierta"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bloque 2: Tareas */}
          <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#101828]">Tareas</h3>
              <button
                type="button"
                onClick={() => setIsTaskModalOpen(true)}
                className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 hover:underline"
              >
                + Nueva
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsTaskModalOpen(true)}
              className="w-full py-2 px-3 rounded-xl border border-dashed border-[#DDD9CF] hover:border-[#101828] text-xs font-semibold text-[#101828] flex items-center justify-center gap-1.5 transition-colors bg-[#F8F9FA]"
            >
              <Plus className="w-3.5 h-3.5 text-amber-500" />
              <span>Crear nueva tarea</span>
            </button>

            {(!client.tasks || client.tasks.length === 0) ? (
              <p className="text-xs text-[#667085] text-center py-2">
                Sin tareas pendientes.
              </p>
            ) : (
              <div className="space-y-2">
                {client.tasks.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="p-3 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                          t.priority === "urgent" || t.priority === "high"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {t.priority === "urgent" || t.priority === "high" ? "Alta" : "Media"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleToggleTask(t)}
                        className={`text-[10px] font-semibold ${
                          t.status === "completed" ? "text-emerald-600" : "text-[#475467] hover:text-[#101828]"
                        }`}
                      >
                        {t.status === "completed" ? "✓ Hecha" : "Completar"}
                      </button>
                    </div>
                    <h4
                      className={`text-xs font-semibold leading-snug ${
                        t.status === "completed" ? "line-through text-[#9C9890]" : "text-[#101828]"
                      }`}
                    >
                      {t.title}
                    </h4>
                    {t.dueDate && (
                      <p className="text-[10px] text-[#667085]">
                        Vence: {new Date(t.dueDate).toLocaleDateString("es-MX", { dateStyle: "short" })}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Bloque 3: Contactos Vinculados */}
          <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-[#101828]">Contactos</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingContact(null);
                  setContactFormData({ firstName: "", lastName: "", email: "", phone: "", jobTitle: "", isPrimary: false });
                  setIsContactModalOpen(true);
                }}
                className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 hover:underline"
              >
                + Agregar
              </button>
            </div>

            {(!client.contacts || client.contacts.length === 0) ? (
              <p className="text-xs text-[#667085] text-center py-2">
                Sin contactos registrados.
              </p>
            ) : (
              <div className="space-y-2">
                {client.contacts.map((c) => (
                  <div
                    key={c.id}
                    className="p-2.5 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-white border border-[#EAECF0] flex items-center justify-center font-bold text-xs text-[#101828] shrink-0">
                        {c.firstName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#101828] truncate">
                          {c.firstName} {c.lastName || ""}
                        </p>
                        <p className="text-[10px] text-[#667085] truncate">
                          {c.jobTitle || c.email || c.phone || "Contacto"}
                        </p>
                      </div>
                    </div>
                    {c.phone && (
                      <a
                        href={`tel:${c.phone}`}
                        title="Llamar"
                        className="p-1 rounded-lg border border-[#EAECF0] hover:bg-white text-[#475467]"
                      >
                        <Phone className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>


      {/* MODAL 1: Edit Client Profile */}
      {isEditClientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FFFFFF] border border-[#EAECF0] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-[#EAECF0] flex items-center justify-between bg-[#F8F9FA] sticky top-0 z-10">
              <h2 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-500" />
                Modificar Ficha Comercial
              </h2>
              <button onClick={() => setIsEditClientOpen(false)} className="text-[#475467] hover:text-[#101828]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClientDetails} className="p-5 space-y-3.5">
              {/* Foto o Logo de la Empresa */}
              <div className="p-3.5 bg-[#F8F9FA] rounded-2xl border border-[#EAECF0] space-y-2.5">
                <label className="block text-xs font-semibold text-[#101828]">Foto o Logo de la Empresa</label>
                <div className="flex items-center gap-3">
                  {editClientData.logoUrl ? (
                    <img
                      src={editClientData.logoUrl}
                      alt="Logo preview"
                      className="w-16 h-16 rounded-2xl object-cover border border-[#EAECF0] shadow-xs shrink-0 bg-white"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[#0F172A] text-amber-400 font-bold text-lg flex items-center justify-center border border-amber-500/20 shrink-0">
                      {editClientData.name ? editClientData.name.slice(0, 2).toUpperCase() : "EM"}
                    </div>
                  )}

                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="px-3 py-1.5 rounded-xl bg-white border border-[#EAECF0] hover:bg-[#F8F9FA] text-[#101828] text-xs font-medium cursor-pointer shadow-2xs inline-flex items-center gap-1.5 transition-colors">
                        <Upload className="w-3.5 h-3.5 text-amber-600" />
                        <span>Subir imagen</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const result = event.target?.result;
                                if (typeof result === "string") {
                                  setEditClientData((prev) => ({ ...prev, logoUrl: result }));
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {editClientData.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setEditClientData((prev) => ({ ...prev, logoUrl: "" }))}
                          className="px-2 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:underline font-medium cursor-pointer"
                        >
                          Quitar foto
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      placeholder="O pega una URL (https://ejemplo.com/logo.png)"
                      value={editClientData.logoUrl.startsWith("data:") ? "" : editClientData.logoUrl}
                      onChange={(e) => setEditClientData((prev) => ({ ...prev, logoUrl: e.target.value }))}
                      className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-2.5 py-1.5 text-[11px] text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#101828] mb-1">Nombre Comercial *</label>
                <input
                  type="text"
                  required
                  value={editClientData.name}
                  onChange={(e) => setEditClientData({ ...editClientData, name: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#101828] mb-1">Razón Social</label>
                <input
                  type="text"
                  value={editClientData.companyName}
                  onChange={(e) => setEditClientData({ ...editClientData, companyName: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Sector / Industria</label>
                  <input
                    type="text"
                    value={editClientData.industry}
                    onChange={(e) => setEditClientData({ ...editClientData, industry: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Estado de la Relación</label>
                  <select
                    value={editClientData.status}
                    onChange={(e) => setEditClientData({ ...editClientData, status: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="active">Activo</option>
                    <option value="on_hold">En Pausa</option>
                    <option value="churned">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Facturación MRR ($ USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editClientData.revenue}
                    onChange={(e) => setEditClientData({ ...editClientData, revenue: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Brand Manager / Responsable en Bunker</label>
                  <select
                    value={editClientData.ownerId}
                    onChange={(e) => setEditClientData({ ...editClientData, ownerId: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">Sin Asignar (Agencia General)</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={editClientData.email}
                    onChange={(e) => setEditClientData({ ...editClientData, email: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={editClientData.phone}
                    onChange={(e) => setEditClientData({ ...editClientData, phone: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#101828] mb-1">Sitio Web</label>
                <input
                  type="url"
                  value={editClientData.website}
                  onChange={(e) => setEditClientData({ ...editClientData, website: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#101828] mb-1">Notas Comerciales</label>
                <textarea
                  rows={2}
                  value={editClientData.notes}
                  onChange={(e) => setEditClientData({ ...editClientData, notes: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#F0EEE6]">
                <button
                  type="button"
                  onClick={() => setIsEditClientOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] text-[#475467] text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingClientEdit}
                  className="btn-black-gold rounded-xl px-4 py-2 text-xs font-semibold"
                >
                  {submittingClientEdit ? "Guardando..." : "Actualizar Ficha"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Create / Edit Contact */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FFFFFF] border border-[#EAECF0] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#EAECF0] flex items-center justify-between bg-[#F8F9FA]">
              <h2 className="text-sm font-semibold text-[#101828]">
                {editingContact ? "Editar Contacto" : "Añadir Nuevo Contacto"}
              </h2>
              <button onClick={() => setIsContactModalOpen(false)} className="text-[#475467] hover:text-[#101828]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Mariana"
                    value={contactFormData.firstName}
                    onChange={(e) => setContactFormData({ ...contactFormData, firstName: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Apellido</label>
                  <input
                    type="text"
                    placeholder="ej. Gómez"
                    value={contactFormData.lastName}
                    onChange={(e) => setContactFormData({ ...contactFormData, lastName: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#101828] mb-1">Cargo / Puesto</label>
                <input
                  type="text"
                  placeholder="ej. Directora Comercial"
                  value={contactFormData.jobTitle}
                  onChange={(e) => setContactFormData({ ...contactFormData, jobTitle: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#101828] mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="mariana@empresa.com"
                  value={contactFormData.email}
                  onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#101828] mb-1">Teléfono (con prefijo intl.)</label>
                <input
                  type="tel"
                  placeholder="+52 55 1234 5678"
                  value={contactFormData.phone}
                  onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPrimaryCheckbox"
                  checked={contactFormData.isPrimary}
                  onChange={(e) => setContactFormData({ ...contactFormData, isPrimary: e.target.checked })}
                  className="rounded text-amber-500 focus:ring-amber-400"
                />
                <label htmlFor="isPrimaryCheckbox" className="text-xs text-[#101828] cursor-pointer">
                  Designar como Contacto Principal de esta cuenta
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#F0EEE6]">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] text-[#475467] text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingContact}
                  className="btn-black-gold rounded-xl px-4 py-2 text-xs font-semibold"
                >
                  {submittingContact ? "Guardando..." : "Guardar Contacto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Create Opportunity in Pipeline */}
      {isOppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FFFFFF] border border-[#EAECF0] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#EAECF0] flex items-center justify-between bg-[#F8F9FA]">
              <h2 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                Nueva Oportunidad Comercial
              </h2>
              <button onClick={() => setIsOppModalOpen(false)} className="text-[#475467] hover:text-[#101828]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOpportunity} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#101828] mb-1">Título de la Oportunidad *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Retainer Redes Sociales + Pauta Meta"
                  value={oppFormData.title}
                  onChange={(e) => setOppFormData({ ...oppFormData, title: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#101828] mb-1">Etapa del Pipeline *</label>
                <select
                  required
                  value={oppFormData.stageId}
                  onChange={(e) => setOppFormData({ ...oppFormData, stageId: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                >
                  {pipelineStages.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Valor ($ USD) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={oppFormData.value}
                    onChange={(e) => setOppFormData({ ...oppFormData, value: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Probabilidad (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={oppFormData.probability}
                    onChange={(e) => setOppFormData({ ...oppFormData, probability: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#101828] mb-1">Fecha Estimada de Cierre</label>
                <input
                  type="date"
                  value={oppFormData.expectedClose}
                  onChange={(e) => setOppFormData({ ...oppFormData, expectedClose: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#F0EEE6]">
                <button
                  type="button"
                  onClick={() => setIsOppModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] text-[#475467] text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingOpp}
                  className="btn-black-gold rounded-xl px-4 py-2 text-xs font-semibold"
                >
                  {submittingOpp ? "Guardando..." : "Crear Oportunidad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Create Task */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FFFFFF] border border-[#EAECF0] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#EAECF0] flex items-center justify-between bg-[#F8F9FA]">
              <h2 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Agendar Tarea Comercial
              </h2>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-[#475467] hover:text-[#101828]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#101828] mb-1">Título de la Tarea *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Enviar reporte mensual de métricas de pauta"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#101828] mb-1">Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Instrucciones o contexto adicional..."
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={taskFormData.dueDate}
                    onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Prioridad</label>
                  <select
                    value={taskFormData.priority}
                    onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#F0EEE6]">
                <button
                  type="button"
                  onClick={() => setIsTaskModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] text-[#475467] text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingTask}
                  className="btn-black-gold rounded-xl px-4 py-2 text-xs font-semibold"
                >
                  {submittingTask ? "Agendando..." : "Guardar Tarea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
