"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  User,
  Mail,
  CheckCircle2,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Building2,
  ExternalLink,
} from "lucide-react";
import {
  APPOINTMENT_LOCATION,
  APPOINTMENT_LOCATION_LABELS,
  APPOINTMENT_SLOT_MINUTES,
  BOOKING_DAY_END,
  BOOKING_DAY_START,
} from "@/lib/constants/appointments";
import { buildDaySlots, isSlotTaken } from "@/lib/appointment-slots";
import type { PublicBookingClientInfo } from "@/types/appointments";
import { ROUTES } from "@/lib/constants/routes";

const TIME_SLOTS = buildDaySlots(BOOKING_DAY_START, BOOKING_DAY_END, APPOINTMENT_SLOT_MINUTES);

export default function PublicBookingPage({ params }: { params: { slug: string } }) {
  const [client, setClient] = useState<PublicBookingClientInfo | null>(null);
  const [advisorId, setAdvisorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerNotes, setCustomerNotes] = useState("");
  const [locationType, setLocationType] = useState<any>(APPOINTMENT_LOCATION.IN_STORE);
  const [consent, setConsent] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successAppointment, setSuccessAppointment] = useState<any | null>(null);

  useEffect(() => {
    async function loadClient() {
      try {
        setLoading(true);
        setError(null);
        // Enlace personal de un vendedor: /citas/<empresa>?asesor=<id>. Sin él, se usa la agenda de la empresa.
        const advisor = new URLSearchParams(window.location.search).get("asesor");
        setAdvisorId(advisor);
        const res = await fetch(`/api/public/booking/${params.slug}${advisor ? `?asesor=${encodeURIComponent(advisor)}` : ""}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "No se encontró la empresa solicitada.");
        }
        setClient(data.client);

        // Preseleccionar fecha de mañana
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        setSelectedDate(tomorrow.toISOString().split("T")[0]);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar la página de citas.");
      } finally {
        setLoading(false);
      }
    }
    loadClient();
  }, [params.slug]);

  // Un bloque no se puede elegir si ya pasó o si se traslapa con otra cita (se comparan instantes, no textos de hora).
  const isSlotUnavailable = (time: string) => {
    if (!client || !selectedDate) return false;
    const slotStart = new Date(`${selectedDate}T${time}:00`);
    return slotStart.getTime() <= Date.now() || isSlotTaken(slotStart, APPOINTMENT_SLOT_MINUTES, client.existingBookings);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!customerName.trim()) {
      setSubmitError("Por favor ingresa tu nombre completo.");
      return;
    }

    if (!customerPhone.trim()) {
      setSubmitError("Por favor ingresa tu número telefónico móvil.");
      return;
    }

    if (!selectedDate || !selectedTime) {
      setSubmitError("Por favor selecciona una fecha y horario para tu cita.");
      return;
    }

    try {
      setSubmitting(true);
      const scheduledAt = new Date(`${selectedDate}T${selectedTime}:00`).toISOString();

      const res = await fetch(`/api/public/booking/${params.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerEmail: customerEmail.trim() || undefined,
          scheduledAt,
          customerNotes: customerNotes.trim() || undefined,
          locationType,
          advisorId: client?.advisor ? advisorId : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al procesar la reserva.");
      }

      setSuccessAppointment(data.appointment);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error inesperado.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#ECEEF2] dark:bg-[#0C0D12] flex items-center justify-center p-4">
        <div className="p-8 rounded-3xl bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion text-center space-y-3">
          <Loader2 className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
          <p className="text-xs font-bold text-[#8C929D]">Cargando agenda de citas...</p>
        </div>
      </div>
    );
  }

  if (error || !client) {
    return (
      <div className="min-h-screen bg-[#ECEEF2] dark:bg-[#0C0D12] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-3xl bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-black text-[#121417] dark:text-white">
            Agenda No Disponible
          </h2>
          <p className="text-xs text-[#8C929D] leading-relaxed">
            {error || "La empresa solicitada no tiene habilitado el agendamiento público en este momento."}
          </p>
        </div>
      </div>
    );
  }

  // Fecha mínima: hoy
  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-[#ECEEF2] dark:bg-[#0C0D12] text-[#121417] dark:text-white py-10 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Cabecera de la Marca */}
        <div className="bg-white dark:bg-[#121417] rounded-[32px] border border-[#E2E5EB] dark:border-[#1F242D] p-8 shadow-orvion text-center space-y-3">
          {client.logoUrl ? (
            <div className="w-20 h-20 rounded-2xl overflow-hidden mx-auto border border-[#E2E5EB] dark:border-[#242A35] shadow-2xs">
              <Image
                src={client.logoUrl}
                alt={client.name}
                width={80}
                height={80}
                className="w-full h-full object-contain p-1"
              />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center mx-auto">
              <Building2 className="w-8 h-8" />
            </div>
          )}

          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{client.name}</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#121417] dark:text-white">
            {client.advisor ? `Agenda una llamada con ${client.advisor.name}` : client.bookingTitle}
          </h1>
          <p className="text-xs sm:text-sm text-[#8C929D] font-medium max-w-md mx-auto">
            {client.bookingNotice}
          </p>

          {client.phone && (
            <div className="pt-2 text-xs text-[#8C929D] flex items-center justify-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>{client.phone}</span>
            </div>
          )}
        </div>

        {/* Pantalla de Éxito o Formulario */}
        <div className="bg-white dark:bg-[#121417] rounded-[32px] border border-[#E2E5EB] dark:border-[#1F242D] p-6 sm:p-10 shadow-orvion">
          {successAppointment ? (
            <div className="text-center py-6 space-y-6">
              <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-[#121417] dark:text-white">
                  ¡Tu Cita ha sido Confirmada!
                </h2>
                <p className="text-xs sm:text-sm text-[#8C929D] max-w-md mx-auto">
                  Hemos reservado tu horario con éxito. Te enviamos los detalles a tu teléfono móvil por mensaje de texto.
                </p>
              </div>

              <div className="max-w-md mx-auto bg-[#F8F9FA] dark:bg-[#181B22] rounded-2xl p-5 border border-[#E2E5EB] dark:border-[#242A35] text-left space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#8C929D]">Fecha & Hora:</span>
                  <span className="font-bold text-[#121417] dark:text-white">
                    {new Date(successAppointment.scheduledAt).toLocaleString("es-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8C929D]">A nombre de:</span>
                  <span className="font-bold text-[#121417] dark:text-white">
                    {successAppointment.customerName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#8C929D]">Modalidad:</span>
                  <span className="text-[#121417] dark:text-white">
                    {APPOINTMENT_LOCATION_LABELS[successAppointment.locationType as keyof typeof APPOINTMENT_LOCATION_LABELS] || "Tienda / Showroom"}
                  </span>
                </div>
                {client.phone && (
                  <div className="pt-2 border-t border-[#E2E5EB] dark:border-[#242A35] flex items-start gap-2">
                    <Phone className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <span className="text-[#8C929D] font-mono">{client.phone}</span>
                  </div>
                )}
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 max-w-md mx-auto flex items-start gap-2 text-left">
                <Clock className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                <span>
                  Recibirás recordatorios automáticos por SMS 24 horas y 2 horas antes de tu cita. ¡Te esperamos!
                </span>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {submitError && (
                <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Paso 1: Selección de Fecha */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#121417] dark:text-white flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-amber-500" />
                  <span>1. Selecciona la Fecha</span>
                </label>
                <input
                  type="date"
                  min={todayStr}
                  required
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedTime("");
                  }}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
                />
              </div>

              {/* Paso 2: Selección de Horario */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#121417] dark:text-white flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>2. Horario disponible ({APPOINTMENT_SLOT_MINUTES} minutos)</span>
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {TIME_SLOTS.map((time) => {
                    const booked = isSlotUnavailable(time);
                    const isSelected = selectedTime === time;

                    return (
                      <button
                        key={time}
                        type="button"
                        disabled={booked}
                        onClick={() => setSelectedTime(time)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                          booked
                            ? "bg-[#F8F9FA] dark:bg-[#1A1D24] border-transparent text-[#8C929D] opacity-40 line-through cursor-not-allowed"
                            : isSelected
                            ? "bg-amber-500 text-black border-amber-600 shadow-md font-black"
                            : "bg-white dark:bg-[#181B22] border-[#E2E5EB] dark:border-[#242A35] text-[#121417] dark:text-white hover:border-amber-500"
                        }`}
                      >
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Paso 3: Modalidad */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-[#121417] dark:text-white flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-amber-500" />
                  <span>3. Modalidad de Atención</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLocationType(APPOINTMENT_LOCATION.IN_STORE)}
                    className={`p-3 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                      locationType === APPOINTMENT_LOCATION.IN_STORE
                        ? "bg-amber-500/10 border-amber-500 text-[#121417] dark:text-white shadow-xs"
                        : "bg-white dark:bg-[#181B22] border-[#E2E5EB] dark:border-[#242A35] text-[#8C929D]"
                    }`}
                  >
                    <span className="block font-black">🏢 Visita a Showroom / Tienda</span>
                    <span className="text-[10px] font-normal opacity-80">
                      En nuestro local comercial
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setLocationType(APPOINTMENT_LOCATION.PHONE_CALL)}
                    className={`p-3 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                      locationType === APPOINTMENT_LOCATION.PHONE_CALL
                        ? "bg-amber-500/10 border-amber-500 text-[#121417] dark:text-white shadow-xs"
                        : "bg-white dark:bg-[#181B22] border-[#E2E5EB] dark:border-[#242A35] text-[#8C929D]"
                    }`}
                  >
                    <span className="block font-black">📞 Llamada Telefónica</span>
                    <span className="text-[10px] font-normal opacity-80">
                      Un asesor te llamará a tu número
                    </span>
                  </button>
                </div>
              </div>

              {/* Paso 4: Datos del Cliente */}
              <div className="space-y-3 pt-2 border-t border-[#E2E5EB] dark:border-[#1F242D]">
                <label className="block text-xs font-bold text-[#121417] dark:text-white">
                  4. Tus Datos de Contacto
                </label>

                <div>
                  <label className="block text-[11px] font-semibold text-[#8C929D] mb-1">
                    Nombre Completo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Tu nombre y apellido"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#8C929D] mb-1">
                      Teléfono Móvil (para recordatorio) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+1 (469) 778-3339"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-[#8C929D] mb-1">
                      Correo Electrónico (opcional)
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="tu-correo@ejemplo.com"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#8C929D] mb-1">
                    ¿Qué producto o consulta tienes en mente? (opcional)
                  </label>
                  <textarea
                    rows={2}
                    value={customerNotes}
                    onChange={(e) => setCustomerNotes(e.target.value)}
                    placeholder="Ej. Me interesa cotizar muebles de sala o juego de comedor..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#D0D5DD] dark:border-[#242A35] bg-white dark:bg-[#181B22] text-[#121417] dark:text-white text-xs focus:outline-hidden resize-none"
                  />
                </div>
              </div>

              {/* Aviso de Consentimiento SMS */}
              <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#181B22] border border-[#E2E5EB] dark:border-[#242A35] text-[11px] text-[#475467] dark:text-[#94A3B8] leading-relaxed flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="bookingConsent"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-amber-500 focus:ring-amber-500 accent-amber-500 cursor-pointer"
                />
                <label htmlFor="bookingConsent" className="cursor-pointer select-none">
                  Acepto recibir recordatorios y notificaciones de mi cita por mensaje de texto (SMS). Pueden aplicarse tarifas estándar de mensajes y datos. Puedes responder STOP en cualquier momento para cancelar. Consulta nuestros{" "}
                  <Link href={ROUTES.TERMS} target="_blank" className="underline font-bold text-amber-600 dark:text-amber-400">
                    Términos
                  </Link>{" "}
                  y{" "}
                  <Link href={ROUTES.PRIVACY} target="_blank" className="underline font-bold text-amber-600 dark:text-amber-400">
                    Privacidad
                  </Link>.
                </label>
              </div>

              {/* Botón de Confirmación */}
              <button
                type="submit"
                disabled={submitting || !consent}
                className="w-full py-3.5 px-6 rounded-2xl font-black text-sm bg-amber-500 hover:bg-amber-600 text-black shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Confirmando tu reserva...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirmar Mi Cita Ahora</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-[#8C929D] font-medium py-2">
          <p>
            Plataforma comercial y de citas respaldada por{" "}
            <span className="font-bold text-[#121417] dark:text-white">Bunker CRM</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
