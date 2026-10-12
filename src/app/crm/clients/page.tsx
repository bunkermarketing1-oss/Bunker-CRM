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
  DollarSign,
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
    revenue: "50000",
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
          revenue: "50000",
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
      alert("Error al eliminar: " + e.message);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-400" />
            Clientes de la Agencia
          </h1>
          <p className="text-xs text-gray-400 mt-0.5">
            Empresas con servicios activos de marketing digital, pautas publicitarias y automatizaciones.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-bunker-600 hover:bg-bunker-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-bunker-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Cliente</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          {feedback}
        </div>
      )}

      {/* Search Bar */}
      <div className="p-4 rounded-xl bg-[#0c111e] border border-[#1b2538] flex items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por cliente, empresa, sector..."
            className="w-full bg-[#121929] border border-[#222f47] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-bunker-500"
          />
        </div>
      </div>

      {/* Clients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full py-12 text-center text-gray-500 text-xs">
            Cargando clientes...
          </div>
        ) : clients.length === 0 ? (
          <div className="col-span-full py-12 text-center text-gray-500 text-xs">
            No se encontraron clientes registrados.
          </div>
        ) : (
          clients.map((client) => (
            <div
              key={client.id}
              className="p-5 rounded-2xl bg-[#0c111e] border border-[#1b2538] hover:border-[#283854] transition-all flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-sm">{client.name}</h3>
                    <div className="text-[11px] text-gray-400 flex items-center gap-1 mt-0.5">
                      <Building className="w-3 h-3 text-gray-500" />
                      <span>{client.industry || "General"}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {client.isDemo && (
                      <span className="text-[9px] bg-amber-500/10 text-amber-400 font-semibold px-1.5 py-0.5 rounded border border-amber-500/20">
                        DEMO
                      </span>
                    )}
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      ACTIVO
                    </span>
                  </div>
                </div>

                {client.notes && (
                  <p className="text-[11px] text-gray-300 mt-3 p-2.5 rounded-lg bg-[#111726] border border-[#1a2336] leading-relaxed">
                    {client.notes}
                  </p>
                )}

                <div className="mt-3 space-y-1.5 text-[11px] text-gray-400">
                  {client.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-gray-500" />
                      <span>{client.email}</span>
                    </div>
                  )}
                  {client.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-gray-500" />
                      <span>{client.phone}</span>
                    </div>
                  )}
                  {client.website && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-3.5 h-3.5 text-gray-500" />
                      <a href={client.website} target="_blank" rel="noreferrer" className="text-bunker-400 hover:underline">
                        {client.website}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-[#1a2336] flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-500 block uppercase font-semibold">Facturación / Valor</span>
                  <span className="text-xs font-bold text-white">
                    ${client.revenue?.toLocaleString() || 0} MXN
                  </span>
                </div>

                <button
                  onClick={() => handleDelete(client.id)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Eliminar cliente"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Client Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0b101d] border border-[#23314d] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-[#1c263c] flex items-center justify-between">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-emerald-400" />
                Registrar Nuevo Cliente
              </h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateClient} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Nombre Comercial / Razón Social *</label>
                <input
                  type="text"
                  required
                  placeholder="ej. Grupo Dental Smile"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Sector / Industria</label>
                  <input
                    type="text"
                    placeholder="ej. Salud, Bienes Raíces, SaaS"
                    value={formData.industry}
                    onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                    className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Valor Contratado ($ MXN)</label>
                  <input
                    type="number"
                    value={formData.revenue}
                    onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                    className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Correo Electrónico</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Teléfono Principal</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Sitio Web</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1">Notas Comerciales / Alcance</label>
                <textarea
                  rows={2}
                  placeholder="Detalles de la cuenta o campañas administradas..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
                />
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
                  className="px-4 py-2 rounded-lg bg-bunker-600 hover:bg-bunker-500 text-white text-xs font-semibold"
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
