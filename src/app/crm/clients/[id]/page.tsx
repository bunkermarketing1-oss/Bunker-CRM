/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ROUTES } from "@/lib/constants/routes";
import { useAuth } from "@/context/AuthContext";
import { useActiveClientId } from "@/hooks/useActiveClientId";
import { useClientPortalUsers } from "@/hooks/useClientPortalUsers";
import { emitClientsUpdated } from "@/hooks/useClientOptions";
import { ClientPortalUsersPanel } from "@/components/clients/ClientPortalUsersPanel";
import { ClientAiAssistantPanel } from "@/components/clients/ClientAiAssistantPanel";
import { SocialNetworkIcon } from "@/components/common/SocialNetworkIcon";
import { isBunkerRole } from "@/lib/roles";
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  Globe,
  DollarSign,
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  Plus,
  Edit,
  Trash2,
  X,
  MessageSquare,
  TrendingUp,
  Sparkles,
  ChevronRight,
  Upload,
  Camera,
  Users,
  ExternalLink,
  Bot,
  UserCheck,
} from "lucide-react";

interface Contact {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  jobTitle: string | null;
  isPrimary: boolean;
}

interface ConnectedAccount {
  id: string;
  accountName: string;
  accountType: string | null;
  externalId: string | null;
  status: string;
  lastSyncAt: string | null;
  createdAt: string;
  integration?: {
    id: string;
    provider: string;
    name: string;
    status: string;
  } | null;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface ClientDetail {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  website: string | null;
  logoUrl?: string | null;
  industry: string | null;
  status: string;
  revenue: number | null;
  notes: string | null;
  createdAt: string;
  owner: TeamMember | null;
  contacts: Contact[];
  connectedAccounts?: ConnectedAccount[];
  leads?: Array<{ id: string; name: string }>;
  opportunities?: Array<{ id: string; title: string; value: number }>;
  tasks?: Array<{ id: string; title: string; status: string }>;
}

export default function ClientProfile360Page() {
  const params = useParams();
  const clientId = params?.id as string;
  const { user } = useAuth();
  // Con marca activa no se ofrece volver al directorio de empresas (listaría otras marcas).
  const activeClientId = useActiveClientId();
  const isBunkerUser = isBunkerRole(user?.role) && !user?.isClientUser;
  const isAdmin = isBunkerUser;

  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Feedback toast
  const [feedback, setFeedback] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Tab activo de gestión derecha
  const [activeTab, setActiveTab] = useState<"contacts" | "portal" | "integrations" | "ai_assistant">("contacts");

  // Portal users hook
  const portalUsers = useClientPortalUsers(clientId, isBunkerUser);

  // Modales
  const [isEditClientOpen, setIsEditClientOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Estados de formulario
  const [submittingClientEdit, setSubmittingClientEdit] = useState(false);
  const [submittingContact, setSubmittingContact] = useState(false);

  const [editClientData, setEditClientData] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    website: "",
    logoUrl: "",
    industry: "",
    status: "active",
    revenue: "",
    notes: "",
    ownerId: "",
  });

  const [contactFormData, setContactFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    jobTitle: "",
    isPrimary: false,
  });

  const showFeedback = (text: string, type: "success" | "error" = "success") => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4500);
  };

  // Cargar datos del cliente
  const fetchClientData = useCallback(async () => {
    if (!clientId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/clients/${clientId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "No se pudo cargar la información del cliente.");
      }
      setClient(json.client);
      setEditClientData({
        name: json.client.name || "",
        companyName: json.client.companyName || "",
        email: json.client.email || "",
        phone: json.client.phone || "",
        website: json.client.website || "",
        logoUrl: json.client.logoUrl || "",
        industry: json.client.industry || "",
        status: json.client.status || "active",
        revenue: json.client.revenue ? String(json.client.revenue) : "",
        notes: json.client.notes || "",
        ownerId: json.client.owner?.id || "",
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error inesperado");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    fetchClientData();
    if (isBunkerUser) {
      fetch("/api/team")
        .then((r) => r.json())
        .then((j) => {
          if (j.success && Array.isArray(j.team)) {
            setTeamMembers(j.team);
          }
        })
        .catch(() => {});
    }
  }, [fetchClientData, isBunkerUser]);

  // Guardar cambios en la ficha comercial
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
        emitClientsUpdated();
      } else {
        showFeedback(json.error || "No se pudo actualizar la ficha.", "error");
      }
    } catch (e) {
      showFeedback("Error: " + (e instanceof Error ? e.message : "Error inesperado"), "error");
    } finally {
      setSubmittingClientEdit(false);
    }
  };

  // Crear o editar contacto
  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingContact(true);
    try {
      const isEditing = Boolean(editingContact);
      const url = "/api/contacts";
      const method = isEditing ? "PUT" : "POST";
      const payload: Record<string, unknown> = {
        firstName: contactFormData.firstName,
        lastName: contactFormData.lastName,
        email: contactFormData.email,
        phone: contactFormData.phone,
        jobTitle: contactFormData.jobTitle,
        isPrimary: contactFormData.isPrimary,
      };

      if (isEditing && editingContact) {
        payload.id = editingContact.id;
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
        showFeedback(isEditing ? "Contacto actualizado." : "Contacto agregado exitosamente.");
        setIsContactModalOpen(false);
        setEditingContact(null);
        setContactFormData({ firstName: "", lastName: "", email: "", phone: "", jobTitle: "", isPrimary: false });
        fetchClientData();
      } else {
        showFeedback(json.error || "No se pudo guardar el contacto.", "error");
      }
    } catch (e) {
      showFeedback("Error: " + (e instanceof Error ? e.message : "Error inesperado"), "error");
    } finally {
      setSubmittingContact(false);
    }
  };

  // Eliminar contacto
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

  const statusBadge = useMemo(() => {
    if (!client) return { label: "Activo", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    switch (client.status) {
      case "on_hold":
        return { label: "En Pausa", color: "bg-amber-50 text-amber-700 border-amber-200" };
      case "churned":
        return { label: "Inactivo / Cancelado", color: "bg-rose-50 text-rose-700 border-rose-200" };
      default:
        return { label: "Activo", color: "bg-emerald-50 text-emerald-700 border-emerald-200" };
    }
  }, [client]);

  if (loading) {
    return (
      <div className="p-12 text-center text-xs text-[#667085] flex flex-col items-center justify-center gap-3">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        <span>Cargando ficha del cliente...</span>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="p-8 max-w-lg mx-auto text-center space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-bold text-[#101828]">No se pudo abrir la ficha</h2>
        <p className="text-xs text-[#667085]">{error || "Cliente no encontrado o sin permisos."}</p>
        {!activeClientId && (
          <Link
            href="/crm/clients"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#101828] text-white text-xs font-semibold hover:bg-black transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a Clientes</span>
          </Link>
        )}
      </div>
    );
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

      {/* Navegación de Regreso */}
      {!activeClientId && (
        <div>
          <Link
            href="/crm/clients"
            className="inline-flex items-center gap-1.5 text-xs text-[#475467] hover:text-[#101828] font-medium transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver a clientes</span>
          </Link>
        </div>
      )}

      {/* Encabezado Principal / Tarjeta Resumen de la Marca */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] p-5 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          {/* Logo con botón interactivo de cambiar foto */}
          <div className="relative group shrink-0">
            {client.logoUrl ? (
              <img
                src={client.logoUrl}
                alt={client.name}
                className="w-16 h-16 rounded-2xl object-cover border border-[#EAECF0] shadow-sm bg-white"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#0F172A] to-slate-800 text-amber-400 font-bold text-xl flex items-center justify-center border border-white shadow-sm">
                {client.name.charAt(0).toUpperCase()}
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsEditClientOpen(true)}
              className="absolute inset-0 bg-black/60 text-white rounded-2xl opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[9px] font-medium transition-opacity cursor-pointer shadow-sm"
              title="Cambiar foto o información"
            >
              <Camera className="w-4 h-4 text-amber-400 mb-0.5" />
              <span>Editar</span>
            </button>
          </div>

          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg font-bold text-[#101828] tracking-tight truncate">
                {client.name}
              </h1>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${statusBadge.color}`}>
                ● {statusBadge.label}
              </span>
            </div>

            <p className="text-xs text-[#475467] font-medium truncate">
              {client.companyName && client.companyName.trim().toLowerCase() !== client.name.trim().toLowerCase()
                ? `${client.companyName} · `
                : ""}
              {client.industry || "Cliente Comercial"}
            </p>
          </div>
        </div>

        {/* Acciones y Canales Directos */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          {client.email && (
            <a
              href={`mailto:${client.email}`}
              title={`Enviar correo a ${client.email}`}
              className="w-9 h-9 rounded-xl bg-white border border-[#EAECF0] hover:border-[#101828] hover:bg-[#F8F9FA] flex items-center justify-center text-[#475467] hover:text-[#101828] transition-colors shadow-2xs"
            >
              <Mail className="w-4 h-4" />
            </a>
          )}

          {client.phone && (
            <a
              href={`tel:${client.phone}`}
              title={`Llamar a ${client.phone}`}
              className="w-9 h-9 rounded-xl bg-white border border-[#EAECF0] hover:border-[#101828] hover:bg-[#F8F9FA] flex items-center justify-center text-[#475467] hover:text-[#101828] transition-colors shadow-2xs"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}

          {client.website && (
            <a
              href={client.website}
              target="_blank"
              rel="noreferrer"
              title={`Visitar ${client.website}`}
              className="w-9 h-9 rounded-xl bg-white border border-[#EAECF0] hover:border-[#101828] hover:bg-[#F8F9FA] flex items-center justify-center text-[#475467] hover:text-[#101828] transition-colors shadow-2xs"
            >
              <Globe className="w-4 h-4" />
            </a>
          )}

          <button
            type="button"
            onClick={() => setIsEditClientOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#EAECF0] hover:border-[#101828] hover:bg-[#F8F9FA] text-xs font-semibold text-[#101828] flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Edit className="w-3.5 h-3.5 text-amber-600" />
            <span>Editar Ficha</span>
          </button>
        </div>
      </div>

      {/* Accesos Rápidos a Módulos del Sidebar Filtrados para esta Marca */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <Link
          href={`${ROUTES.INBOX}?clientId=${client.id}`}
          className="p-3.5 rounded-2xl bg-white border border-[#EAECF0] hover:border-amber-400 hover:shadow-xs transition-all group flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#101828] group-hover:text-amber-700 truncate transition-colors">
                Bandeja
              </p>
              <span className="text-[10px] text-[#667085]">Mensajes y chats</span>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#98A2B3] group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>

        <Link
          href={`${ROUTES.LEADS}?clientId=${client.id}`}
          className="p-3.5 rounded-2xl bg-white border border-[#EAECF0] hover:border-amber-400 hover:shadow-xs transition-all group flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#101828] group-hover:text-amber-700 truncate transition-colors">
                Leads ({client.leads?.length || 0})
              </p>
              <span className="text-[10px] text-[#667085]">Prospectos captados</span>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#98A2B3] group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>

        <Link
          href={`${ROUTES.CAMPAIGNS}?clientId=${client.id}`}
          className="p-3.5 rounded-2xl bg-white border border-[#EAECF0] hover:border-amber-400 hover:shadow-xs transition-all group flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#101828] group-hover:text-amber-700 truncate transition-colors">
                Campañas
              </p>
              <span className="text-[10px] text-[#667085]">Meta Ads & Pautas</span>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#98A2B3] group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>

        <Link
          href={`${ROUTES.PIPELINE}?clientId=${client.id}`}
          className="p-3.5 rounded-2xl bg-white border border-[#EAECF0] hover:border-amber-400 hover:shadow-xs transition-all group flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#101828] group-hover:text-amber-700 truncate transition-colors">
                Pipeline ({client.opportunities?.length || 0})
              </p>
              <span className="text-[10px] text-[#667085]">Deals de ventas</span>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#98A2B3] group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>

        <Link
          href={`${ROUTES.TASKS}?clientId=${client.id}`}
          className="p-3.5 rounded-2xl bg-white border border-[#EAECF0] hover:border-amber-400 hover:shadow-xs transition-all group flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-stone-100 text-[#101828] flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#101828] group-hover:text-amber-700 truncate transition-colors">
                Tareas ({client.tasks?.filter((t) => t.status !== "completed").length || 0})
              </p>
              <span className="text-[10px] text-[#667085]">Seguimientos</span>
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-[#98A2B3] group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all shrink-0" />
        </Link>
      </div>

      {/* Contenido Principal en 2 Columnas Limpias */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Columna Izquierda: Información de la Empresa (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-[#EAECF0] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#101828] flex items-center gap-2">
                <Building className="w-3.5 h-3.5 text-amber-600" />
                Información de la Empresa
              </h2>
              <button
                type="button"
                onClick={() => setIsEditClientOpen(true)}
                className="text-[11px] font-semibold text-amber-600 hover:text-amber-800 underline"
              >
                Editar
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block mb-0.5">
                  Correo Comercial
                </span>
                <span className="text-[#101828] font-medium break-all">
                  {client.email || "Sin registrar"}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block mb-0.5">
                  Teléfono Principal
                </span>
                <span className="text-[#101828] font-medium">
                  {client.phone || "Sin registrar"}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block mb-0.5">
                  Sitio Web
                </span>
                {client.website ? (
                  <a
                    href={client.website}
                    target="_blank"
                    rel="noreferrer"
                    className="text-amber-700 hover:underline font-medium inline-flex items-center gap-1 truncate max-w-full"
                  >
                    <span className="truncate">{client.website}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ) : (
                  <span className="text-[#667085]">Sin registrar</span>
                )}
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block mb-0.5">
                  Razón Social
                </span>
                <span className="text-[#101828] font-medium">
                  {client.companyName || client.name}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block mb-0.5">
                  Brand Manager en Bunker
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[#101828] font-semibold">
                    {client.owner?.name || "Sin asignar (Agencia General)"}
                  </span>
                  {isBunkerUser && (
                    <button
                      type="button"
                      onClick={() => setIsEditClientOpen(true)}
                      className="text-[10px] text-amber-600 hover:text-amber-800 underline font-medium"
                    >
                      Asignar
                    </button>
                  )}
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block mb-0.5">
                  Facturación MRR
                </span>
                <span className="text-[#101828] font-bold text-sm">
                  {client.revenue ? `$${client.revenue.toLocaleString("en-US")} USD/mes` : "Sin registrar"}
                </span>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block mb-0.5">
                  Cliente Desde
                </span>
                <span className="text-[#101828] font-medium">
                  {new Date(client.createdAt).toLocaleDateString("es-MX", { dateStyle: "long" })}
                </span>
              </div>

              {client.notes && (
                <div className="pt-2 border-t border-[#F2F4F7]">
                  <span className="text-[10px] uppercase font-bold text-[#667085] tracking-wider block mb-1">
                    Notas y Observaciones
                  </span>
                  <p className="text-[#475467] text-[11px] whitespace-pre-wrap leading-relaxed bg-[#F8F9FA] p-2.5 rounded-xl border border-[#EAECF0]">
                    {client.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Columna Derecha: Pestañas de Gestión (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Barra de Pestañas Superiores */}
          <div className="bg-white rounded-2xl border border-[#EAECF0] p-1.5 shadow-xs flex items-center gap-1 overflow-x-auto no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab("contacts")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === "contacts"
                  ? "bg-[#101828] text-white shadow-xs"
                  : "text-[#667085] hover:bg-[#F8F9FA] hover:text-[#101828]"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Contactos ({client.contacts?.length || 0})</span>
            </button>

            {isBunkerUser && (
              <button
                type="button"
                onClick={() => setActiveTab("portal")}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "portal"
                    ? "bg-[#101828] text-white shadow-xs"
                    : "text-[#667085] hover:bg-[#F8F9FA] hover:text-[#101828]"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Portal ({portalUsers.users.length})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setActiveTab("integrations")}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === "integrations"
                  ? "bg-[#101828] text-white shadow-xs"
                  : "text-[#667085] hover:bg-[#F8F9FA] hover:text-[#101828]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cuentas Conectadas ({client.connectedAccounts?.length || 0})</span>
            </button>

            {isAdmin && (
              <button
                type="button"
                onClick={() => setActiveTab("ai_assistant")}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                  activeTab === "ai_assistant"
                    ? "bg-[#101828] text-white shadow-xs"
                    : "text-[#667085] hover:bg-[#F8F9FA] hover:text-[#101828]"
                }`}
              >
                <Bot className="w-3.5 h-3.5" />
                <span>Asistente IA</span>
              </button>
            )}
          </div>

          {/* Contenido de la Pestaña Activa */}
          {activeTab === "contacts" && (
            <div className="bg-white rounded-2xl border border-[#EAECF0] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#101828]">
                    Contactos Clave de la Empresa
                  </h3>
                  <p className="text-[11px] text-[#667085] mt-0.5">
                    Directores, dueños o personal administrativo vinculado a esta marca.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingContact(null);
                    setContactFormData({ firstName: "", lastName: "", email: "", phone: "", jobTitle: "", isPrimary: false });
                    setIsContactModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#101828] hover:bg-black text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-500" />
                  <span>Agregar Contacto</span>
                </button>
              </div>

              {(!client.contacts || client.contacts.length === 0) ? (
                <div className="p-8 text-center text-xs text-[#667085] space-y-2">
                  <p className="font-medium text-[#101828]">Sin contactos registrados</p>
                  <p>Agrega los datos de los responsables de la empresa para facilitar la comunicación directa.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {client.contacts.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] hover:border-[#D0D5DD] transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-9 h-9 rounded-xl bg-white border border-[#EAECF0] flex items-center justify-center font-bold text-xs text-[#101828] shadow-2xs shrink-0">
                            {c.firstName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-[#101828] truncate flex items-center gap-1.5">
                              <span>{c.firstName} {c.lastName || ""}</span>
                              {c.isPrimary && (
                                <span className="text-[9px] font-semibold bg-amber-50 text-amber-800 border border-amber-300 px-1.5 py-0.2 rounded">
                                  Principal
                                </span>
                              )}
                            </p>
                            <p className="text-[11px] text-[#667085] truncate">
                              {c.jobTitle || "Contacto"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingContact(c);
                              setContactFormData({
                                firstName: c.firstName,
                                lastName: c.lastName || "",
                                email: c.email || "",
                                phone: c.phone || "",
                                jobTitle: c.jobTitle || "",
                                isPrimary: c.isPrimary,
                              });
                              setIsContactModalOpen(true);
                            }}
                            className="p-1 rounded-lg hover:bg-white text-[#667085] hover:text-[#101828] transition-colors"
                            title="Editar contacto"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteContact(c.id, c.firstName)}
                            className="p-1 rounded-lg hover:bg-white text-[#667085] hover:text-rose-600 transition-colors"
                            title="Eliminar contacto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs pt-2 border-t border-[#EAECF0]">
                        {c.email && (
                          <a
                            href={`mailto:${c.email}`}
                            className="flex items-center gap-2 text-[#475467] hover:text-[#101828] truncate"
                          >
                            <Mail className="w-3.5 h-3.5 text-[#98A2B3] shrink-0" />
                            <span className="truncate">{c.email}</span>
                          </a>
                        )}
                        {c.phone && (
                          <a
                            href={`tel:${c.phone}`}
                            className="flex items-center gap-2 text-[#475467] hover:text-[#101828] truncate"
                          >
                            <Phone className="w-3.5 h-3.5 text-[#98A2B3] shrink-0" />
                            <span className="truncate">{c.phone}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "portal" && isBunkerUser && (
            <div className="bg-white rounded-2xl border border-[#EAECF0] p-5 shadow-xs">
              <ClientPortalUsersPanel
                clientId={client?.id || clientId}
                clientName={client?.name || client?.companyName || ""}
                users={portalUsers.users}
                error={portalUsers.error}
                savingId={portalUsers.savingId}
                onSetRole={portalUsers.setRole}
                onCreateUser={portalUsers.createUser}
                onGenerateResetLink={portalUsers.generateResetLink}
                onDeleteUser={portalUsers.deleteUser}
              />
            </div>
          )}

          {activeTab === "integrations" && (
            <div className="bg-white rounded-2xl border border-[#EAECF0] p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-[#101828]">
                    Cuentas Publicitarias y Redes Asignadas
                  </h3>
                  <p className="text-[11px] text-[#667085] mt-0.5">
                    Canales de Meta Ads, Facebook Pages, Instagram y TikTok enlazados a este cliente.
                  </p>
                </div>
                <Link
                  href={`/marketing/integrations?clientId=${client.id}`}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Vincular Cuentas</span>
                </Link>
              </div>

              {(!client.connectedAccounts || client.connectedAccounts.length === 0) ? (
                <div className="p-8 text-center text-xs text-[#667085] space-y-2">
                  <p className="font-medium text-[#101828]">No hay cuentas publicitarias asignadas</p>
                  <p>Vincula una cuenta de Meta Ads o TikTok para sincronizar campañas y prospectos automáticamente.</p>
                  <Link
                    href={`/marketing/integrations?clientId=${client.id}`}
                    className="inline-block mt-2 text-xs font-semibold text-amber-700 hover:underline"
                  >
                    Ir a Integraciones →
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {client.connectedAccounts.map((acc) => (
                    <div
                      key={acc.id}
                      className="p-3.5 rounded-xl bg-[#F8F9FA] border border-[#EAECF0] flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <SocialNetworkIcon type={acc.accountType || "meta_ad_account"} size="md" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#101828] truncate">{acc.accountName}</p>
                          <span className="text-[10px] text-[#667085] block truncate">
                            ID: {acc.externalId || "—"}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 shrink-0">
                        ● Activa
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "ai_assistant" && isAdmin && (
            <div className="bg-white rounded-2xl border border-[#EAECF0] p-5 shadow-xs">
              <ClientAiAssistantPanel clientId={clientId} />
            </div>
          )}
        </div>
      </div>

      {/* MODAL: Modificar Ficha Comercial */}
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
                  <label className="block text-xs font-medium text-[#101828] mb-1">Brand Manager en Bunker</label>
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
                  <label className="block text-xs font-medium text-[#101828] mb-1">Teléfono Principal</label>
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
                  placeholder="https://..."
                  value={editClientData.website}
                  onChange={(e) => setEditClientData({ ...editClientData, website: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#101828] mb-1">Notas Internas</label>
                <textarea
                  rows={3}
                  value={editClientData.notes}
                  onChange={(e) => setEditClientData({ ...editClientData, notes: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAECF0]">
                <button
                  type="button"
                  onClick={() => setIsEditClientOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#475467] hover:bg-[#F8F9FA] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingClientEdit}
                  className="px-4 py-2 rounded-xl bg-[#101828] text-[#F8F9FA] hover:bg-black text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {submittingClientEdit ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Crear o Editar Contacto */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#FFFFFF] border border-[#EAECF0] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-4 border-b border-[#EAECF0] flex items-center justify-between bg-[#F8F9FA] rounded-t-2xl">
              <h2 className="text-sm font-semibold text-[#101828] flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-500" />
                {editingContact ? "Modificar Contacto" : "Nuevo Contacto de la Empresa"}
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
                    value={contactFormData.firstName}
                    onChange={(e) => setContactFormData({ ...contactFormData, firstName: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#101828] mb-1">Apellido</label>
                  <input
                    type="text"
                    value={contactFormData.lastName}
                    onChange={(e) => setContactFormData({ ...contactFormData, lastName: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#101828] mb-1">Cargo o Puesto</label>
                <input
                  type="text"
                  placeholder="Ej. Director General, Gerente Comercial, Dueño"
                  value={contactFormData.jobTitle}
                  onChange={(e) => setContactFormData({ ...contactFormData, jobTitle: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#101828] mb-1">Correo Electrónico</label>
                <input
                  type="email"
                  value={contactFormData.email}
                  onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#101828] mb-1">Teléfono Directo</label>
                <input
                  type="tel"
                  value={contactFormData.phone}
                  onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#EAECF0] rounded-xl px-3 py-2 text-xs text-[#101828] focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="isPrimaryContact"
                  checked={contactFormData.isPrimary}
                  onChange={(e) => setContactFormData({ ...contactFormData, isPrimary: e.target.checked })}
                  className="rounded border-[#EAECF0] text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="isPrimaryContact" className="text-xs text-[#101828] font-medium">
                  Contacto principal de esta empresa
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#EAECF0]">
                <button
                  type="button"
                  onClick={() => setIsContactModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-[#475467] hover:bg-[#F8F9FA] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submittingContact}
                  className="px-4 py-2 rounded-xl bg-[#101828] text-[#F8F9FA] hover:bg-black text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {submittingContact ? "Guardando..." : editingContact ? "Actualizar Contacto" : "Guardar Contacto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
