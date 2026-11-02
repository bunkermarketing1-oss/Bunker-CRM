"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
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
  User,
  ChevronRight,
  RefreshCw,
  Sparkles,
  Share2,
  BarChart3,
  Plug,
  ExternalLink,
  Layers,
  Search,
  Edit,
  Upload,
  Camera,
} from "lucide-react";
import { ClientOnboardingWizardModal } from "@/components/modals/ClientOnboardingWizardModal";
import { emitClientsUpdated } from "@/hooks/useClientOptions";
import { ConnectSocialAccountModal } from "@/components/modals/ConnectSocialAccountModal";
import { SocialNetworkIcon } from "@/components/common/SocialNetworkIcon";
import { ACCOUNT_TYPE } from "@/lib/constants/integrations";

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

interface ConnectedAccountItem {
  id: string;
  accountName: string;
  accountType: string | null;
  externalId: string | null;
  status: string;
  lastSyncAt: string | null;
  integration?: {
    id: string;
    provider: string;
    name: string;
    status: string;
  } | null;
}

interface Client {
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
  ownerId: string | null;
  owner?: { id: string; name: string; email: string; role?: string } | null;
  contacts?: Contact[];
  opportunities?: Opportunity[];
  activities?: { performedAt: string }[];
  tasks?: { status: string }[];
  connectedAccounts?: ConnectedAccountItem[];
  _count?: { leads: number };
}

interface UserMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AdAccountItem {
  id: string;
  accountName: string;
  accountType: string | null;
  externalId: string | null;
  status: string;
  clientId: string | null;
  lastSyncAt?: string | null;
  integration?: {
    id: string;
    provider: string;
    name: string;
    status?: string;
  } | null;
}

interface IntegrationItem {
  id: string;
  provider: string;
  name: string;
  status: string;
  connectedAccounts?: AdAccountItem[];
}

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  [ACCOUNT_TYPE.META_AD_ACCOUNT]: "Cuenta de anuncios Meta",
  [ACCOUNT_TYPE.TIKTOK_ADVERTISER]: "Cuenta de TikTok Ads",
  [ACCOUNT_TYPE.FACEBOOK_PAGE]: "Página de Facebook",
  [ACCOUNT_TYPE.INSTAGRAM_BUSINESS]: "Perfil de Instagram",
};

export default function ClientsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isClient = Boolean(user?.isClientUser);

  // Tab principal: Directorio Comercial (Clientes) vs Cuentas de Nuestros Clientes (BM & Anuncios)
  const [activeTab, setActiveTab] = useState<"directory" | "ad_accounts">("directory");

  const [clients, setClients] = useState<Client[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserMember[]>([]);
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [integrationsLoading, setIntegrationsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Un usuario del portal solo administra su propia empresa: redirige directo a su Ficha 360°
  useEffect(() => {
    if (user?.isClientUser && user.clientId) {
      router.replace(`/crm/clients/${user.clientId}`);
    }
  }, [user, router]);

  // Filters & Search para Directorio Comercial
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [industryFilter, setIndustryFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");

  // Filters & Search para Cuentas Publicitarias (BM)
  const [accountSearch, setAccountSearch] = useState("");
  const [accountAssignmentFilter, setAccountAssignmentFilter] = useState<"all" | "clients" | "agency">("all");
  const [accountClientFilter, setAccountClientFilter] = useState("all");
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");

  // Modales
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSocialModalOpen, setIsSocialModalOpen] = useState(false);
  const [socialConnectClientId, setSocialConnectClientId] = useState<string>("");
  // Modal de Edición Rápida de Empresa
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    companyName: "",
    industry: "",
    email: "",
    phone: "",
    website: "",
    logoUrl: "",
    status: "active",
    revenue: "0",
    notes: "",
    ownerId: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);


  const handleOpenEditModal = (c: Client) => {
    setEditingClient(c);
    setEditFormData({
      name: c.name || "",
      companyName: c.companyName || "",
      industry: c.industry || "General",
      email: c.email || "",
      phone: c.phone || "",
      website: c.website || "",
      logoUrl: c.logoUrl || "",
      status: c.status || "active",
      revenue: String(c.revenue || 0),
      notes: c.notes || "",
      ownerId: c.owner?.id || "",
    });
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/clients/${editingClient.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFormData.name,
          companyName: editFormData.companyName,
          industry: editFormData.industry,
          email: editFormData.email,
          phone: editFormData.phone,
          website: editFormData.website,
          logoUrl: editFormData.logoUrl || null,
          status: editFormData.status,
          revenue: editFormData.revenue,
          notes: editFormData.notes,
          ownerId: editFormData.ownerId || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback("¡Ficha de la empresa actualizada con éxito!");
        setTimeout(() => setFeedback(null), 4000);
        setEditingClient(null);
        fetchClients();
        emitClientsUpdated();
      } else {
        setErrorMsg(json.error || "No se pudo actualizar la empresa.");
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error al guardar empresa");
    } finally {
      setSavingEdit(false);
    }
  };


  // Fetch Team Members
  const fetchTeam = useCallback(async () => {
    try {
      const res = await fetch("/api/users?scope=bunker");
      const json = await res.json();
      if (json.success && Array.isArray(json.users)) {
        setTeamMembers(json.users);
      }
    } catch (err) {
      console.error("Error fetching team:", err);
    }
  }, []);

  // Fetch Integrations & All Connected Accounts
  const fetchIntegrations = useCallback(async () => {
    try {
      setIntegrationsLoading(true);
      const res = await fetch("/api/integrations");
      const json = await res.json();
      if (json.success && Array.isArray(json.integrations)) {
        setIntegrations(json.integrations);
      }
    } catch (err) {
      console.error("Error fetching integrations:", err);
    } finally {
      setIntegrationsLoading(false);
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
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error de conexión al cargar clientes.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, industryFilter, ownerFilter, sortOption]);

  useEffect(() => {
    fetchTeam();
    fetchIntegrations();
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam === "ad_accounts" || tabParam === "cuentas") {
        setActiveTab("ad_accounts");
      }
    }
  }, [fetchTeam, fetchIntegrations]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchClients]);

  // Extraer industrias distintas para el filtro
  const availableIndustries = useMemo(() => {
    const defaultList = ["Bienes Raíces", "Salud & Medicina", "Tecnología / SaaS", "E-commerce", "Servicios Profesionales", "Gastronomía"];
    const fromClients = clients.map((c) => c.industry).filter(Boolean) as string[];
    return Array.from(new Set([...defaultList, ...fromClients])).sort();
  }, [clients]);

  // Métricas comerciales del Directorio
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

      if (c.opportunities && Array.isArray(c.opportunities)) {
        c.opportunities.forEach((opp) => {
          if (opp.status === "open") {
            totalClientPipelineUSD += opp.value || 0;
          }
        });
      }

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

  // Lista aplanada de todas las cuentas conectadas
  const allConnectedAccounts = useMemo(() => {
    return integrations.flatMap((it) =>
      (it.connectedAccounts || [])
        .filter((acc) => acc.externalId !== "meta_master_user")
        .map((acc) => ({
          ...acc,
          integration: acc.integration || { id: it.id, provider: it.provider, name: it.name, status: it.status },
        }))
    );
  }, [integrations]);

  // Métricas de Cuentas Publicitarias (BM)
  const adAccountMetrics = useMemo(() => {
    const total = allConnectedAccounts.length;
    const clientAssigned = allConnectedAccounts.filter((a) => Boolean(a.clientId)).length;
    const agencyAccounts = allConnectedAccounts.filter((a) => !a.clientId).length;
    const clientsWithAccounts = new Set(allConnectedAccounts.map((a) => a.clientId).filter(Boolean)).size;
    const activeAdsAccounts = allConnectedAccounts.filter(
      (a) => a.accountType === ACCOUNT_TYPE.META_AD_ACCOUNT || a.accountType === ACCOUNT_TYPE.TIKTOK_ADVERTISER
    ).length;

    return {
      total,
      clientAssigned,
      agencyAccounts,
      clientsWithAccounts,
      activeAdsAccounts,
    };
  }, [allConnectedAccounts]);

  // Filtrado de Cuentas Publicitarias
  const filteredAdAccounts = useMemo(() => {
    return allConnectedAccounts.filter((acc) => {
      if (accountSearch.trim()) {
        const q = accountSearch.toLowerCase();
        const clientName = clients.find((c) => c.id === acc.clientId)?.name?.toLowerCase() || "";
        const matchesName = acc.accountName.toLowerCase().includes(q);
        const matchesExternalId = (acc.externalId || "").toLowerCase().includes(q);
        const matchesClient = clientName.includes(q);
        if (!matchesName && !matchesExternalId && !matchesClient) return false;
      }
      if (accountAssignmentFilter === "clients" && !acc.clientId) return false;
      if (accountAssignmentFilter === "agency" && acc.clientId) return false;
      if (accountClientFilter !== "all" && acc.clientId !== accountClientFilter) return false;
      if (accountTypeFilter !== "all" && acc.accountType !== accountTypeFilter) return false;
      return true;
    });
  }, [allConnectedAccounts, accountSearch, accountAssignmentFilter, accountClientFilter, accountTypeFilter, clients]);

  // Reasignar una cuenta publicitaria a un cliente
  const handleAssignAccount = async (accountId: string, newClientId: string) => {
    setAssigningId(accountId);
    try {
      const res = await fetch(`/api/integrations/accounts/${accountId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId: newClientId || null }),
      });
      const json = await res.json();
      if (json.success) {
        setFeedback(json.message || "Asignación de cuenta publicitaria actualizada.");
        setTimeout(() => setFeedback(null), 4000);
        await Promise.all([fetchClients(), fetchIntegrations()]);
      } else {
        setErrorMsg(json.error || "No se pudo asignar la cuenta.");
        setTimeout(() => setErrorMsg(null), 5000);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al asignar cuenta publicitaria.";
      setErrorMsg(message);
      setTimeout(() => setErrorMsg(null), 5000);
    } finally {
      setAssigningId(null);
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
        emitClientsUpdated();
      } else {
        setErrorMsg(json.error || "No se pudo eliminar el cliente.");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Error al eliminar cliente";
      setErrorMsg(msg);
    }
  };

  const resetFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setIndustryFilter("all");
    setOwnerFilter("all");
    setSortOption("newest");
  };

  const resetAccountFilters = () => {
    setAccountSearch("");
    setAccountAssignmentFilter("all");
    setAccountClientFilter("all");
    setAccountTypeFilter("all");
  };

  const refreshAll = () => {
    fetchClients();
    fetchIntegrations();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header Principal con Título y Acciones Dinámicas */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#EAECF0]">
        <div>
          <h1 className="text-3xl font-semibold text-[#101828] tracking-tight">
            {isClient
              ? "Mi Empresa & Contactos"
              : activeTab === "directory"
              ? "Centro de Gestión de Clientes"
              : "Cuentas Publicitarias de Clientes"}
          </h1>
          <p className="text-xs text-[#475467] mt-1 max-w-2xl leading-relaxed">
            {isClient
              ? "Información comercial, contactos clave y ficha 360° de tu empresa."
              : activeTab === "directory"
              ? "Directorio comercial y administración centralizada de clientes, contratos de facturación recurrente (MRR), contactos clave y cronología comercial 360°."
              : "Cuentas publicitarias de Meta Ads, TikTok y canales sociales vinculados a cada cliente. Permite supervisar sus anuncios y métricas de forma independiente a las campañas propias de Bunker."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={refreshAll}
            disabled={loading || integrationsLoading}
            className="p-2.5 rounded-xl bg-[#FFFFFF] border border-[#EAECF0] text-[#475467] hover:text-[#101828] text-xs transition-colors shadow-2xs"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || integrationsLoading) ? "animate-spin text-amber-500" : ""}`} />
          </button>

          {!isClient && activeTab === "directory" && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="btn-black-gold rounded-2xl px-4 py-2 text-xs font-semibold flex items-center gap-2 shadow-sm"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>+ Nueva Empresa</span>
            </button>
          )}

          {!isClient && activeTab === "ad_accounts" && (
            <button
              onClick={() => {
                setSocialConnectClientId("");
                setIsSocialModalOpen(true);
              }}
              className="px-4 py-2 rounded-2xl bg-[#1877F2] hover:bg-[#166fe5] text-white text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
            >
              <Plug className="w-4 h-4" />
              <span>+ Vincular Cuenta Publicitaria (BM)</span>
            </button>
          )}
        </div>
      </div>

      {/* Selector de Pestañas: Directorio Comercial vs Cuentas de Nuestros Clientes */}
      {!isClient && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 bg-[#FAF9F5] rounded-2xl border border-[#EAECF0]">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab("directory")}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "directory"
                  ? "bg-white text-[#101828] shadow-sm border border-[#EAECF0]"
                  : "text-[#475467] hover:text-[#101828]"
              }`}
            >
              <Building className="w-4 h-4 text-amber-500" />
              <span>Directorio de Empresas</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F0EEE6] font-bold text-[#101828]">
                {clients.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("ad_accounts")}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 whitespace-nowrap ${
                activeTab === "ad_accounts"
                  ? "bg-white text-[#101828] shadow-sm border border-[#EAECF0]"
                  : "text-[#475467] hover:text-[#101828]"
              }`}
            >
              <Share2 className="w-4 h-4 text-[#1877F2]" />
              <span>Cuentas Publicitarias & Redes</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1877F2]/10 text-[#1877F2] font-bold">
                {allConnectedAccounts.length}
              </span>
            </button>
          </div>

          <div className="px-3 text-[11px] text-[#667085] hidden md:block">
            {activeTab === "directory"
              ? "Empresas, contratos de clientes y contactos CRM"
              : "Cuentas del BM asignadas con anuncios independientes"}
          </div>
        </div>
      )}

      {/* Banner de Feedback o Alertas */}
      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 1: DIRECTORIO COMERCIAL (EMPRESAS CLIENTES)                       */}
      {/* ========================================================================= */}
      {activeTab === "directory" && (
        <div className="space-y-6">
          {/* Métricas Comerciales */}
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
                  ${metrics.mrrUSD.toLocaleString("en-US", { minimumFractionDigits: 0 })}{" "}
                  <span className="text-[10px] font-normal text-[#475467]">USD</span>
                </div>
                <div className="text-[10px] text-[#9C9890] mt-0.5">Facturación recurrente mensual</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#EAECF0] shadow-sm">
                <div className="flex items-center justify-between text-[#475467] text-[11px]">
                  <span>ARR Proyectado</span>
                  <TrendingUp className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="text-lg font-semibold text-[#101828] mt-1">
                  ${metrics.arrUSD.toLocaleString("en-US", { minimumFractionDigits: 0 })}{" "}
                  <span className="text-[10px] font-normal text-[#475467]">USD</span>
                </div>
                <div className="text-[10px] text-[#9C9890] mt-0.5">Anualizado (MRR x 12)</div>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#EAECF0] shadow-sm">
                <div className="flex items-center justify-between text-[#475467] text-[11px]">
                  <span>Pipeline Cuentas</span>
                  <Briefcase className="w-3.5 h-3.5 text-[#586ff6]" />
                </div>
                <div className="text-lg font-semibold text-[#101828] mt-1">
                  ${metrics.totalClientPipelineUSD.toLocaleString("en-US", { minimumFractionDigits: 0 })}{" "}
                  <span className="text-[10px] font-normal text-[#475467]">USD</span>
                </div>
                <div className="text-[10px] text-[#9C9890] mt-0.5">Deals abiertos vinculados</div>
              </div>
            </div>
          )}

          {/* Filtros de Clientes */}
          <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#EAECF0] shadow-sm space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-4 relative">
                <Search className="w-3.5 h-3.5 text-[#9C9890] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por cliente, empresa, email, teléfono o sector..."
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl pl-9 pr-3 py-2 text-xs text-[#101828] placeholder-[#9C9890] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="all">Estado: Todos</option>
                  <option value="active">Activo</option>
                  <option value="on_hold">En Pausa</option>
                  <option value="churned">Cancelado</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="all">Sector: Todos</option>
                  {availableIndustries.map((ind) => (
                    <option key={ind} value={ind}>
                      {ind}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={ownerFilter}
                  onChange={(e) => setOwnerFilter(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                >
                  <option value="all">Asesor: Todos</option>
                  {teamMembers.map((member) => (
                    <option key={member.id} value={member.id}>
                      {member.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
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
                  className="text-amber-600 hover:text-amber-700 hover:underline font-semibold"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>

          {/* Grid de Clientes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {loading ? (
              <div className="col-span-full py-16 text-center text-[#9C9890] text-xs flex flex-col items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-amber-500" />
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
                const hasConnectedAccounts = Boolean(client.connectedAccounts && client.connectedAccounts.length > 0);

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
                      {/* Top Bar: Logo, Title, Industry, Badges */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Logo de la empresa */}
                          {client.logoUrl ? (
                            <img
                              src={client.logoUrl}
                              alt={client.name}
                              className="w-12 h-12 rounded-2xl object-cover border border-[#EAECF0] shadow-2xs shrink-0 bg-white"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-2xl bg-[#0F172A] border border-amber-500/20 text-amber-400 font-bold text-sm flex items-center justify-center shadow-xs shrink-0">
                              {client.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div className="space-y-0.5 min-w-0">
                            <Link
                              href={`/crm/clients/${client.id}`}
                              className="font-semibold text-[#101828] text-base group-hover:text-amber-600 transition-colors flex items-center gap-1.5 truncate"
                            >
                              <span className="truncate">{client.name}</span>
                              <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                            </Link>
                            {client.companyName && client.companyName.trim().toLowerCase() !== client.name.trim().toLowerCase() && (
                              <div className="text-[11px] text-[#475467] font-medium truncate">{client.companyName}</div>
                            )}
                            <div className="text-[11px] text-[#475467] flex items-center gap-1">
                              <Building className="w-3 h-3 text-[#9C9890] shrink-0" />
                              <span className="truncate">{client.industry || "General"}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1 shrink-0">
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

                      {/* Commercial Notes */}
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
                              className="text-amber-600 hover:text-amber-700 hover:underline truncate"
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

                      {/* Separación Visual: Estado de Cuentas Publicitarias del BM */}
                      <div className="mt-3 pt-3 border-t border-[#F0EEE6] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-[#475467]">
                          <Share2 className="w-3.5 h-3.5 text-[#1877F2]" />
                          <span className="text-[11px]">Cuentas BM:</span>
                          <span className="font-semibold text-[#101828] text-[11px]">
                            {hasConnectedAccounts
                              ? `${client.connectedAccounts!.length} asignada(s)`
                              : "Sin cuenta BM"}
                          </span>
                        </div>
                        {hasConnectedAccounts ? (
                          <Link
                            href={`/campaigns?clientId=${client.id}`}
                            className="text-[11px] font-semibold text-amber-600 hover:text-amber-700 hover:underline flex items-center gap-1"
                            title="Ver anuncios y campañas pagadas de este cliente"
                          >
                            <span>Ver anuncios</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setSocialConnectClientId(client.id);
                              setIsSocialModalOpen(true);
                            }}
                            className="text-[11px] font-semibold text-[#1877F2] hover:underline"
                            title="Vincular cuenta publicitaria de Meta o TikTok"
                          >
                            + Vincular BM
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: MRR & Actions */}
                    <div className="pt-3 border-t border-[#F0EEE6] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-[#9C9890] block uppercase font-medium">Facturación MRR</span>
                        <span className="text-sm font-semibold text-[#101828]">
                          ${(client.revenue || 0).toLocaleString("en-US")}{" "}
                          <span className="text-[10px] font-normal text-[#475467]">USD/mes</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(client)}
                          className="px-2.5 py-1.5 rounded-xl border border-[#EAECF0] bg-[#F8F9FA] hover:bg-white text-[#475467] hover:text-[#101828] text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs"
                          title="Editar información y foto de la empresa"
                        >
                          <Edit className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>

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
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA 2: CUENTAS PUBLICITARIAS ASIGNADAS (BM & ANUNCIOS)                 */}
      {/* ========================================================================= */}
      {activeTab === "ad_accounts" && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Banner Explicativo sobre Cuentas vs Clientes */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#1877F2]/10 via-[#FAF9F5] to-amber-50/40 border border-[#1877F2]/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1877F2] text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-[#101828]">
                  Separación de Cuentas Publicitarias del Business Manager (BM)
                </h3>
                <p className="text-[11px] text-[#475467] mt-0.5 max-w-2xl leading-relaxed">
                  Cada cuenta de anuncios conectada se asigna a un cliente específico para que sus métricas, presupuesto y anuncios corran de forma aislada. Las cuentas sin cliente asignado representan los anuncios propios de Bunker Agency.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <Link
                href="/marketing/integrations"
                className="text-xs font-semibold text-[#1877F2] hover:underline flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-[#1877F2]/20 shadow-2xs"
              >
                <span>Administrar Canales OAuth</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Tarjetas KPI de Cuentas Publicitarias */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-sm">
              <div className="flex items-center justify-between text-[#475467] text-[11px]">
                <span>Total Cuentas BM</span>
                <Layers className="w-3.5 h-3.5 text-[#1877F2]" />
              </div>
              <div className="text-2xl font-bold text-[#101828] mt-1">{adAccountMetrics.total}</div>
              <div className="text-[10px] text-[#9C9890] mt-0.5">canales y cuentas activas</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-sm">
              <div className="flex items-center justify-between text-[#475467] text-[11px]">
                <span>Cuentas de Clientes</span>
                <Building className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="text-2xl font-bold text-amber-600 mt-1">{adAccountMetrics.clientAssigned}</div>
              <div className="text-[10px] text-[#9C9890] mt-0.5">asignadas con anuncios propios</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-sm">
              <div className="flex items-center justify-between text-[#475467] text-[11px]">
                <span>Cuentas Propias (Bunker)</span>
                <div className="w-2.5 h-2.5 rounded-full bg-blue-600" />
              </div>
              <div className="text-2xl font-bold text-[#101828] mt-1">{adAccountMetrics.agencyAccounts}</div>
              <div className="text-[10px] text-[#9C9890] mt-0.5">anuncios internos de agencia</div>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-[#EAECF0] shadow-sm">
              <div className="flex items-center justify-between text-[#475467] text-[11px]">
                <span>Clientes con Pauta Activa</span>
                <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {adAccountMetrics.clientsWithAccounts}{" "}
                <span className="text-xs font-normal text-[#9C9890]">/ {clients.length}</span>
              </div>
              <div className="text-[10px] text-[#9C9890] mt-0.5">empresas con canal BM conectado</div>
            </div>
          </div>

          {/* Filtros de Cuentas Publicitarias */}
          <div className="p-4 rounded-2xl bg-[#FFFFFF] border border-[#EAECF0] shadow-sm space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-5 relative">
                <Search className="w-3.5 h-3.5 text-[#9C9890] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={accountSearch}
                  onChange={(e) => setAccountSearch(e.target.value)}
                  placeholder="Buscar cuenta por nombre, ID de Meta/TikTok o cliente asignado..."
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl pl-9 pr-3 py-2 text-xs text-[#101828] placeholder-[#9C9890] focus:outline-none focus:border-[#1877F2]"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={accountAssignmentFilter}
                  onChange={(e) => setAccountAssignmentFilter(e.target.value as "all" | "clients" | "agency")}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-[#1877F2]"
                >
                  <option value="all">Asignación: Todas ({allConnectedAccounts.length})</option>
                  <option value="clients">Solo Cuentas de Clientes ({adAccountMetrics.clientAssigned})</option>
                  <option value="agency">Solo Cuentas de la Agencia ({adAccountMetrics.agencyAccounts})</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={accountClientFilter}
                  onChange={(e) => setAccountClientFilter(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-[#1877F2]"
                >
                  <option value="all">Cliente: Todos</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <select
                  value={accountTypeFilter}
                  onChange={(e) => setAccountTypeFilter(e.target.value)}
                  className="w-full bg-[#F8F9FA] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-[#1877F2]"
                >
                  <option value="all">Tipo: Todos</option>
                  <option value={ACCOUNT_TYPE.META_AD_ACCOUNT}>Cuentas Meta Ads</option>
                  <option value={ACCOUNT_TYPE.TIKTOK_ADVERTISER}>Cuentas TikTok Ads</option>
                  <option value={ACCOUNT_TYPE.FACEBOOK_PAGE}>Páginas Facebook</option>
                  <option value={ACCOUNT_TYPE.INSTAGRAM_BUSINESS}>Instagram Business</option>
                </select>
              </div>
            </div>

            {(accountSearch || accountAssignmentFilter !== "all" || accountClientFilter !== "all" || accountTypeFilter !== "all") && (
              <div className="flex items-center justify-between pt-2 border-t border-[#F0EEE6] text-[11px] text-[#475467]">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-[#101828]">Filtros activos:</span>
                  {accountSearch && <span className="px-2 py-0.5 rounded-full bg-[#F8F9FA] border border-[#EAECF0]">Texto: &ldquo;{accountSearch}&rdquo;</span>}
                  {accountAssignmentFilter !== "all" && (
                    <span className="px-2 py-0.5 rounded-full bg-[#F8F9FA] border border-[#EAECF0]">
                      {accountAssignmentFilter === "clients" ? "Cuentas de Clientes" : "Cuentas de Agencia"}
                    </span>
                  )}
                  {accountClientFilter !== "all" && (
                    <span className="px-2 py-0.5 rounded-full bg-[#F8F9FA] border border-[#EAECF0]">
                      Cliente: {clients.find((c) => c.id === accountClientFilter)?.name || accountClientFilter}
                    </span>
                  )}
                  {accountTypeFilter !== "all" && (
                    <span className="px-2 py-0.5 rounded-full bg-[#F8F9FA] border border-[#EAECF0]">
                      Tipo: {ACCOUNT_TYPE_LABELS[accountTypeFilter] || accountTypeFilter}
                    </span>
                  )}
                </div>
                <button
                  onClick={resetAccountFilters}
                  className="text-[#1877F2] hover:underline font-semibold"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>

          {/* Grid de Cuentas Publicitarias */}
          {integrationsLoading ? (
            <div className="py-16 text-center text-[#9C9890] text-xs flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-[#1877F2]" />
              <span>Cargando cuentas del Business Manager...</span>
            </div>
          ) : filteredAdAccounts.length === 0 ? (
            <div className="py-16 text-center text-[#9C9890] text-xs p-8 rounded-2xl bg-[#FFFFFF] border border-[#EAECF0] space-y-3">
              <Plug className="w-10 h-10 text-[#DDD9CF] mx-auto" />
              <div className="font-semibold text-sm text-[#101828]">No se encontraron cuentas publicitarias</div>
              <p className="max-w-md mx-auto text-[#475467]">
                No hay cuentas del Business Manager que coincidan con la búsqueda o filtros aplicados.
              </p>
              <button
                onClick={() => {
                  setSocialConnectClientId("");
                  setIsSocialModalOpen(true);
                }}
                className="btn-black-gold rounded-xl px-4 py-2 text-xs font-semibold inline-flex items-center gap-2"
              >
                <Plug className="w-4 h-4 text-amber-400" />
                <span>+ Conectar Cuentas de Meta / TikTok</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredAdAccounts.map((acc) => {
                const assignedClient = clients.find((c) => c.id === acc.clientId);
                const isAdsAccount =
                  acc.accountType === ACCOUNT_TYPE.META_AD_ACCOUNT || acc.accountType === ACCOUNT_TYPE.TIKTOK_ADVERTISER;

                return (
                  <div
                    key={acc.id}
                    className="p-5 rounded-2xl bg-white border border-[#EAECF0] shadow-sm hover:border-[#1877F2]/40 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Cabecera de la Cuenta: Icono, Nombre y Estado */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <SocialNetworkIcon type={acc.accountType || "meta_ad_account"} size="md" />
                          <div className="min-w-0">
                            <h3 className="font-bold text-[#101828] text-sm truncate" title={acc.accountName}>
                              {acc.accountName}
                            </h3>
                            <p className="text-[11px] text-[#667085] truncate">
                              {ACCOUNT_TYPE_LABELS[acc.accountType || ""] || acc.accountType || "Canal Publicitario"}
                            </p>
                          </div>
                        </div>

                        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                          ● Activa
                        </span>
                      </div>

                      {/* ID Externo del BM */}
                      <div className="mt-3 px-3 py-1.5 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] flex items-center justify-between text-[11px]">
                        <span className="text-[#9C9890]">ID del Business Manager:</span>
                        <code className="font-mono font-semibold text-[#101828] text-[11px]">
                          {acc.externalId || "—"}
                        </code>
                      </div>

                      {/* Asignación de Cliente */}
                      <div className="mt-4 p-3.5 rounded-xl border space-y-2 bg-[#FAF9F5] border-[#EAECF0]">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-[#667085] font-medium">Asignada a:</span>
                          {assignedClient ? (
                            <Link
                              href={`/crm/clients/${assignedClient.id}`}
                              className="text-amber-600 hover:text-amber-700 font-semibold hover:underline flex items-center gap-1"
                            >
                              <span>Ver cliente</span>
                              <ChevronRight className="w-3 h-3" />
                            </Link>
                          ) : (
                            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                              Agencia Bunker
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Building className="w-4 h-4 text-[#9C9890] shrink-0" />
                          <span className="font-bold text-[#101828] text-xs truncate">
                            {assignedClient ? assignedClient.name : "Cuenta Propia de Bunker (Sin cliente)"}
                          </span>
                        </div>

                        {/* Reasignar cliente directamente */}
                        <div className="pt-2 border-t border-[#EAECF0] text-[11px]">
                          <label className="text-[10px] text-[#9C9890] block mb-1">
                            Cambiar asignación de cliente:
                          </label>
                          <select
                            value={acc.clientId || ""}
                            disabled={assigningId === acc.id}
                            onChange={(e) => handleAssignAccount(acc.id, e.target.value)}
                            className="w-full bg-white border border-[#EAECF0] rounded-lg px-2.5 py-1.5 text-xs text-[#101828] focus:outline-none focus:border-[#1877F2]"
                          >
                            <option value="">Cuenta de Bunker Agency (Sin asignar)</option>
                            {clients.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Acciones de la Cuenta */}
                    <div className="pt-3 border-t border-[#EAECF0] flex items-center gap-2">
                      <Link
                        href={`/campaigns?clientId=${acc.clientId || "all"}&accountId=${acc.id}`}
                        className="btn-black-gold rounded-xl px-3 py-2 text-xs font-semibold flex items-center justify-center gap-1.5 flex-1 shadow-2xs"
                        title="Ver campañas, anuncios y métricas de esta cuenta"
                      >
                        <BarChart3 className="w-3.5 h-3.5 text-amber-400" />
                        <span>Ver Campañas & Anuncios</span>
                      </Link>

                      {assignedClient && (
                        <Link
                          href={`/crm/clients/${assignedClient.id}`}
                          className="p-2 rounded-xl bg-white border border-[#EAECF0] hover:bg-[#F8F9FA] text-[#475467] hover:text-[#101828] transition-colors"
                          title="Ir a la Ficha 360° del Cliente"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Client Onboarding Wizard Modal */}
      {!isClient && (
        <ClientOnboardingWizardModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onSuccess={() => {
            fetchClients();
            emitClientsUpdated();
            setFeedback("¡Cliente comercial instalado y configurado con éxito!");
            setTimeout(() => setFeedback(null), 5000);
          }}
          teamMembers={teamMembers}
        />
      )}

      {/* Modal: Editar Empresa y Completar Información */}
      {editingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FFFFFF] border border-[#EAECF0] rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-4 border-b border-[#EAECF0] flex items-center justify-between bg-[#F8F9FA] sticky top-0 z-10">
              <h2 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-500" />
                <span>Editar Empresa: {editingClient.name}</span>
              </h2>
              <button
                onClick={() => setEditingClient(null)}
                className="text-[#475467] hover:text-[#101828] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="p-5 space-y-4">
              {/* Foto o Logo de la Empresa */}
              <div className="p-3.5 bg-[#F8F9FA] rounded-2xl border border-[#EAECF0] space-y-2.5">
                <label className="block text-xs font-semibold text-[#101828]">Foto o Logo de la Empresa</label>
                <div className="flex items-center gap-3">
                  {editFormData.logoUrl ? (
                    <img
                      src={editFormData.logoUrl}
                      alt="Logo preview"
                      className="w-16 h-16 rounded-2xl object-cover border border-[#EAECF0] shadow-xs shrink-0 bg-white"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-[#0F172A] text-amber-400 font-bold text-lg flex items-center justify-center border border-amber-500/20 shrink-0">
                      {editFormData.name ? editFormData.name.slice(0, 2).toUpperCase() : "EM"}
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
                                  setEditFormData((prev) => ({ ...prev, logoUrl: result }));
                                }
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      {editFormData.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setEditFormData((prev) => ({ ...prev, logoUrl: "" }))}
                          className="px-2 py-1.5 text-xs text-rose-600 hover:text-rose-700 hover:underline font-medium cursor-pointer"
                        >
                          Quitar foto
                        </button>
                      )}
                    </div>
                    <input
                      type="url"
                      placeholder="O pegar URL de imagen (https://...)"
                      value={editFormData.logoUrl}
                      onChange={(e) => setEditFormData({ ...editFormData, logoUrl: e.target.value })}
                      className="w-full bg-white border border-[#EAECF0] rounded-xl px-2.5 py-1.5 text-xs text-[#101828] focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* Nombres y Razón Social */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Nombre Comercial *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 font-medium"
                    placeholder="ej. Regal Furniture"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Razón Social / Nombre Legal</label>
                  <input
                    type="text"
                    value={editFormData.companyName}
                    onChange={(e) => setEditFormData({ ...editFormData, companyName: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="ej. Regal Furniture DFW LLC"
                  />
                </div>
              </div>

              {/* Sector y Estado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Sector / Industria</label>
                  <input
                    type="text"
                    value={editFormData.industry}
                    onChange={(e) => setEditFormData({ ...editFormData, industry: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="ej. Mueblería, Retail, Bienes Raíces..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Estado de la Relación</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="active">Activo</option>
                    <option value="on_hold">En Pausa</option>
                    <option value="churned">Cancelado</option>
                  </select>
                </div>
              </div>

              {/* Canales Oficiales: Sitio Web, Teléfono, Correo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Sitio Web</label>
                  <input
                    type="url"
                    value={editFormData.website}
                    onChange={(e) => setEditFormData({ ...editFormData, website: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Teléfono</label>
                  <input
                    type="tel"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="+1 469..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={editFormData.email}
                    onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="contacto@empresa.com"
                  />
                </div>
              </div>

              {/* Facturación y Asesor */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Facturación MRR ($ USD/mes)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={editFormData.revenue}
                    onChange={(e) => setEditFormData({ ...editFormData, revenue: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Brand Manager / Asesor en Bunker</label>
                  <select
                    value={editFormData.ownerId}
                    onChange={(e) => setEditFormData({ ...editFormData, ownerId: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">Sin Asignar (Dirección Bunker)</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notas Comerciales */}
              <div>
                <label className="block text-xs font-medium text-[#101828] mb-1">Notas Comerciales y Objetivos</label>
                <textarea
                  rows={2}
                  value={editFormData.notes}
                  onChange={(e) => setEditFormData({ ...editFormData, notes: e.target.value })}
                  placeholder="Detalles sobre acuerdos, productos destacados, horarios o especificaciones..."
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#F0EEE6]">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-3.5 py-2 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] text-[#475467] text-xs font-medium hover:bg-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="btn-black-gold rounded-xl px-4 py-2 text-xs font-semibold cursor-pointer shadow-xs"
                >
                  {savingEdit ? "Guardando..." : "Actualizar Empresa"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Connect Social Account Modal (BM) */}
      {!isClient && (
        <ConnectSocialAccountModal
          isOpen={isSocialModalOpen}
          onClose={() => {
            setIsSocialModalOpen(false);
            setSocialConnectClientId("");
          }}
          onSuccess={() => {
            fetchClients();
            fetchIntegrations();
            setFeedback("¡Cuenta publicitaria actualizada con éxito!");
            setTimeout(() => setFeedback(null), 4000);
          }}
          clients={clients.map((c) => ({ id: c.id, name: c.name }))}
          initialClientId={socialConnectClientId}
          initialProvider="meta"
        />
      )}
    </div>
  );
}
