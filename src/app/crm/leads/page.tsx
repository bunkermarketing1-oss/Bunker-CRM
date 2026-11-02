"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Users,
  Plus,
  Search,
  Trash2,
  ArrowRightCircle,
  Mail,
  Building,
  X,
  CheckCircle,
  Sparkles,
  TrendingUp,
  DollarSign,
  MessageCircle,
  ExternalLink,
  Download,
  Flame,
  Edit,
  AlertTriangle,
  UserCheck,
  Tag,
  Loader2,
  RefreshCw,
  FileText,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { buildCsv } from "@/lib/csv";
import LeadStatusBadge from "@/components/crm/LeadStatusBadge";
import { SocialNetworkIcon } from "@/components/common/SocialNetworkIcon";

interface Lead {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  normalizedPhone: string | null;
  source: string;
  campaign: string | null;
  externalLeadId: string | null;
  externalFormId?: string | null;
  externalAdId?: string | null;
  externalCampaignId?: string | null;
  status: string;
  qualification: number;
  aiSummary: string | null;
  estimatedValue: number;
  notes: string | null;
  isDemo: boolean;
  createdAt: string;
  ownerId: string | null;
  clientId?: string | null;
  client?: {
    id: string;
    name: string;
  } | null;
  owner?: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

// Next 14 exige un Suspense alrededor de useSearchParams para prerenderizar la página (si no, falla el build).
export default function LeadsPage() {
  return (
    <Suspense>
      <LeadsPageContent />
    </Suspense>
  );
}

function LeadsPageContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const isAdmin = user?.role?.toUpperCase() === "ADMIN" && !user?.isClientUser;

  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [clients, setClients] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState(searchParams.get("clientId") ?? "all");

  // Sincronizar filtro si cambia el parámetro de URL (ej. navegación desde el Sidebar)
  useEffect(() => {
    const cid = searchParams.get("clientId") ?? "all";
    if (cid !== clientFilter) {
      setClientFilter(cid);
    }
  }, [searchParams, clientFilter]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const tableTopRef = React.useRef<HTMLDivElement>(null);

  // Resetear a la primera página cuando cambie cualquier filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, sourceFilter, ownerFilter, clientFilter, pageSize]);

  // Notifications & Feedback
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const [syncingMeta, setSyncingMeta] = useState(false);

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createData, setCreateData] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    source: "meta_ads",
    campaign: "",
    estimatedValue: "2500",
    ownerId: "",
    clientId: "",
    notes: "",
  });
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string[]>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<any[] | null>(null);
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [editFormData, setEditFormData] = useState({
    id: "",
    name: "",
    companyName: "",
    email: "",
    phone: "",
    source: "manual",
    status: "new",
    campaign: "",
    estimatedValue: "0",
    ownerId: "",
    clientId: "",
    notes: "",
  });
  const [editFieldErrors, setEditFieldErrors] = useState<Record<string, string[]>>({});
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Detail Drawer/Modal State
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const showNotification = (text: string, type: "success" | "error" = "success") => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 5000);
  };

  const handleSyncMetaLeads = async () => {
    try {
      setSyncingMeta(true);
      const res = await fetch("/api/leads/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hours: 8760,
          clientId: clientFilter !== "all" ? clientFilter : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification(
          `Sincronización completada: ${json.summary?.recovered ?? 0} prospectos recuperados de Meta Ads.`,
          "success"
        );
        fetchLeads();
      } else {
        showNotification(json.error || "No se pudo sincronizar los leads de Meta.", "error");
      }
    } catch {
      showNotification("Error de conexión al sincronizar con Meta.", "error");
    } finally {
      setSyncingMeta(false);
    }
  };

  // Fetch Team Members (solo asesores internos de Bunker)
  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch("/api/users?scope=bunker");
      const json = await res.json();
      if (json.success && json.users) {
        setTeamMembers(json.users);
      }
    } catch (e) {
      console.error("Error fetching team members:", e);
    }
  }, []);

  // Fetch Clientes (solo para administradores)
  const fetchClients = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await fetch("/api/clients");
      const json = await res.json();
      if (json.success && json.clients) {
        setClients(json.clients);
      }
    } catch (e) {
      console.error("Error fetching clients:", e);
    }
  }, [isAdmin]);

  // Fetch Leads
  useEffect(() => {
    const term = searchParams.get("search");
    if (term !== null) setSearch(term);
  }, [searchParams]);

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (sourceFilter !== "all") params.append("source", sourceFilter);
      if (ownerFilter !== "all") params.append("ownerId", ownerFilter);
      if (clientFilter !== "all") params.append("clientId", clientFilter);

      const res = await fetch(`/api/leads?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLeads(json.leads);
      } else {
        console.error("Fetch leads failed:", json.error);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, sourceFilter, ownerFilter, clientFilter]);

  useEffect(() => {
    fetchTeam();
    fetchClients();
  }, [fetchTeam, fetchClients]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  // Handle Create Lead Submission
  const handleCreateLead = async (e: React.FormEvent, force: boolean = false) => {
    if (e) e.preventDefault();
    setSubmittingCreate(true);
    setCreateFieldErrors({});

    try {
      const payload: any = {
        name: createData.name,
        companyName: createData.companyName || null,
        email: createData.email || null,
        phone: createData.phone || null,
        source: createData.source,
        campaign: createData.campaign || null,
        estimatedValue: parseFloat(createData.estimatedValue) || 0,
        ownerId: createData.ownerId || null,
        clientId: createData.clientId || (clientFilter !== "all" ? clientFilter : null),
        notes: createData.notes || null,
        forceDuplicate: force,
      };

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (res.status === 409 && json.duplicateDetected) {
        // Duplicate detected
        setDuplicateWarning(json.matches);
        setSubmittingCreate(false);
        return;
      }

      if (!res.ok || !json.success) {
        if (json.fieldErrors) {
          setCreateFieldErrors(json.fieldErrors);
        }
        showNotification(json.error || "Error al registrar prospecto.", "error");
        setSubmittingCreate(false);
        return;
      }

      // Success
      setIsCreateOpen(false);
      setDuplicateWarning(null);
      setCreateData({
        name: "",
        companyName: "",
        email: "",
        phone: "",
        source: "meta_ads",
        campaign: "",
        estimatedValue: "2500",
        ownerId: "",
    clientId: "",
        notes: "",
      });
      showNotification("¡Prospecto registrado exitosamente!");
      fetchLeads();
    } catch (err: any) {
      showNotification(err.message || "Error al conectar con el servidor", "error");
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (lead: Lead) => {
    setEditingLead(lead);
    setEditFormData({
      id: lead.id,
      name: lead.name,
      companyName: lead.companyName || "",
      email: lead.email || "",
      phone: lead.phone || "",
      source: lead.source,
      status: lead.status,
      campaign: lead.campaign || "",
      estimatedValue: (lead.estimatedValue || 0).toString(),
      ownerId: lead.ownerId || "",
      clientId: lead.clientId || "",
      notes: lead.notes || "",
    });
    setEditFieldErrors({});
    setIsEditOpen(true);
  };

  // Handle Edit Lead Submission
  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEdit(true);
    setEditFieldErrors({});

    try {
      const payload: any = {
        id: editFormData.id,
        name: editFormData.name,
        companyName: editFormData.companyName || null,
        email: editFormData.email || null,
        phone: editFormData.phone || null,
        source: editFormData.source,
        status: editFormData.status,
        campaign: editFormData.campaign || null,
        estimatedValue: parseFloat(editFormData.estimatedValue) || 0,
        ownerId: editFormData.ownerId || null,
        notes: editFormData.notes || null,
      };

      const res = await fetch("/api/leads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.fieldErrors) {
          setEditFieldErrors(json.fieldErrors);
        }
        showNotification(json.error || "Error al actualizar prospecto.", "error");
        setSubmittingEdit(false);
        return;
      }

      setIsEditOpen(false);
      setEditingLead(null);
      showNotification("Prospecto actualizado correctamente.");
      fetchLeads();
      if (selectedLead && selectedLead.id === json.lead.id) {
        setSelectedLead(json.lead);
      }
    } catch (err: any) {
      showNotification(err.message || "Error de conexión", "error");
    } finally {
      setSubmittingEdit(false);
    }
  };

  // Convert Lead to Client & Opportunity
  const handleConvert = async (leadId: string) => {
    if (
      !confirm(
        "¿Deseas convertir este prospecto en Cliente Activo y abrir su Oportunidad en el Pipeline?"
      )
    )
      return;

    try {
      const res = await fetch(`/api/leads/${leadId}/convert`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        showNotification("¡Prospecto convertido exitosamente a Cliente y Oportunidad comercial!");
        fetchLeads();
        if (selectedLead && selectedLead.id === leadId) {
          setSelectedLead(null);
        }
      } else {
        showNotification(json.error || "No se pudo convertir el prospecto.", "error");
      }
    } catch (e: any) {
      showNotification("Error: " + e.message, "error");
    }
  };

  // Delete Lead (Restricted to Admin)
  const handleDelete = async (leadId: string) => {
    if (!isAdmin) {
      showNotification("Solo los administradores poseen permisos para eliminar prospectos.", "error");
      return;
    }

    if (!confirm("¿Estás seguro de archivar este prospecto del CRM?"))
      return;

    try {
      const res = await fetch(`/api/leads?id=${leadId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        showNotification("Prospecto eliminado de forma segura.");
        fetchLeads();
        if (selectedLead && selectedLead.id === leadId) {
          setSelectedLead(null);
        }
      } else {
        showNotification(json.error || "Error al eliminar prospecto.", "error");
      }
    } catch (e: any) {
      showNotification("Error: " + e.message, "error");
    }
  };

  // Helper for WhatsApp Phone Clean Format
  const getWhatsAppNumber = (lead: Lead) => {
    const raw = lead.normalizedPhone || lead.phone;
    if (!raw) return "";
    return raw.replace(/[^0-9]/g, "");
  };

  // Metrics Calculations
  const totalLeadsCount = leads.length;
  const qualifiedCount = leads.filter(
    (l) => l.status === "qualified" || (l.qualification || 0) >= 70
  ).length;
  const totalPipelineVal = leads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
  const conversionRate =
    totalLeadsCount > 0
      ? Math.round(
          (leads.filter((l) => l.status === "converted").length / totalLeadsCount) * 100
        )
      : 0;

  // Paginación (100 por página por defecto)
  const totalPages = Math.max(1, Math.ceil(totalLeadsCount / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalLeadsCount);
  const paginatedLeads = leads.slice(startIndex, endIndex);

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
    setCurrentPage(newPage);
    tableTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (validCurrentPage <= 4) {
      return [1, 2, 3, 4, 5, "...", totalPages];
    }
    if (validCurrentPage >= totalPages - 3) {
      return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, "...", validCurrentPage - 1, validCurrentPage, validCurrentPage + 1, "...", totalPages];
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "ID",
      "Nombre",
      "Empresa",
      "Email",
      "Telefono",
      "Telefono_E164",
      "Origen",
      "Campana",
      "Estado",
      "Presupuesto_USD",
      "Score_IA",
      "Asesor",
      "Fecha_Registro",
    ];

    const rows = leads.map((l) => [
      l.id,
      l.name,
      l.companyName || "",
      l.email || "",
      l.phone || "",
      l.normalizedPhone || "",
      l.source,
      l.campaign || "",
      l.status,
      l.estimatedValue || 0,
      l.qualification || 0,
      l.owner?.name || "Sin asignar",
      new Date(l.createdAt).toLocaleDateString(),
    ]);

    // buildCsv neutralises spreadsheet formulas (=, +, -, @) and escapes quotes.
    // A Blob is used instead of a data: URI so characters such as '#' never truncate the file.
    const csvContent = "\uFEFF" + buildCsv(headers, rows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `bunker_leads_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#EAECF0]">
        <div>
          <h1 className="text-2xl font-semibold text-[#101828] tracking-tight">
            Gestión de Leads & Prospectos
          </h1>
          <p className="text-xs text-[#475467] mt-0.5">
            Captación multicanal desde Meta Ads, calificación con IA, teléfonos verificados y prevención de duplicados.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSyncMetaLeads}
            disabled={syncingMeta}
            className="px-3.5 py-2 rounded-2xl bg-white border border-[#EAECF0] text-[#101828] hover:bg-[#F8F9FA] text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60"
            title="Sincronizar prospectos desde campañas de Meta Ads"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#667085] ${syncingMeta ? "animate-spin text-amber-500" : ""}`} />
            <span>{syncingMeta ? "Sincronizando..." : "Sincronizar Meta"}</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-2xl bg-white border border-[#EAECF0] text-[#101828] hover:bg-[#F8F9FA] text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#667085]" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => {
              setDuplicateWarning(null);
              setCreateFieldErrors({});
              setCreateData((prev) => ({
                ...prev,
                clientId: clientFilter !== "all" ? clientFilter : "",
              }));
              setIsCreateOpen(true);
            }}
            className="btn-black-gold rounded-2xl px-4 py-2 text-xs font-semibold flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>+ Registrar Prospecto</span>
          </button>
        </div>
      </div>

      {/* Global Feedback Banner */}
      {feedback && (
        <div
          className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center gap-2 shadow-xs animate-in slide-in-from-top-1 ${
            feedback.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {feedback.type === "success" ? (
            <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* KPI Metric Strip Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="p-4 rounded-3xl bg-white border border-[#EAECF0] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-medium">Total Prospectos</span>
            <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-amber-700" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#101828] tracking-tight">{totalLeadsCount}</div>
          <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Captación activa multicanal</span>
          </div>
        </div>

        {/* Calificados con IA */}
        <div className="p-4 rounded-3xl bg-white border border-[#EAECF0] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-medium">Calificados por IA (≥70)</span>
            <div className="w-7 h-7 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#101828] tracking-tight">{qualifiedCount}</div>
          <div className="text-[11px] text-[#475467]">Alta probabilidad de cierre comercial</div>
        </div>

        {/* Pipeline Estimado */}
        <div className="p-4 rounded-3xl bg-white border border-[#EAECF0] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-medium">Pipeline Proyectado</span>
            <div className="w-7 h-7 rounded-full bg-[#F8F9FA] border border-[#EAECF0] flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-[#101828]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#101828] tracking-tight">
            ${totalPipelineVal.toLocaleString()}{" "}
            <span className="text-xs font-normal text-[#667085]">USD</span>
          </div>
          <div className="text-[11px] text-amber-700 font-medium">
            Presupuesto estimado de pautas
          </div>
        </div>

        {/* Tasa de Conversión */}
        <div className="p-4 rounded-3xl bg-white border border-[#EAECF0] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#667085]">
            <span className="text-xs font-medium">Tasa de Conversión</span>
            <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 text-amber-600" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#101828] tracking-tight">{conversionRate}%</div>
          <div className="text-[11px] text-[#475467]">Leads convertidos a clientes activos</div>
        </div>
      </div>

      {/* Unified Filter & Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-[#EAECF0] shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative w-full lg:w-96">
            <Search className="w-3.5 h-3.5 text-[#667085] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, correo, empresa, teléfono o notas..."
              className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-2xl pl-9 pr-4 py-2 text-xs text-[#101828] placeholder-[#98A2B3] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Status Selector */}
            <div className="flex items-center gap-1 bg-[#F8F9FA] p-1 rounded-2xl border border-[#EAECF0] text-xs">
              <span className="text-[11px] text-[#667085] px-2 font-medium">Estado:</span>
              {[
                { id: "all", label: "Todos" },
                { id: "new", label: "Nuevo" },
                { id: "contacted", label: "Contactado" },
                { id: "qualified", label: "Calificado" },
                { id: "converted", label: "Convertido" },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2.5 py-1 rounded-xl text-xs transition-all ${
                    statusFilter === st.id
                      ? "bg-white text-[#101828] font-bold shadow-xs"
                      : "text-[#475467] hover:text-[#101828]"
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Source Dropdown */}
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-[#F8F9FA] border border-[#EAECF0] rounded-2xl px-3 py-1.5 text-xs text-[#101828] focus:outline-none font-medium"
            >
              <option value="all">Todos los Canales</option>
              <option value="meta_ads">Meta Ads (Instagram / FB)</option>
              <option value="facebook_ads">Facebook Ads</option>
              <option value="instagram_ads">Instagram Ads</option>
              <option value="google_ads">Google Ads</option>
              <option value="tiktok_ads">TikTok Ads</option>
              <option value="whatsapp">WhatsApp Directo</option>
              <option value="website">Formulario Web</option>
              <option value="referral">Recomendación</option>
              <option value="sales_outreach">Prospección Comercial</option>
              <option value="import">Importación</option>
              <option value="manual">Registro Manual</option>
              <option value="other">Otro</option>
            </select>

            {/* Owner Dropdown */}
            {teamMembers.length > 0 && (
              <select
                value={ownerFilter}
                onChange={(e) => setOwnerFilter(e.target.value)}
                className="bg-[#F8F9FA] border border-[#EAECF0] rounded-2xl px-3 py-1.5 text-xs text-[#101828] focus:outline-none font-medium"
              >
                <option value="all">Todos los Asesores</option>
                <option value="unassigned">Sin Asignar</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Main Leads Table */}
      <div ref={tableTopRef} className="bg-white rounded-3xl border border-[#EAECF0] shadow-xs overflow-hidden scroll-mt-6">
        <div className="p-4 border-b border-[#EAECF0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#F8F9FA]">
          <div className="text-xs font-bold text-[#101828]">
            Directorio de Prospectos{" "}
            <span className="text-[#667085] font-normal">({totalLeadsCount.toLocaleString()})</span>
          </div>
          {totalLeadsCount > 0 && (
            <div className="flex items-center gap-3 text-xs text-[#667085]">
              <span>
                Mostrando <strong className="text-[#101828] font-semibold">{startIndex + 1}–{endIndex}</strong> de{" "}
                <strong className="text-[#101828] font-semibold">{totalLeadsCount.toLocaleString()}</strong>
              </span>
              <div className="flex items-center gap-1.5 pl-2 border-l border-[#EAECF0]">
                <span className="text-[11px] text-[#667085]">Por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-[#EAECF0] rounded-lg px-2 py-0.5 text-xs font-semibold text-[#101828] focus:outline-none cursor-pointer"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={200}>200</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#EAECF0] text-[11px] font-semibold text-[#667085] bg-[#F8F9FA]/60">
                <th className="py-3.5 px-4 font-semibold">Prospecto / Empresa</th>
                <th className="py-3.5 px-4 font-semibold">Contacto & WhatsApp</th>
                <th className="py-3.5 px-4 font-semibold">Origen & Campaña</th>
                <th className="py-3.5 px-4 font-semibold">Asesor Asignado</th>
                <th className="py-3.5 px-4 font-semibold">Calificación IA</th>
                <th className="py-3.5 px-4 font-semibold">Presupuesto</th>
                <th className="py-3.5 px-4 font-semibold">Estado</th>
                <th className="py-3.5 px-4 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EAECF0]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#667085] text-xs">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
                    <span>Cargando prospectos en tiempo real...</span>
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#667085] text-xs">
                    No se encontraron prospectos con los filtros actuales.
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => {
                  const initials = lead.name
                    ? lead.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    : "LD";

                  const score = lead.qualification || 75;
                  const waNumber = getWhatsAppNumber(lead);

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-[#F8F9FA] transition-colors group"
                    >
                      {/* Profile / Company */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/crm/leads/${lead.id}`}
                            className="w-9 h-9 rounded-full bg-[#0F172A] text-amber-400 hover:scale-105 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs border border-amber-500/30 transition-transform"
                            title="Ver expediente en InsightCRM"
                          >
                            {initials}
                          </Link>
                          <div>
                            <Link
                              href={`/crm/leads/${lead.id}`}
                              className="font-bold text-[#101828] hover:text-amber-600 hover:underline flex items-center gap-1.5 leading-tight transition-colors"
                            >
                              <span>{lead.name}</span>
                              {lead.isDemo && (
                                <span className="text-[9px] bg-amber-50 text-amber-800 font-bold px-1.5 py-0.2 rounded-md border border-amber-300">
                                  DEMO
                                </span>
                              )}
                            </Link>
                            <div className="text-[11px] text-[#475467] flex items-center gap-1.5 mt-0.5">
                              <Building className="w-3 h-3 text-[#667085]" />
                              <span>{lead.companyName || "Sin empresa especificada"}</span>
                            </div>
                            {/* Mostrar badge de empresa asignada */}
                            {lead.client && (
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-950 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 px-2 py-0.5 rounded-full shadow-2xs">
                                  <Building className="w-2.5 h-2.5 text-amber-700 dark:text-amber-400" />
                                  <span>{lead.client.name}</span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact & WhatsApp */}
                      <td className="py-3.5 px-4 text-[11px]">
                        <div className="space-y-1">
                          {lead.email ? (
                            <div className="flex items-center gap-1.5 text-[#101828] font-medium">
                              <Mail className="w-3 h-3 text-[#667085] flex-shrink-0" />
                              <a
                                href={`mailto:${lead.email}`}
                                className="hover:underline truncate max-w-[170px]"
                              >
                                {lead.email}
                              </a>
                            </div>
                          ) : (
                            <span className="text-[#98A2B3] italic">Sin correo</span>
                          )}

                          <div className="flex items-center gap-2">
                            <span className="text-[#475467] font-mono">
                              {lead.phone || lead.normalizedPhone || "Sin teléfono"}
                            </span>
                            {waNumber && (
                              <a
                                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                                  `Hola ${lead.name}, te escribo de Bunker Agency para dar seguimiento a tu requerimiento comercial.`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors text-[10px] font-semibold"
                                title="Abrir chat en WhatsApp"
                              >
                                <MessageCircle className="w-2.5 h-2.5 text-emerald-600" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                            <Link
                              href={`/inbox?search=${encodeURIComponent(lead.name)}`}
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 hover:bg-amber-100 transition-colors text-[10px] font-semibold"
                              title="Abrir chat en la Bandeja de Entrada"
                            >
                              <Inbox className="w-2.5 h-2.5 text-amber-700" />
                              <span>Bandeja</span>
                            </Link>
                          </div>
                        </div>
                      </td>

                      {/* Channel & Campaign Traceability */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <SocialNetworkIcon provider={lead.source} size="sm" className="!w-5 !h-5 !rounded-md text-[10px]" />
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase inline-block ${
                                lead.source.includes("meta") ||
                                lead.source.includes("facebook") ||
                                lead.source.includes("instagram")
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : lead.source.includes("google")
                                  ? "bg-sky-50 text-sky-700 border-sky-200"
                                  : lead.source.includes("tiktok")
                                  ? "bg-pink-50 text-pink-700 border-pink-200"
                                  : lead.source === "referral"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-slate-50 text-slate-700 border-slate-200"
                              }`}
                            >
                              {lead.source.replace(/_/g, " ")}
                            </span>
                          </div>

                          {lead.campaign ? (
                            <div
                              className="text-[11px] font-semibold text-[#101828] flex items-center gap-1.5 truncate max-w-[200px]"
                              title={`Campaña: ${lead.campaign}`}
                            >
                              <Tag className="w-3 h-3 text-amber-600 shrink-0" />
                              <span className="truncate">{lead.campaign}</span>
                            </div>
                          ) : (
                            <p className="text-[10px] text-[#98A2B3] italic">Sin campaña asignada</p>
                          )}

                          <button
                            type="button"
                            onClick={() => setSelectedLead(lead)}
                            className="text-[10px] text-[#475467] hover:text-amber-700 font-medium flex items-center gap-1 truncate max-w-[200px] text-left transition-colors group"
                            title="Ver respuestas del formulario y anuncio de Meta Ads"
                          >
                            <FileText className="w-2.5 h-2.5 text-amber-600 shrink-0 group-hover:scale-110 transition-transform" />
                            <span className="truncate group-hover:underline">
                              {lead.externalAdId ? `Anuncio: ${lead.externalAdId}` : lead.externalFormId ? `Form: ${lead.externalFormId}` : (lead.campaign || "Ver contenido & respuestas")}
                            </span>
                          </button>
                        </div>
                      </td>

                      {/* Assigned Advisor */}
                      <td className="py-3.5 px-4 text-[11px]">
                        {lead.owner ? (
                          <div className="flex items-center gap-1.5 text-[#101828] font-medium">
                            <UserCheck className="w-3 h-3 text-amber-600" />
                            <span className="truncate max-w-[120px]">{lead.owner.name}</span>
                          </div>
                        ) : (
                          <span className="text-[#98A2B3] italic">Sin asignar</span>
                        )}
                      </td>

                      {/* AI Scoring */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <span
                            className={`text-xs font-bold px-2 py-0.5 rounded-md border inline-block ${
                              score >= 80
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                                : score >= 60
                                ? "bg-amber-50 text-amber-800 border-amber-300"
                                : "bg-red-50 text-red-800 border-red-200"
                            }`}
                          >
                            {score}/100
                          </span>
                          {lead.aiSummary && (
                            <p className="text-[10px] text-[#475467] line-clamp-1 max-w-[140px]">
                              {lead.aiSummary}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Budget */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#101828]">
                          ${lead.estimatedValue?.toLocaleString() || 0}
                        </div>
                        <div className="text-[10px] text-[#667085]">USD / mes</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <LeadStatusBadge status={lead.status} />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.status !== "converted" && (
                            <button
                              onClick={() => handleConvert(lead.id)}
                              className="btn-black-gold rounded-xl px-2 py-1 text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                              title="Convertir a Contacto y Oportunidad"
                            >
                              <ArrowRightCircle className="w-3 h-3 text-white" />
                              <span>Convertir</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleOpenEdit(lead)}
                            className="p-1.5 rounded-xl bg-[#F8F9FA] hover:bg-white text-[#475467] hover:text-[#101828] border border-[#EAECF0] transition-colors"
                            title="Editar prospecto"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedLead(lead)}
                            className="p-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 transition-colors shadow-2xs"
                            title="Ver contenido, anuncio y respuestas del formulario Meta Ads"
                          >
                            <FileText className="w-3.5 h-3.5 text-amber-700" />
                          </button>

                          <Link
                            href={`/crm/leads/${lead.id}`}
                            className="p-1.5 rounded-xl bg-[#F8F9FA] hover:bg-white text-[#475467] hover:text-amber-600 border border-[#EAECF0] transition-colors"
                            title="Ver Expediente Completo (InsightCRM)"
                          >
                            <ExternalLink className="w-3.5 h-3.5 text-amber-600" />
                          </Link>

                          {isAdmin && (
                            <button
                              onClick={() => handleDelete(lead.id)}
                              className="p-1.5 rounded-xl text-[#667085] hover:text-red-600 hover:bg-red-50 transition-colors"
                              title="Eliminar prospecto (Solo Admin)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Barra de Paginación */}
        {totalLeadsCount > pageSize && (
          <div className="p-3.5 border-t border-[#EAECF0] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <div className="text-xs text-[#667085]">
              Página <strong className="font-semibold text-[#101828]">{validCurrentPage}</strong> de{" "}
              <strong className="font-semibold text-[#101828]">{totalPages}</strong>{" "}
              <span className="text-[#98A2B3]">({totalLeadsCount.toLocaleString()} prospectos en total)</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={validCurrentPage === 1}
                className="p-1.5 rounded-lg border border-[#EAECF0] bg-white text-[#475467] hover:bg-[#F8F9FA] hover:text-[#101828] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Primera página"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handlePageChange(validCurrentPage - 1)}
                disabled={validCurrentPage === 1}
                className="px-2.5 py-1.5 rounded-lg border border-[#EAECF0] bg-white text-xs font-medium text-[#475467] hover:bg-[#F8F9FA] hover:text-[#101828] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {getPageNumbers().map((num, idx) =>
                  num === "..." ? (
                    <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-[#98A2B3]">
                      …
                    </span>
                  ) : (
                    <button
                      key={`page-${num}`}
                      type="button"
                      onClick={() => handlePageChange(num as number)}
                      className={`min-w-[28px] h-7 px-2 rounded-lg text-xs font-medium transition-colors ${
                        validCurrentPage === num
                          ? "bg-[#0F172A] text-white font-bold shadow-xs"
                          : "border border-[#EAECF0] bg-white text-[#475467] hover:bg-[#F8F9FA] hover:text-[#101828]"
                      }`}
                    >
                      {num}
                    </button>
                  )
                )}
              </div>

              <button
                type="button"
                onClick={() => handlePageChange(validCurrentPage + 1)}
                disabled={validCurrentPage === totalPages}
                className="px-2.5 py-1.5 rounded-lg border border-[#EAECF0] bg-white text-xs font-medium text-[#475467] hover:bg-[#F8F9FA] hover:text-[#101828] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handlePageChange(totalPages)}
                disabled={validCurrentPage === totalPages}
                className="p-1.5 rounded-lg border border-[#EAECF0] bg-white text-[#475467] hover:bg-[#F8F9FA] hover:text-[#101828] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Última página"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Contenido y Detalle del Formulario Meta */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#0c0d12] border border-[#EAECF0] dark:border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#EAECF0] dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-amber-50/50 via-white to-amber-50/30 dark:from-amber-950/20 dark:via-[#0c0d12] dark:to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0F172A] border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-sm shadow-md">
                  {selectedLead.name
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#101828] dark:text-white flex items-center gap-2">
                    <span>{selectedLead.name}</span>
                    {isAdmin && selectedLead.client?.name && (
                      <span className="text-[10px] font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 px-2 py-0.5 rounded-full">
                        {selectedLead.client.name}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-[#475467] dark:text-slate-400">
                    {selectedLead.companyName || "Prospecto Comercial"} • Captado {new Date(selectedLead.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="text-[#667085] hover:text-[#101828] dark:text-slate-400 dark:hover:text-white p-2 rounded-2xl hover:bg-[#F8F9FA] dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Tarjeta de Atribución Publicitaria (Campaña, Formulario, FanPage) */}
              <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/90 dark:border-amber-800/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 dark:text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                    Atribución & Campaña de Origen
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800 uppercase">
                    {selectedLead.source.replace(/_/g, " ")}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-amber-200/60 dark:border-slate-800">
                    <div className="text-[10px] text-[#667085] dark:text-slate-400 uppercase font-semibold">Campaña Publicitaria</div>
                    <div className="font-bold text-[#101828] dark:text-white mt-0.5 truncate" title={selectedLead.campaign || "Campaña no especificada"}>
                      {selectedLead.campaign || "Campaña no especificada"}
                    </div>
                  </div>

                  {selectedLead.client && (
                    <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-amber-200/60 dark:border-slate-800">
                      <div className="text-[10px] text-[#667085] dark:text-slate-400 uppercase font-semibold">Empresa Gestora / Cuenta</div>
                      <div className="font-bold text-amber-700 dark:text-amber-400 mt-0.5 capitalize">
                        {selectedLead.client.name}
                      </div>
                    </div>
                  )}

                  <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-amber-200/60 dark:border-slate-800">
                    <div className="text-[10px] text-[#667085] dark:text-slate-400 uppercase font-semibold">Presupuesto Estimado</div>
                    <div className="font-bold text-[#101828] dark:text-white mt-0.5">
                      ${selectedLead.estimatedValue?.toLocaleString() || 0} USD
                    </div>
                  </div>

                  <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-amber-200/60 dark:border-slate-800">
                    <div className="text-[10px] text-[#667085] dark:text-slate-400 uppercase font-semibold">Score Bunker AI</div>
                    <div className="font-bold text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{selectedLead.qualification || 70}/100</span>
                    </div>
                  </div>

                  <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-amber-200/60 dark:border-slate-800">
                    <div className="text-[10px] text-[#667085] dark:text-slate-400 uppercase font-semibold">Formulario / Origen</div>
                    <div className="font-semibold text-[#101828] dark:text-slate-200 mt-0.5 truncate">
                      {selectedLead.externalFormId ? `Formulario Meta Lead Ads` : selectedLead.source}
                    </div>
                    {selectedLead.externalFormId && (
                      <div className="text-[9px] text-[#667085] font-mono mt-0.5">Form ID: {selectedLead.externalFormId}</div>
                    )}
                  </div>

                  <div className="bg-white/90 dark:bg-slate-900/90 p-3 rounded-xl border border-amber-200/60 dark:border-slate-800">
                    <div className="text-[10px] text-[#667085] dark:text-slate-400 uppercase font-semibold">Anuncio / Creativo</div>
                    <div className="font-semibold text-[#101828] dark:text-slate-200 mt-0.5 truncate">
                      {selectedLead.externalAdId ? `Anuncio Meta` : (selectedLead.campaign || "Lead Inbound")}
                    </div>
                    {selectedLead.externalAdId && (
                      <div className="text-[9px] text-[#667085] font-mono mt-0.5">Ad ID: {selectedLead.externalAdId}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Respuestas del Formulario enviadas por el Lead */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-[#101828] dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  Contenido & Respuestas Enviadas por el Prospecto
                </h3>

                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-slate-900/60 border border-[#EAECF0] dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[#667085] dark:text-slate-400 font-medium">Nombre completo:</span>
                    <span className="font-bold text-[#101828] dark:text-white">{selectedLead.name}</span>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-slate-900/60 border border-[#EAECF0] dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[#667085] dark:text-slate-400 font-medium">Correo Electrónico:</span>
                    <a href={`mailto:${selectedLead.email}`} className="font-bold text-amber-600 dark:text-amber-400 hover:underline">
                      {selectedLead.email || "No registrado"}
                    </a>
                  </div>

                  <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-slate-900/60 border border-[#EAECF0] dark:border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-[#667085] dark:text-slate-400 font-medium">Número de Teléfono:</span>
                    <span className="font-mono font-bold text-[#101828] dark:text-white">
                      {selectedLead.phone || selectedLead.normalizedPhone || "No registrado"}
                    </span>
                  </div>

                  {selectedLead.notes && (
                    <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-slate-900/60 border border-[#EAECF0] dark:border-slate-800 text-xs space-y-1">
                      <span className="text-[10px] text-[#667085] dark:text-slate-400 font-semibold uppercase">Preguntas adicionales / Notas del Lead:</span>
                      <pre className="text-xs font-sans text-[#101828] dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
                        {selectedLead.notes}
                      </pre>
                    </div>
                  )}

                  {selectedLead.aiSummary && (
                    <div className="p-3 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 text-xs space-y-1">
                      <span className="text-[10px] text-amber-800 dark:text-amber-400 font-bold uppercase flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Resumen y Análisis IA:
                      </span>
                      <p className="text-xs text-[#475467] dark:text-slate-300 leading-relaxed">
                        {selectedLead.aiSummary}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-[#EAECF0] dark:border-slate-800 bg-[#F8F9FA] dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-2.5">
              <Link
                href={`/crm/leads/${selectedLead.id}`}
                className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-[#EAECF0] dark:border-slate-700 hover:border-amber-400 text-xs font-semibold text-[#101828] dark:text-white flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-500" />
                <span>Ver Expediente Completo</span>
              </Link>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const leadToEdit = selectedLead;
                    setSelectedLead(null);
                    handleOpenEdit(leadToEdit);
                  }}
                  className="px-3.5 py-2 rounded-2xl bg-white dark:bg-slate-800 hover:bg-[#F8F9FA] text-[#101828] dark:text-white border border-[#EAECF0] dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                >
                  <Edit className="w-3.5 h-3.5 text-[#667085]" />
                  <span>Editar</span>
                </button>

                {selectedLead.status !== "converted" && (
                  <button
                    type="button"
                    onClick={() => {
                      const leadId = selectedLead.id;
                      setSelectedLead(null);
                      handleConvert(leadId);
                    }}
                    className="btn-black-gold rounded-2xl px-3.5 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-2xs"
                  >
                    <ArrowRightCircle className="w-3.5 h-3.5 text-[#E5C158]" />
                    <span>Convertir</span>
                  </button>
                )}

                <Link
                  href={`/inbox?search=${encodeURIComponent(selectedLead.name)}`}
                  className="px-3.5 py-2 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Abrir chat en la Bandeja de Entrada"
                >
                  <Inbox className="w-3.5 h-3.5 text-amber-600" />
                  <span>Bandeja de Entrada</span>
                </Link>

                {getWhatsAppNumber(selectedLead) && (
                  <a
                    href={`https://wa.me/${getWhatsAppNumber(selectedLead)}?text=${encodeURIComponent(
                      `Hola ${selectedLead.name}, te escribo de Bunker Agency para dar seguimiento a tu requerimiento comercial.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="px-3.5 py-2 rounded-2xl bg-[#101828] hover:bg-black text-white text-xs font-semibold transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Prospecto */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#ECEAE3] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-[#ECEAE3] flex items-center justify-between bg-[#FDFDFC]">
              <div>
                <h2 className="text-base font-semibold text-[#141414] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#D4AF37]" />
                  Registrar Nuevo Prospecto
                </h2>
                <p className="text-[11px] text-[#6B6861] mt-0.5">
                  Completa los datos del contacto y asigna un asesor comercial.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-[#8C887E] hover:text-[#141414] p-1 rounded-xl hover:bg-[#F6F5F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Duplicate Detected Warning Alert */}
            {duplicateWarning && duplicateWarning.length > 0 && (
              <div className="p-4 mx-6 mt-4 bg-amber-50 border border-amber-200/90 rounded-2xl text-amber-900 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-amber-950">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span>Posible prospecto duplicado detectado</span>
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Ya existe un registro con correo o teléfono similar en su organización:
                </p>
                <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 text-[11px] space-y-1">
                  {duplicateWarning.map((m) => (
                    <div key={m.id} className="flex items-center justify-between">
                      <span className="font-semibold text-[#141414]">
                        {m.name} ({m.companyName || "Sin empresa"})
                      </span>
                      <span className="text-[#8C887E] font-mono">
                        {m.email || m.phone}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-1 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDuplicateWarning(null)}
                    className="px-2.5 py-1 text-[11px] rounded-xl bg-white border border-amber-300 font-medium text-amber-900 hover:bg-amber-100"
                  >
                    Corregir datos
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleCreateLead(e, true)}
                    className="btn-black-gold rounded-xl px-3 py-1 text-[11px] font-semibold shadow-xs"
                  >
                    Guardar de todos modos
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={(e) => handleCreateLead(e, false)} className="p-6 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Lic. Roberto Garza"
                  value={createData.name}
                  onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                  className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                />
                {createFieldErrors.name && (
                  <p className="text-[11px] text-red-600 mt-1">{createFieldErrors.name[0]}</p>
                )}
              </div>

              {/* Company */}
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">
                  Empresa / Negocio
                </label>
                <input
                  type="text"
                  placeholder="ej. Cadena Restaurantes Sonora Grill"
                  value={createData.companyName}
                  onChange={(e) =>
                    setCreateData({ ...createData, companyName: e.target.value })
                  }
                  className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={createData.email}
                    onChange={(e) =>
                      setCreateData({ ...createData, email: e.target.value })
                    }
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  />
                  {createFieldErrors.email && (
                    <p className="text-[11px] text-red-600 mt-1">{createFieldErrors.email[0]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Teléfono / WhatsApp (Internacional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+52 55 1234 5678"
                    value={createData.phone}
                    onChange={(e) =>
                      setCreateData({ ...createData, phone: e.target.value })
                    }
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  />
                  {createFieldErrors.phone && (
                    <p className="text-[11px] text-red-600 mt-1">{createFieldErrors.phone[0]}</p>
                  )}
                </div>
              </div>

              {/* Source & Campaign */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Canal de Origen *
                  </label>
                  <select
                    value={createData.source}
                    onChange={(e) =>
                      setCreateData({ ...createData, source: e.target.value })
                    }
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="meta_ads">Meta Ads (Instagram / FB)</option>
                    <option value="facebook_ads">Facebook Ads</option>
                    <option value="instagram_ads">Instagram Ads</option>
                    <option value="google_ads">Google Ads</option>
                    <option value="tiktok_ads">TikTok Ads</option>
                    <option value="whatsapp">WhatsApp Directo</option>
                    <option value="website">Formulario Web</option>
                    <option value="referral">Recomendación</option>
                    <option value="sales_outreach">Prospección Comercial</option>
                    <option value="import">Importación</option>
                    <option value="manual">Registro Manual</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Campaña de Origen
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Preventa Luxury 2026"
                    value={createData.campaign}
                    onChange={(e) =>
                      setCreateData({ ...createData, campaign: e.target.value })
                    }
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              {/* Budget & Owner */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Presupuesto Mensual ($ USD)
                  </label>
                  <input
                    type="number"
                    value={createData.estimatedValue}
                    onChange={(e) =>
                      setCreateData({ ...createData, estimatedValue: e.target.value })
                    }
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Asesor Responsable
                  </label>
                  <select
                    value={createData.ownerId}
                    onChange={(e) =>
                      setCreateData({ ...createData, ownerId: e.target.value })
                    }
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="">Asignar a mí mismo</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Client Selection (Admin only) */}
              {!user?.isClientUser && (
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Empresa / Marca del Cliente
                  </label>
                  <select
                    value={createData.clientId}
                    onChange={(e) =>
                      setCreateData({ ...createData, clientId: e.target.value })
                    }
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="">Sin vincular (General Bunker Agency)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[#667085] mt-0.5">
                    Vincula este prospecto directamente a la marca seleccionada para aislar métricas y mensajería.
                  </p>
                </div>
              )}

              {/* Client Selection (Admin only) */}
              {!user?.isClientUser && (
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Empresa / Marca del Cliente
                  </label>
                  <select
                    value={createData.clientId}
                    onChange={(e) =>
                      setCreateData({ ...createData, clientId: e.target.value })
                    }
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="">Sin vincular (General Bunker Agency)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[#667085] mt-0.5">
                    Vincula este prospecto directamente a la marca seleccionada para aislar métricas y mensajería.
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">
                  Observaciones Comerciales
                </label>
                <textarea
                  rows={2}
                  placeholder="ej. Interesado en captación para 8 sucursales..."
                  value={createData.notes}
                  onChange={(e) =>
                    setCreateData({ ...createData, notes: e.target.value })
                  }
                  className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-2xl bg-[#F6F5F2] border border-[#ECEAE3] text-[#6B6861] hover:text-[#141414] text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="btn-black-gold rounded-2xl px-5 py-2 text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  {submittingCreate ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Guardar Prospecto</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Prospecto */}
      {isEditOpen && editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#ECEAE3] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-[#ECEAE3] flex items-center justify-between bg-[#FDFDFC]">
              <div>
                <h2 className="text-base font-semibold text-[#141414] flex items-center gap-2">
                  <Edit className="w-4 h-4 text-[#D4AF37]" />
                  Editar Prospecto
                </h2>
                <p className="text-[11px] text-[#6B6861] mt-0.5">
                  Actualización de información comercial y trazabilidad de cambios.
                </p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-[#8C887E] hover:text-[#141414] p-1 rounded-xl hover:bg-[#F6F5F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateLead} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                />
                {editFieldErrors.name && (
                  <p className="text-[11px] text-red-600 mt-1">{editFieldErrors.name[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">
                  Empresa / Negocio
                </label>
                <input
                  type="text"
                  value={editFormData.companyName}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, companyName: e.target.value })
                  }
                  className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, email: e.target.value })
                    }
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  />
                  {editFieldErrors.email && (
                    <p className="text-[11px] text-red-600 mt-1">{editFieldErrors.email[0]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, phone: e.target.value })
                    }
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  />
                  {editFieldErrors.phone && (
                    <p className="text-[11px] text-red-600 mt-1">{editFieldErrors.phone[0]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Estado Comercial
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, status: e.target.value })
                    }
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="new">Nuevo</option>
                    <option value="contacted">Contactado</option>
                    <option value="qualified">Calificado</option>
                    <option value="lost">Perdido</option>
                    {/* 'Convertido' is only reachable through the Convert action (atomic Client + Opportunity) */}
                    {editingLead?.status === "converted" && (
                      <option value="converted">Convertido</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Canal de Origen
                  </label>
                  <select
                    value={editFormData.source}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, source: e.target.value })
                    }
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="meta_ads">Meta Ads (Instagram / FB)</option>
                    <option value="facebook_ads">Facebook Ads</option>
                    <option value="instagram_ads">Instagram Ads</option>
                    <option value="google_ads">Google Ads</option>
                    <option value="tiktok_ads">TikTok Ads</option>
                    <option value="whatsapp">WhatsApp Directo</option>
                    <option value="website">Formulario Web</option>
                    <option value="referral">Recomendación</option>
                    <option value="sales_outreach">Prospección Comercial</option>
                    <option value="import">Importación</option>
                    <option value="manual">Registro Manual</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Presupuesto ($ USD)
                  </label>
                  <input
                    type="number"
                    value={editFormData.estimatedValue}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        estimatedValue: e.target.value,
                      })
                    }
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Asesor Responsable
                  </label>
                  <select
                    value={editFormData.ownerId}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, ownerId: e.target.value })
                    }
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="">Sin asignar</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">
                  Observaciones Comerciales
                </label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, notes: e.target.value })
                  }
                  className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-2xl bg-[#F6F5F2] border border-[#ECEAE3] text-[#6B6861] hover:text-[#141414] text-xs font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="btn-black-gold rounded-2xl px-5 py-2 text-xs font-semibold shadow-xs flex items-center gap-1.5"
                >
                  {submittingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <span>Guardar Cambios</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


    </div>
  );
}
