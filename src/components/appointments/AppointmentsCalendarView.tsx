"use client";

import React, { useState, useMemo } from "react";
import {
  Calendar,
  Clock,
  Plus,
  Search,
  Building2,
  User,
  Phone,
  MapPin,
  CheckCircle2,
  Link as LinkIcon,
  Check,
  RefreshCw,
  ChevronRight,
} from "lucide-react";
import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_LOCATION_LABELS,
} from "@/lib/constants/appointments";
import type { AppointmentDto } from "@/types/appointments";
import { useAppointments } from "@/hooks/useAppointments";
import { useClientOptions } from "@/hooks/useClientOptions";
import { useAuth } from "@/context/AuthContext";
import { CreateAppointmentModal } from "./CreateAppointmentModal";
import { AppointmentDetailModal } from "./AppointmentDetailModal";

export function AppointmentsCalendarView() {
  const {
    appointments,
    stats,
    loading,
    refresh,
    create,
    update,
    remove,
  } = useAppointments();

  const clients = useClientOptions();
  const { user } = useAuth();

  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentDto | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      const q = search.toLowerCase().trim();
      const matchSearch =
        !q ||
        apt.title.toLowerCase().includes(q) ||
        apt.customerName?.toLowerCase().includes(q) ||
        apt.customerPhone?.toLowerCase().includes(q) ||
        apt.clientName?.toLowerCase().includes(q);

      const matchStatus = statusFilter === "all" || apt.status === statusFilter;
      const matchClient = clientFilter === "all" || apt.clientId === clientFilter;

      return matchSearch && matchStatus && matchClient;
    });
  }, [appointments, search, statusFilter, clientFilter]);

  // Enlace personal: la agenda que ve el cliente es la de este vendedor (sus citas y sus bloqueos), no la de toda la empresa.
  const handleCopyBookingLink = (clientId: string) => {
    const personal = user?.id ? `?asesor=${user.id}` : "";
    navigator.clipboard.writeText(`${window.location.origin}/citas/${clientId}${personal}`);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Tarjetas de Estadísticas Orvion */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white dark:bg-[#121417] rounded-2xl sm:rounded-3xl border border-[#E2E5EB] dark:border-[#1F242D] p-4 sm:p-5 shadow-orvion">
          <div className="flex items-center justify-between text-xs font-semibold text-[#8C929D] mb-1">
            <span>Total Citas</span>
            <Calendar className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-[#121417] dark:text-white">
            {stats.total}
          </div>
          <p className="text-[10px] sm:text-xs text-[#8C929D] mt-1">Registradas en el CRM</p>
        </div>

        <div className="bg-white dark:bg-[#121417] rounded-2xl sm:rounded-3xl border border-[#E2E5EB] dark:border-[#1F242D] p-4 sm:p-5 shadow-orvion">
          <div className="flex items-center justify-between text-xs font-semibold text-[#8C929D] mb-1">
            <span>Próximas</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
            {stats.upcoming}
          </div>
          <p className="text-[10px] sm:text-xs text-[#8C929D] mt-1">Pendientes de atención</p>
        </div>

        <div className="bg-white dark:bg-[#121417] rounded-2xl sm:rounded-3xl border border-[#E2E5EB] dark:border-[#1F242D] p-4 sm:p-5 shadow-orvion">
          <div className="flex items-center justify-between text-xs font-semibold text-[#8C929D] mb-1">
            <span>Completadas</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
            {stats.completed}
          </div>
          <p className="text-[10px] sm:text-xs text-[#8C929D] mt-1">Atendidas con éxito</p>
        </div>

        <div className="bg-white dark:bg-[#121417] rounded-2xl sm:rounded-3xl border border-[#E2E5EB] dark:border-[#1F242D] p-4 sm:p-5 shadow-orvion">
          <div className="flex items-center justify-between text-xs font-semibold text-[#8C929D] mb-1">
            <span>Ausentismo</span>
            <span className="w-2 h-2 rounded-full bg-rose-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400">
            {stats.noShow}
          </div>
          <p className="text-[10px] sm:text-xs text-[#8C929D] mt-1">Canceladas / No-Show</p>
        </div>
      </div>

      {/* Barra de Filtros y Acciones */}
      <div className="bg-white dark:bg-[#121417] rounded-[24px] border border-[#E2E5EB] dark:border-[#1F242D] p-4 shadow-orvion flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por cliente, teléfono o título..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#E2E5EB] dark:border-[#242A35] bg-[#F8F9FA] dark:bg-[#181B22] text-[#121417] dark:text-white text-xs focus:outline-hidden"
            />
            <Search className="w-4 h-4 text-[#8C929D] absolute left-3 top-2.5 pointer-events-none" />
          </div>

          {/* Filtro de Estado */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-[#E2E5EB] dark:border-[#242A35] bg-[#F8F9FA] dark:bg-[#181B22] text-[#121417] dark:text-white text-xs font-medium focus:outline-hidden"
          >
            <option value="all">Todos los Estados</option>
            {Object.entries(APPOINTMENT_STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>

          {/* Filtro de Empresa */}
          {clients.length > 0 && (
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-[#E2E5EB] dark:border-[#242A35] bg-[#F8F9FA] dark:bg-[#181B22] text-[#121417] dark:text-white text-xs font-medium focus:outline-hidden"
            >
              <option value="all">Todas las Empresas</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="p-2 rounded-xl border border-[#E2E5EB] dark:border-[#242A35] text-[#8C929D] hover:text-[#121417] dark:hover:text-white transition-colors cursor-pointer"
            title="Refrescar citas"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>

        {/* Botones de Acción */}
        <div className="flex items-center gap-2">
          {clients.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const target = clients.find((c) => c.id === clientFilter) || clients[0];
                if (target) handleCopyBookingLink(target.id);
              }}
              className="px-3.5 py-2 rounded-full border border-[#E2E5EB] dark:border-[#242A35] text-xs font-bold text-[#121417] dark:text-white hover:bg-[#F8F9FA] dark:hover:bg-[#181B22] transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              {linkCopied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">¡Copiado!</span>
                </>
              ) : (
                <>
                  <LinkIcon className="w-3.5 h-3.5 text-amber-500" />
                  <span>Copiar mi enlace</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 rounded-full bg-amber-500 hover:bg-amber-600 text-black text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Cita</span>
          </button>
        </div>
      </div>

      {/* Lista de Citas */}
      <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs font-semibold text-[#8C929D] flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
            <span>Cargando agenda de citas...</span>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
              <Calendar className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-[#121417] dark:text-white">
              No hay citas programadas
            </h3>
            <p className="text-xs text-[#8C929D] max-w-sm mx-auto">
              {search || statusFilter !== "all" || clientFilter !== "all"
                ? "No se encontraron citas con los filtros seleccionados."
                : "Comienza programando tu primera cita o comparte tu enlace público de agendamiento con tus clientes."}
            </p>
            <button
              type="button"
              onClick={() => setIsCreateOpen(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Agendar Primera Cita</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-[#E2E5EB] dark:divide-[#1F242D]">
            {filteredAppointments.map((apt) => {
              const scheduledDate = new Date(apt.scheduledAt);
              const formattedDate = scheduledDate.toLocaleDateString("es-US", {
                weekday: "short",
                day: "numeric",
                month: "short",
              });
              const formattedTime = scheduledDate.toLocaleTimeString("es-US", {
                hour: "numeric",
                minute: "2-digit",
              });
              const statusCfg = APPOINTMENT_STATUS_LABELS[apt.status] || APPOINTMENT_STATUS_LABELS.scheduled;

              return (
                <div
                  key={apt.id}
                  onClick={() => setSelectedAppointment(apt)}
                  className="p-4 sm:p-5 hover:bg-[#F8F9FA] dark:hover:bg-[#16181F] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer group"
                >
                  <div className="flex items-start gap-4">
                    {/* Badge de Horario */}
                    <div className="w-16 h-16 rounded-2xl bg-[#F8F9FA] dark:bg-[#181B22] border border-[#E2E5EB] dark:border-[#242A35] flex flex-col items-center justify-center text-center shrink-0 group-hover:border-amber-500/50 transition-colors">
                      <span className="text-[10px] font-bold text-[#8C929D] uppercase">
                        {formattedDate}
                      </span>
                      <span className="text-xs font-black text-[#121417] dark:text-white">
                        {formattedTime}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusCfg.bg} ${statusCfg.color}`}
                        >
                          {statusCfg.label}
                        </span>
                        {apt.clientName && (
                          <span className="text-[10px] font-bold text-[#8C929D] flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-amber-500" />
                            <span>{apt.clientName}</span>
                          </span>
                        )}
                        <span className="text-[10px] text-[#8C929D] flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          <span>{APPOINTMENT_LOCATION_LABELS[apt.locationType] || "Presencial"}</span>
                        </span>
                      </div>

                      <h4 className="text-sm font-bold text-[#121417] dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {apt.title}
                      </h4>

                      <div className="flex items-center gap-3 text-xs text-[#8C929D] flex-wrap">
                        <span className="font-medium text-[#121417] dark:text-white flex items-center gap-1">
                          <User className="w-3 h-3" />
                          <span>{apt.customerName || apt.leadName || "Cliente"}</span>
                        </span>
                        {apt.customerPhone && (
                          <span className="font-mono flex items-center gap-1">
                            <Phone className="w-3 h-3 text-amber-500" />
                            <span>{apt.customerPhone}</span>
                          </span>
                        )}
                        {apt.userName && (
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold">
                            Asesor: {apt.userName}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-xs font-bold text-[#8C929D] group-hover:text-[#121417] dark:group-hover:text-white flex items-center gap-1">
                      <span>Ver detalles</span>
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de Creación */}
      <CreateAppointmentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={create}
      />

      {/* Modal de Detalle / Edición */}
      <AppointmentDetailModal
        appointment={selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        onUpdate={update}
        onDelete={remove}
      />
    </div>
  );
}
