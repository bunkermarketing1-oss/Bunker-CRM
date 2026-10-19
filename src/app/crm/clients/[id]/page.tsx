"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { ROUTES, leadSearchRoute } from "@/lib/constants/routes";
import { useParams, useRouter } from "next/navigation";
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

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Active Tab: summary, contacts, activities, opportunities, tasks, ads_leads
  const [activeTab, setActiveTab] = useState<"summary" | "contacts" | "activities" | "opportunities" | "tasks" | "ads_leads">("summary");

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
    fetch("/api/users")
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
        alert(json.error || "No se pudo actualizar la ficha.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
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
        alert(json.error || "Error al guardar contacto.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
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
        alert(json.error || "Error al actualizar contacto principal.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
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
        alert(json.error || "No se pudo eliminar el contacto.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
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
        alert(json.error || "Error al guardar actividad.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
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
        alert(json.error || "Error al registrar oportunidad.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
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
        alert(json.error || "Error al actualizar oportunidad.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
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
        alert(json.error || "Error al agendar tarea.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
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
        alert(json.error || "Error al actualizar tarea.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
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

  // Loading Screen
  if (loading) {
    return (
      <div className="py-24 text-center text-[#9C9890] text-xs flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-6 h-6 animate-spin text-[#D97757]" />
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
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Back Link & Quick Breadcrumb */}
      <div className="flex items-center justify-between pb-2 border-b border-[#F0EEE6]">
        <Link
          href="/crm/clients"
          className="text-xs text-[#716F6A] hover:text-[#1F1E1D] flex items-center gap-1.5 transition-colors font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Volver al listado de clientes</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchClientData()}
            className="p-1.5 rounded-lg border border-[#E8E6DF] text-[#716F6A] hover:text-[#1F1E1D] text-xs transition-colors"
            title="Refrescar ficha 360°"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsEditClientOpen(true)}
            className="px-3 py-1.5 rounded-xl border border-[#E8E6DF] bg-[#FFFFFF] hover:border-[#DDD9CF] text-xs font-semibold text-[#1F1E1D] flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Edit className="w-3.5 h-3.5 text-[#D97757]" />
            <span>Editar Datos de Cuenta</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            feedback.type === "error"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            ) : (
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Account Master Header (Fase C) */}
      <div className="p-6 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadge.cls}`}>
                {statusBadge.label}
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-[#FAF9F5] border border-[#E8E6DF] text-[#716F6A] flex items-center gap-1">
                <Building className="w-3 h-3 text-[#9C9890]" />
                {client.industry || "General"}
              </span>
              {client.isDemo && (
                <span className="text-[9px] bg-[#FBF1ED] text-[#C15F3C] font-semibold px-2 py-0.5 rounded border border-[#F3D6CB]">
                  CUENTA DEMO
                </span>
              )}
            </div>

            <h1 className="text-2xl md:text-3xl font-semibold text-[#1F1E1D] tracking-tight">
              {client.name}
            </h1>
            {client.companyName && client.companyName !== client.name && (
              <p className="text-xs text-[#716F6A] font-medium">Razón Social: {client.companyName}</p>
            )}
          </div>

          {/* Key Financial Badges (MRR & ARR in USD) */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DF] text-right">
              <div className="text-[10px] font-medium uppercase text-[#9C9890]">Facturación MRR</div>
              <div className="text-xl font-semibold text-[#1F1E1D]">
                ${(client.revenue || 0).toLocaleString("en-US")}{" "}
                <span className="text-xs font-normal text-[#716F6A]">USD/mes</span>
              </div>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DF] text-right hidden sm:block">
              <div className="text-[10px] font-medium uppercase text-[#9C9890]">ARR Anualizado</div>
              <div className="text-lg font-semibold text-[#1F1E1D]">
                ${((client.revenue || 0) * 12).toLocaleString("en-US")}{" "}
                <span className="text-xs font-normal text-[#716F6A]">USD</span>
              </div>
            </div>
          </div>
        </div>

        {/* Commercial & Contact Metadata Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-[#F0EEE6] text-xs text-[#716F6A]">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-[#9C9890] shrink-0" />
            <span className="truncate">{client.email || "Sin correo comercial"}</span>
          </div>

          <div className="flex items-center gap-2">
            <Phone className="w-4 h-4 text-[#9C9890] shrink-0" />
            <span>{client.phone || "Sin teléfono registrado"}</span>
          </div>

          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#9C9890] shrink-0" />
            {client.website ? (
              <a
                href={client.website}
                target="_blank"
                rel="noreferrer"
                className="text-[#D97757] hover:underline flex items-center gap-1 truncate"
              >
                <span>{client.website.replace(/^https?:\/\//, "")}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              <span>Sin sitio web</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-[#9C9890] shrink-0" />
            <span>
              Asesor: <strong className="text-[#1F1E1D]">{client.owner?.name || "Sin asignar"}</strong>
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Navigation (Fase C) */}
      <div className="flex items-center gap-1 border-b border-[#E8E6DF] overflow-x-auto no-scrollbar">
        {[
          { key: "summary", label: "Resumen de Cuenta", count: null },
          { key: "contacts", label: "Contactos", count: client.contacts?.length || 0 },
          { key: "activities", label: "Cronología de Actividades", count: client.activities?.length || 0 },
          { key: "opportunities", label: "Oportunidades (Pipeline)", count: client.opportunities?.length || 0 },
          { key: "tasks", label: "Tareas y Próximas Acciones", count: clientMetrics.pendingTasksCount },
          { key: "ads_leads", label: "⚡ Pautas & Leads en Vivo", count: client.leads?.length ?? (client.connectedAccounts?.length ? 0 : null) },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`px-4 py-2.5 text-xs font-semibold rounded-t-xl transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === tab.key
                ? "border-[#D97757] text-[#D97757] bg-[#FFFFFF] shadow-sm"
                : "border-transparent text-[#716F6A] hover:text-[#1F1E1D] hover:bg-[#FAF9F5]"
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== null && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  activeTab === tab.key
                    ? "bg-[#FBF1ED] text-[#C15F3C]"
                    : "bg-[#F0EEE6] text-[#716F6A]"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 1: Resumen General */}
      {activeTab === "summary" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          <div className="lg:col-span-2 space-y-6">
            {/* Notes Section */}
            <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm space-y-3">
              <h3 className="font-semibold text-sm text-[#1F1E1D] flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#D97757]" />
                Notas Comerciales y Condiciones de Contrato
              </h3>
              <p className="text-xs text-[#716F6A] leading-relaxed whitespace-pre-wrap bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E8E6DF]">
                {client.notes || "No se han registrado notas comerciales para esta cuenta."}
              </p>
            </div>

            {/* Recent Activities Preview */}
            <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-[#1F1E1D] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Últimas Actividades Registradas
                </h3>
                <button
                  onClick={() => setActiveTab("activities")}
                  className="text-xs text-[#D97757] hover:underline font-semibold"
                >
                  Ver todas
                </button>
              </div>

              {!client.activities || client.activities.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#9C9890]">
                  No hay interacciones registradas aún.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {client.activities.slice(0, 3).map((act) => (
                    <div
                      key={act.id}
                      className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] flex items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-semibold text-[#1F1E1D]">{act.title}</div>
                        {act.description && <div className="text-[#716F6A] text-[11px]">{act.description}</div>}
                        <div className="text-[10px] text-[#9C9890] mt-1">
                          Registrado por: {act.user?.name || "Asesor"} • {new Date(act.performedAt).toLocaleString("es-MX", { dateStyle: "short", timeStyle: "short" })}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-[#FFFFFF] border border-[#E8E6DF] text-[#716F6A]">
                        {act.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Key Summary & Pending Tasks */}
          <div className="space-y-6">
            {/* Commercial Indicators */}
            <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm space-y-3">
              <h3 className="font-semibold text-sm text-[#1F1E1D]">Indicadores de la Cuenta</h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between py-1.5 border-b border-[#F0EEE6]">
                  <span className="text-[#716F6A]">Oportunidades Abiertas</span>
                  <span className="font-bold text-[#1F1E1D]">{clientMetrics.openOppsCount}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F0EEE6]">
                  <span className="text-[#716F6A]">Valor en Pipeline (USD)</span>
                  <span className="font-bold text-blue-900">${clientMetrics.openOppsValue.toLocaleString("en-US")}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F0EEE6]">
                  <span className="text-[#716F6A]">Deals Ganados (USD)</span>
                  <span className="font-bold text-emerald-700">${clientMetrics.wonOppsValue.toLocaleString("en-US")}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-[#F0EEE6]">
                  <span className="text-[#716F6A]">Tareas Pendientes</span>
                  <span className="font-bold text-amber-700">{clientMetrics.pendingTasksCount}</span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#716F6A]">Cliente Desde</span>
                  <span className="font-medium text-[#1F1E1D]">
                    {new Date(client.createdAt).toLocaleDateString("es-MX")}
                  </span>
                </div>
              </div>
            </div>

            {/* Primary Contact Card */}
            <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm text-[#1F1E1D]">Contacto Principal</h3>
                <button
                  onClick={() => setActiveTab("contacts")}
                  className="text-xs text-[#D97757] hover:underline font-semibold"
                >
                  Gestionar
                </button>
              </div>

              {(() => {
                const primary = client.contacts?.find((c) => c.isPrimary) || client.contacts?.[0];
                if (!primary) {
                  return (
                    <div className="text-center py-4 text-xs text-[#9C9890]">
                      No hay contactos registrados.
                    </div>
                  );
                }
                return (
                  <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-1.5 text-xs">
                    <div className="font-semibold text-[#1F1E1D] flex items-center justify-between">
                      <span>{primary.firstName} {primary.lastName || ""}</span>
                      <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Principal
                      </span>
                    </div>
                    {primary.jobTitle && <div className="text-[11px] text-[#716F6A]">{primary.jobTitle}</div>}
                    {primary.email && (
                      <div className="text-[11px] text-[#716F6A] flex items-center gap-1.5 pt-1">
                        <Mail className="w-3 h-3 text-[#9C9890]" />
                        <span>{primary.email}</span>
                      </div>
                    )}
                    {primary.phone && (
                      <div className="text-[11px] text-[#716F6A] flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-[#9C9890]" />
                        <span>{primary.phone}</span>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Contactos (Fase D) */}
      {activeTab === "contacts" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-[#1F1E1D]">
                Contactos Vinculados ({client.contacts?.length || 0})
              </h3>
              <p className="text-xs text-[#716F6A]">
                Personas de contacto directo, directores y tomadores de decisión autorizados en la cuenta.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingContact(null);
                setContactFormData({
                  firstName: "",
                  lastName: "",
                  email: "",
                  phone: "",
                  jobTitle: "",
                  isPrimary: (client.contacts?.length || 0) === 0,
                });
                setIsContactModalOpen(true);
              }}
              className="btn-black-gold rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#E5C158]" />
              <span>Añadir Contacto</span>
            </button>
          </div>

          {!client.contacts || client.contacts.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] text-xs text-[#9C9890] space-y-2">
              <User className="w-8 h-8 mx-auto text-[#DDD9CF]" />
              <p>No hay contactos vinculados a este cliente todavía.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {client.contacts.map((contact) => (
                <div
                  key={contact.id}
                  className={`p-4 rounded-2xl bg-[#FFFFFF] border shadow-sm flex flex-col justify-between space-y-3 ${
                    contact.isPrimary ? "border-amber-300 ring-1 ring-amber-200" : "border-[#E8E6DF]"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-semibold text-sm text-[#1F1E1D]">
                          {contact.firstName} {contact.lastName || ""}
                        </h4>
                        {contact.jobTitle && (
                          <div className="text-[11px] text-[#716F6A]">{contact.jobTitle}</div>
                        )}
                      </div>
                      {contact.isPrimary ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                          Principal
                        </span>
                      ) : (
                        <button
                          onClick={() => handleMakePrimaryContact(contact.id)}
                          className="text-[10px] text-[#716F6A] hover:text-amber-700 hover:bg-amber-50 px-2 py-0.5 rounded border border-[#E8E6DF] transition-colors"
                          title="Hacer contacto principal de la cuenta"
                        >
                          Hacer principal
                        </button>
                      )}
                    </div>

                    <div className="pt-2 border-t border-[#F0EEE6] space-y-1 text-xs text-[#716F6A]">
                      {contact.email && (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-[#9C9890]" />
                          <span className="truncate">{contact.email}</span>
                        </div>
                      )}
                      {contact.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-[#9C9890]" />
                          <span>{contact.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[#F0EEE6]">
                    <button
                      onClick={() => {
                        setEditingContact(contact);
                        setContactFormData({
                          firstName: contact.firstName,
                          lastName: contact.lastName || "",
                          email: contact.email || "",
                          phone: contact.phone || "",
                          jobTitle: contact.jobTitle || "",
                          isPrimary: contact.isPrimary,
                        });
                        setIsContactModalOpen(true);
                      }}
                      className="p-1.5 rounded-lg text-[#716F6A] hover:text-[#1F1E1D] hover:bg-[#FAF9F5] text-xs transition-colors"
                      title="Editar contacto"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteContact(contact.id, `${contact.firstName} ${contact.lastName || ""}`)}
                      className="p-1.5 rounded-lg text-[#716F6A] hover:text-rose-600 hover:bg-rose-50 text-xs transition-colors"
                      title="Eliminar contacto"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Timeline de Actividades (Fase E) */}
      {activeTab === "activities" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in duration-200">
          {/* Quick Register Activity Form (Col 1) */}
          <div className="lg:col-span-1">
            <div className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm space-y-3 sticky top-4">
              <h3 className="font-semibold text-sm text-[#1F1E1D] flex items-center gap-2">
                <Send className="w-4 h-4 text-[#D97757]" />
                Registrar Interacción
              </h3>
              <p className="text-xs text-[#716F6A]">
                Guarda notas de llamadas, minutas de reunión o seguimientos comerciales en la cronología.
              </p>

              <form onSubmit={handleCreateActivity} className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-medium text-[#1F1E1D] mb-1">Tipo de Actividad</label>
                  <select
                    value={newActivity.type}
                    onChange={(e) => setNewActivity({ ...newActivity, type: e.target.value })}
                    className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-1.5 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  >
                    <option value="call">📞 Llamada telefónica</option>
                    <option value="meeting">🤝 Reunión / Videollamada</option>
                    <option value="email">✉️ Correo electrónico</option>
                    <option value="note">📝 Nota interna</option>
                    <option value="follow_up">🎯 Seguimiento comercial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#1F1E1D] mb-1">Título / Asunto *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Llamada de revisión de pauta mensual"
                    value={newActivity.title}
                    onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                    className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-1.5 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-[#1F1E1D] mb-1">Descripción / Acuerdos</label>
                  <textarea
                    rows={3}
                    placeholder="Detalles de la conversación, próximos pasos o compromisos pactados..."
                    value={newActivity.description}
                    onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                    className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-1.5 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingActivity}
                  className="w-full btn-black-gold rounded-xl py-2 text-xs font-semibold flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5 text-[#E5C158]" />
                  <span>{submittingActivity ? "Guardando..." : "Guardar en Timeline"}</span>
                </button>
              </form>
            </div>
          </div>

          {/* Activity Timeline Stream (Col 2-3) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="font-semibold text-sm text-[#1F1E1D]">
              Cronología de Interacciones ({client.activities?.length || 0})
            </h3>

            {!client.activities || client.activities.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] text-xs text-[#9C9890] space-y-2">
                <Clock className="w-8 h-8 mx-auto text-[#DDD9CF]" />
                <p>No se han registrado actividades para este cliente aún.</p>
              </div>
            ) : (
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-5 before:w-0.5 before:bg-[#E8E6DF]">
                {client.activities.map((act) => {
                  let icon = <Phone className="w-4 h-4 text-blue-600" />;
                  if (act.type === "meeting") icon = <Video className="w-4 h-4 text-emerald-600" />;
                  if (act.type === "email") icon = <Mail className="w-4 h-4 text-purple-600" />;
                  if (act.type === "note") icon = <FileText className="w-4 h-4 text-amber-600" />;
                  if (act.type === "follow_up") icon = <TrendingUp className="w-4 h-4 text-[#D97757]" />;

                  return (
                    <div key={act.id} className="relative pl-11">
                      <div className="absolute left-2.5 top-3 -translate-x-1/2 w-6 h-6 rounded-full bg-[#FFFFFF] border-2 border-[#E8E6DF] flex items-center justify-center shadow-sm">
                        {icon}
                      </div>

                      <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-xs text-[#1F1E1D]">{act.title}</h4>
                          <span className="text-[10px] font-semibold text-[#9C9890] whitespace-nowrap">
                            {new Date(act.performedAt).toLocaleString("es-MX", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>

                        {act.description && (
                          <p className="text-xs text-[#716F6A] leading-relaxed whitespace-pre-wrap bg-[#FAF9F5] p-2.5 rounded-xl border border-[#E8E6DF]">
                            {act.description}
                          </p>
                        )}

                        <div className="flex items-center justify-between pt-1 text-[10px] text-[#9C9890]">
                          <span>
                            Registrado por: <strong className="text-[#1F1E1D]">{act.user?.name || "Asesor"}</strong>
                          </span>
                          <span className="capitalize">{act.type}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 4: Oportunidades Comerciales (Fase F) */}
      {activeTab === "opportunities" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-[#1F1E1D]">
                Oportunidades en Pipeline ({client.opportunities?.length || 0})
              </h3>
              <p className="text-xs text-[#716F6A]">
                Proyectos, contratos de expansión y servicios complementarios gestionados en el embudo comercial.
              </p>
            </div>
            <button
              onClick={() => setIsOppModalOpen(true)}
              className="btn-black-gold rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#E5C158]" />
              <span>Nueva Oportunidad</span>
            </button>
          </div>

          {!client.opportunities || client.opportunities.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] text-xs text-[#9C9890] space-y-2">
              <Briefcase className="w-8 h-8 mx-auto text-[#DDD9CF]" />
              <p>No hay oportunidades registradas para este cliente en el pipeline.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {client.opportunities.map((opp) => {
                let statusBadge = { label: "ABIERTA", cls: "bg-blue-50 text-blue-700 border-blue-200" };
                if (opp.status === "won") {
                  statusBadge = { label: "GANADA", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" };
                } else if (opp.status === "lost") {
                  statusBadge = { label: "PERDIDA", cls: "bg-rose-50 text-rose-700 border-rose-200" };
                }

                return (
                  <div
                    key={opp.id}
                    className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm flex flex-col justify-between space-y-3"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-semibold text-sm text-[#1F1E1D]">{opp.title}</h4>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadge.cls}`}>
                          {statusBadge.label}
                        </span>
                      </div>

                      {opp.stage && (
                        <div className="flex items-center gap-1.5 text-xs text-[#716F6A]">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: opp.stage.color || "#586ff6" }}
                          />
                          <span>Etapa: {opp.stage.name}</span>
                        </div>
                      )}

                      <div className="pt-2 border-t border-[#F0EEE6] grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <div className="text-[10px] text-[#9C9890] uppercase font-medium">Valor ($ USD)</div>
                          <div className="font-bold text-[#1F1E1D]">
                            ${opp.value.toLocaleString("en-US")} USD
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-[#9C9890] uppercase font-medium">Probabilidad</div>
                          <div className="font-semibold text-[#1F1E1D]">{opp.probability}%</div>
                        </div>
                      </div>

                      {opp.expectedClose && (
                        <div className="text-[11px] text-[#716F6A] flex items-center gap-1 pt-1">
                          <Calendar className="w-3 h-3 text-[#9C9890]" />
                          <span>Cierre estimado: {new Date(opp.expectedClose).toLocaleDateString("es-MX")}</span>
                        </div>
                      )}
                    </div>

                    {/* Status quick actions */}
                    {opp.status === "open" && (
                      <div className="pt-2 border-t border-[#F0EEE6] flex items-center justify-end gap-1.5 text-xs">
                        <button
                          onClick={() => handleUpdateOppStatus(opp.id, "won")}
                          className="px-2 py-1 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 font-semibold border border-emerald-200 transition-colors"
                        >
                          Marcar Ganada
                        </button>
                        <button
                          onClick={() => handleUpdateOppStatus(opp.id, "lost")}
                          className="px-2 py-1 rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 font-semibold border border-rose-200 transition-colors"
                        >
                          Marcar Perdida
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Tareas y Próximas Acciones (Fase G) */}
      {activeTab === "tasks" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-sm text-[#1F1E1D]">
                Tareas Vinculadas a la Cuenta ({client.tasks?.length || 0})
              </h3>
              <p className="text-xs text-[#716F6A]">
                Compromisos, entregables y recordatorios comerciales asignados a esta cuenta.
              </p>
            </div>
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="btn-black-gold rounded-xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-[#E5C158]" />
              <span>Agendar Tarea</span>
            </button>
          </div>

          {!client.tasks || client.tasks.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] text-xs text-[#9C9890] space-y-2">
              <CheckSquare className="w-8 h-8 mx-auto text-[#DDD9CF]" />
              <p>No hay tareas pendientes ni registradas para este cliente.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {client.tasks.map((task) => {
                const isCompleted = task.status === "completed";
                const now = new Date();
                const isOverdue =
                  task.dueDate &&
                  !isCompleted &&
                  new Date(task.dueDate).getTime() < now.getTime();

                let priorityBadge = { label: "Media", cls: "bg-blue-50 text-blue-700 border-blue-200" };
                if (task.priority === "urgent" || task.priority === "high") {
                  priorityBadge = { label: "Alta", cls: "bg-rose-50 text-rose-700 border-rose-200" };
                } else if (task.priority === "low") {
                  priorityBadge = { label: "Baja", cls: "bg-gray-50 text-gray-700 border-gray-200" };
                }

                return (
                  <div
                    key={task.id}
                    className={`p-4 rounded-2xl bg-[#FFFFFF] border shadow-sm flex items-start justify-between gap-3 transition-colors ${
                      isCompleted ? "opacity-60 bg-[#FAF9F5] border-[#E8E6DF]" : "border-[#E8E6DF]"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <button
                        onClick={() => handleToggleTask(task)}
                        className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors ${
                          isCompleted
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-[#9C9890] hover:border-[#D97757]"
                        }`}
                      >
                        {isCompleted && <Check className="w-3.5 h-3.5" />}
                      </button>

                      <div className="space-y-1">
                        <div
                          className={`text-xs font-semibold ${
                            isCompleted ? "line-through text-[#9C9890]" : "text-[#1F1E1D]"
                          }`}
                        >
                          {task.title}
                        </div>
                        {task.description && (
                          <div className="text-[11px] text-[#716F6A] leading-relaxed">{task.description}</div>
                        )}
                        <div className="flex items-center gap-3 text-[10px] text-[#9C9890] pt-1">
                          {task.dueDate && (
                            <span
                              className={`flex items-center gap-1 ${
                                isOverdue ? "text-rose-600 font-bold" : ""
                              }`}
                            >
                              <Calendar className="w-3 h-3" />
                              <span>
                                Vence: {new Date(task.dueDate).toLocaleDateString("es-MX")}
                                {isOverdue && " (Vencida)"}
                              </span>
                            </span>
                          )}
                          {task.user && <span>Asignado a: {task.user.name}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${priorityBadge.cls}`}>
                        {priorityBadge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 6: Pautas & Leads en Vivo (Meta Ads, TikTok, etc.) */}
      {activeTab === "ads_leads" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Cuentas de Redes / Pautas Conectadas */}
          <div className="p-6 rounded-3xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EEE6]">
              <div>
                <h3 className="text-base font-semibold text-[#1F1E1D] flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#D97757]" />
                  Canales & Cuentas Publicitarias Vinculadas
                </h3>
                <p className="text-xs text-[#716F6A] mt-0.5">
                  Cuentas de Meta Ads, Facebook Pages o TikTok vinculadas a este cliente para recepción automática de prospectos.
                </p>
              </div>

              <Link
                href="/marketing/integrations"
                className="px-3.5 py-2 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] hover:bg-[#F4F3EE] text-[#1F1E1D] text-xs font-semibold flex items-center gap-2 transition-colors self-start sm:self-auto"
              >
                <Plus className="w-3.5 h-3.5 text-[#D97757]" />
                <span>Gestionar en Centro de Conexiones</span>
              </Link>
            </div>

            {(!client.connectedAccounts || client.connectedAccounts.length === 0) ? (
              <div className="p-8 text-center rounded-2xl bg-[#FAF9F5] border border-dashed border-[#D1CFCA] space-y-3">
                <Share2 className="w-8 h-8 text-[#9C9890] mx-auto" />
                <div className="max-w-md mx-auto space-y-1">
                  <h4 className="text-xs font-semibold text-[#1F1E1D]">
                    Aún no hay cuentas publicitarias asignadas a {client.name}
                  </h4>
                  <p className="text-[11px] text-[#716F6A]">
                    Vincula una cuenta de anuncios de Meta (Facebook/Instagram) o TikTok para que los leads de sus formularios se sincronicen directamente aquí en segundos.
                  </p>
                </div>
                <Link
                  href="/marketing/integrations"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl btn-black-gold text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5 text-[#E5C158]" />
                  <span>Vincular Cuenta Publicitaria</span>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {client.connectedAccounts.map((acc) => (
                  <div
                    key={acc.id}
                    className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DF] hover:border-[#D1CFCA] transition-all space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#1877F2] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          f
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#1F1E1D] leading-tight">
                            {acc.accountName}
                          </h4>
                          <span className="text-[10px] text-[#716F6A] block">
                            ID: {acc.externalId || "—"}
                          </span>
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 uppercase">
                        {acc.status === "active" ? "● Activa" : acc.status}
                      </span>
                    </div>

                    <div className="text-[11px] text-[#716F6A] flex items-center justify-between pt-2 border-t border-[#E8E6DF]/60">
                      <span>Webhook en tiempo real</span>
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Sincronizando
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leads Recibidos en Tiempo Real */}
          <div className="p-6 rounded-3xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#F0EEE6]">
              <div>
                <h3 className="text-base font-semibold text-[#1F1E1D] flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-emerald-600" />
                  Prospectos & Leads Captados de Pauta ({client.leads?.length || 0})
                </h3>
                <p className="text-xs text-[#716F6A] mt-0.5">
                  Leads entrantes desde anuncios de Meta Ads y redes sociales, listos para llamada o WhatsApp directo.
                </p>
              </div>

              <Link
                href={ROUTES.LEADS}
                className="text-xs font-semibold text-[#D97757] hover:underline flex items-center gap-1"
              >
                <span>Ver embudo completo de leads</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {(!client.leads || client.leads.length === 0) ? (
              <div className="p-8 text-center rounded-2xl bg-[#FAF9F5] border border-dashed border-[#D1CFCA] text-xs text-[#716F6A]">
                No se han registrado leads automáticos de campañas para este cliente recientemente.
              </div>
            ) : (
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E8E6DF] text-[#716F6A]">
                      <th className="py-2.5 px-3 font-semibold">Prospecto / Nombre</th>
                      <th className="py-2.5 px-3 font-semibold">Campaña / Origen</th>
                      <th className="py-2.5 px-3 font-semibold">Teléfono / WhatsApp</th>
                      <th className="py-2.5 px-3 font-semibold">Calificación IA</th>
                      <th className="py-2.5 px-3 font-semibold">Estado</th>
                      <th className="py-2.5 px-3 font-semibold">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EEE6]">
                    {client.leads.map((lead) => (
                      <tr key={lead.id} className="hover:bg-[#FAF9F5] transition-colors">
                        <td className="py-3 px-3">
                          <Link href={leadSearchRoute(lead.name)} className="font-semibold text-[#1F1E1D] hover:text-[#D97757]">
                            {lead.name}
                          </Link>
                          {lead.email && <span className="block text-[11px] text-[#716F6A]">{lead.email}</span>}
                        </td>
                        <td className="py-3 px-3">
                          <span className="inline-block px-2 py-0.5 rounded-md bg-[#FAF9F5] border border-[#E8E6DF] text-[10px] font-medium text-[#1F1E1D]">
                            {lead.campaign || lead.source}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {lead.phone ? (
                            <a
                              href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, "")}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors font-medium text-[11px]"
                            >
                              <span>📱 {lead.phone}</span>
                              <ExternalLink className="w-3 h-3 text-emerald-600" />
                            </a>
                          ) : (
                            <span className="text-[#9C9890]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            lead.qualification >= 70
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : lead.qualification >= 40
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-stone-50 text-stone-600 border-stone-200"
                          }`}>
                            ⚡ {lead.qualification}/100
                          </span>
                        </td>
                        <td className="py-3 px-3 uppercase text-[10px] font-bold text-[#716F6A]">
                          {lead.status}
                        </td>
                        <td className="py-3 px-3 text-[#716F6A] text-[11px] whitespace-nowrap">
                          {new Date(lead.createdAt).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 1: Edit Client Profile */}
      {isEditClientOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FFFFFF] border border-[#E8E6DF] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#E8E6DF] flex items-center justify-between bg-[#FAF9F5]">
              <h2 className="text-sm font-semibold text-[#1F1E1D] flex items-center gap-2">
                <Edit className="w-4 h-4 text-[#D97757]" />
                Modificar Ficha Comercial
              </h2>
              <button onClick={() => setIsEditClientOpen(false)} className="text-[#716F6A] hover:text-[#1F1E1D]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClientDetails} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Nombre Comercial *</label>
                <input
                  type="text"
                  required
                  value={editClientData.name}
                  onChange={(e) => setEditClientData({ ...editClientData, name: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Razón Social</label>
                <input
                  type="text"
                  value={editClientData.companyName}
                  onChange={(e) => setEditClientData({ ...editClientData, companyName: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Sector / Industria</label>
                  <input
                    type="text"
                    value={editClientData.industry}
                    onChange={(e) => setEditClientData({ ...editClientData, industry: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Estado de la Relación</label>
                  <select
                    value={editClientData.status}
                    onChange={(e) => setEditClientData({ ...editClientData, status: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  >
                    <option value="active">Activo</option>
                    <option value="on_hold">En Pausa</option>
                    <option value="churned">Cancelado</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Facturación MRR ($ USD)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editClientData.revenue}
                    onChange={(e) => setEditClientData({ ...editClientData, revenue: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Asesor Responsable</label>
                  <select
                    value={editClientData.ownerId}
                    onChange={(e) => setEditClientData({ ...editClientData, ownerId: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  >
                    <option value="">Sin Asignar</option>
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
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={editClientData.email}
                    onChange={(e) => setEditClientData({ ...editClientData, email: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={editClientData.phone}
                    onChange={(e) => setEditClientData({ ...editClientData, phone: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Sitio Web</label>
                <input
                  type="url"
                  value={editClientData.website}
                  onChange={(e) => setEditClientData({ ...editClientData, website: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Notas Comerciales</label>
                <textarea
                  rows={2}
                  value={editClientData.notes}
                  onChange={(e) => setEditClientData({ ...editClientData, notes: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#F0EEE6]">
                <button
                  type="button"
                  onClick={() => setIsEditClientOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-[#716F6A] text-xs"
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
          <div className="bg-[#FFFFFF] border border-[#E8E6DF] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#E8E6DF] flex items-center justify-between bg-[#FAF9F5]">
              <h2 className="text-sm font-semibold text-[#1F1E1D]">
                {editingContact ? "Editar Contacto" : "Añadir Nuevo Contacto"}
              </h2>
              <button onClick={() => setIsContactModalOpen(false)} className="text-[#716F6A] hover:text-[#1F1E1D]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveContact} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Nombre *</label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Mariana"
                    value={contactFormData.firstName}
                    onChange={(e) => setContactFormData({ ...contactFormData, firstName: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Apellido</label>
                  <input
                    type="text"
                    placeholder="ej. Gómez"
                    value={contactFormData.lastName}
                    onChange={(e) => setContactFormData({ ...contactFormData, lastName: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Cargo / Puesto</label>
                <input
                  type="text"
                  placeholder="ej. Directora Comercial"
                  value={contactFormData.jobTitle}
                  onChange={(e) => setContactFormData({ ...contactFormData, jobTitle: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  placeholder="mariana@empresa.com"
                  value={contactFormData.email}
                  onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Teléfono (con prefijo intl.)</label>
                <input
                  type="tel"
                  placeholder="+52 55 1234 5678"
                  value={contactFormData.phone}
                  onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPrimaryCheckbox"
                  checked={contactFormData.isPrimary}
                  onChange={(e) => setContactFormData({ ...contactFormData, isPrimary: e.target.checked })}
                  className="rounded text-[#D97757] focus:ring-[#D97757]"
                />
                <label htmlFor="isPrimaryCheckbox" className="text-xs text-[#1F1E1D] cursor-pointer">
                  Designar como Contacto Principal de esta cuenta
                </label>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#F0EEE6]">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-[#716F6A] text-xs"
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
          <div className="bg-[#FFFFFF] border border-[#E8E6DF] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#E8E6DF] flex items-center justify-between bg-[#FAF9F5]">
              <h2 className="text-sm font-semibold text-[#1F1E1D] flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                Nueva Oportunidad Comercial
              </h2>
              <button onClick={() => setIsOppModalOpen(false)} className="text-[#716F6A] hover:text-[#1F1E1D]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOpportunity} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Título de la Oportunidad *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Retainer Redes Sociales + Pauta Meta"
                  value={oppFormData.title}
                  onChange={(e) => setOppFormData({ ...oppFormData, title: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Etapa del Pipeline *</label>
                <select
                  required
                  value={oppFormData.stageId}
                  onChange={(e) => setOppFormData({ ...oppFormData, stageId: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
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
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Valor ($ USD) *</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={oppFormData.value}
                    onChange={(e) => setOppFormData({ ...oppFormData, value: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Probabilidad (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={oppFormData.probability}
                    onChange={(e) => setOppFormData({ ...oppFormData, probability: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Fecha Estimada de Cierre</label>
                <input
                  type="date"
                  value={oppFormData.expectedClose}
                  onChange={(e) => setOppFormData({ ...oppFormData, expectedClose: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#F0EEE6]">
                <button
                  type="button"
                  onClick={() => setIsOppModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-[#716F6A] text-xs"
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
          <div className="bg-[#FFFFFF] border border-[#E8E6DF] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#E8E6DF] flex items-center justify-between bg-[#FAF9F5]">
              <h2 className="text-sm font-semibold text-[#1F1E1D] flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                Agendar Tarea Comercial
              </h2>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-[#716F6A] hover:text-[#1F1E1D]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Título de la Tarea *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Enviar reporte mensual de métricas de pauta"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Descripción</label>
                <textarea
                  rows={2}
                  placeholder="Instrucciones o contexto adicional..."
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={taskFormData.dueDate}
                    onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Prioridad</label>
                  <select
                    value={taskFormData.priority}
                    onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
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
                  className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-[#716F6A] text-xs"
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
