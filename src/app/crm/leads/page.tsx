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
  X,
  CheckCircle,
  Sparkles,
  DollarSign,
  MessageCircle,
  ExternalLink,
  Flame,
  Edit,
  AlertTriangle,
  Tag,
  Loader2,
  FileText,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useActiveClientId } from "@/hooks/useActiveClientId";
import { useClientOptions } from "@/hooks/useClientOptions";
import { buildCsv } from "@/lib/csv";
import LeadStatusBadge from "@/components/crm/LeadStatusBadge";
import LeadAvatar from "@/components/crm/LeadAvatar";
import LeadsActionsMenu from "@/components/crm/LeadsActionsMenu";
import ActionMenu, { type ActionMenuItem } from "@/components/ui/ActionMenu";
import StatCard from "@/components/ui/StatCard";
import TwilioSmsConsentNotice from "@/components/common/TwilioSmsConsentNotice";
import { SocialNetworkIcon } from "@/components/common/SocialNetworkIcon";

interface Lead {
  id: string;
  name: string;
  avatarUrl?: string | null;
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
  smsConsent?: boolean;
  smsConsentAt?: string | null;
  smsConsentSource?: string | null;
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

interface DuplicateMatch {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
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
  const activeClientId = useActiveClientId();
  const clients = useClientOptions();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  // La marca activa (barra lateral) es la única fuente del filtro: no se puede cambiar desde esta pantalla.
  const clientFilter = activeClientId ?? "all";
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
  const [assigningRoundRobin, setAssigningRoundRobin] = useState(false);

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
    smsConsent: true,
  });
  const [createFieldErrors, setCreateFieldErrors] = useState<Record<string, string[]>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateMatch[] | null>(null);
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
    smsConsent: true,
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

  const handleBulkRoundRobin = async () => {
    try {
      setAssigningRoundRobin(true);
      const res = await fetch("/api/leads/round-robin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: clientFilter !== "all" ? clientFilter : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showNotification(json.message, "success");
        fetchLeads();
      } else {
        showNotification(json.error || "No se pudo ejecutar la auto-asignación.", "error");
      }
    } catch {
      showNotification("Error de red al ejecutar auto-asignación Round-Robin.", "error");
    } finally {
      setAssigningRoundRobin(false);
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
  }, [fetchTeam]);

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
      const payload: Record<string, unknown> = {
        name: createData.name,
        companyName: createData.companyName || null,
        email: createData.email || null,
        phone: createData.phone || null,
        source: createData.source,
        campaign: createData.campaign || null,
        estimatedValue: parseFloat(createData.estimatedValue) || 0,
        ownerId: createData.ownerId || null,
        clientId: activeClientId ?? (createData.clientId || null),
        notes: createData.notes || null,
        smsConsent: createData.smsConsent,
        smsConsentSource: "crm_manual",
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
        smsConsent: true,
      });
      showNotification("¡Prospecto registrado exitosamente!");
      fetchLeads();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al conectar con el servidor";
      showNotification(message, "error");
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
      smsConsent: lead.smsConsent !== false,
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
      const payload: Record<string, unknown> = {
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
        smsConsent: editFormData.smsConsent,
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
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error de conexión";
      showNotification(message, "error");
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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error desconocido";
      showNotification("Error: " + message, "error");
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
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Error desconocido";
      showNotification("Error: " + message, "error");
    }
  };

  // Helper for WhatsApp Phone Clean Format
  const getWhatsAppNumber = (lead: Lead) => {
    const raw = lead.normalizedPhone || lead.phone;
    if (!raw) return "";
    return raw.replace(/[^0-9]/g, "");
  };

  const activeLeads = leads;

  // Metrics Calculations
  const totalLeadsCount = activeLeads.length;
  const qualifiedCount = activeLeads.filter(
    (l) => l.status.toLowerCase() === "qualified" || (l.qualification || 0) >= 70
  ).length;
  const totalPipelineVal = activeLeads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
  const conversionRate =
    totalLeadsCount > 0
      ? Math.round(
          (activeLeads.filter((l) => l.status.toLowerCase() === "converted").length / totalLeadsCount) * 100
        )
      : 0;

  // Paginación (100 por página por defecto)
  const totalPages = Math.max(1, Math.ceil(totalLeadsCount / pageSize));
  const validCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (validCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalLeadsCount);
  const paginatedLeads = activeLeads.slice(startIndex, endIndex);

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

    const rows = activeLeads.map((l) => [
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
    <div className="space-y-6 animate-fade-in-up">
      {/* Top Header Banner con Estilo Orvion Capsule */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E2E5EB] dark:border-[#1F242D]">
        <h1 className="text-2xl sm:text-3xl font-black text-[#121417] dark:text-white tracking-tight">
          Prospectos
        </h1>

        <div className="flex items-center gap-2 flex-wrap">
          <LeadsActionsMenu
            syncingMeta={syncingMeta}
            assigningRoundRobin={assigningRoundRobin}
            onSyncMeta={handleSyncMetaLeads}
            onRoundRobin={handleBulkRoundRobin}
            onExportCsv={handleExportCSV}
          />

          <button
            type="button"
            onClick={() => {
              setDuplicateWarning(null);
              setCreateFieldErrors({});
              setCreateData((prev) => ({
                ...prev,
                clientId: activeClientId ?? "",
              }));
              setIsCreateOpen(true);
            }}
            className="rounded-full bg-[#121417] hover:bg-[#1E2229] dark:bg-white dark:hover:bg-[#F3F4F7] text-white dark:text-[#121417] px-4 py-2 text-xs font-bold flex items-center gap-2 shadow-orvion transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400 dark:text-[#121417]" />
            <span>Registrar prospecto</span>
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Prospectos" value={totalLeadsCount.toLocaleString()} icon={Users} />
        <StatCard label="Calificados (IA ≥70)" value={qualifiedCount.toLocaleString()} icon={Sparkles} />
        <StatCard label="Pipeline (USD)" value={`$${totalPipelineVal.toLocaleString()}`} icon={DollarSign} />
        <StatCard label="Conversión" value={`${conversionRate}%`} icon={Flame} />
      </div>

      {/* Unified Filter & Search Bar con Estilo Cápsula */}
      <div className="p-4 sm:p-5 rounded-[26px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Search Input con Bordes Redondeados */}
          <div className="relative w-full lg:w-96">
            <Search className="w-3.5 h-3.5 text-[#8C929D] absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, correo, empresa, teléfono o notas..."
              className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full pl-10 pr-4 py-2.5 text-xs text-[#121417] dark:text-white placeholder:text-[#8C929D] focus:outline-hidden focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] transition-all shadow-2xs"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Status Selector */}
            <div className="flex items-center gap-1 bg-[#F8F9FA] dark:bg-[#1A1D24] p-1 rounded-full border border-[#E2E5EB] dark:border-[#2A2E37] text-xs">
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
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                    statusFilter === st.id
                      ? "bg-[#121417] text-white dark:bg-white dark:text-[#121417] shadow-xs"
                      : "text-[#667085] hover:text-[#121417] dark:text-[#8C929D] dark:hover:text-white"
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
              className="bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-3.5 py-1.5 text-xs text-[#121417] dark:text-white focus:outline-hidden font-semibold cursor-pointer shadow-2xs"
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
                className="bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-3.5 py-1.5 text-xs text-[#121417] dark:text-white focus:outline-hidden font-semibold cursor-pointer shadow-2xs"
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

      {/* Main Leads Table con Diseño Cápsula Orvion */}
      <div ref={tableTopRef} className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion overflow-hidden scroll-mt-6">
        <div className="p-4 sm:p-5 border-b border-[#E2E5EB] dark:border-[#1F242D] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#F8F9FA] dark:bg-[#1A1D24]">
          {totalLeadsCount > 0 && (
            <div className="flex items-center gap-3 text-xs text-[#667085] dark:text-[#8C929D]">
              <span>
                Mostrando <strong className="text-[#121417] dark:text-white font-semibold">{startIndex + 1}–{endIndex}</strong> de{" "}
                <strong className="text-[#121417] dark:text-white font-semibold">{totalLeadsCount.toLocaleString()}</strong>
              </span>
              <div className="flex items-center gap-1.5 pl-2 border-l border-[#E2E5EB] dark:border-[#2A2E37]">
                <span className="text-[11px] text-[#667085] dark:text-[#8C929D]">Por página:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-2.5 py-0.5 text-xs font-bold text-[#121417] dark:text-white focus:outline-hidden cursor-pointer shadow-2xs"
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
              <tr className="border-b border-[#E2E5EB] dark:border-[#1F242D] text-[11px] font-bold text-[#667085] dark:text-[#8C929D] bg-[#F8F9FA]/60 dark:bg-[#1A1D24]/60">
                <th className="py-3.5 px-4 font-bold">Prospecto</th>
                <th className="py-3.5 px-4 font-bold">Contacto</th>
                <th className="py-3.5 px-4 font-bold">Origen</th>
                <th className="py-3.5 px-4 font-bold">Asesor</th>
                <th className="py-3.5 px-4 font-bold">Calificación</th>
                <th className="py-3.5 px-4 font-bold">Presupuesto (USD/mes)</th>
                <th className="py-3.5 px-4 font-bold">Estado</th>
                <th className="py-3.5 px-4 text-right font-bold"><span className="sr-only">Acciones</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E5EB] dark:divide-[#1F242D]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#667085] dark:text-[#8C929D] text-xs">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto text-amber-500 mb-2" />
                    <span>Cargando prospectos en tiempo real...</span>
                  </td>
                </tr>
              ) : activeLeads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-[#667085] dark:text-[#8C929D] text-xs space-y-2">
                    <Inbox className="w-6 h-6 mx-auto text-[#8C929D] mb-1 opacity-70" />
                    <p className="font-semibold text-[#121417] dark:text-white">No se encontraron prospectos con los filtros actuales.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearch("");
                        setStatusFilter("all");
                        setSourceFilter("all");
                        setOwnerFilter("all");
                      }}
                      className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100 transition-colors cursor-pointer"
                    >
                      Restablecer filtros
                    </button>
                  </td>
                </tr>
              ) : (
                paginatedLeads.map((lead) => {
                  const score = lead.qualification || 75;
                  const waNumber = getWhatsAppNumber(lead);
                  const contextLine = Array.from(
                    new Set([lead.companyName, lead.client?.name].filter((value): value is string => Boolean(value)))
                  ).join(" · ");
                  const menuItems: ActionMenuItem[] = [
                    { key: "answers", label: "Ver respuestas del formulario", icon: FileText, onSelect: () => setSelectedLead(lead) },
                    { key: "edit", label: "Editar prospecto", icon: Edit, onSelect: () => handleOpenEdit(lead) },
                    ...(isAdmin
                      ? [{ key: "delete", label: "Eliminar prospecto", icon: Trash2, onSelect: () => handleDelete(lead.id) }]
                      : []),
                  ];

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-[#F8F9FA] dark:hover:bg-[#1A1D24]/50 transition-colors group"
                    >
                      {/* Profile / Company */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <Link
                            href={`/crm/leads/${lead.id}`}
                            className="hover:scale-105 transition-transform shrink-0 relative inline-block"
                            title="Ver expediente en InsightCRM"
                          >
                            <LeadAvatar name={lead.name} avatarUrl={lead.avatarUrl} size="md" />
                            {lead.source && (
                              <div
                                className="absolute -bottom-1 -right-1 p-0.5 rounded-full bg-white dark:bg-[#121417] shadow-2xs border border-white dark:border-[#1F242D]"
                                title={`Canal: ${lead.source}`}
                              >
                                <SocialNetworkIcon
                                  type={
                                    lead.source.includes("instagram")
                                      ? "instagram"
                                      : lead.source.includes("facebook") || lead.source.includes("messenger")
                                      ? "facebook"
                                      : lead.source.includes("whatsapp")
                                      ? "whatsapp"
                                      : lead.source.includes("tiktok")
                                      ? "tiktok"
                                      : "meta"
                                  }
                                  size="xs"
                                />
                              </div>
                            )}
                          </Link>
                          <div className="min-w-0">
                            <Link
                              href={`/crm/leads/${lead.id}`}
                              className="font-bold text-[#121417] dark:text-white hover:text-amber-600 dark:hover:text-amber-400 hover:underline block truncate leading-tight transition-colors"
                            >
                              {lead.name}
                            </Link>
                            {contextLine && (
                              <p className="text-[11px] text-[#667085] dark:text-[#8C929D] mt-0.5 truncate">{contextLine}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contacto */}
                      <td className="py-3.5 px-4 text-[11px]">
                        <div className="space-y-1">
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="block text-[#121417] dark:text-white font-medium hover:underline truncate max-w-[190px]"
                            >
                              {lead.email}
                            </a>
                          )}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[#667085] dark:text-[#8C929D] font-mono">
                              {lead.phone || lead.normalizedPhone || "—"}
                            </span>
                            {waNumber && (
                              <a
                                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                                  `Hola ${lead.name}, te escribo de Bunker Agency para dar seguimiento a tu requerimiento comercial.`
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 rounded-full text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors"
                                title="Escribir por WhatsApp"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <Link
                              href={`/inbox?search=${encodeURIComponent(lead.name)}`}
                              className="p-1 rounded-full text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors"
                              title="Abrir la conversación en la Bandeja"
                            >
                              <Inbox className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                          {/* Solo se avisa la excepción: el consentimiento SMS en regla es lo normal y no necesita etiqueta. */}
                          {lead.phone && lead.smsConsent === false && (
                            <p
                              className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1"
                              title="Sin consentimiento SMS registrado (A2P 10DLC / Twilio)"
                            >
                              <ShieldCheck className="w-3 h-3" />
                              <span>Sin opt-in SMS</span>
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Origen */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <SocialNetworkIcon provider={lead.source} size="sm" className="!w-5 !h-5 !rounded-md text-[10px] shrink-0" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-[#121417] dark:text-white capitalize truncate">
                              {lead.source.replace(/_/g, " ")}
                            </p>
                            {lead.campaign && (
                              <p
                                className="text-[10px] text-[#667085] dark:text-[#8C929D] truncate max-w-[190px]"
                                title={`Campaña: ${lead.campaign}`}
                              >
                                {lead.campaign}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Asesor */}
                      <td className="py-3.5 px-4 text-[11px]">
                        {lead.owner ? (
                          <span className="block font-semibold text-[#121417] dark:text-white truncate max-w-[130px]">
                            {lead.owner.name}
                          </span>
                        ) : (
                          <span className="text-[#8C929D]">Sin asignar</span>
                        )}
                      </td>

                      {/* Calificación */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span
                            className={`text-sm font-black inline-flex items-center gap-1 ${
                              score >= 80
                                ? "text-amber-600 dark:text-amber-400"
                                : score >= 60
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {score >= 90 && <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />}
                            <span>{score}</span>
                          </span>
                          {lead.aiSummary && (
                            <p className="text-[10px] text-[#667085] dark:text-[#8C929D] line-clamp-1 max-w-[140px]">
                              {lead.aiSummary}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Presupuesto */}
                      <td className="py-3.5 px-4 font-bold text-[#121417] dark:text-white">
                        ${(lead.estimatedValue || 0).toLocaleString()}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <LeadStatusBadge status={lead.status} />
                      </td>

                      {/* Acciones: una principal visible y el resto en el menú */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.status !== "converted" && (
                            <button
                              onClick={() => handleConvert(lead.id)}
                              className="rounded-full bg-[#121417] hover:bg-[#1E2229] dark:bg-white dark:hover:bg-[#F3F4F7] text-white dark:text-[#121417] px-2.5 py-1 text-[11px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer transition-transform hover:scale-105"
                              title="Convertir a Contacto y Oportunidad"
                            >
                              <ArrowRightCircle className="w-3 h-3 text-amber-400 dark:text-[#121417]" />
                              <span>Convertir</span>
                            </button>
                          )}
                          <ActionMenu items={menuItems} />
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
          <div className="p-3.5 sm:p-4 border-t border-[#E2E5EB] dark:border-[#1F242D] flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-[#121417]">
            <div className="text-xs text-[#667085] dark:text-[#8C929D]">
              Página <strong className="font-semibold text-[#121417] dark:text-white">{validCurrentPage}</strong> de{" "}
              <strong className="font-semibold text-[#121417] dark:text-white">{totalPages}</strong>{" "}
              <span className="text-[#8C929D]">({totalLeadsCount.toLocaleString()} prospectos en total)</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => handlePageChange(1)}
                disabled={validCurrentPage === 1}
                className="p-1.5 rounded-full border border-[#E2E5EB] dark:border-[#2A2E37] bg-white dark:bg-[#1A1D24] text-[#667085] dark:text-[#8C929D] hover:bg-[#F8F9FA] hover:text-[#121417] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                title="Primera página"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handlePageChange(validCurrentPage - 1)}
                disabled={validCurrentPage === 1}
                className="px-3 py-1.5 rounded-full border border-[#E2E5EB] dark:border-[#2A2E37] bg-white dark:bg-[#1A1D24] text-xs font-semibold text-[#667085] dark:text-[#8C929D] hover:bg-[#F8F9FA] hover:text-[#121417] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Anterior</span>
              </button>

              <div className="flex items-center gap-1 px-1">
                {getPageNumbers().map((num, idx) =>
                  num === "..." ? (
                    <span key={`ellipsis-${idx}`} className="px-2 py-1 text-xs text-[#8C929D]">
                      …
                    </span>
                  ) : (
                    <button
                      key={`page-${num}`}
                      type="button"
                      onClick={() => handlePageChange(num as number)}
                      className={`min-w-[32px] h-8 px-2.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                        validCurrentPage === num
                          ? "bg-[#121417] text-white dark:bg-white dark:text-[#121417] shadow-xs"
                          : "border border-[#E2E5EB] dark:border-[#2A2E37] bg-white dark:bg-[#1A1D24] text-[#667085] dark:text-[#8C929D] hover:bg-[#F8F9FA] hover:text-[#121417]"
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
                className="px-3 py-1.5 rounded-full border border-[#E2E5EB] dark:border-[#2A2E37] bg-white dark:bg-[#1A1D24] text-xs font-semibold text-[#667085] dark:text-[#8C929D] hover:bg-[#F8F9FA] hover:text-[#121417] disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
              >
                <span className="hidden sm:inline">Siguiente</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handlePageChange(totalPages)}
                disabled={validCurrentPage === totalPages}
                className="p-1.5 rounded-full border border-[#E2E5EB] dark:border-[#2A2E37] bg-white dark:bg-[#1A1D24] text-[#667085] dark:text-[#8C929D] hover:bg-[#F8F9FA] hover:text-[#121417] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                title="Última página"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal: Contenido y Detalle del Formulario Meta con Diseño Cápsula */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] rounded-[32px] w-full max-w-xl overflow-hidden shadow-orvion">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#E2E5EB] dark:border-[#1F242D] flex items-center justify-between bg-gradient-to-r from-amber-500/10 via-transparent to-transparent">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#121417] text-amber-400 dark:bg-white dark:text-[#121417] border border-amber-500/40 flex items-center justify-center font-bold text-sm shadow-md">
                  {selectedLead.name
                    .split(" ")
                    .map((p) => p[0])
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#121417] dark:text-white flex items-center gap-2">
                    <span>{selectedLead.name}</span>
                    {isAdmin && selectedLead.client?.name && (
                      <span className="orvion-badge-gold text-[10px] py-0.5 px-2">
                        {selectedLead.client.name}
                      </span>
                    )}
                  </h2>
                  <p className="text-xs text-[#667085] dark:text-[#8C929D] mt-0.5">
                    {selectedLead.companyName || "Prospecto Comercial"} • Captado {new Date(selectedLead.createdAt).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLead(null)}
                className="text-[#8C929D] hover:text-[#121417] dark:hover:text-white p-1.5 rounded-full hover:bg-white dark:hover:bg-[#1A1D24] transition-colors cursor-pointer"
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
                  <div className="bg-white/90 dark:bg-[#1A1D24] p-3 rounded-xl border border-amber-200/60 dark:border-[#2A2E37]">
                    <div className="text-[10px] text-[#667085] dark:text-[#8C929D] uppercase font-semibold">Campaña Publicitaria</div>
                    <div className="font-bold text-[#121417] dark:text-white mt-0.5 truncate" title={selectedLead.campaign || "Campaña no especificada"}>
                      {selectedLead.campaign || "Campaña no especificada"}
                    </div>
                  </div>

                  {selectedLead.client && (
                    <div className="bg-white/90 dark:bg-[#1A1D24] p-3 rounded-xl border border-amber-200/60 dark:border-[#2A2E37]">
                      <div className="text-[10px] text-[#667085] dark:text-[#8C929D] uppercase font-semibold">Empresa Gestora / Cuenta</div>
                      <div className="font-bold text-amber-600 dark:text-amber-400 mt-0.5 capitalize">
                        {selectedLead.client.name}
                      </div>
                    </div>
                  )}

                  <div className="bg-white/90 dark:bg-[#1A1D24] p-3 rounded-xl border border-amber-200/60 dark:border-[#2A2E37]">
                    <div className="text-[10px] text-[#667085] dark:text-[#8C929D] uppercase font-semibold">Presupuesto Estimado</div>
                    <div className="font-bold text-[#121417] dark:text-white mt-0.5">
                      ${selectedLead.estimatedValue?.toLocaleString() || 0} USD
                    </div>
                  </div>

                  <div className="bg-white/90 dark:bg-[#1A1D24] p-3 rounded-xl border border-amber-200/60 dark:border-[#2A2E37]">
                    <div className="text-[10px] text-[#667085] dark:text-[#8C929D] uppercase font-semibold">Score Bunker AI</div>
                    <div className="font-bold text-amber-600 dark:text-amber-400 mt-0.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>{selectedLead.qualification || 70}/100</span>
                    </div>
                  </div>

                  <div className="bg-white/90 dark:bg-[#1A1D24] p-3 rounded-xl border border-amber-200/60 dark:border-[#2A2E37]">
                    <div className="text-[10px] text-[#667085] dark:text-[#8C929D] uppercase font-semibold">Formulario / Origen</div>
                    <div className="font-semibold text-[#121417] dark:text-white mt-0.5 truncate">
                      {selectedLead.externalFormId ? `Formulario Meta Lead Ads` : selectedLead.source}
                    </div>
                    {selectedLead.externalFormId && (
                      <div className="text-[9px] text-[#667085] dark:text-[#8C929D] font-mono mt-0.5">Form ID: {selectedLead.externalFormId}</div>
                    )}
                  </div>

                  <div className="bg-white/90 dark:bg-[#1A1D24] p-3 rounded-xl border border-amber-200/60 dark:border-[#2A2E37]">
                    <div className="text-[10px] text-[#667085] dark:text-[#8C929D] uppercase font-semibold">Anuncio / Creativo</div>
                    <div className="font-semibold text-[#121417] dark:text-white mt-0.5 truncate">
                      {selectedLead.externalAdId ? `Anuncio Meta` : (selectedLead.campaign || "Lead Inbound")}
                    </div>
                    {selectedLead.externalAdId && (
                      <div className="text-[9px] text-[#667085] dark:text-[#8C929D] font-mono mt-0.5">Ad ID: {selectedLead.externalAdId}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Respuestas del Formulario enviadas por el Lead */}
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-[#121417] dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-amber-500" />
                  Contenido & Respuestas Enviadas por el Prospecto
                </h3>

                <div className="space-y-2">
                  <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] flex items-center justify-between text-xs">
                    <span className="text-[#667085] dark:text-[#8C929D] font-medium">Nombre completo:</span>
                    <span className="font-bold text-[#121417] dark:text-white">{selectedLead.name}</span>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] flex items-center justify-between text-xs">
                    <span className="text-[#667085] dark:text-[#8C929D] font-medium">Correo Electrónico:</span>
                    <a href={`mailto:${selectedLead.email}`} className="font-bold text-amber-600 dark:text-amber-400 hover:underline">
                      {selectedLead.email || "No registrado"}
                    </a>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] flex items-center justify-between text-xs">
                    <span className="text-[#667085] dark:text-[#8C929D] font-medium">Número de Teléfono:</span>
                    <span className="font-mono font-bold text-[#121417] dark:text-white">
                      {selectedLead.phone || selectedLead.normalizedPhone || "No registrado"}
                    </span>
                  </div>

                  {selectedLead.notes && (
                    <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] text-xs space-y-1">
                      <span className="text-[10px] text-[#667085] dark:text-[#8C929D] font-bold uppercase">Preguntas adicionales / Notas del Lead:</span>
                      <pre className="text-xs font-sans text-[#121417] dark:text-white whitespace-pre-wrap leading-relaxed">
                        {selectedLead.notes}
                      </pre>
                    </div>
                  )}

                  {selectedLead.aiSummary && (
                    <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-300/40 dark:border-amber-500/30 text-xs space-y-1">
                      <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold uppercase flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" /> Resumen y Análisis IA:
                      </span>
                      <p className="text-xs text-[#121417] dark:text-slate-200 leading-relaxed font-medium">
                        {selectedLead.aiSummary}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-4 border-t border-[#E2E5EB] dark:border-[#1F242D] bg-[#F8F9FA] dark:bg-[#1A1D24] flex flex-wrap items-center justify-between gap-2.5">
              <Link
                href={`/crm/leads/${selectedLead.id}`}
                className="px-3.5 py-2 rounded-full bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#2A2E37] hover:border-amber-400 text-xs font-bold text-[#121417] dark:text-white flex items-center gap-1.5 transition-colors shadow-2xs"
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
                  className="px-3.5 py-2 rounded-full bg-white dark:bg-[#121417] hover:bg-[#F8F9FA] text-[#121417] dark:text-white border border-[#E2E5EB] dark:border-[#2A2E37] text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5 text-[#8C929D]" />
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
                    className="rounded-full bg-[#121417] hover:bg-[#1E2229] dark:bg-white dark:hover:bg-[#F3F4F7] text-white dark:text-[#121417] px-4 py-2 text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <ArrowRightCircle className="w-3.5 h-3.5 text-amber-400 dark:text-[#121417]" />
                    <span>Convertir</span>
                  </button>
                )}

                <Link
                  href={`/inbox?search=${encodeURIComponent(selectedLead.name)}`}
                  className="px-3.5 py-2 rounded-full bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 text-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-700 text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
                  title="Abrir chat en la Bandeja de Entrada"
                >
                  <Inbox className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                  <span>Bandeja de Entrada</span>
                </Link>

                {getWhatsAppNumber(selectedLead) && (
                  <a
                    href={`https://wa.me/${getWhatsAppNumber(selectedLead)}?text=${encodeURIComponent(
                      `Hola ${selectedLead.name}, te escribo de Bunker Agency para dar seguimiento a tu requerimiento comercial.`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedLead(null)}
                  className="px-4 py-2 rounded-full bg-[#121417] hover:bg-[#1E2229] dark:bg-white dark:hover:bg-[#F3F4F7] text-white dark:text-[#121417] text-xs font-bold transition-colors cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar Prospecto con Diseño Cápsula Orvion */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] rounded-[32px] w-full max-w-lg overflow-hidden shadow-orvion">
            <div className="p-6 border-b border-[#E2E5EB] dark:border-[#1F242D] flex items-center justify-between bg-[#F8F9FA] dark:bg-[#1A1D24]">
              <div>
                <h2 className="text-base font-bold text-[#121417] dark:text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  Registrar Nuevo Prospecto
                </h2>
                <p className="text-xs text-[#667085] dark:text-[#8C929D] mt-0.5">
                  Completa los datos del contacto y asigna un asesor comercial.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-[#8C929D] hover:text-[#121417] dark:hover:text-white p-1.5 rounded-full hover:bg-white dark:hover:bg-[#121417] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Duplicate Detected Warning Alert */}
            {duplicateWarning && duplicateWarning.length > 0 && (
              <div className="p-4 mx-6 mt-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700 rounded-2xl text-amber-950 dark:text-amber-300 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  <span>Posible prospecto duplicado detectado</span>
                </div>
                <p className="text-[11px] leading-relaxed text-[#667085] dark:text-[#8C929D]">
                  Ya existe un registro con correo o teléfono similar en su organización:
                </p>
                <div className="bg-white/80 dark:bg-[#121417]/80 p-2.5 rounded-xl border border-amber-200 dark:border-amber-800 text-[11px] space-y-1">
                  {duplicateWarning.map((m) => (
                    <div key={m.id} className="flex items-center justify-between">
                      <span className="font-bold text-[#121417] dark:text-white">
                        {m.name} ({m.companyName || "Sin empresa"})
                      </span>
                      <span className="text-[#8C929D] font-mono">
                        {m.email || m.phone}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="pt-1 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDuplicateWarning(null)}
                    className="px-3 py-1 text-[11px] rounded-full bg-white dark:bg-[#1A1D24] border border-amber-300 font-semibold text-amber-900 dark:text-amber-300 hover:bg-amber-50 cursor-pointer"
                  >
                    Corregir datos
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleCreateLead(e, true)}
                    className="rounded-full bg-[#121417] text-white dark:bg-white dark:text-[#121417] px-3.5 py-1 text-[11px] font-bold shadow-xs cursor-pointer"
                  >
                    Guardar de todos modos
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={(e) => handleCreateLead(e, false)} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Lic. Roberto Garza"
                  value={createData.name}
                  onChange={(e) => setCreateData({ ...createData, name: e.target.value })}
                  className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] transition-all"
                />
                {createFieldErrors.name && (
                  <p className="text-[11px] text-red-600 mt-1 pl-2">{createFieldErrors.name[0]}</p>
                )}
              </div>

              {/* Company */}
              <div>
                <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
                  Empresa / Negocio
                </label>
                <input
                  type="text"
                  placeholder="ej. Cadena Restaurantes Sonora Grill"
                  value={createData.companyName}
                  onChange={(e) =>
                    setCreateData({ ...createData, companyName: e.target.value })
                  }
                  className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] transition-all"
                />
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={createData.email}
                    onChange={(e) =>
                      setCreateData({ ...createData, email: e.target.value })
                    }
                    className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] transition-all"
                  />
                  {createFieldErrors.email && (
                    <p className="text-[11px] text-red-600 mt-1 pl-2">{createFieldErrors.email[0]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="+57 310 123 4567"
                    value={createData.phone}
                    onChange={(e) =>
                      setCreateData({ ...createData, phone: e.target.value })
                    }
                    className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] transition-all"
                  />
                  {createFieldErrors.phone && (
                    <p className="text-[11px] text-red-600 mt-1 pl-2">{createFieldErrors.phone[0]}</p>
                  )}
                </div>
              </div>

              {/* Source & Campaign */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
                    Canal de Origen *
                  </label>
                  <select
                    value={createData.source}
                    onChange={(e) =>
                      setCreateData({ ...createData, source: e.target.value })
                    }
                    className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden cursor-pointer"
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
                  <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
                    Campaña de Origen
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Preventa Luxury 2026"
                    value={createData.campaign}
                    onChange={(e) =>
                      setCreateData({ ...createData, campaign: e.target.value })
                    }
                    className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] transition-all"
                  />
                </div>
              </div>

              {/* Budget & Owner */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
                    Presupuesto Mensual ($ USD)
                  </label>
                  <input
                    type="number"
                    value={createData.estimatedValue}
                    onChange={(e) =>
                      setCreateData({ ...createData, estimatedValue: e.target.value })
                    }
                    className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
                    Asesor Responsable
                  </label>
                  <select
                    value={createData.ownerId}
                    onChange={(e) =>
                      setCreateData({ ...createData, ownerId: e.target.value })
                    }
                    className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden cursor-pointer"
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
              {!user?.isClientUser && !activeClientId && (
                <div>
                  <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
                    Empresa / Marca del Cliente
                  </label>
                  <select
                    value={createData.clientId}
                    onChange={(e) =>
                      setCreateData({ ...createData, clientId: e.target.value })
                    }
                    className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden cursor-pointer"
                  >
                    <option value="">Sin vincular (General Bunker Agency)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-[#667085] dark:text-[#8C929D] mt-1 pl-1">
                    Vincula este prospecto directamente a la marca seleccionada para aislar métricas y mensajería.
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
                  Observaciones Comerciales
                </label>
                <textarea
                  rows={2}
                  placeholder="ej. Interesado en captación para 8 sucursales..."
                  value={createData.notes}
                  onChange={(e) =>
                    setCreateData({ ...createData, notes: e.target.value })
                  }
                  className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-2xl px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] transition-all"
                />
              </div>

              {/* Twilio A2P 10DLC SMS & Voice Consent */}
              <TwilioSmsConsentNotice
                id="create-lead-sms-consent"
                checked={createData.smsConsent}
                onChange={(checked) => setCreateData({ ...createData, smsConsent: checked })}
                brandName={
                  (activeClientId ?? createData.clientId)
                    ? clients.find((c) => c.id === (activeClientId ?? createData.clientId))?.name || "Bunker Agency"
                    : "Bunker Agency"
                }
              />

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] text-[#667085] dark:text-[#8C929D] hover:text-[#121417] dark:hover:text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingCreate}
                  className="rounded-full bg-[#121417] hover:bg-[#1E2229] dark:bg-white dark:hover:bg-[#F3F4F7] text-white dark:text-[#121417] px-5 py-2 text-xs font-bold shadow-orvion flex items-center gap-1.5 cursor-pointer disabled:opacity-60 transition-transform hover:scale-102"
                >
                  {submittingCreate ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
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

      {/* Modal: Editar Prospecto con Diseño Cápsula Orvion */}
      {isEditOpen && editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] rounded-[32px] w-full max-w-lg overflow-hidden shadow-orvion">
            <div className="p-6 border-b border-[#E2E5EB] dark:border-[#1F242D] flex items-center justify-between bg-[#F8F9FA] dark:bg-[#1A1D24]">
              <div>
                <h2 className="text-base font-bold text-[#121417] dark:text-white flex items-center gap-2">
                  <Edit className="w-4 h-4 text-amber-500" />
                  Editar Prospecto
                </h2>
                <p className="text-xs text-[#667085] dark:text-[#8C929D] mt-0.5">
                  Actualización de información comercial y trazabilidad de cambios.
                </p>
              </div>
              <button
                onClick={() => setIsEditOpen(false)}
                className="text-[#8C929D] hover:text-[#121417] dark:hover:text-white p-1.5 rounded-full hover:bg-white dark:hover:bg-[#121417] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateLead} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] transition-all"
                />
                {editFieldErrors.name && (
                  <p className="text-[11px] text-red-600 mt-1 pl-2">{editFieldErrors.name[0]}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
                  Empresa / Negocio
                </label>
                <input
                  type="text"
                  value={editFormData.companyName}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, companyName: e.target.value })
                  }
                  className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, email: e.target.value })
                    }
                    className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] transition-all"
                  />
                  {editFieldErrors.email && (
                    <p className="text-[11px] text-red-600 mt-1 pl-2">{editFieldErrors.email[0]}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
                    Teléfono / WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, phone: e.target.value })
                    }
                    className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] transition-all"
                  />
                  {editFieldErrors.phone && (
                    <p className="text-[11px] text-red-600 mt-1 pl-2">{editFieldErrors.phone[0]}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
                    Estado Comercial
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, status: e.target.value })
                    }
                    className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden cursor-pointer"
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
                  <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
                    Canal de Origen
                  </label>
                  <select
                    value={editFormData.source}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, source: e.target.value })
                    }
                    className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden cursor-pointer"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
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
                    className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
                    Asesor Responsable
                  </label>
                  <select
                    value={editFormData.ownerId}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, ownerId: e.target.value })
                    }
                    className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden cursor-pointer"
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
                <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1 pl-1">
                  Observaciones Comerciales
                </label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, notes: e.target.value })
                  }
                  className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] rounded-2xl px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden focus:border-amber-400 focus:bg-white dark:focus:bg-[#121417] transition-all"
                />
              </div>

              {/* Twilio A2P 10DLC SMS & Voice Consent */}
              <TwilioSmsConsentNotice
                id="edit-lead-sms-consent"
                checked={editFormData.smsConsent}
                onChange={(checked) => setEditFormData({ ...editFormData, smsConsent: checked })}
                brandName={
                  editingLead?.client?.name || "Bunker Agency"
                }
              />

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="px-4 py-2 rounded-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] text-[#667085] dark:text-[#8C929D] hover:text-[#121417] dark:hover:text-white text-xs font-bold cursor-pointer transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="rounded-full bg-[#121417] hover:bg-[#1E2229] dark:bg-white dark:hover:bg-[#F3F4F7] text-white dark:text-[#121417] px-5 py-2 text-xs font-bold shadow-orvion flex items-center gap-1.5 cursor-pointer disabled:opacity-60 transition-transform hover:scale-102"
                >
                  {submittingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
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
