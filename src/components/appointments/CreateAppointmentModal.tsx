"use client";

import React, { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import {
  APPOINTMENT_DURATION_OPTIONS,
  APPOINTMENT_LOCATION,
  APPOINTMENT_LOCATION_LABELS,
  APPOINTMENT_SLOT_MINUTES,
  type AppointmentLocation,
} from "@/lib/constants/appointments";
import type { CreateAppointmentInput } from "@/types/appointments";
import { useClientOptions } from "@/hooks/useClientOptions";
import { Modal } from "@/components/ui/Modal";

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
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Nueva cita"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 rounded-full text-xs font-bold text-[#667085] hover:text-[#121417] dark:hover:text-white transition-colors cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="appointment-form"
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
                <span>Programar cita</span>
              </>
            )}
          </button>
        </>
      }
    >
      <form id="appointment-form" onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs">
            {error}
          </div>
        )}

        <Field label="Motivo de la cita" required>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ej. Llamada de seguimiento"
            className={INPUT_CLASS}
          />
        </Field>

        <Section title="Cuándo">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Fecha" required>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={INPUT_CLASS} />
            </Field>
            <Field label="Hora">
              <input
                type="time"
                step={APPOINTMENT_SLOT_MINUTES * 60}
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Duración">
              <select value={durationMinutes} onChange={(e) => setDurationMinutes(Number(e.target.value))} className={INPUT_CLASS}>
                {APPOINTMENT_DURATION_OPTIONS.map((option) => (
                  <option key={option.minutes} value={option.minutes}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Section>

        <Section title="Cliente">
          {clients.length > 0 && (
            <Field label="Empresa / marca">
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className={INPUT_CLASS}>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Nombre">
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Ej. Carlos Mendoza"
                className={INPUT_CLASS}
              />
            </Field>
            <Field label="Teléfono">
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+1 (469) 778-3339"
                className={INPUT_CLASS}
              />
            </Field>
          </div>
        </Section>

        <Section title="Lugar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Modalidad">
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value as AppointmentLocation)}
                className={INPUT_CLASS}
              >
                {Object.entries(APPOINTMENT_LOCATION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Dirección o enlace">
              <input
                type="text"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                placeholder="Ej. Showroom Dallas o enlace de la llamada"
                className={INPUT_CLASS}
              />
            </Field>
          </div>
        </Section>

        <Field label="Notas para el asesor">
          <textarea
            rows={2}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
            placeholder="Producto de interés o requerimientos especiales…"
            className={`${INPUT_CLASS} resize-none`}
          />
        </Field>

        {/* El SMS solo tiene sentido si hay un teléfono al que mandarlo. */}
        {customerPhone.trim() && (
          <label className="flex items-start gap-3 p-3 rounded-xl bg-[#F8F9FA] dark:bg-[#181B22] border border-[#E2E5EB] dark:border-[#242A35] text-xs text-[#475467] dark:text-[#94A3B8] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={sendConfirmationSms}
              onChange={(e) => setSendConfirmationSms(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded accent-amber-500 cursor-pointer"
            />
            <span>Enviar confirmación por SMS y recordatorios automáticos (24 h y 2 h antes).</span>
          </label>
        )}
      </form>
    </Modal>
  );
}

const INPUT_CLASS =
  "w-full px-3.5 py-2.5 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/40";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-bold text-[#121417] dark:text-white mb-1.5">
        {label}
        {required && <span className="text-rose-500"> *</span>}
      </label>
      {children}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#8C929D] pb-1 border-b border-[#E2E5EB] dark:border-[#1F242D]">
        {title}
      </p>
      {children}
    </div>
  );
}
