"use client";

import React, { useState, useEffect } from "react";
import {
  Users,
  Plus,
  Search,
  Filter,
  Trash2,
  Sparkles,
  ArrowRightCircle,
  Phone,
  Mail,
  Building,
  DollarSign,
  X,
  CheckCircle,
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
  });
  const [submitting, setSubmitting] = useState(false);

  // Conversion toast / state
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
        setFeedback("¡Prospecto creado exitosamente en la base de datos!");
        setTimeout(() => setFeedback(null), 4000);
        fetchLeads();
      } else {
        alert(json.error);
      }
    } catch (e: any) {
      alert("Error al crear lead: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConvert = async (leadId: string) => {
    if (!confirm("¿Deseas convertir este lead en Cliente y crear una oportunidad en el Pipeline de ventas?")) return;

    try {
      const res = await fetch(`/api/leads/${leadId}/convert`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setFeedback("¡Lead convertido exitosamente a Cliente y registrado en el Pipeline!");
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
    if (!confirm("¿Eliminar lógicamente este lead?")) return;

    try {
      const res = await fetch(`/api/leads?id=${leadId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchLeads();
      }
    } catch (e: any) {
      alert("Error al eliminar: " + e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-bunker-400" />
            Gestión de Leads & Prospectos
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Captación multicanal, calificación inteligente y conversión a clientes comerciales.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-bunker-600 hover:bg-bunker-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-bunker-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nuevo Lead</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {feedback}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-4 rounded-xl bg-[#0c111e] border border-[#1b2538] flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, correo, empresa..."
            className="w-full bg-[#121929] border border-[#222f47] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bunker-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Filter className="w-3.5 h-3.5" />
            <span>Estado:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-[#121929] border border-[#222f47] rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
            >
              <option value="all">Todos los estados</option>
              <option value="new">Nuevo</option>
              <option value="contacted">Contactado</option>
              <option value="qualified">Calificado</option>
              <option value="converted">Convertido</option>
              <option value="lost">Perdido</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <span>Canal:</span>
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value)}
              className="bg-[#121929] border border-[#222f47] rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
            >
              <option value="all">Todos los canales</option>
              <option value="meta_ads">Meta Ads</option>
              <option value="google_ads">Google Ads</option>
              <option value="referral">Recomendación</option>
              <option value="website">Formulario Web</option>
            </select>
          </div>
        </div>
      </div>

      {/* Leads Table */}
      <div className="rounded-2xl bg-[#0c111e] border border-[#1b2538] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-[#090d16] border-b border-[#1b2538] text-gray-400 font-semibold">
                <th className="py-3 px-4">Prospecto / Contacto</th>
                <th className="py-3 px-4">Canal</th>
                <th className="py-3 px-4">Puntaje IA</th>
                <th className="py-3 px-4">Presupuesto Estimado</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#162033]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    Cargando prospectos...
                  </td>
                </tr>
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-gray-500">
                    No se encontraron leads con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-[#111827]/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{lead.name}</span>
                        {lead.isDemo && (
                          <span className="text-[9px] bg-amber-500/10 text-amber-400 font-semibold px-1.5 py-0.5 rounded border border-amber-500/20">
                            DEMO
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-gray-400 flex items-center gap-1.5 mt-0.5">
                        <Building className="w-3 h-3 text-gray-500" />
                        <span>{lead.companyName || "Sin empresa"}</span>
                      </div>
                      <div className="text-[10px] text-gray-500 flex items-center gap-3 mt-1">
                        {lead.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {lead.email}
                          </span>
                        )}
                        {lead.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {lead.phone}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#162033] text-gray-300">
                        {lead.source.replace("_", " ").toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          {lead.qualification}/100
                        </span>
                      </div>
                      {lead.aiSummary && (
                        <p className="text-[10px] text-gray-400 line-clamp-1 max-w-xs mt-1">
                          {lead.aiSummary}
                        </p>
                      )}
                    </td>

                    <td className="py-3 px-4 font-bold text-white">
                      ${lead.estimatedValue?.toLocaleString() || 0} MXN
                    </td>

                    <td className="py-3 px-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        lead.status === "qualified" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                        lead.status === "contacted" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                        lead.status === "converted" ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" :
                        "bg-gray-500/10 text-gray-300 border border-gray-500/20"
                      }`}>
                        {lead.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {lead.status !== "converted" && (
                          <button
                            onClick={() => handleConvert(lead.id)}
                            className="p-1.5 rounded-lg bg-bunker-600/20 hover:bg-bunker-600/40 text-bunker-300 hover:text-white transition-all text-[11px] font-semibold flex items-center gap-1"
                            title="Convertir a Cliente y crear Negocio"
                          >
                            <ArrowRightCircle className="w-3.5 h-3.5" />
                            <span>Convertir</span>
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(lead.id)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Eliminar registro lógicamente"
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

      {/* Create Lead Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0b101d] border border-[#23314d] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#1c263c] flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-bunker-400" />
                Registrar Nuevo Prospecto
              </h2>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Lic. Roberto Mendoza"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Empresa / Negocio</label>
                <input
                  type="text"
                  placeholder="ej. Inmobiliaria Premier"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="contacto@empresa.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Teléfono / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="+52 55 1234 5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Canal de Captación</label>
                  <select
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                  >
                    <option value="meta_ads">Meta Ads (Instagram / FB)</option>
                    <option value="google_ads">Google Ads</option>
                    <option value="referral">Recomendación</option>
                    <option value="website">Formulario Web</option>
                    <option value="manual">Prospección en Frío</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Presupuesto Estimado ($ MXN)</label>
                  <input
                    type="number"
                    value={formData.estimatedValue}
                    onChange={(e) => setFormData({ ...formData, estimatedValue: e.target.value })}
                    className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-2 rounded-lg bg-[#141d30] border border-[#23314d] text-gray-300 hover:text-white text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-bunker-600 hover:bg-bunker-500 text-white text-xs font-semibold shadow-md"
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
