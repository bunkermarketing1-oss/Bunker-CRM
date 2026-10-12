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
} from "lucide-react";

export default function SmsMessagingPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: string; message: string } | null>(null);

  // Form
  const [selectedContact, setSelectedContact] = useState<string>("");
  const [phone, setPhone] = useState("+525549123011");
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
          message: "SMS despachado al proveedor telefónico exitosamente.",
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
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-black text-white flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-400" />
          Módulo de Mensajería SMS Oficial
        </h1>
        <p className="text-xs text-gray-400 mt-0.5">
          Envío real de notificaciones comerciales, confirmación de reuniones y alertas transaccionales.
        </p>
      </div>

      {feedback && (
        <div className={`p-3 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
          feedback.type === "success"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
            : "bg-red-500/10 border-red-500/30 text-red-300"
        }`}>
          {feedback.type === "success" ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
          {feedback.message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Send SMS Composer (2 cols) */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-[#0c111e] border border-[#1b2538] space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Send className="w-4 h-4 text-bunker-400" />
            Redactar Mensaje SMS
          </h2>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Seleccionar Contacto Registrado
              </label>
              <select
                value={selectedContact}
                onChange={handleContactSelect}
                className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
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
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Número Telefónico Destinatario (Formato E.164) *
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  required
                  placeholder="+52 55 1234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-[#121929] border border-[#222f47] rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500 font-mono"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-300">Cuerpo del Mensaje *</label>
                <span className={`text-[10px] ${messageText.length > 160 ? "text-amber-400 font-semibold" : "text-gray-500"}`}>
                  {messageText.length} / 480 caracteres
                </span>
              </div>
              <textarea
                rows={4}
                required
                maxLength={480}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Escribe el texto del mensaje..."
                className="w-full bg-[#121929] border border-[#222f47] rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-bunker-500"
              />
            </div>

            {/* Compliance warning */}
            <div className="p-3 bg-[#080d16] border border-[#19243a] rounded-xl text-[10px] text-gray-400 space-y-1">
              <div className="text-gray-300 font-semibold flex items-center gap-1">
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                Normativa de Telecomunicaciones & Prevención
              </div>
              <p>
                Cuenta con protección anti-duplicados (2 minutos) y registro de auditoría en base de datos.
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
              className="w-full py-2.5 rounded-xl bg-bunker-600 hover:bg-bunker-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-lg shadow-bunker-600/30 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? "Enviando..." : "Validar y Enviar SMS"}</span>
            </button>
          </div>
        </div>

        {/* History Log (3 cols) */}
        <div className="lg:col-span-3 p-5 rounded-2xl bg-[#0c111e] border border-[#1b2538] space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-400" />
              Historial & Estado de Entregas
            </h2>
            <span className="text-[11px] text-gray-400">{messages.length} mensajes</span>
          </div>

          <div className="divide-y divide-[#162033] overflow-y-auto max-h-[500px]">
            {loading ? (
              <div className="py-8 text-center text-gray-500 text-xs">Cargando historial...</div>
            ) : messages.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-xs">No hay mensajes enviados aún.</div>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className="py-3.5 space-y-2 hover:bg-[#111827]/40 px-2 rounded-xl transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-gray-500" />
                      {msg.recipient}
                    </span>

                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                      msg.status === "delivered" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                      msg.status === "sent" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                      msg.status === "failed" ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}>
                      {msg.status === "sent" ? "ENVIADO AL PROVEEDOR" :
                       msg.status === "delivered" ? "CONFIRMADO ENTREGADO" :
                       msg.status === "failed" ? "FALLIDO" : msg.status}
                    </span>
                  </div>

                  <p className="text-xs text-gray-300 leading-relaxed bg-[#080d16] p-2.5 rounded-lg border border-[#162033]">
                    {msg.body}
                  </p>

                  {msg.errorMessage && (
                    <div className="text-[10px] text-red-400 bg-red-500/10 p-2 rounded border border-red-500/20">
                      <strong>Causa:</strong> {msg.errorMessage}
                    </div>
                  )}

                  <div className="text-[10px] text-gray-500 flex items-center justify-between">
                    <span>{new Date(msg.createdAt).toLocaleString()}</span>
                    {msg.isDemo && <span className="text-amber-400">[Modo Demo / Sandbox]</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0b101d] border border-[#23314d] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Confirmar Envío de Mensaje SMS
            </h3>

            <div className="text-xs text-gray-300 space-y-2 bg-[#121929] p-3 rounded-xl border border-[#222f47]">
              <div><strong>Destinatario:</strong> {phone}</div>
              <div><strong>Mensaje:</strong> &ldquo;{messageText}&rdquo;</div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-[#141d30] border border-[#23314d] text-gray-300 hover:text-white text-xs"
              >
                Cancelar
              </button>
              <button
                onClick={handleSendSms}
                className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md"
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
