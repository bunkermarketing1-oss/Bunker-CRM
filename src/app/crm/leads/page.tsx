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
} from "lucide-react";

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    companyName: "",
    email: "",
    phone: "",
    source: "meta_ads",
    estimatedValue: "45000",
  });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

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
        });
        setFeedback("¡Prospecto registrado exitosamente en Supabase!");
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
    if (!confirm("¿Deseas convertir este lead en Cliente y crear una oportunidad en el Pipeline?")) return;
    try {
      const res = await fetch(`/api/leads/${leadId}/convert`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setFeedback("¡Lead convertido con éxito a Cliente y Oportunidad en Pipeline!");
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
    if (!confirm("¿Eliminar lógicamente este prospecto?")) return;
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E8E6DF]">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1F1E1D] tracking-tight">
            Gestión de Leads & Prospectos
          </h1>
          <p className="text-xs text-[#716F6A] mt-1 max-w-xl">
            Captación multicanal, calificación algorítmica con IA y conversión a clientes activos de la agencia.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 rounded-xl bg-[#D97757] hover:bg-[#C15F3C] text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Prospecto</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          {feedback}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-[#9C9890] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, correo o empresa..."
            className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#1F1E1D] placeholder-[#9C9890] focus:outline-none focus:border-[#D97757]"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto text-xs text-[#716F6A]">
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5" />
            <span>Estado:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#FAF9F5] border border-[#E8E6DF] rounded-lg px-2 py-1 text-xs text-[#1F1E1D] focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="new">Nuevo</option>
              <option value="contacted">Contactado</option>
              <option value="qualified">Calificado</option>
              <option value="converted">Convertido</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span>Canal:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-[#FAF9F5] border border-[#E8E6DF] rounded-lg px-2 py-1 text-xs text-[#1F1E1D] focus:outline-none"
            >
              <option value="all">Todos</option>
              <option value="meta_ads">Meta Ads</option>
              <option value="google_ads">Google Ads</option>
              <option value="referral">Recomendación</option>
              <option value="website">Web</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#FAF9F5] border-b border-[#E8E6DF] text-[#716F6A] font-semibold">
                <th className="py-3.5 px-4 font-medium">Prospecto / Empresa</th>
                <th className="py-3.5 px-4 font-medium">Canal</th>
                <th className="py-3.5 px-4 font-medium">Score IA</th>
                <th className="py-3.5 px-4 font-medium">Presupuesto</th>
                <th className="py-3.5 px-4 font-medium">Estado</th>
                <th className="py-3.5 px-4 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F0EEE6]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#9C9890]">
                    Cargando prospectos...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#9C9890]">
                    No se encontraron prospectos con los filtros actuales.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#FAF9F5] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#1F1E1D]">{lead.name}</span>
                        {lead.isDemo && (
                          <span className="text-[9px] bg-[#FBF1ED] text-[#C15F3C] font-semibold px-1.5 py-0.2 rounded border border-[#F3D6CB]">
                            DEMO
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#716F6A] flex items-center gap-1.5 mt-0.5">
                        <Building className="w-3 h-3 text-[#9C9890]" />
                        <span>{lead.companyName || "Sin empresa"}</span>
                      </div>
                      <div className="text-[10px] text-[#9C9890] flex items-center gap-3 mt-1">
                        {lead.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {lead.email}</span>}
                        {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {lead.phone}</span>}
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-medium bg-[#F3F1EB] text-[#716F6A] border border-[#E8E6DF]">
                        {lead.source.replace("_", " ").toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {lead.qualification}/100
                      </span>
                      {lead.aiSummary && (
                        <p className="text-[10px] text-[#716F6A] line-clamp-1 max-w-xs mt-1">
                          {lead.aiSummary}
                        </p>
                      )}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-[#1F1E1D]">
                      ${lead.estimatedValue?.toLocaleString() || 0} MXN
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                        lead.status === "qualified" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                        lead.status === "contacted" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                        lead.status === "converted" ? "bg-purple-50 text-purple-700 border border-purple-200" :
                        "bg-stone-100 text-stone-700 border border-stone-200"
                      }`}>
                        {lead.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {lead.status !== "converted" && (
                          <button
                            onClick={() => handleConvert(lead.id)}
                            className="px-2 py-1 rounded-lg bg-[#FAF9F5] hover:bg-[#FBF1ED] text-[#C15F3C] border border-[#E8E6DF] text-[11px] font-semibold flex items-center gap-1 transition-all"
                            title="Convertir a Cliente y crear Negocio"
                          >
                            <ArrowRightCircle className="w-3.5 h-3.5" />
                            <span>Convertir</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-1 rounded-lg text-[#9C9890] hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Eliminar lógicamente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-[#FFFFFF] border border-[#E8E6DF] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#E8E6DF] flex items-center justify-between bg-[#FAF9F5]">
              <h2 className="text-sm font-serif font-bold text-[#1F1E1D] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#D97757]" />
                Registrar Nuevo Prospecto
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-[#716F6A] hover:text-[#1F1E1D]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Lic. Roberto Mendoza"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Empresa / Negocio</label>
                <input
                  type="text"
                  placeholder="ej. Inmobiliaria Premier"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Canal de Captación</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  >
                    <option value="meta_ads">Meta Ads (Instagram / FB)</option>
                    <option value="google_ads">Google Ads</option>
                    <option value="referral">Recomendación</option>
                    <option value="website">Formulario Web</option>
                    <option value="manual">Prospección en Frío</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Presupuesto Estimado ($ MXN)</label>
                  <input
                    type="number"
                    value={formData.estimatedValue}
                    onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-[#716F6A] hover:text-[#1F1E1D] text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 rounded-xl bg-[#D97757] hover:bg-[#C15F3C] text-white text-xs font-semibold shadow-sm"
                >
                  {submitting ? "Guardando..." : "Guardar Prospecto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
