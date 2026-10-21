"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  UserCheck,
  Plus,
  Search,
  Building,
  Mail,
  Phone,
  Globe,
  Trash2,
  X,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  DollarSign,
  Briefcase,
  Clock,
  Filter,
  User,
  Activity,
  Layers,
  ChevronRight,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { ClientOnboardingWizardModal } from "@/components/modals/ClientOnboardingWizardModal";

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  isPrimary: boolean;
}

interface Opportunity {
  id: string;
  title: string;
  value: number;
  status: string;
  stage?: { id: string; name: string };
}

interface Client {
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
  ownerId: string | null;
  owner?: { id: string; name: string; email: string; role?: string } | null;
  contacts?: Contact[];
  opportunities?: Opportunity[];
  activities?: any[];
  tasks?: any[];
}

interface UserMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function ClientsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isClient = Boolean(user?.isClientUser);

  const [clients, setClients] = useState<Client[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Un usuario del portal solo administra su propia empresa: redirige directo a su Ficha 360°
  useEffect(() => {
    if (user?.isClientUser && user.clientId) {
      router.replace(`/crm/clients/${user.clientId}`);
    }
  }, [user, router]);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    website: "",
    industry: "Bienes Raíces",
    revenue: "3000",
    notes: "",
    ownerId: "",
  });

  // Fetch Team Members
  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.success && Array.isArray(json.users)) {
        setTeamMembers(json.users);
      }
    } catch (err) {
      console.error("Error fetching team:", err);
    }
  }, []);

  // Fetch Clients
  const fetchClients = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const params = new URLSearchParams();
      if (search.trim()) params.append("search", search.trim());
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (industryFilter !== "all") params.append("industry", industryFilter);
      if (ownerFilter !== "all") params.append("ownerId", ownerFilter);
      if (sortOption !== "newest") params.append("sort", sortOption);

      const res = await fetch(`/api/clients?${params.toString()}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.clients)) {
        setClients(json.clients);
      } else {
        setErrorMsg(json.error || "No se pudieron obtener los clientes.");
      }
    } catch (e: any) {
      setErrorMsg(e.message || "Error de conexión al cargar clientes.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, industryFilter, ownerFilter, sortOption]);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchClients]);

  // Extract distinct industries from loaded clients for the filter dropdown
  const availableIndustries = useMemo(() => {
    const defaultList = ["Bienes Raíces", "Salud & Medicina", "Tecnología / SaaS", "E-commerce", "Servicios Profesionales", "Gastronomía"];
    const fromClients = clients.map((c) => c.industry).filter(Boolean) as string[];
    return Array.from(new Set([...defaultList, ...fromClients])).sort();
  }, [clients]);

  // Calculate Real Business Metrics
  const metrics = useMemo(() => {
    let activeCount = 0;
    let onHoldCount = 0;
    let churnedCount = 0;
    let mrrUSD = 0;
    let totalClientPipelineUSD = 0;
    let inactiveAccountsCount = 0;

    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    clients.forEach((c) => {
      if (c.status === "active") {
        activeCount += 1;
        mrrUSD += c.revenue || 0;
      } else if (c.status === "on_hold") {
        onHoldCount += 1;
      } else if (c.status === "churned") {
        churnedCount += 1;
      }

      // Calculate open pipeline value for this client
      if (c.opportunities && Array.isArray(c.opportunities)) {
        c.opportunities.forEach((opp) => {
          if (opp.status === "open") {
            totalClientPipelineUSD += opp.value || 0;
          }
        });
      }

      // Check for inactivity (no activities in >30 days or empty activities)
      const hasRecentActivity =
        c.activities &&
        c.activities.length > 0 &&
        c.activities.some((act) => new Date(act.performedAt).getTime() > thirtyDaysAgo);

      if (!hasRecentActivity && c.status === "active") {
        inactiveAccountsCount += 1;
      }
    });

    return {
      activeCount,
      onHoldCount,
      churnedCount,
      mrrUSD,
      arrUSD: mrrUSD * 12,
      totalClientPipelineUSD,
      inactiveAccountsCount,
      totalCount: clients.length,
    };
  }, [clients]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          ownerId: formData.ownerId || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsCreateOpen(false);
        setFormData({
          name: "",
          companyName: "",
          email: "",
          phone: "",
          website: "",
          industry: "Bienes Raíces",
          revenue: "3000",
          notes: "",
          ownerId: "",
        });
        setFeedback("¡Cliente comercial registrado con éxito!");
        setTimeout(() => setFeedback(null), 4000);
        fetchClients();
      } else {
        alert(json.error || "Error al crear cliente");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Eliminar lógicamente al cliente "${name}"? Esta acción deshabilitará su acceso comercial en el CRM.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/clients?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setFeedback(`Cliente "${name}" eliminado correctamente.`);
        setTimeout(() => setFeedback(null), 4000);
        fetchClients();
      } else {
        alert(json.error || "No se pudo eliminar el cliente.");
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setIndustryFilter("all");
    setOwnerFilter("all");
    setSortOption("newest");
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#EAECF0]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#F8F9FA] border border-[#EAECF0] text-[#475467]">
              {isClient ? "Portal Cliente" : "Módulo Comercial"}
            </span>
            <span className="text-xs text-[#9C9890]">
              {isClient ? "• Mi Cuenta" : "• Fase 3 CRM"}
            </span>
          </div>
          <h1 className="text-3xl font-semibold text-[#101828] tracking-tight">
            {isClient ? "Mi Empresa & Contactos" : "Centro de Gestión de Clientes"}
          </h1>
          <p className="text-xs text-[#475467] mt-1 max-w-2xl leading-relaxed">
            {isClient
              ? "Información comercial, contactos clave y ficha 360° de tu empresa."
              : "Administración centralizada de cuentas, contratos de facturación recurrente (MRR), contactos clave y cronología comercial 360°."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchClients()}
            disabled={loading}
            className="p-2 rounded-xl bg-[#FFFFFF] border border-[#EAECF0] text-[#475467] hover:text-[#101828] text-xs transition-colors"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#6366F1]" : ""}`} />
          </button>
          {!isClient && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="btn-black-gold rounded-2xl px-4 py-2 text-xs font-semibold flex items-center gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-[#6366F1]" />
              <span>+ Nuevo Cliente (Asistente Guiado)</span>
            </button>
          )}
        </div>
      </div>

      {/* Real Commercial Metrics Cards (Fase H) - Solo para administradores de agencia */}
      {!isClient && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#EAECF0] shadow-sm">
            <div className="flex items-center justify-between text-[#475467] text-[11px]">
              <span>Activos</span>
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="text-xl font-semibold text-[#101828] mt-1">{metrics.activeCount}</div>
            <div className="text-[10px] text-[#9C9890] mt-0.5">de {metrics.totalCount} clientes</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#EAECF0] shadow-sm">
            <div className="flex items-center justify-between text-[#475467] text-[11px]">
              <span>En Pausa</span>
              <div className="w-2 h-2 rounded-full bg-amber-500" />
            </div>
            <div className="text-xl font-semibold text-[#101828] mt-1">{metrics.onHoldCount}</div>
            <div className="text-[10px] text-[#9C9890] mt-0.5">contratos suspendidos</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#EAECF0] shadow-sm">
            <div className="flex items-center justify-between text-[#475467] text-[11px]">
              <span>Cancelados</span>
              <div className="w-2 h-2 rounded-full bg-rose-500" />
            </div>
            <div className="text-xl font-semibold text-[#101828] mt-1">{metrics.churnedCount}</div>
            <div className="text-[10px] text-[#9C9890] mt-0.5">cuentas churned</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#EAECF0] shadow-sm">
            <div className="flex items-center justify-between text-[#475467] text-[11px]">
              <span>MRR Activo</span>
              <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-lg font-semibold text-emerald-700 mt-1">
              ${metrics.mrrUSD.toLocaleString("en-US", { minimumFractionDigits: 0 })} <span className="text-[10px] font-normal text-[#475467]">USD</span>
            </div>
            <div className="text-[10px] text-[#9C9890] mt-0.5">Facturación recurrente mensual</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#EAECF0] shadow-sm">
            <div className="flex items-center justify-between text-[#475467] text-[11px]">
              <span>ARR Proyectado</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#6366F1]" />
            </div>
            <div className="text-lg font-semibold text-[#101828] mt-1">
              ${metrics.arrUSD.toLocaleString("en-US", { minimumFractionDigits: 0 })} <span className="text-[10px] font-normal text-[#475467]">USD</span>
            </div>
            <div className="text-[10px] text-[#9C9890] mt-0.5">Anualizado (MRR x 12)</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#EAECF0] shadow-sm">
            <div className="flex items-center justify-between text-[#475467] text-[11px]">
              <span>Pipeline Cuentas</span>
              <Briefcase className="w-3.5 h-3.5 text-[#586ff6]" />
            </div>
            <div className="text-lg font-semibold text-[#101828] mt-1">
              ${metrics.totalClientPipelineUSD.toLocaleString("en-US", { minimumFractionDigits: 0 })} <span className="text-[10px] font-normal text-[#475467]">USD</span>
            </div>
            <div className="text-[10px] text-[#9C9890] mt-0.5">Deals abiertos vinculados</div>
          </div>
        </div>
      )}

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Advanced Filters Bar (Fase B) */}
      <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#EAECF0] shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search box (Col 1-4) */}
          <div className="md:col-span-4 relative">
            <Search className="w-3.5 h-3.5 text-[#9C9890] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, empresa, email, teléfono o sector..."
              className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl pl-9 pr-3 py-2 text-xs text-[#101828] placeholder-[#9C9890] focus:outline-none focus:border-[#6366F1]"
            />
          </div>

          {/* Status Filter (Col 5-6) */}
          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-[#6366F1]"
            >
              <option value="all">Estado: Todos</option>
              <option value="active">Activo</option>
              <option value="on_hold">En Pausa</option>
              <option value="churned">Cancelado</option>
            </select>
          </div>

          {/* Industry Filter (Col 7-8) */}
          <div className="md:col-span-2">
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-[#6366F1]"
            >
              <option value="all">Sector: Todos</option>
              {availableIndustries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
          </div>

          {/* Owner Filter (Col 9-10) */}
          <div className="md:col-span-2">
            <select
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-[#6366F1]"
            >
              <option value="all">Asesor: Todos</option>
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Filter (Col 11-12) */}
          <div className="md:col-span-2">
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-[#6366F1]"
            >
              <option value="newest">Más recientes</option>
              <option value="revenue_desc">Mayor Facturación ($)</option>
              <option value="revenue_asc">Menor Facturación ($)</option>
              <option value="name_asc">Nombre (A - Z)</option>
              <option value="name_desc">Nombre (Z - A)</option>
              <option value="oldest">Más antiguos</option>
            </select>
          </div>
        </div>

        {/* Filter Badges & Reset */}
        {(search || statusFilter !== "all" || industryFilter !== "all" || ownerFilter !== "all" || sortOption !== "newest") && (
          <div className="flex items-center justify-between pt-2 border-t border-[#F0EEE6] text-[11px] text-[#475467]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-[#101828]">Filtros activos:</span>
              {search && <span className="px-2 py-0.5 rounded-full bg-[#F8F9FA] border border-[#EAECF0]">Texto: &ldquo;{search}&rdquo;</span>}
              {statusFilter !== "all" && <span className="px-2 py-0.5 rounded-full bg-[#F8F9FA] border border-[#EAECF0]">Estado: {statusFilter}</span>}
              {industryFilter !== "all" && <span className="px-2 py-0.5 rounded-full bg-[#F8F9FA] border border-[#EAECF0]">Sector: {industryFilter}</span>}
              {ownerFilter !== "all" && (
                <span className="px-2 py-0.5 rounded-full bg-[#F8F9FA] border border-[#EAECF0]">
                  Asesor: {teamMembers.find((m) => m.id === ownerFilter)?.name || ownerFilter}
                </span>
              )}
            </div>
            <button
              onClick={resetFilters}
              className="text-[#6366F1] hover:underline font-semibold"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Clients Grid (Fase B & C links) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-16 text-center text-[#9C9890] text-xs flex flex-col items-center justify-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin text-[#6366F1]" />
            <span>Cargando directorio comercial de clientes...</span>
          </div>
        ) : clients.length === 0 ? (
          <div className="col-span-full py-16 text-center text-[#9C9890] text-xs p-8 rounded-2xl bg-[#FFFFFF] border border-[#EAECF0] space-y-3">
            <Building className="w-10 h-10 text-[#DDD9CF] mx-auto" />
            <div className="font-semibold text-sm text-[#101828]">No se encontraron clientes</div>
            <p className="max-w-md mx-auto text-[#475467]">
              No hay cuentas comerciales que coincidan con los criterios de búsqueda o filtros seleccionados.
            </p>
            {(search || statusFilter !== "all" || industryFilter !== "all" || ownerFilter !== "all") && (
              <button
                onClick={resetFilters}
                className="btn-black-gold rounded-xl px-4 py-2 text-xs font-semibold"
              >
                Restablecer todos los filtros
              </button>
            )}
          </div>
        ) : (
          clients.map((client) => {
            const primaryContact = client.contacts?.find((ct) => ct.isPrimary) || client.contacts?.[0];
            const openOpps = client.opportunities?.filter((op) => op.status === "open") || [];
            const openOppsValue = openOpps.reduce((sum, op) => sum + (op.value || 0), 0);

            let statusBadge = {
              label: "ACTIVO",
              cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
            };
            if (client.status === "on_hold") {
              statusBadge = {
                label: "EN PAUSA",
                cls: "bg-amber-50 text-amber-700 border-amber-200",
              };
            } else if (client.status === "churned") {
              statusBadge = {
                label: "CANCELADO",
                cls: "bg-rose-50 text-rose-700 border-rose-200",
              };
            }

            return (
              <div
                key={client.id}
                className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#EAECF0] shadow-sm hover:border-[#DDD9CF] hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
              >
                <div>
                  {/* Top Bar: Title, Industry, Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <Link
                        href={`/crm/clients/${client.id}`}
                        className="font-semibold text-[#101828] text-base group-hover:text-[#6366F1] transition-colors flex items-center gap-1.5"
                      >
                        <span>{client.name}</span>
                        <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      {client.companyName && client.companyName !== client.name && (
                        <div className="text-[11px] text-[#475467] font-medium">{client.companyName}</div>
                      )}
                      <div className="text-[11px] text-[#475467] flex items-center gap-1">
                        <Building className="w-3 h-3 text-[#9C9890]" />
                        <span>{client.industry || "General"}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${statusBadge.cls}`}>
                        {statusBadge.label}
                      </span>
                      {client.isDemo && (
                        <span className="text-[9px] bg-[#FBF1ED] text-[#C15F3C] font-semibold px-1.5 py-0.2 rounded border border-[#F3D6CB]">
                          DEMO
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Commercial Notes snippet */}
                  {client.notes && (
                    <p className="text-[11px] text-[#475467] mt-3 p-2.5 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] leading-relaxed line-clamp-2">
                      {client.notes}
                    </p>
                  )}

                  {/* Contact Info & Primary Contact */}
                  <div className="mt-3.5 space-y-1.5 text-[11px] text-[#475467] pt-3 border-t border-[#F0EEE6]">
                    {primaryContact ? (
                      <div className="flex items-center justify-between text-[11px] pb-1">
                        <span className="text-[#9C9890]">Contacto principal:</span>
                        <span className="font-semibold text-[#101828]">
                          {primaryContact.firstName} {primaryContact.lastName || ""}
                        </span>
                      </div>
                    ) : null}

                    {client.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-[#9C9890]" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-[#9C9890]" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.website && (
                      <div className="flex items-center gap-2">
                        <Globe className="w-3.5 h-3.5 text-[#9C9890]" />
                        <a
                          href={client.website}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[#6366F1] hover:underline truncate"
                        >
                          {client.website.replace(/^https?:\/\//, "")}
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Summary of Associated Pipeline Deals */}
                  {openOpps.length > 0 && (
                    <div className="mt-3 px-2.5 py-1.5 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between text-[11px]">
                      <span className="text-blue-900 font-medium">Deals en Pipeline ({openOpps.length}):</span>
                      <span className="font-bold text-blue-950">
                        ${openOppsValue.toLocaleString("en-US")} USD
                      </span>
                    </div>
                  )}

                  {/* Responsible Advisor */}
                  {client.owner && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-[#475467]">
                      <User className="w-3 h-3 text-[#9C9890]" />
                      <span>Asesor: <strong className="text-[#101828]">{client.owner.name}</strong></span>
                    </div>
                  )}
                </div>

                {/* Card Footer: MRR, 360 profile link & delete */}
                <div className="pt-3 border-t border-[#F0EEE6] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[#9C9890] block uppercase font-medium">Facturación MRR</span>
                    <span className="text-sm font-semibold text-[#101828]">
                      ${(client.revenue || 0).toLocaleString("en-US")} <span className="text-[10px] font-normal text-[#475467]">USD/mes</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {!isClient && (
                      <button
                        onClick={() => handleDelete(client.id, client.name)}
                        className="p-2 rounded-xl text-[#9C9890] hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Eliminar cliente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}

                    <Link
                      href={`/crm/clients/${client.id}`}
                      className="btn-black-gold rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1"
                    >
                      <span>Ficha 360°</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Client Onboarding Wizard Modal - Solo para administradores de agencia */}
      {!isClient && (
        <ClientOnboardingWizardModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            fetchClients();
            setFeedback("¡Cliente comercial instalado y configurado con éxito!");
            setTimeout(() => setFeedback(null), 5000);
          }}
          teamMembers={teamMembers}
        />
      )}
    </div>
  );
}
