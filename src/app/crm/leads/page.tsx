"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Filter,
  Trash2,
  ArrowRightCircle,
  Phone,
  Mail,
  Building,
  X,
  CheckCircle,
  Sparkles,
  TrendingUp,
  DollarSign,
  MessageCircle,
  ExternalLink,
  ShieldCheck,
  Calendar,
  MoreVertical,
  Download,
  Flame,
} from "lucide-react";

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    source: "meta_ads",
    estimatedValue: "45000",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  // Detail Modal
  const [selectedLead, setSelectedLead] = useState<any | null>(null);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter !== "all") params.append("status", statusFilter);
      if (sourceFilter !== "all") params.append("source", sourceFilter);

      const res = await fetch(`/api/leads?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLeads(json.leads);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLeads();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter, sourceFilter]);

  const handleCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (json.success) {
        setIsCreateOpen(false);
        setFormData({
          name: "",
          companyName: "",
          email: "",
          phone: "",
          source: "meta_ads",
          estimatedValue: "45000",
          notes: "",
        });
        setFeedback("¡Prospecto registrado exitosamente en la base de datos de Bunker!");
        setTimeout(() => setFeedback(null), 4000);
        fetchLeads();
      } else {
        alert(json.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvert = async (leadId: string) => {
    if (!confirm("¿Deseas convertir este prospecto en Cliente y crear su Oportunidad comercial en el Pipeline?")) return;
    try {
      const res = await fetch(`/api/leads/${leadId}/convert`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setFeedback("¡Prospecto convertido con éxito a Cliente Activo!");
        setTimeout(() => setFeedback(null), 4000);
        fetchLeads();
      } else {
        alert(json.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm("¿Eliminar este prospecto?")) return;
    try {
      const res = await fetch(`/api/leads?id=${leadId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchLeads();
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  const cleanPhoneForWa = (phone: string) => {
    if (!phone) return "";
    return phone.replace(/[^0-9]/g, "");
  };

  // Metrics Calculations
  const totalLeadsCount = leads.length;
  const qualifiedCount = leads.filter((l) => l.status === "qualified" || (l.qualification || 0) >= 70).length;
  const totalPipelineVal = leads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);
  const conversionRate = totalLeadsCount > 0 ? Math.round((leads.filter((l) => l.status === "converted").length / totalLeadsCount) * 100) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#ECEAE3]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#8C887E] mb-1">
            <span>CRM Comercial</span>
            <span>/</span>
            <span className="text-[#141414] font-medium">Prospectos</span>
          </div>
          <h1 className="text-2xl font-serif font-normal text-[#141414] tracking-tight">
            Gestión de Leads & Prospectos
          </h1>
          <p className="text-xs text-[#6B6861] mt-0.5">
            Captación multicanal desde Meta Ads, scoring algorítmico con IA y seguimiento comercial directo.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              const csvContent = "data:text/csv;charset=utf-8," + ["Nombre,Empresa,Email,Telefono,Canal,Presupuesto,Score"].concat(
                leads.map(l => `"${l.name}","${l.companyName || ''}","${l.email}","${l.phone}","${l.source}","${l.estimatedValue}","${l.qualification}"`)
              ).join("\n");
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement("a");
              link.setAttribute("href", encodedUri);
              link.setAttribute("download", `bunker_leads_${new Date().toISOString().slice(0,10)}.csv`);
              document.body.appendChild(link);
              link.click();
            }}
            className="px-3.5 py-2 rounded-2xl bg-white border border-[#ECEAE3] text-[#141414] hover:bg-[#FAF9F5] text-xs font-medium flex items-center gap-1.5 shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#8C887E]" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={() => setIsCreateOpen(true)}
            className="btn-black-gold rounded-2xl px-4 py-2 text-xs font-semibold flex items-center gap-2 shadow-xs"
          >
            <Plus className="w-4 h-4 text-[#E5C158]" />
            <span>+ Registrar Prospecto</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 bg-[#EBF5EE] border border-[#C2E2CC] rounded-2xl text-emerald-800 text-xs font-medium flex items-center gap-2 shadow-xs">
          <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* KPI Metric Strip Cards (Luxury Rounded Marfil) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Leads */}
        <div className="p-4 rounded-3xl bg-white border border-[#ECEAE3] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#8C887E]">
            <span className="text-xs font-medium">Total Prospectos</span>
            <div className="w-7 h-7 rounded-full bg-[#FAF0D7] border border-[#F2E5C4] flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-[#9A7320]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#141414] tracking-tight">{totalLeadsCount}</div>
          <div className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            <span>Captación activa multicanal</span>
          </div>
        </div>

        {/* Calificados con IA */}
        <div className="p-4 rounded-3xl bg-white border border-[#ECEAE3] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#8C887E]">
            <span className="text-xs font-medium">Calificados por IA (≥70)</span>
            <div className="w-7 h-7 rounded-full bg-[#EBF5EE] border border-[#C2E2CC] flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#141414] tracking-tight">{qualifiedCount}</div>
          <div className="text-[11px] text-[#6B6861]">
            Alta probabilidad de cierre comercial
          </div>
        </div>

        {/* Pipeline Estimado */}
        <div className="p-4 rounded-3xl bg-white border border-[#ECEAE3] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#8C887E]">
            <span className="text-xs font-medium">Pipeline Proyectado</span>
            <div className="w-7 h-7 rounded-full bg-[#FAF9F5] border border-[#ECEAE3] flex items-center justify-center">
              <DollarSign className="w-3.5 h-3.5 text-[#141414]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#141414] tracking-tight">
            ${totalPipelineVal.toLocaleString()} <span className="text-xs font-normal text-[#8C887E]">MXN</span>
          </div>
          <div className="text-[11px] text-[#9A7320] font-medium">
            Presupuesto estimado de pautas
          </div>
        </div>

        {/* Tasa de Conversión */}
        <div className="p-4 rounded-3xl bg-white border border-[#ECEAE3] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[#8C887E]">
            <span className="text-xs font-medium">Tasa de Conversión</span>
            <div className="w-7 h-7 rounded-full bg-[#FAF9F5] border border-[#ECEAE3] flex items-center justify-center">
              <Flame className="w-3.5 h-3.5 text-[#D97757]" />
            </div>
          </div>
          <div className="text-2xl font-bold text-[#141414] tracking-tight">{conversionRate}%</div>
          <div className="text-[11px] text-[#6B6861]">
            Leads convertidos a clientes activos
          </div>
        </div>
      </div>

      {/* Unified Filter & Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-[#ECEAE3] shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Search */}
          <div className="relative w-full lg:w-96">
            <Search className="w-3.5 h-3.5 text-[#8C887E] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, correo, empresa o teléfono..."
              className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-2xl pl-9 pr-4 py-2 text-xs text-[#141414] placeholder-[#8C887E] focus:outline-none focus:border-[#D4AF37]/70 transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            {/* Status Selector */}
            <div className="flex items-center gap-1 bg-[#F6F5F2] p-1 rounded-2xl border border-[#ECEAE3] text-xs">
              <span className="text-[11px] text-[#8C887E] px-2 font-medium">Estado:</span>
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
                      ? "bg-white text-[#141414] font-bold shadow-xs"
                      : "text-[#6B6861] hover:text-[#141414]"
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
              className="bg-[#F6F5F2] border border-[#ECEAE3] rounded-2xl px-3 py-1.5 text-xs text-[#141414] focus:outline-none font-medium"
            >
              <option value="all">Todos los Canales</option>
              <option value="meta_ads">Meta Ads (Instagram / FB)</option>
              <option value="google_ads">Google Ads</option>
              <option value="referral">Recomendación</option>
              <option value="website">Formulario Web</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Leads Table (Designed like Reference UI) */}
      <div className="bg-white rounded-3xl border border-[#ECEAE3] shadow-xs overflow-hidden">
        <div className="p-4 border-b border-[#F4F3EE] flex items-center justify-between bg-[#FDFDFC]">
          <div className="text-xs font-bold text-[#141414]">
            Directorio de Prospectos <span className="text-[#8C887E] font-normal">({leads.length})</span>
          </div>
          <div className="text-[11px] text-[#8C887E]">
            Conectado a PostgreSQL Supabase Cloud
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F4F3EE] text-[11px] font-semibold text-[#8C887E]">
                <th className="py-3.5 px-4 font-semibold">Prospecto / Empresa</th>
                <th className="py-3.5 px-4 font-semibold">Contacto & WhatsApp</th>
                <th className="py-3.5 px-4 font-semibold">Canal</th>
                <th className="py-3.5 px-4 font-semibold">Scoring IA</th>
                <th className="py-3.5 px-4 font-semibold">Presupuesto</th>
                <th className="py-3.5 px-4 font-semibold">Estado</th>
                <th className="py-3.5 px-4 text-right font-semibold">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F3EE]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8C887E] text-xs">
                    Cargando prospectos en tiempo real...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#8C887E] text-xs">
                    No se encontraron prospectos con los filtros actuales.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const initials = lead.name
                    ? lead.name
                        .split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("")
                    : "LD";

                  const score = lead.qualification || 75;
                  const waNumber = cleanPhoneForWa(lead.phone);

                  return (
                    <tr
                      key={lead.id}
                      className="hover:bg-[#FAF9F5] transition-colors group"
                    >
                      {/* Profile / Company */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#141414] text-[#FAF8F3] border border-[#D4AF37]/40 flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {initials}
                          </div>
                          <div>
                            <div className="font-bold text-[#141414] flex items-center gap-1.5 leading-tight">
                              <span>{lead.name}</span>
                              {lead.isDemo && (
                                <span className="text-[9px] bg-[#FAF0D7] text-[#9A7320] font-bold px-1.5 py-0.2 rounded-md border border-[#F2E5C4]">
                                  DEMO
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-[#6B6861] flex items-center gap-1.5 mt-0.5">
                              <Building className="w-3 h-3 text-[#8C887E]" />
                              <span>{lead.companyName || "Sin empresa especificada"}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contact & Direct WhatsApp Link */}
                      <td className="py-3.5 px-4 text-[11px]">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-[#141414] font-medium">
                            <Mail className="w-3 h-3 text-[#8C887E] flex-shrink-0" />
                            <a href={`mailto:${lead.email}`} className="hover:underline truncate max-w-[170px]">
                              {lead.email}
                            </a>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[#6B6861] font-mono">{lead.phone || "Sin teléfono"}</span>
                            {waNumber && (
                              <a
                                href={`https://wa.me/${waNumber}?text=${encodeURIComponent(`Hola ${lead.name}, te escribo de Bunker Agency para dar seguimiento a tu requerimiento comercial.`)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#EBF5EE] text-emerald-800 border border-[#C2E2CC] hover:bg-emerald-100 transition-colors text-[10px] font-semibold"
                                title="Abrir chat en WhatsApp"
                              >
                                <MessageCircle className="w-2.5 h-2.5 text-emerald-600" />
                                <span>WhatsApp</span>
                              </a>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Channel / Source */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                          lead.source === "meta_ads" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                          lead.source === "google_ads" ? "bg-blue-50 text-blue-700 border-blue-200" :
                          lead.source === "referral" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-stone-50 text-stone-700 border-stone-200"
                        }`}>
                          {lead.source.replace("_", " ")}
                        </span>
                      </td>

                      {/* AI Scoring */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${
                              score >= 80 ? "bg-[#EBF5EE] text-emerald-800 border-[#C2E2CC]" :
                              score >= 60 ? "bg-[#FAF0D7] text-[#9A7320] border-[#F2E5C4]" :
                              "bg-[#FEE2E2] text-red-800 border-[#FECACA]"
                            }`}>
                              {score}/100
                            </span>
                          </div>
                          {lead.aiSummary && (
                            <p className="text-[10px] text-[#6B6861] line-clamp-1 max-w-xs">
                              {lead.aiSummary}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Budget */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-[#141414]">
                          ${lead.estimatedValue?.toLocaleString() || 0}
                        </div>
                        <div className="text-[10px] text-[#8C887E]">MXN / mes</div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase border ${
                          lead.status === "qualified" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                          lead.status === "contacted" ? "bg-blue-50 text-blue-700 border-blue-200" :
                          lead.status === "converted" ? "bg-purple-50 text-purple-700 border-purple-200" :
                          "bg-stone-100 text-stone-700 border-stone-200"
                        }`}>
                          {lead.status === "qualified" ? "Calificado" :
                           lead.status === "contacted" ? "Contactado" :
                           lead.status === "converted" ? "Convertido" : "Nuevo"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {lead.status !== "converted" && (
                            <button
                              onClick={() => handleConvert(lead.id)}
                              className="btn-black-gold rounded-xl px-2.5 py-1 text-[11px] font-semibold flex items-center gap-1 shadow-xs"
                              title="Convertir a Cliente y crear Negocio"
                            >
                              <ArrowRightCircle className="w-3 h-3 text-[#E5C158]" />
                              <span>Convertir</span>
                            </button>
                          )}

                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="p-1.5 rounded-xl bg-[#F6F5F2] hover:bg-white text-[#6B6861] hover:text-[#141414] border border-[#ECEAE3] transition-colors"
                            title="Ver Ficha Completa"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="p-1.5 rounded-xl text-[#8C887E] hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Eliminar prospecto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Registrar Prospecto */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#ECEAE3] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#ECEAE3] flex items-center justify-between bg-[#FDFDFC]">
              <div>
                <h2 className="text-base font-serif font-bold text-[#141414] flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#D4AF37]" />
                  Registrar Nuevo Prospecto
                </h2>
                <p className="text-[11px] text-[#6B6861] mt-0.5">
                  Los datos se guardan directamente en Supabase PostgreSQL.
                </p>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-[#8C887E] hover:text-[#141414] p-1 rounded-xl hover:bg-[#F6F5F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Lic. Roberto Mendoza"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">Empresa / Negocio</label>
                <input
                  type="text"
                  placeholder="ej. Inmobiliaria Premier o Marca de Ropa"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="+52 55 1234 5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">Canal de Origen</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="meta_ads">Meta Ads (Instagram / FB)</option>
                    <option value="google_ads">Google Ads</option>
                    <option value="referral">Recomendación</option>
                    <option value="website">Formulario Web</option>
                    <option value="manual">Prospección Directa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">Presupuesto ($ MXN)</label>
                  <input
                    type="number"
                    value={formData.estimatedValue}
                    onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">Requerimientos o Notas</label>
                <textarea
                  rows={2}
                  placeholder="ej. Quiere pauta de reels para captar citas de ortodoncia..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
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
                  disabled={submitting}
                  className="btn-black-gold rounded-2xl px-5 py-2 text-xs font-semibold shadow-xs"
                >
                  {submitting ? "Guardando..." : "Guardar Prospecto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ficha Detallada del Prospecto */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white border border-[#ECEAE3] rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-[#F4F3EE]">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-[#141414] text-[#E5C158] border border-[#D4AF37]/50 flex items-center justify-center font-bold text-sm">
                  {selectedLead.name ? selectedLead.name.slice(0, 2).toUpperCase() : "LD"}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#141414]">{selectedLead.name}</h3>
                  <div className="text-xs text-[#6B6861] flex items-center gap-1.5 mt-0.5">
                    <Building className="w-3 h-3 text-[#8C887E]" />
                    <span>{selectedLead.companyName || "Sin empresa"}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedLead(null)}
                className="text-[#8C887E] hover:text-[#141414] p-1 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-[#F6F5F2] rounded-2xl border border-[#ECEAE3] space-y-1">
                <div className="text-[10px] text-[#8C887E] font-medium uppercase">Canal de Captación</div>
                <div className="font-bold text-[#141414] uppercase">{selectedLead.source}</div>
              </div>
              <div className="p-3 bg-[#F6F5F2] rounded-2xl border border-[#ECEAE3] space-y-1">
                <div className="text-[10px] text-[#8C887E] font-medium uppercase">Presupuesto Estimado</div>
                <div className="font-bold text-[#141414]">${selectedLead.estimatedValue?.toLocaleString()} MXN</div>
              </div>
            </div>

            <div className="p-4 bg-[#FAF0D7]/40 rounded-2xl border border-[#F2E5C4] space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#9A7320] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#9A7320]" />
                  Evaluación Algorítmica Bunker AI
                </span>
                <span className="text-xs font-bold bg-white text-[#9A7320] px-2 py-0.5 rounded-full border border-[#F2E5C4]">
                  {selectedLead.qualification || 75}/100
                </span>
              </div>
              <p className="text-xs text-[#6B6861] leading-relaxed pt-1">
                {selectedLead.aiSummary || "Prospecto calificado con potencial positivo para campaña publicitaria y embudo de conversión."}
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              {cleanPhoneForWa(selectedLead.phone) && (
                <a
                  href={`https://wa.me/${cleanPhoneForWa(selectedLead.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-2xl bg-[#EBF5EE] text-emerald-800 border border-[#C2E2CC] text-xs font-semibold flex items-center gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Chatear en WhatsApp</span>
                </a>
              )}

              <button
                onClick={() => {
                  const leadId = selectedLead.id;
                  setSelectedLead(null);
                  handleConvert(leadId);
                }}
                className="btn-black-gold rounded-2xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5"
              >
                <ArrowRightCircle className="w-3.5 h-3.5 text-[#E5C158]" />
                <span>Convertir a Cliente</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
