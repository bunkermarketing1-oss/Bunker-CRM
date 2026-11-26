"use client";

import React, { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  MessageSquare,
  Send,
  RefreshCw,
  AlertTriangle,
  History,
  Phone,
  ArrowDownLeft,
  ShieldAlert,
  Megaphone,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useClientOptions } from "@/hooks/useClientOptions";
import { BulkSmsPanel } from "@/components/messaging/BulkSmsPanel";
import {
  MESSAGE_DIRECTION,
  MESSAGE_GENERATED_BY,
  MESSAGE_STATUS,
  SMS_MAX_LENGTH,
} from "@/lib/constants/messaging";

interface MessageItem {
  id: string;
  recipient: string;
  body: string;
  direction: string;
  status: string;
  errorMessage?: string | null;
  createdAt: string;
  generatedBy?: string | null;
  client?: { id: string; name: string } | null;
  lead?: { id: string; name: string; phone?: string | null } | null;
}

interface LeadOption {
  id: string;
  name: string;
  phone: string | null;
  clientId: string | null;
}

export default function SmsMessagingPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-[#667085]">Cargando mensajería SMS...</div>}>
      <SmsMessagingPageContent />
    </Suspense>
  );
}

function SmsMessagingPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramClientId = searchParams.get("clientId");
  const isAdmin = user?.role === "ADMIN" && !user?.isClientUser;
  const clients = useClientOptions();
  const activeClient = paramClientId && paramClientId !== "all" ? clients.find((c) => c.id === paramClientId) : null;

  // Estado de mensajes
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState<string>(paramClientId ?? "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"direct" | "bulk" | "rules">("direct");

  // Estado de envío manual
  const [selectedClientId, setSelectedClientId] = useState<string>(paramClientId && paramClientId !== "all" ? paramClientId : "");

  useEffect(() => {
    if (paramClientId) {
      setFilterClient(paramClientId);
      if (paramClientId !== "all") {
        setSelectedClientId(paramClientId);
      }
    }
  }, [paramClientId]);
  const [leads, setLeads] = useState<LeadOption[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Cargar leads para el selector
  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const targetClient = user?.isClientUser ? user.clientId : selectedClientId;
        const url = targetClient ? `/api/leads?hasPhone=true&clientId=${targetClient}` : "/api/leads?hasPhone=true";
        const res = await fetch(url);
        const data = await res.json();
        if (data.success && Array.isArray(data.leads)) {
          setLeads(
            data.leads.map((l: { id: string; name: string; phone?: string | null; clientId?: string | null }) => ({
              id: l.id,
              name: l.name,
              phone: l.phone ?? null,
              clientId: l.clientId ?? null,
            }))
          );
        }
      } catch (err) {
        console.error("Error cargando leads:", err);
      }
    };
    fetchLeads();
  }, [user, selectedClientId]);

  // Cargar historial de SMS
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/messages/sms";
      const params = new URLSearchParams();
      if (filterClient && filterClient !== "all") {
        params.set("clientId", filterClient);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.messages)) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error("Error consultando historial de SMS:", err);
    } finally {
      setLoading(false);
    }
  }, [filterClient]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  // Manejar selección de lead en el formulario
  const handleSelectLead = (leadId: string) => {
    setSelectedLeadId(leadId);
    if (!leadId) return;
    const found = leads.find((l) => l.id === leadId);
    if (found?.phone) {
      setPhone(found.phone);
    }
    if (found?.clientId && !selectedClientId) {
      setSelectedClientId(found.clientId);
    }
  };

  // Envío manual de SMS
  const handleSendSms = async () => {
    setSending(true);
    setFeedback(null);
    setShowConfirm(false);

    try {
      const res = await fetch("/api/messages/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient: phone.trim(),
          message: messageText.trim(),
          clientId: user?.isClientUser ? user.clientId : selectedClientId || undefined,
          leadId: selectedLeadId || undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ type: "success", message: "SMS entregado correctamente al proveedor Twilio." });
        setMessageText("");
        setPhone("");
        setSelectedLeadId("");
        fetchHistory();
      } else {
        setFeedback({ type: "error", message: data.error || "Error al enviar SMS." });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        message: err instanceof Error ? err.message : "Error de comunicación con el servidor.",
      });
    } finally {
      setSending(false);
    }
  };

  // Filtrado de mensajes por búsqueda
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter(
      (m) =>
        m.recipient.toLowerCase().includes(q) ||
        m.body.toLowerCase().includes(q) ||
        (m.lead?.name && m.lead.name.toLowerCase().includes(q)) ||
        (m.client?.name && m.client.name.toLowerCase().includes(q))
    );
  }, [messages, searchQuery]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#EAECF0]">
        <div>
          <h1 className="text-2xl font-semibold text-[#101828] tracking-tight flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-[#D97757] shrink-0" />
            <span>Mensajería SMS & Campañas</span>
            {activeClient && (
              <span className="text-xs font-medium text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-0.5 rounded-full">
                {activeClient.name}
              </span>
            )}
          </h1>
          <p className="text-xs text-[#475467] mt-1">
            Envío directo a prospectos, trazabilidad de respuestas entrantes y campañas masivas mediante Twilio API.
          </p>
        </div>

        <button
          onClick={fetchHistory}
          className="p-2.5 rounded-xl bg-white border border-[#EAECF0] text-[#475467] hover:text-[#101828] text-xs transition-colors self-start sm:self-auto shadow-2xs flex items-center gap-2"
          title="Actualizar historial"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-[#D97757]" : ""}`} />
          <span className="hidden sm:inline">Actualizar</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-[#E8E6DF] pb-2">
        <button
          type="button"
          onClick={() => setActiveTab("direct")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === "direct"
              ? "bg-[#1F1E1D] text-white"
              : "bg-[#FAF9F5] text-[#6B6966] hover:bg-[#F4F3EE] hover:text-[#1F1E1D]"
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Chat Directo & Historial</span>
        </button>

        {isAdmin && (
          <button
            type="button"
            onClick={() => setActiveTab("bulk")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
              activeTab === "bulk"
                ? "bg-[#1F1E1D] text-white"
                : "bg-[#FAF9F5] text-[#6B6966] hover:bg-[#F4F3EE] hover:text-[#1F1E1D]"
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" />
            <span>Envío Masivo (Campañas)</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setActiveTab("rules")}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${
            activeTab === "rules"
              ? "bg-[#1F1E1D] text-white"
              : "bg-[#FAF9F5] text-[#6B6966] hover:bg-[#F4F3EE] hover:text-[#1F1E1D]"
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Reglas de Bajas (Opt-Out)</span>
        </button>
      </div>

      {/* TAB 1: Chat Directo & Historial */}
      {activeTab === "direct" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Redactar SMS (5 cols) */}
          <div className="lg:col-span-5 p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-[#1F1E1D] flex items-center gap-2">
              <Send className="w-4 h-4 text-[#D97757]" />
              Redactar Mensaje SMS
            </h2>

            {feedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  feedback.type === "success"
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}
              >
                {feedback.type === "success" ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{feedback.message}</span>
              </div>
            )}

            <div className="space-y-3">
              {/* Selección de cliente (para admin) */}
              {isAdmin && (
                <div>
                  <label className="block text-xs font-medium text-[#4D4C48] mb-1">Empresa / Cliente</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => {
                      setSelectedClientId(e.target.value);
                      setSelectedLeadId("");
                    }}
                    className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  >
                    <option value="">Selecciona una empresa (opcional)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Selección de Lead */}
              <div>
                <label className="block text-xs font-medium text-[#4D4C48] mb-1">Prospecto Asociado</label>
                <select
                  value={selectedLeadId}
                  onChange={(e) => handleSelectLead(e.target.value)}
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                >
                  <option value="">Ingresar número a mano o elegir prospecto...</option>
                  {leads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} {l.phone ? `(${l.phone})` : "— sin teléfono"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Teléfono */}
              <div>
                <label className="block text-xs font-medium text-[#4D4C48] mb-1">
                  Número Celular Destinatario (E.164) *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#82807C] absolute left-3 top-2.5" />
                  <input
                    type="tel"
                    required
                    placeholder="+57 300 123 4567 o +52 55 1234 5678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl pl-9 pr-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757] font-mono"
                  />
                </div>
                <p className="text-[10px] text-[#82807C] mt-1">Incluye siempre el código de país con el signo +.</p>
              </div>

              {/* Cuerpo del mensaje */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-[#4D4C48]">Cuerpo del Mensaje *</label>
                  <span
                    className={`text-[10px] font-mono ${
                      messageText.length > 160 ? "text-amber-700 font-semibold" : "text-[#82807C]"
                    }`}
                  >
                    {messageText.length} / {SMS_MAX_LENGTH} car. {messageText.length > 160 && "(~múltiples SMS)"}
                  </span>
                </div>
                <textarea
                  rows={4}
                  required
                  maxLength={SMS_MAX_LENGTH}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Escribe el texto del mensaje..."
                  className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757] resize-y"
                />
              </div>

              {/* Compliance Box */}
              <div className="p-3 bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl text-[11px] text-[#6B6966] space-y-1">
                <div className="text-[#1F1E1D] font-medium flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
                  <span>Envío Seguro & Anti-Duplicados</span>
                </div>
                <p>
                  Protección automática contra envíos repetidos dentro de los últimos 2 minutos. Si el lead responde
                  BAJA o STOP, el sistema bloqueará futuros envíos automáticamente.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!phone.trim() || !messageText.trim()) {
                    setFeedback({ type: "error", message: "Ingresa un número y texto válidos para el SMS." });
                    return;
                  }
                  setShowConfirm(true);
                }}
                disabled={sending}
                className="w-full py-2.5 rounded-2xl btn-black-gold font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
              >
                <Send className="w-4 h-4 text-[#E5C158]" />
                <span>{sending ? "Validando..." : "Validar y Enviar SMS"}</span>
              </button>
            </div>
          </div>

          {/* Columna Derecha: Historial y Respuestas (7 cols) */}
          <div className="lg:col-span-7 p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-600" />
                <h2 className="text-sm font-semibold text-[#1F1E1D]">Historial de Mensajes</h2>
                <span className="text-[11px] text-[#82807C] font-mono">({filteredMessages.length})</span>
              </div>

              <div className="flex items-center gap-2">
                {isAdmin && (
                  <select
                    value={filterClient}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFilterClient(val);
                      if (typeof window !== "undefined") {
                        localStorage.setItem("bunker_selected_client_id", val);
                      }
                      const currentParams = new URLSearchParams(searchParams.toString());
                      if (val !== "all") {
                        currentParams.set("clientId", val);
                      } else {
                        currentParams.delete("clientId");
                      }
                      const q = currentParams.toString();
                      router.push(q ? `/messaging/sms?${q}` : "/messaging/sms");
                    }}
                    className="bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-2.5 py-1.5 text-xs text-[#1F1E1D]"
                  >
                    <option value="all">Todas las empresas</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#82807C] absolute left-2.5 top-2" />
                  <input
                    type="text"
                    placeholder="Buscar..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl pl-8 pr-2.5 py-1.5 text-xs text-[#1F1E1D] w-32 sm:w-40 focus:outline-none focus:border-[#D97757]"
                  />
                </div>
              </div>
            </div>

            <div className="divide-y divide-[#F0EFEA] overflow-y-auto max-h-[580px] pr-1">
              {loading ? (
                <div className="py-16 text-center text-[#82807C] text-xs flex flex-col items-center gap-2">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#D97757]" />
                  <span>Cargando historial de SMS...</span>
                </div>
              ) : filteredMessages.length === 0 ? (
                <div className="py-16 text-center text-[#82807C] text-xs space-y-1">
                  <MessageSquare className="w-8 h-8 text-[#D1CFCA] mx-auto mb-2" />
                  <p className="font-semibold text-[#1F1E1D]">No hay mensajes registrados</p>
                  <p>Los mensajes enviados o recibidos vía Twilio aparecerán en esta lista.</p>
                </div>
              ) : (
                filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className="py-3.5 space-y-2 hover:bg-[#FAF9F5] px-2 rounded-xl transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#1F1E1D] font-mono flex items-center gap-1.5 flex-wrap">
                        {msg.direction === MESSAGE_DIRECTION.INBOUND ? (
                          <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-sans font-medium">
                            <ArrowDownLeft className="w-3 h-3" />
                            Recibido
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[#4D4C48] bg-[#F4F3EE] px-2 py-0.5 rounded-full text-[10px] font-sans font-medium">
                            <Phone className="w-3 h-3" />
                            Enviado
                          </span>
                        )}
                        <span>{msg.recipient}</span>
                        {msg.lead?.name && (
                          <span className="font-sans font-normal text-[#82807C]">· {msg.lead.name}</span>
                        )}
                        {isAdmin && msg.client?.name && (
                          <span className="font-sans text-[10px] text-[#6B6966] bg-white px-1.5 py-0.5 rounded border border-[#E8E6DF]">
                            {msg.client.name}
                          </span>
                        )}
                        {isAdmin && msg.generatedBy && (
                          <span
                            title={
                              msg.generatedBy === MESSAGE_GENERATED_BY.AI
                                ? "Respuesta de IA fuera de horario"
                                : "Mensaje de traspaso automático fuera de horario"
                            }
                            className="font-sans text-[10px] font-semibold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200"
                          >
                            {msg.generatedBy === MESSAGE_GENERATED_BY.AI ? "IA" : "IA · traspaso"}
                          </span>
                        )}
                      </span>

                      <span
                        className={`text-[10px] font-medium px-2 py-0.5 rounded-full uppercase border shrink-0 ${
                          msg.status === MESSAGE_STATUS.DELIVERED
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : msg.status === MESSAGE_STATUS.SENT
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : msg.status === MESSAGE_STATUS.FAILED
                            ? "bg-red-50 text-red-700 border-red-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}
                      >
                        {msg.direction === MESSAGE_DIRECTION.INBOUND
                          ? "RECIBIDO"
                          : msg.status === MESSAGE_STATUS.SENT
                          ? "ENVIADO"
                          : msg.status === MESSAGE_STATUS.DELIVERED
                          ? "ENTREGADO"
                          : msg.status === MESSAGE_STATUS.FAILED
                          ? "FALLIDO"
                          : msg.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#4D4C48] leading-relaxed bg-[#FAF9F5] p-3 rounded-xl border border-[#E8E6DF]">
                      {msg.body}
                    </p>

                    {msg.errorMessage && (
                      <div className="text-[11px] text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-200">
                        <strong>Causa del fallo:</strong> {msg.errorMessage}
                      </div>
                    )}

                    <div className="text-[10px] text-[#82807C] flex items-center justify-between">
                      <span>{new Date(msg.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Envío Masivo */}
      {activeTab === "bulk" && isAdmin && (
        <BulkSmsPanel clients={clients} onSent={fetchHistory} />
      )}

      {/* TAB 3: Reglas de Bajas & Privacidad */}
      {activeTab === "rules" && (
        <div className="p-6 rounded-2xl bg-white border border-[#E8E6DF] space-y-4 shadow-sm">
          <h2 className="text-base font-semibold text-[#1F1E1D] flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#D97757]" />
            <span>Gestión de Bajas (Opt-Out) & Respuestas Automáticas</span>
          </h2>

          <p className="text-xs text-[#4D4C48] leading-relaxed">
            Twilio y Bunker CRM implementan control estricto de consentimiento para evitar sanciones y bloqueos de
            operador. Todas las bajas son globales por número telefónico.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-2">
              <h3 className="font-semibold text-[#1F1E1D] flex items-center gap-1.5">
                <XCircle className="w-4 h-4 text-red-600" />
                <span>Palabras de Cancelación (Baja)</span>
              </h3>
              <p className="text-[#6B6966] leading-relaxed text-[11px]">
                Cuando un destinatario responde con alguna de estas palabras, queda automáticamente registrado en la lista
                negra global y no volverá a recibir mensajes:
              </p>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px] font-semibold text-red-700">
                <span className="bg-red-50 px-2 py-0.5 rounded border border-red-200">BAJA</span>
                <span className="bg-red-50 px-2 py-0.5 rounded border border-red-200">STOP</span>
                <span className="bg-red-50 px-2 py-0.5 rounded border border-red-200">ALTO</span>
                <span className="bg-red-50 px-2 py-0.5 rounded border border-red-200">CANCELAR</span>
                <span className="bg-red-50 px-2 py-0.5 rounded border border-red-200">PARAR</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-2">
              <h3 className="font-semibold text-[#1F1E1D] flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Palabras de Reactivación (Alta)</span>
              </h3>
              <p className="text-[#6B6966] leading-relaxed text-[11px]">
                Si un usuario previamente dado de baja desea volver a recibir comunicaciones, puede enviar cualquiera de
                las siguientes palabras:
              </p>
              <div className="flex flex-wrap gap-1.5 font-mono text-[11px] font-semibold text-emerald-700">
                <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">ALTA</span>
                <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">START</span>
                <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">UNSTOP</span>
                <span className="bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">SUSCRIBIR</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmación para envío directo */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-[#E8E6DF] rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-[#1F1E1D] flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Confirmar Envío de Mensaje SMS
            </h3>

            <div className="text-xs text-[#4D4C48] space-y-2 bg-[#FAF9F5] p-3.5 rounded-xl border border-[#E8E6DF]">
              <div>
                <strong>Destinatario:</strong> <span className="font-mono text-[#1F1E1D]">{phone}</span>
              </div>
              <div>
                <strong>Mensaje:</strong> &ldquo;{messageText}&rdquo;
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="px-3.5 py-1.5 rounded-xl bg-[#F4F3EE] border border-[#E8E6DF] text-[#4D4C48] hover:text-[#1F1E1D] text-xs font-medium"
              >
                Cancelar
              </button>
              <button
                type="button"
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
