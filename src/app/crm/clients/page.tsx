"use client";

import React, { useState, useEffect } from "react";
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
} from "lucide-react";

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
  });

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append("search", search);

      const res = await fetch(`/api/clients?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setClients(json.clients);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/clients", {
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
          website: "",
          industry: "Bienes Raíces",
          revenue: "3000",
          notes: "",
        });
        setFeedback("¡Cliente comercial registrado con éxito!");
        setTimeout(() => setFeedback(null), 4000);
        fetchClients();
      } else {
        alert(json.error);
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Eliminar lógicamente este cliente?")) return;
    try {
      const res = await fetch(`/api/clients?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        fetchClients();
      }
    } catch (e: any) {
      alert("Error: " + e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-[#E8E6DF]">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#1F1E1D] tracking-tight">
            Clientes de la Agencia
          </h1>
          <p className="text-xs text-[#716F6A] mt-1 max-w-xl">
            Empresas con servicios activos de marketing digital, pautas publicitarias y embudos comerciales.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="btn-black-gold rounded-2xl px-4 py-2 text-xs font-semibold flex items-center gap-2"
        >
          <Plus className="w-4 h-4 text-[#E5C158]" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          {feedback}
        </div>
      )}

      {/* Search Bar */}
      <div className="p-3.5 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] flex items-center justify-between shadow-sm">
        <div className="relative w-full md:w-80">
          <Search className="w-3.5 h-3.5 text-[#9C9890] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, sector o empresa..."
            className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl pl-9 pr-3 py-1.5 text-xs text-[#1F1E1D] placeholder-[#9C9890] focus:outline-none focus:border-[#D97757]"
          />
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-[#9C9890] text-xs">
            Cargando clientes...
          </div>
        ) : clients.length === 0 ? (
          <div className="col-span-full py-12 text-center text-[#9C9890] text-xs">
            No se encontraron clientes registrados.
          </div>
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              className="p-5 rounded-2xl bg-[#FFFFFF] border border-[#E8E6DF] shadow-sm hover:border-[#DDD9CF] transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-serif font-bold text-[#1F1E1D] text-sm">{client.name}</h3>
                    <div className="text-[11px] text-[#716F6A] flex items-center gap-1 mt-0.5">
                      <Building className="w-3 h-3 text-[#9C9890]" />
                      <span>{client.industry || "General"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {client.isDemo && (
                      <span className="text-[9px] bg-[#FBF1ED] text-[#C15F3C] font-semibold px-1.5 py-0.2 rounded border border-[#F3D6CB]">
                        DEMO
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      ACTIVO
                    </span>
                  </div>
                </div>

                {client.notes && (
                  <p className="text-[11px] text-[#716F6A] mt-3 p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] leading-relaxed">
                    {client.notes}
                  </p>
                )}

                <div className="mt-3 space-y-1.5 text-[11px] text-[#716F6A]">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-[#9C9890]" />
                      <span>{client.email}</span>
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
                      <a href={client.website} target="_blank" rel="noreferrer" className="text-[#D97757] hover:underline">
                        {client.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[#F0EEE6] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-[#9C9890] block uppercase font-medium">Facturación</span>
                  <span className="text-xs font-bold text-[#1F1E1D]">
                    ${client.revenue?.toLocaleString() || 0} USD
                  </span>
                </div>

                <button
                  onClick={() => handleDelete(client.id)}
                  className="p-1 rounded-lg text-[#9C9890] hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Eliminar cliente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
          <div className="bg-[#FFFFFF] border border-[#E8E6DF] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#E8E6DF] flex items-center justify-between bg-[#FAF9F5]">
              <h2 className="text-sm font-serif font-bold text-[#1F1E1D] flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-600" />
                Registrar Nuevo Cliente
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-[#716F6A] hover:text-[#1F1E1D]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Nombre Comercial *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Grupo Dental Smile"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Sector / Industria</label>
                  <input
                    type="text"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Valor Contratado ($ USD)</label>
                  <input
                    type="number"
                    value={formData.revenue}
                    onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
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
                  <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Teléfono Principal</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Sitio Web</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1F1E1D] mb-1">Notas Comerciales</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#FFFFFF] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                />
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
                  className="btn-black-gold rounded-xl px-4 py-2 text-xs font-semibold"
                >
                  {submitting ? "Guardando..." : "Guardar Cliente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
