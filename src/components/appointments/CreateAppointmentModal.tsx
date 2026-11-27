"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Calendar,
  User,
  Phone,
  Building2,
  Check,
  Loader2,
} from "lucide-react";
import {
  APPOINTMENT_DURATION_OPTIONS,
  APPOINTMENT_LOCATION,
  APPOINTMENT_LOCATION_LABELS,
  APPOINTMENT_SLOT_MINUTES,
  type AppointmentLocation,
} from "@/lib/constants/appointments";
import type { CreateAppointmentInput } from "@/types/appointments";
import { useClientOptions } from "@/hooks/useClientOptions";

interface CreateAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (input: CreateAppointmentInput) => Promise<{ success: boolean; error?: string }>;
  initialLeadId?: string;
  initialLeadName?: string;
  initialLeadPhone?: string;
  initialClientId?: string;
  /** Fecha (YYYY-MM-DD) y hora (HH:mm) con las que abre, p. ej. al tocar un bloque libre del calendario. */
  initialDate?: string;
  initialTime?: string;
}

export function CreateAppointmentModal({
  isOpen,
  onClose,
  onSubmit,
  initialLeadId,
  initialLeadName,
  initialLeadPhone,
  initialClientId,
  initialDate,
  initialTime,
}: CreateAppointmentModalProps) {
  const clients = useClientOptions();

  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState(initialClientId || clients[0]?.id || "");
  const [customerName, setCustomerName] = useState(initialLeadName || "");
  const [customerPhone, setCustomerPhone] = useState(initialLeadPhone || "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [durationMinutes, setDurationMinutes] = useState<number>(APPOINTMENT_SLOT_MINUTES);
  const [locationType, setLocationType] = useState<AppointmentLocation>(APPOINTMENT_LOCATION.IN_STORE);
  const [locationAddress, setLocationAddress] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [sendConfirmationSms, setSendConfirmationSms] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    if (initialDate) setDate(initialDate);
    if (initialTime) setTime(initialTime);
  }, [isOpen, initialDate, initialTime]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Por favor ingresa un título o motivo para la cita.");
      return;
    }

    if (!date) {
      setError("Por favor selecciona una fecha.");
      return;
    }

    try {
      setLoading(true);
      const scheduledAt = new Date(`${date}T${time}:00`).toISOString();

      const res = await onSubmit({
        title: title.trim(),
        clientId: clientId || null,
        leadId: initialLeadId || null,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
        scheduledAt,
        durationMinutes,
        locationType,
        locationAddress: locationAddress.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
        sendConfirmationSms: sendConfirmationSms && Boolean(customerPhone.trim()),
      });

      if (!res.success) {
        throw new Error(res.error || "No se pudo agendar la cita.");
      }

      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] w-full max-w-xl p-6 sm:p-8 shadow-2xl space-y-6 my-8">
        {/* Cabecera */}
        <div className="flex items-center justify-between pb-4 border-b border-[#E2E5EB] dark:border-[#1F242D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#121417] dark:text-white">
                Agendar Nueva Cita
              </h2>
              <p className="text-xs text-[#8C929D] font-medium">
                Programa una visita o llamada comercial con recordatorios automáticos
              </p>
            </div>
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título de la cita */}
          <div>
            <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">
              Título / Motivo de la Cita <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej. Visita a Showroom - Muebles de Sala"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Empresa Cliente */}
          {clients.length > 0 && (
            <div>
              <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-amber-500" />
                <span>Empresa / Marca</span>
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Datos del Cliente / Prospecto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">
                Nombre del Cliente
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-xs focus:outline-hidden"
                />
                <User className="w-4 h-4 text-[#8C929D] absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">
                Teléfono (para SMS recordatorio)
              </label>
              <div className="relative">
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+1 (469) 778-3339"
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-xs focus:outline-hidden"
                />
                <Phone className="w-4 h-4 text-[#8C929D] absolute left-3 top-2.5 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Fecha y Hora */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">
                Fecha <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-xs focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">
                Hora
              </label>
              <input
                type="time"
                step={APPOINTMENT_SLOT_MINUTES * 60}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-xs focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">
                Duración
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-xs focus:outline-hidden"
              >
                {APPOINTMENT_DURATION_OPTIONS.map((option) => (
                  <option key={option.minutes} value={option.minutes}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tipo de Ubicación */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">
                Modalidad
              </label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value as AppointmentLocation)}
                className="w-full px-3.5 py-2 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-xs focus:outline-hidden"
              >
                {Object.entries(APPOINTMENT_LOCATION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">
                Dirección o Enlace
              </label>
              <input
                type="text"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="Ej. Showroom Principal Dallas"
                className="w-full px-3.5 py-2 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-xs focus:outline-hidden"
              />
            </div>
          </div>

          {/* Notas Internas */}
          <div>
            <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">
              Notas para el Asesor
            </label>
            <textarea
              rows={2}
              value={internalNotes}
              onChange={(e) => setInternalNotes(e.target.value)}
              placeholder="Indica detalles del producto de interés o requerimientos especiales..."
              className="w-full px-3.5 py-2 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-xs focus:outline-hidden resize-none"
            />
          </div>

          {/* Opción SMS Confirmación */}
          <div className="p-3 rounded-xl bg-[#F8F9FA] dark:bg-[#181B22] border border-[#E2E5EB] dark:border-[#242A35] flex items-center gap-3">
            <input
              type="checkbox"
              id="sendConfirmationSms"
              checked={sendConfirmationSms}
              onChange={(e) => setSendConfirmationSms(e.target.checked)}
              className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
            />
            <label
              htmlFor="sendConfirmationSms"
              className="text-xs text-[#475467] dark:text-[#94A3B8] cursor-pointer select-none"
            >
              Enviar confirmación inmediata por SMS y activar recordatorios automáticos (24h y 2h antes).
            </label>
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E2E5EB] dark:border-[#1F242D]">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-full text-xs font-bold text-[#8C929D] hover:text-[#121417] dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 rounded-full text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Programar Cita</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
