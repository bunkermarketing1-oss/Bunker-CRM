"use client";

import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  History,
  AlertTriangle,
  CheckCircle2,
  Phone,
  User,
  Clock,
  Sparkles,
  ShieldAlert,
  ArrowDownLeft,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useClientOptions } from "@/hooks/useClientOptions";
import { BulkSmsPanel } from "@/components/messaging/BulkSmsPanel";
import { MESSAGE_DIRECTION } from "@/lib/constants/messaging";

export default function SmsMessagingPage() {
  const { user } = useAuth();
  const isAdmin = Boolean(user && !user.isClientUser);
  const clients = useClientOptions();
  const [messages, setMessages] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: string; message: string } | null>(null);

  // Form
  const [selectedContact, setSelectedContact] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [messageText, setMessageText] = useState(
    "Hola, te confirmamos tu sesión estratégica con Bunker Agency para mañana a las 11:00 AM."
  );
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const [msgRes, leadsRes] = await Promise.all([
        fetch("/api/messages/sms"),
        fetch("/api/leads"),
      ]);
      const msgJson = await msgRes.json();
      const leadsJson = await leadsRes.json();

      if (msgJson.success) setMessages(msgJson.messages);
      if (leadsJson.success) setContacts(leadsJson.leads.filter((l: any) => l.phone));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleContactSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const contactId = e.target.value;
    setSelectedContact(contactId);
    const found = contacts.find((c) => c.id === contactId);
    if (found && found.phone) {
      setPhone(found.phone);
    }
  };

  const handleSendSms = async () => {
    setShowConfirm(false);
    setSending(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/messages/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: phone,
          message: messageText,
          leadId: selectedContact || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setFeedback({
          type: "success",
          message: "Mensaje SMS enviado exitosamente.",
        });
        setMessageText("");
        fetchHistory();
      } else {
        setFeedback({
          type: "error",
          message: json.error || "No se pudo enviar el SMS.",
        });
        fetchHistory();
      }
    } catch (e: any) {
      setFeedback({ type: "error", message: e.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#E8E6DF]">
        <div>
          <div className="flex items-center gap-2 text-xs text-[#82807C] mb-1">
            <span>Mensajería</span>
            <span>/</span>
            <span className="text-[#1F1E1D] font-medium">SMS Oficial</span>
          </div>
          <h1 className="text-2xl font-semibold text-[#1F1E1D] tracking-tight">
            Canal de Mensajería SMS Comercial
          </h1>
          <p className="text-xs text-[#6B6966] mt-0.5">
            Envío directo de notificaciones comerciales, confirmación de reuniones y alertas transaccionales.
          </p>
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl border text-xs font-medium flex items-center gap-2.5 ${
          feedback.type === "success"
            ? "bg-[#EBF5EE] border-[#C2E2CC] text-emerald-800"
            : "bg-[#FDF2F2] border-[#F8D7DA] text-red-800"
        }`}>
          {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <AlertTriangle className="w-4 h-4 text-red-600" />}
          <span>{feedback.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Send SMS Composer */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm space-y-4">
          <h2 className="text-sm font-semibold text-[#1F1E1D] flex items-center gap-2">
            <Send className="w-4 h-4 text-[#D97757]" />
            Redactar Mensaje SMS
          </h2>

          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-[#4D4C48] mb-1">
                Seleccionar Contacto Registrado
              </label>
              <select
                value={selectedContact}
                onChange={handleContactSelect}
                className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
              >
                <option value="">Selección manual / Directo</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.phone}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#4D4C48] mb-1">
                Número de Celular Destinatario (con código de país, ej: +57 o +52) *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-[#82807C] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="+57 300 123 4567 o +52 55 1234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757] font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-[#4D4C48]">Cuerpo del Mensaje *</label>
                <span className={`text-[10px] font-mono ${messageText.length > 160 ? "text-amber-700 font-semibold" : "text-[#82807C]"}`}>
                  {messageText.length} / 480 car.
                </span>
              </div>
              <textarea
                rows={4}
                required
                maxLength={480}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Escribe el texto del mensaje..."
                className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
              />
            </div>

            {/* Compliance box */}
            <div className="p-3 bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl text-[11px] text-[#6B6966] space-y-1">
              <div className="text-[#1F1E1D] font-medium flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                <span>Envío Seguro & Auditoría</span>
              </div>
              <p>
                Evita envíos duplicados accidentales (bloqueo preventivo de 2 min) y guarda el registro automático en el perfil del cliente.
              </p>
            </div>

            <button
              onClick={() => {
                if (!phone || !messageText) {
                  alert("Ingresa un número y un mensaje válido.");
                  return;
                }
                setShowConfirm(true);
              }}
              disabled={sending}
              className="w-full py-2.5 rounded-2xl btn-black-gold font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4 text-[#E5C158]" />
              <span>{sending ? "Enviando..." : "Validar y Enviar SMS"}</span>
            </button>
          </div>
        </div>

        {/* History Log */}
        <div className="lg:col-span-3 p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#1F1E1D] flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              Historial de mensajes
            </h2>
            <span className="text-[11px] text-[#82807C] font-mono">{messages.length} mensajes</span>
          </div>

          <div className="divide-y divide-[#F0EFEA] overflow-y-auto max-h-[500px]">
            {loading ? (
              <div className="py-12 text-center text-[#82807C] text-xs">Cargando historial de envíos...</div>
            ) : messages.length === 0 ? (
              <div className="py-12 text-center text-[#82807C] text-xs">No hay mensajes enviados aún.</div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="py-3.5 space-y-2 hover:bg-[#FAF9F5] px-2 rounded-xl transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1F1E1D] font-mono flex items-center gap-1.5">
                      {msg.direction === MESSAGE_DIRECTION.INBOUND ? (
                        <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" aria-label="Recibido" />
                      ) : (
                        <Phone className="w-3.5 h-3.5 text-[#82807C]" />
                      )}
                      {msg.recipient}
                      {msg.lead?.name && <span className="font-sans font-normal text-[#82807C]">· {msg.lead.name}</span>}
                    </span>

                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase border ${
                      msg.status === "delivered" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      msg.status === "sent" ? "bg-blue-50 text-blue-700 border-blue-200" :
                      msg.status === "failed" ? "bg-red-50 text-red-700 border-red-200" :
                      "bg-amber-50 text-amber-700 border-amber-200"
                    }`}>
                      {msg.direction === MESSAGE_DIRECTION.INBOUND ? "RECIBIDO" :
                       msg.status === "sent" ? "ENVIADO" :
                       msg.status === "delivered" ? "ENTREGADO" :
                       msg.status === "failed" ? "FALLIDO" : msg.status}
                    </span>
                  </div>

                  <p className="text-xs text-[#4D4C48] leading-relaxed bg-[#FAF9F5] p-3 rounded-xl border border-[#E8E6DF]">
                    {msg.body}
                  </p>

                  {msg.errorMessage && (
                    <div className="text-[11px] text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200">
                      <strong>Causa:</strong> {msg.errorMessage}
                    </div>
                  )}

                  <div className="text-[10px] text-[#82807C] flex items-center justify-between">
                    <span>{new Date(msg.createdAt).toLocaleString()}</span>
                    {msg.isDemo && <span className="text-amber-700 font-medium">[Modo Prueba / Simulado]</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {isAdmin && <BulkSmsPanel clients={clients} onSent={fetchHistory} />}

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white border border-[#E8E6DF] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#1F1E1D] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Confirmar Envío de Mensaje SMS
            </h3>

            <div className="text-xs text-[#4D4C48] space-y-2 bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E8E6DF]">
              <div><strong>Destinatario:</strong> <span className="font-mono">{phone}</span></div>
              <div><strong>Mensaje:</strong> &ldquo;{messageText}&rdquo;</div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl bg-[#F4F3EE] border border-[#E8E6DF] text-[#4D4C48] hover:text-[#1F1E1D] text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendSms}
                className="px-4 py-1.5 rounded-xl btn-black-gold text-xs font-semibold"
              >
                Confirmar y Enviar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
