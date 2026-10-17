"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Building2,
  UserCheck,
  Share2,
  Sparkles,
  Check,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  Clock,
  Phone,
  Mail,
  DollarSign,
  Briefcase,
  HelpCircle,
  KanbanSquare,
} from "lucide-react";

interface TeamMember {
  id: string;
  name: string;
  role?: string;
}

interface ClientOnboardingWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  teamMembers: TeamMember[];
}

export function ClientOnboardingWizardModal({
  isOpen,
  onClose,
  onSuccess,
  teamMembers,
}: ClientOnboardingWizardModalProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Available agency accounts to link
  const [agencyAccounts, setAgencyAccounts] = useState<any[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);

  // Step 1: Empresa
  const [name, setName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState("Restaurantes & Gastronomía");
  const [revenue, setRevenue] = useState("2500");
  const [website, setWebsite] = useState("");
  const [ownerId, setOwnerId] = useState("");

  // Step 2: Contacto Principal
  const [contactFirstName, setContactFirstName] = useState("");
  const [contactLastName, setContactLastName] = useState("");
  const [contactJobTitle, setContactJobTitle] = useState("Director / Dueño");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  // Step 3: Redes & Pauta
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [manualAdAccountId, setManualAdAccountId] = useState<string>("");
  const [platformOption, setPlatformOption] = useState<"meta" | "manual">("meta");

  // Step 4: IA Comercial & Pipeline
  const [enableOutOfHoursAi, setEnableOutOfHoursAi] = useState(true);
  const [startHour, setStartHour] = useState("08:00");
  const [endHour, setEndHour] = useState("19:00");
  const [createInitialDeal, setCreateInitialDeal] = useState(true);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setErrorMessage(null);
      fetchAgencyAccounts();
    }
  }, [isOpen]);

  const fetchAgencyAccounts = async () => {
    try {
      setLoadingAccounts(true);
      const res = await fetch("/api/integrations");
      const json = await res.json();
      if (json.success && Array.isArray(json.integrations)) {
        const unassigned: any[] = [];
        json.integrations.forEach((it: any) => {
          if (Array.isArray(it.connectedAccounts)) {
            it.connectedAccounts.forEach((acc: any) => {
              if (!acc.clientId) {
                unassigned.push({ ...acc, providerName: it.name });
              }
            });
          }
        });
        setAgencyAccounts(unassigned);
      }
    } catch (e) {
      console.error("Error fetching accounts:", e);
    } finally {
      setLoadingAccounts(false);
    }
  };

  if (!isOpen) return null;

  const validateCurrentStep = () => {
    setErrorMessage(null);
    if (currentStep === 1) {
      if (!name.trim()) {
        setErrorMessage("Por favor ingresa el nombre de la empresa o cliente comercial.");
        return false;
      }
      return true;
    }
    if (currentStep === 2) {
      if (!contactFirstName.trim()) {
        setErrorMessage("Por favor ingresa al menos el nombre del contacto principal.");
        return false;
      }
      return true;
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinish = async () => {
    setSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        name: name.trim(),
        companyName: companyName.trim() || name.trim(),
        email: contactEmail.trim() || undefined,
        phone: contactPhone.trim() || undefined,
        website: website.trim() || undefined,
        industry,
        revenue: revenue || "0",
        ownerId: ownerId || undefined,
        notes: notes.trim() || undefined,
        primaryContact: {
          firstName: contactFirstName.trim(),
          lastName: contactLastName.trim() || undefined,
          jobTitle: contactJobTitle.trim() || "Contacto Principal",
          email: contactEmail.trim() || undefined,
          phone: contactPhone.trim() || undefined,
        },
        connectedAccountId: selectedAccountId || undefined,
        adAccountExternalId: manualAdAccountId.trim() || undefined,
        initialDeal: {
          enabled: createInitialDeal,
          title: `Campaña Comercial Inicial - ${name.trim()}`,
          value: parseFloat(revenue) || 2500,
        },
      };

      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(json.error || "No se pudo registrar el cliente.");
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Error al conectar con el servidor.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepsMeta = [
    { num: 1, title: "Empresa", icon: Building2 },
    { num: 2, title: "Contacto", icon: UserCheck },
    { num: 3, title: "Redes & Pauta", icon: Share2 },
    { num: 4, title: "IA & Activación", icon: Sparkles },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white border border-[#ECEAE3] rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header con Stepper Progress */}
        <div className="p-6 border-b border-[#F4F3EE] bg-[#FDFDFC]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9A7320] bg-[#FAF0D7] border border-[#F2E5C4] px-2 py-0.5 rounded-md">
                Asistente Guiado de Instalación
              </span>
              <h2 className="text-lg font-bold text-[#141414] mt-1">
                Alta & Configuración de Nuevo Cliente
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-[#8C887E] hover:text-[#141414] p-1.5 rounded-xl hover:bg-[#F6F5F2] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Stepper visual */}
          <div className="grid grid-cols-4 gap-2 pt-2">
            {stepsMeta.map((s) => {
              const Icon = s.icon;
              const isActive = currentStep === s.num;
              const isPast = currentStep > s.num;

              return (
                <div key={s.num} className="space-y-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all ${
                      isPast
                        ? "bg-emerald-500"
                        : isActive
                        ? "bg-[#D97757]"
                        : "bg-[#ECEAE3]"
                    }`}
                  />
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold transition-all ${
                        isPast
                          ? "bg-emerald-100 text-emerald-800"
                          : isActive
                          ? "bg-[#D97757] text-white"
                          : "bg-[#F6F5F2] text-[#8C887E]"
                      }`}
                    >
                      {isPast ? <Check className="w-3 h-3 text-emerald-600" /> : s.num}
                    </span>
                    <span
                      className={`text-[11px] font-medium hidden sm:inline ${
                        isActive ? "text-[#141414] font-bold" : "text-[#8C887E]"
                      }`}
                    >
                      {s.title}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Feedback Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {/* PASO 1: EMPRESA */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#ECEAE3] text-xs text-[#6B6861] flex items-start gap-2.5">
                <Building2 className="w-4 h-4 text-[#D97757] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Paso 1:</strong> Ingresa la información comercial básica de la empresa o cliente que vas a gestionar en Bunker CRM.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">
                  Nombre Comercial del Cliente *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Carrito Naranja o DentPrime"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Razón Social / Empresa Legal
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Carrito Naranja S.A.S."
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Sector o Industria
                  </label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="Restaurantes & Gastronomía">Restaurantes & Gastronomía</option>
                    <option value="Bienes Raíces & Inmobiliaria">Bienes Raíces & Inmobiliaria</option>
                    <option value="Clínicas & Salud Dental">Clínicas & Salud Dental</option>
                    <option value="FinTech & Servicios Financieros">FinTech & Servicios Financieros</option>
                    <option value="E-commerce & Tienda Online">E-commerce & Tienda Online</option>
                    <option value="Automotriz & Talleres">Automotriz & Talleres</option>
                    <option value="Educación & Cursos">Educación & Cursos</option>
                    <option value="Servicios Profesionales">Servicios Profesionales</option>
                    <option value="General">Otro / General</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Valor Contratado Mensual ($ USD)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-3.5 h-3.5 text-[#8C887E] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      placeholder="2500"
                      value={revenue}
                      onChange={(e) => setRevenue(e.target.value)}
                      className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl pl-8 pr-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Asesor Comercial Responsable
                  </label>
                  <select
                    value={ownerId}
                    onChange={(e) => setOwnerId(e.target.value)}
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="">Asignar automáticamente a mí</option>
                    {teamMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role || "Equipo"})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">
                  Sitio Web Oficial (Opcional)
                </label>
                <input
                  type="url"
                  placeholder="https://www.carritonaranja.com"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>
          )}

          {/* PASO 2: CONTACTO PRINCIPAL */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#ECEAE3] text-xs text-[#6B6861] flex items-start gap-2.5">
                <UserCheck className="w-4 h-4 text-[#D97757] flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Paso 2:</strong> Datos del tomador de decisiones o contacto clave en la empresa con quien tu equipo coordinará pautas y ventas.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Nombre del Contacto *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. Carlos"
                    value={contactFirstName}
                    onChange={(e) => setContactFirstName(e.target.value)}
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Apellidos
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Mendoza"
                    value={contactLastName}
                    onChange={(e) => setContactLastName(e.target.value)}
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">
                  Cargo o Posición en la Empresa
                </label>
                <div className="relative">
                  <Briefcase className="w-3.5 h-3.5 text-[#8C887E] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="ej. Gerente de Ventas / Fundador"
                    value={contactJobTitle}
                    onChange={(e) => setContactJobTitle(e.target.value)}
                    className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl pl-8 pr-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Teléfono Celular / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-[#8C887E] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      placeholder="+57 300 123 4567 o +52 55 1234 5678"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl pl-8 pr-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#141414] mb-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-[#8C887E] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      placeholder="contacto@empresa.com"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl pl-8 pr-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PASO 3: REDES & CUENTA PUBLICITARIA */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#ECEAE3] text-xs text-[#6B6861] flex items-start gap-2.5">
                <Share2 className="w-4 h-4 text-[#D97757] flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Paso 3:</strong> Vincula la cuenta publicitaria o página social del cliente.
                  <p className="mt-0.5 text-[11px] text-[#8C887E]">
                    Al vincularla, los leads generados por sus anuncios entrarán automáticamente a este cliente y el dueño podrá ver sus métricas en su portal.
                  </p>
                </div>
              </div>

              {agencyAccounts.length > 0 ? (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-[#141414]">
                    Seleccionar cuenta del Portafolio de la Agencia:
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {agencyAccounts.map((acc) => (
                      <label
                        key={acc.id}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          selectedAccountId === acc.id
                            ? "bg-[#FAF0D7] border-[#D4AF37] text-[#141414]"
                            : "bg-[#F6F5F2] border-[#ECEAE3] text-[#4D4C48] hover:bg-[#FAF9F5]"
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="radio"
                            name="account"
                            checked={selectedAccountId === acc.id}
                            onChange={() => {
                              setSelectedAccountId(acc.id);
                              setManualAdAccountId("");
                            }}
                            className="text-[#D97757] focus:ring-0"
                          />
                          <div>
                            <div className="font-semibold text-xs">{acc.accountName}</div>
                            <div className="text-[10px] text-[#8C887E] font-mono">
                              {acc.providerName} · ID: {acc.externalId}
                            </div>
                          </div>
                        </div>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-[#ECEAE3]">
                          Disponible
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-1">
                  <strong>No hay cuentas sin asignar en el portafolio.</strong>
                  <p className="text-[11px] text-amber-800">
                    Puedes ingresar el ID de la cuenta de anuncios directamente abajo para asociarla.
                  </p>
                </div>
              )}

              <div className="pt-2 border-t border-[#F4F3EE]">
                <label className="block text-xs font-semibold text-[#141414] mb-1 flex items-center justify-between">
                  <span>O ingresar ID de Cuenta Publicitaria de Meta / TikTok:</span>
                  <span className="text-[10px] text-[#8C887E] font-normal">ej. 5194920503935574</span>
                </label>
                <input
                  type="text"
                  placeholder="ID numérico de la cuenta en Meta Business Suite"
                  value={manualAdAccountId}
                  onChange={(e) => {
                    setManualAdAccountId(e.target.value);
                    setSelectedAccountId("");
                  }}
                  className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37] font-mono"
                />
                <p className="text-[11px] text-[#8C887E] mt-1">
                  💡 Este es el identificador que aparece en el Business Manager junto al nombre de la cuenta (ej. *Workshop Carrito Naranja*).
                </p>
              </div>
            </div>
          )}

          {/* PASO 4: IA & ACTIVACIÓN */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" />
                <div>
                  <strong>Paso 4: Configuración Comercial & IA</strong>
                  <p className="mt-0.5 text-[11px] text-emerald-800">
                    Define la atención automática para los prospectos de este cliente cuando entren en horario no hábil.
                  </p>
                </div>
              </div>

              {/* Toggle IA fuera de horario */}
              <div className="p-3.5 rounded-2xl bg-[#F6F5F2] border border-[#ECEAE3] space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#141414] flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-[#D97757]" />
                      <span>Respuesta Automática con IA en Horas de Ausencia</span>
                    </div>
                    <div className="text-[11px] text-[#8C887E] mt-0.5">
                      Si un lead llena un anuncio fuera de oficina, recibe un SMS inteligente en &lt; 60 seg.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={enableOutOfHoursAi}
                    onChange={(e) => setEnableOutOfHoursAi(e.target.checked)}
                    className="w-4 h-4 text-[#D97757] rounded"
                  />
                </div>

                {enableOutOfHoursAi && (
                  <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E8E6DF] text-xs">
                    <div>
                      <label className="block text-[11px] font-medium text-[#6B6861] mb-1">
                        Apertura Oficina
                      </label>
                      <input
                        type="time"
                        value={startHour}
                        onChange={(e) => setStartHour(e.target.value)}
                        className="w-full bg-white border border-[#ECEAE3] rounded-xl px-2.5 py-1.5 text-xs text-[#141414]"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-[#6B6861] mb-1">
                        Cierre Oficina
                      </label>
                      <input
                        type="time"
                        value={endHour}
                        onChange={(e) => setEndHour(e.target.value)}
                        className="w-full bg-white border border-[#ECEAE3] rounded-xl px-2.5 py-1.5 text-xs text-[#141414]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Crear Oportunidad inicial en Pipeline */}
              <label className="p-3.5 rounded-2xl bg-[#FAF9F5] border border-[#ECEAE3] flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <KanbanSquare className="w-4 h-4 text-[#D97757]" />
                  <div>
                    <div className="text-xs font-semibold text-[#141414]">
                      Abrir Oportunidad Inicial en el Pipeline de Ventas
                    </div>
                    <div className="text-[11px] text-[#8C887E]">
                      Crea un negocio en la primera etapa para dar seguimiento comercial de inmediato.
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={createInitialDeal}
                  onChange={(e) => setCreateInitialDeal(e.target.checked)}
                  className="w-4 h-4 text-[#D97757] rounded"
                />
              </label>

              {/* Notas de onboarding */}
              <div>
                <label className="block text-xs font-semibold text-[#141414] mb-1">
                  Notas de Instalación o Preguntas Frecuentes (FAQ)
                </label>
                <textarea
                  rows={2}
                  placeholder="ej. Precios promedio, promociones activas o enlaces de agendamiento para que el equipo los consulte..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-[#F6F5F2] border border-[#ECEAE3] rounded-xl px-3 py-2 text-xs text-[#141414] focus:outline-none focus:border-[#D4AF37]"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer con Botones de Navegación */}
        <div className="p-4 border-t border-[#F4F3EE] bg-[#FDFDFC] flex items-center justify-between">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                disabled={submitting}
                className="px-3.5 py-2 rounded-2xl bg-[#F6F5F2] hover:bg-[#ECEAE3] text-xs font-semibold text-[#6B6861] flex items-center gap-1.5 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Atrás</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-2 rounded-2xl text-xs font-medium text-[#8C887E] hover:text-[#141414]"
            >
              Cancelar
            </button>

            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-black-gold px-4 py-2 rounded-2xl text-xs font-semibold flex items-center gap-1.5 shadow-sm"
              >
                <span>Continuar</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={submitting}
                className="btn-black-gold px-5 py-2.5 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm disabled:opacity-50"
              >
                {submitting ? (
                  <span>Activando Cliente...</span>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-[#E5C158]" />
                    <span>Finalizar y Activar Cliente</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
