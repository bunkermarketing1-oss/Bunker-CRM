"use client";

import React, { useState } from "react";
import {
  X,
  Calendar,
  MapPin,
  Phone,
  Building2,
  Trash2,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Loader2,
} from "lucide-react";
import {
  APPOINTMENT_STATUS,
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_LOCATION_LABELS,
  type AppointmentStatus,
} from "@/lib/constants/appointments";
import type { AppointmentDto, UpdateAppointmentInput } from "@/types/appointments";

interface AppointmentDetailModalProps {
  appointment: AppointmentDto | null;
  onClose: () => void;
  onUpdate: (id: string, input: UpdateAppointmentInput) => Promise<{ success: boolean; error?: string }>;
  onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
}

export function AppointmentDetailModal({
  appointment,
  onClose,
  onUpdate,
  onDelete,
}: AppointmentDetailModalProps) {
  const [status, setStatus] = useState<AppointmentStatus>(
    appointment?.status || APPOINTMENT_STATUS.SCHEDULED
  );
  const [internalNotes, setInternalNotes] = useState(appointment?.internalNotes || "");
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!appointment) return null;

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    try {
      setUpdating(true);
      setError(null);
      const res = await onUpdate(appointment.id, { status: newStatus });
      if (!res.success) {
        throw new Error(res.error || "No se pudo actualizar el estado.");
      }
      setStatus(newStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar.");
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveNotes = async () => {
    try {
      setUpdating(true);
      setError(null);
      const res = await onUpdate(appointment.id, { internalNotes: internalNotes.trim() });
      if (!res.success) {
        throw new Error(res.error || "No se pudieron guardar las notas.");
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar notas.");
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta cita?")) return;
    try {
      setDeleting(true);
      const res = await onDelete(appointment.id);
      if (!res.success) {
        throw new Error(res.error || "No se pudo eliminar la cita.");
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar.");
    } finally {
      setDeleting(false);
    }
  };

  const scheduledDate = new Date(appointment.scheduledAt);
  const formattedDate = scheduledDate.toLocaleDateString("es-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = scheduledDate.toLocaleTimeString("es-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const statusConfig = APPOINTMENT_STATUS_LABELS[status];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] w-full max-w-lg p-6 sm:p-8 shadow-2xl space-y-6 my-8">
        {/* Cabecera */}
        <div className="flex items-start justify-between pb-4 border-b border-[#E2E5EB] dark:border-[#1F242D]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${statusConfig.bg} ${statusConfig.color}`}
              >
                {statusConfig.label}
              </span>
              {appointment.clientName && (
                <span className="text-[11px] font-medium text-[#8C929D] flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-amber-500" />
                  <span>{appointment.clientName}</span>
                </span>
              )}
            </div>
            <h2 className="text-xl font-black text-[#121417] dark:text-white">
              {appointment.title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[#E2E5EB] dark:border-[#242A35] flex items-center justify-center text-[#8C929D] hover:text-[#121417] dark:hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Detalles de Fecha y Modalidad */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-[#F8F9FA] dark:bg-[#181B22] border border-[#E2E5EB] dark:border-[#242A35] text-xs">
          <div className="space-y-1">
            <span className="text-[#8C929D] flex items-center gap-1 font-medium">
              <Calendar className="w-3.5 h-3.5 text-amber-500" />
              <span>Fecha & Hora</span>
            </span>
            <p className="font-bold text-[#121417] dark:text-white capitalize">
              {formattedDate}
            </p>
            <p className="text-[#8C929D]">
              {formattedTime} ({appointment.durationMinutes} min)
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[#8C929D] flex items-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-amber-500" />
              <span>Modalidad</span>
            </span>
            <p className="font-bold text-[#121417] dark:text-white">
              {APPOINTMENT_LOCATION_LABELS[appointment.locationType] || "Presencial"}
            </p>
            {appointment.locationAddress && (
              <p className="text-[#8C929D] truncate">{appointment.locationAddress}</p>
            )}
          </div>
        </div>

        {/* Datos del Cliente */}
        <div className="space-y-2 text-xs">
          <span className="font-bold text-[#121417] dark:text-white block">
            Datos del Prospecto / Cliente
          </span>
          <div className="p-3.5 rounded-xl border border-[#E2E5EB] dark:border-[#242A35] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#8C929D]">Nombre:</span>
              <span className="font-bold text-[#121417] dark:text-white">
                {appointment.customerName || appointment.leadName || "Sin nombre registrado"}
              </span>
            </div>
            {appointment.customerPhone && (
              <div className="flex items-center justify-between">
                <span className="text-[#8C929D]">Teléfono:</span>
                <span className="font-mono text-[#121417] dark:text-white flex items-center gap-1">
                  <Phone className="w-3 h-3 text-amber-500" />
                  <span>{appointment.customerPhone}</span>
                </span>
              </div>
            )}
            {appointment.customerEmail && (
              <div className="flex items-center justify-between">
                <span className="text-[#8C929D]">Correo:</span>
                <span className="text-[#121417] dark:text-white">
                  {appointment.customerEmail}
                </span>
              </div>
            )}
            {appointment.userName && (
              <div className="flex items-center justify-between pt-1 border-t border-[#E2E5EB] dark:border-[#242A35]">
                <span className="text-[#8C929D]">Asesor asignado:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {appointment.userName}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Acciones de Estado Rápido */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-[#121417] dark:text-white block">
            Cambiar Estado de la Cita
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <button
              type="button"
              disabled={updating}
              onClick={() => handleStatusChange(APPOINTMENT_STATUS.CONFIRMED)}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                status === APPOINTMENT_STATUS.CONFIRMED
                  ? "bg-blue-500 text-white border-blue-600 shadow-xs"
                  : "bg-white dark:bg-[#181B22] border-[#E2E5EB] dark:border-[#242A35] text-[#121417] dark:text-white hover:border-blue-500"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Confirmar</span>
            </button>

            <button
              type="button"
              disabled={updating}
              onClick={() => handleStatusChange(APPOINTMENT_STATUS.COMPLETED)}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                status === APPOINTMENT_STATUS.COMPLETED
                  ? "bg-emerald-500 text-white border-emerald-600 shadow-xs"
                  : "bg-white dark:bg-[#181B22] border-[#E2E5EB] dark:border-[#242A35] text-[#121417] dark:text-white hover:border-emerald-500"
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Completada</span>
            </button>

            <button
              type="button"
              disabled={updating}
              onClick={() => handleStatusChange(APPOINTMENT_STATUS.NO_SHOW)}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                status === APPOINTMENT_STATUS.NO_SHOW
                  ? "bg-rose-500 text-white border-rose-600 shadow-xs"
                  : "bg-white dark:bg-[#181B22] border-[#E2E5EB] dark:border-[#242A35] text-[#121417] dark:text-white hover:border-rose-500"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>No Asistió</span>
            </button>

            <button
              type="button"
              disabled={updating}
              onClick={() => handleStatusChange(APPOINTMENT_STATUS.CANCELLED)}
              className={`py-2 px-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1 transition-all cursor-pointer ${
                status === APPOINTMENT_STATUS.CANCELLED
                  ? "bg-slate-600 text-white border-slate-700 shadow-xs"
                  : "bg-white dark:bg-[#181B22] border-[#E2E5EB] dark:border-[#242A35] text-[#121417] dark:text-white hover:border-slate-500"
              }`}
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancelar</span>
            </button>
          </div>
        </div>

        {/* Notas Internas */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-[#121417] dark:text-white">
            Notas del Asesor
          </label>
          <textarea
            rows={2}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Añade notas del resultado de la cita o detalles de seguimiento..."
            className="w-full px-3.5 py-2 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-xs focus:outline-hidden resize-none"
          />
        </div>

        {/* Pie y acciones */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E2E5EB] dark:border-[#1F242D]">
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar Cita</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-xs font-bold text-[#8C929D] hover:text-[#121417] dark:hover:text-white transition-colors cursor-pointer"
            >
              Cerrar
            </button>
            <button
              type="button"
              onClick={handleSaveNotes}
              disabled={updating}
              className="px-5 py-2 rounded-full text-xs font-bold bg-[#121417] text-white dark:bg-white dark:text-[#121417] hover:opacity-90 shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Guardar Notas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
