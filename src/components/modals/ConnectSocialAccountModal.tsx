"use client";

import React, { useState } from "react";
import {
  X,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { ACCOUNT_TYPE } from "@/lib/constants/integrations";

export interface ClientOption {
  id: string;
  name: string;
}

interface ConnectSocialAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clients: ClientOption[];
  initialProvider?: string;
  initialClientId?: string;
}

export function ConnectSocialAccountModal({
  isOpen,
  onClose,
  onSuccess,
  clients,
  initialProvider = "meta",
  initialClientId = "",
}: ConnectSocialAccountModalProps) {
  const [provider, setProvider] = useState<string>(initialProvider);
  const [accountType, setAccountType] = useState<string>(ACCOUNT_TYPE.META_AD_ACCOUNT);
  const [targetType, setTargetType] = useState<"agency" | "client">(
    initialClientId ? "client" : "client"
  );
  const [selectedClientId, setSelectedClientId] = useState<string>(initialClientId);
  const [accountName, setAccountName] = useState("");
  const [externalId, setExternalId] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProviderSelect = (p: string) => {
    setProvider(p);
    if (p === "meta") {
      setAccountType(ACCOUNT_TYPE.META_AD_ACCOUNT);
    } else if (p === "tiktok") {
      setAccountType(ACCOUNT_TYPE.TIKTOK_ADVERTISER);
    } else if (p === "instagram") {
      setProvider("meta");
      setAccountType(ACCOUNT_TYPE.INSTAGRAM_BUSINESS);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!accountName.trim()) {
      setErrorMessage("Por favor ingresa el nombre de la cuenta.");
      return;
    }
    if (!externalId.trim()) {
      setErrorMessage("Por favor ingresa el ID de la cuenta publicitaria o página.");
      return;
    }
    if (targetType === "client" && !selectedClientId) {
      setErrorMessage("Por favor selecciona a qué cliente pertenece esta cuenta.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch("/api/integrations/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider,
          accountType,
          accountName: accountName.trim(),
          externalId: externalId.trim(),
          clientId: targetType === "client" ? selectedClientId : null,
          accessToken: accessToken.trim() || null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onSuccess();
        onClose();
      } else {
        setErrorMessage(data.error || "No se pudo conectar la cuenta.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error de red al conectar";
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-[#E8E6DF] overflow-hidden">
        {/* Header con gradiente sutil */}
        <div className="px-6 py-5 bg-[#FAF9F5] border-b border-[#E8E6DF] flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#D97757]">
              Conexión de Pauta & Leads
            </span>
            <h2 className="text-lg font-semibold text-[#1F1E1D] mt-0.5">
              Conectar Cuenta de Red Social
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#82807C] hover:text-[#1F1E1D] hover:bg-[#E8E6DF] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Selector de Red Social con Íconos de Marca */}
          <div>
            <label className="block text-xs font-semibold text-[#1F1E1D] mb-2.5">
              1. Selecciona la Red Social o Plataforma de Pauta
            </label>
            <div className="grid grid-cols-3 gap-3">
              {/* Facebook / Meta */}
              <button
                type="button"
                onClick={() => handleProviderSelect("meta")}
                className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center cursor-pointer ${
                  provider === "meta" && accountType !== ACCOUNT_TYPE.INSTAGRAM_BUSINESS
                    ? "border-[#1877F2] bg-blue-50/50 shadow-sm ring-2 ring-[#1877F2]/20"
                    : "border-[#E8E6DF] bg-white hover:border-[#D1CFCA]"
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-[#1877F2] flex items-center justify-center text-white shadow-sm">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-[#1F1E1D]">Facebook / Meta</span>
                <span className="text-[10px] text-[#82807C]">Ads & Páginas</span>
              </button>

              {/* Instagram */}
              <button
                type="button"
                onClick={() => handleProviderSelect("instagram")}
                className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center cursor-pointer ${
                  accountType === ACCOUNT_TYPE.INSTAGRAM_BUSINESS
                    ? "border-[#E4405F] bg-pink-50/50 shadow-sm ring-2 ring-[#E4405F]/20"
                    : "border-[#E8E6DF] bg-white hover:border-[#D1CFCA]"
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FD1D1D] via-[#E1306C] to-[#C13584] flex items-center justify-center text-white shadow-sm">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-[#1F1E1D]">Instagram</span>
                <span className="text-[10px] text-[#82807C]">Business Profile</span>
              </button>

              {/* TikTok */}
              <button
                type="button"
                onClick={() => handleProviderSelect("tiktok")}
                className={`p-3 rounded-2xl border transition-all flex flex-col items-center gap-2 text-center cursor-pointer ${
                  provider === "tiktok"
                    ? "border-black bg-gray-50 shadow-sm ring-2 ring-black/20"
                    : "border-[#E8E6DF] bg-white hover:border-[#D1CFCA]"
                }`}
              >
                <div className="w-9 h-9 rounded-xl bg-black flex items-center justify-center text-white shadow-sm">
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.24 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold text-[#1F1E1D]">TikTok Ads</span>
                <span className="text-[10px] text-[#82807C]">Advertiser</span>
              </button>
            </div>
          </div>

          {/* 2. ¿A quién pertenece esta cuenta? (BM Agencia vs Cliente Específico) */}
          <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-3">
            <label className="block text-xs font-semibold text-[#1F1E1D]">
              2. ¿A quién pertenece esta cuenta publicitaria?
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                onClick={() => setTargetType("client")}
                className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                  targetType === "client"
                    ? "bg-white border-[#D97757] shadow-sm ring-1 ring-[#D97757]"
                    : "bg-white/60 border-[#E8E6DF] hover:bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="targetType"
                  checked={targetType === "client"}
                  onChange={() => setTargetType("client")}
                  className="mt-0.5 text-[#D97757] focus:ring-[#D97757]"
                />
                <div>
                  <span className="font-semibold text-[#1F1E1D] block">Cliente Comercial</span>
                  <span className="text-[11px] text-[#82807C] leading-tight block mt-0.5">
                    El cliente verá sus campañas y leads en su propio portal.
                  </span>
                </div>
              </label>

              <label
                onClick={() => setTargetType("agency")}
                className={`p-3 rounded-xl border text-xs cursor-pointer flex items-start gap-2.5 transition-all ${
                  targetType === "agency"
                    ? "bg-white border-[#D97757] shadow-sm ring-1 ring-[#D97757]"
                    : "bg-white/60 border-[#E8E6DF] hover:bg-white"
                }`}
              >
                <input
                  type="radio"
                  name="targetType"
                  checked={targetType === "agency"}
                  onChange={() => setTargetType("agency")}
                  className="mt-0.5 text-[#D97757] focus:ring-[#D97757]"
                />
                <div>
                  <span className="font-semibold text-[#1F1E1D] block">Portafolio BM Agencia</span>
                  <span className="text-[11px] text-[#82807C] leading-tight block mt-0.5">
                    Cuenta base de Bunker Agency (visible para administradores).
                  </span>
                </div>
              </label>
            </div>

            {targetType === "client" && (
              <div className="pt-2 animate-in fade-in">
                <label className="block text-[11px] font-medium text-[#4D4C48] mb-1">
                  Selecciona el Cliente:
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  className="w-full bg-white border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  required
                >
                  <option value="">-- Elige un cliente (ej. Carrito Naranja) --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* 3. Datos de la Cuenta (Nombre e ID visibles en Meta) */}
          <div className="space-y-3.5">
            <label className="block text-xs font-semibold text-[#1F1E1D]">
              3. Datos del Activo / Cuenta en Meta
            </label>

            <div>
              <label className="block text-[11px] font-medium text-[#6B6966] mb-1">
                Nombre de la Cuenta Publicitaria o Página:
              </label>
              <input
                type="text"
                placeholder="Ej. Workshop Carrito Naranja"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="w-full bg-white border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-[#6B6966] mb-1">
                  Identificador (Ad Account ID / Page ID):
                </label>
                <input
                  type="text"
                  placeholder="Ej. 5194920503935574"
                  value={externalId}
                  onChange={(e) => setExternalId(e.target.value)}
                  className="w-full font-mono bg-white border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#6B6966] mb-1">
                  Tipo de Activo:
                </label>
                <select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value)}
                  className="w-full bg-white border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
                >
                  <option value={ACCOUNT_TYPE.META_AD_ACCOUNT}>Cuenta publicitaria (Ads)</option>
                  <option value={ACCOUNT_TYPE.FACEBOOK_PAGE}>Página de Facebook</option>
                  <option value={ACCOUNT_TYPE.INSTAGRAM_BUSINESS}>Instagram Business</option>
                  <option value={ACCOUNT_TYPE.TIKTOK_ADVERTISER}>TikTok Advertiser</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#6B6966] mb-1">
                Token de Acceso de Usuario del Sistema (Opcional):
              </label>
              <input
                type="password"
                placeholder="EAAB... (dejar vacío si se vinculará por sesión OAuth)"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                className="w-full font-mono bg-white border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D97757]"
              />
              <p className="text-[10px] text-[#82807C] mt-1">
                Se guardará cifrado en PostgreSQL con AES-256-GCM.
              </p>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="pt-3 border-t border-[#E8E6DF] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-[#82807C] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>Aislamiento multi-tenant verificado</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl border border-[#E8E6DF] text-xs font-medium text-[#4D4C48] hover:bg-gray-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={submitting}
                className="flex-1 sm:flex-initial px-5 py-2 rounded-xl btn-black-gold text-xs font-semibold shadow-sm disabled:opacity-50"
              >
                {submitting ? "Vinculando..." : "Vincular Cuenta"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
