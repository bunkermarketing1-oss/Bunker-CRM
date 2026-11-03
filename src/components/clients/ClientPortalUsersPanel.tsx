"use client";

import React, { useState } from "react";
import {
  Crown,
  UserCog,
  Plus,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  X,
  ShieldCheck,
  Sparkles,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { ROLES, isClientOwnerRole, type StoredUserRole } from "@/lib/roles";
import type {
  PortalUser,
  CreatePortalUserInput,
  CreatePortalUserResult,
  ResetLinkResult,
  DeleteUserResult,
} from "@/hooks/useClientPortalUsers";

interface ClientPortalUsersPanelProps {
  clientId?: string;
  clientName?: string;
  users: PortalUser[];
  error: string | null;
  savingId: string | null;
  onSetRole: (userId: string, role: StoredUserRole) => void;
  onCreateUser?: (payload: CreatePortalUserInput) => Promise<CreatePortalUserResult>;
  onGenerateResetLink?: (userId: string) => Promise<ResetLinkResult>;
  onDeleteUser?: (userId: string) => Promise<DeleteUserResult>;
}

/**
 * Panel de usuarios del portal del cliente (solo Bunker). Permite crear nuevos usuarios con
 * rol Asesor o Dueño, generar enlaces de acceso directo, cambiar roles y eliminar usuarios de forma segura.
 */
export function ClientPortalUsersPanel({
  clientId: _clientId,
  clientName,
  users,
  error,
  savingId,
  onSetRole,
  onCreateUser,
  onGenerateResetLink,
  onDeleteUser,
}: ClientPortalUsersPanelProps) {
  // Modal de Crear Usuario
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState<StoredUserRole>(ROLES.CLIENT);
  const [createPassword, setCreatePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Credenciales mostradas tras crear usuario exitosamente
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password?: string;
    role: StoredUserRole;
  } | null>(null);
  const [copiedMessage, setCopiedMessage] = useState(false);

  // Modal / Feedback de enlace de acceso generado
  const [resetModalData, setResetModalData] = useState<{
    userName: string;
    userEmail: string;
    recoveryUrl: string;
  } | null>(null);
  const [generatingResetId, setGeneratingResetId] = useState<string | null>(null);
  const [copiedResetUrl, setCopiedResetUrl] = useState(false);

  // Modal / Estado de Confirmación de Eliminación
  const [userToDelete, setUserToDelete] = useState<PortalUser | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const generateRandomPassword = () => {
    const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789!@#$%";
    let rand = "";
    for (let i = 0; i < 4; i++) {
      rand += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `Bunker2026!${rand}`;
  };

  const handleOpenCreate = () => {
    setCreateName("");
    setCreateEmail("");
    setCreateRole(ROLES.CLIENT);
    setCreatePassword(generateRandomPassword());
    setShowPassword(false);
    setCreateError(null);
    setCreatedCredentials(null);
    setCopiedMessage(false);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onCreateUser) return;
    if (!createName.trim() || createName.trim().length < 2) {
      setCreateError("El nombre debe tener al menos 2 caracteres.");
      return;
    }
    if (!createEmail.trim() || !createEmail.includes("@")) {
      setCreateError("Ingresa un correo electrónico válido.");
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    const res = await onCreateUser({
      name: createName.trim(),
      email: createEmail.trim().toLowerCase(),
      password: createPassword || undefined,
      role: createRole,
    });

    setIsSubmitting(false);

    if (res.success) {
      setCreatedCredentials({
        name: createName.trim(),
        email: createEmail.trim().toLowerCase(),
        password: res.tempPassword || createPassword,
        role: createRole,
      });
    } else {
      setCreateError(res.error || "Error al crear el usuario.");
    }
  };

  const handleGenerateReset = async (user: PortalUser) => {
    if (!onGenerateResetLink) return;
    setGeneratingResetId(user.id);
    setCopiedResetUrl(false);

    const res = await onGenerateResetLink(user.id);
    setGeneratingResetId(null);

    if (res.success && res.recoveryUrl) {
      setResetModalData({
        userName: user.name,
        userEmail: user.email,
        recoveryUrl: res.recoveryUrl,
      });
    } else {
      alert(res.error || "No se pudo generar el enlace de acceso.");
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete || !onDeleteUser) return;
    setIsDeletingUser(true);
    setDeleteError(null);
    const res = await onDeleteUser(userToDelete.id);
    setIsDeletingUser(false);
    if (res.success) {
      setUserToDelete(null);
    } else {
      setDeleteError(res.error || "No se pudo eliminar el usuario.");
    }
  };

  const copyToClipboard = async (text: string, onSuccess: () => void) => {
    try {
      await navigator.clipboard.writeText(text);
      onSuccess();
      setTimeout(() => onSuccess(), 2500);
    } catch {
      // Ignorar fallo de portapapeles
    }
  };

  const getLoginUrl = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/login`;
    }
    return "https://crm.bunkermarketing.com.co/login";
  };

  return (
    <section className="p-5 rounded-2xl bg-white border border-[#E8E6DF] shadow-sm space-y-4">
      {/* Cabecera del Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#F0EEE8]">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm text-[#1F1E1D] flex items-center gap-2">
              <UserCog className="w-4 h-4 text-[#D97757]" />
              Usuarios del portal
            </h3>
            {users.length > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 text-[#1F1E1D] border border-neutral-200">
                {users.length} {users.length === 1 ? "usuario" : "usuarios"}
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#82807C] leading-relaxed">
            Estructura del cliente: Cuenta del Dueño (supervisa vendedores y llamadas) y Vendedores comerciales (atienden leads e inbox). Ambos ven métricas de campañas publicitarias en modo de solo lectura.
          </p>
        </div>

        {onCreateUser && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-3.5 py-1.5 rounded-xl bg-[#1F1E1D] text-[#E5C158] hover:bg-[#2A2826] font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all self-start sm:self-auto flex-shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#E5C158]" />
            <span>Crear Usuario</span>
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Lista de Usuarios o Estado Vacío */}
      {users.length === 0 ? (
        <div className="p-5 rounded-xl bg-[#FAF9F5] border border-dashed border-[#E8E6DF] text-center space-y-2.5">
          <p className="text-xs font-medium text-[#1F1E1D]">
            Esta empresa todavía no tiene usuarios en el portal.
          </p>
          <p className="text-[11px] text-[#82807C] max-w-md mx-auto">
            Crea las credenciales de acceso para que el dueño o sus asesores comerciales ingresen a gestionar sus prospectos en su portal de cliente.
          </p>
          {onCreateUser && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1F1E1D] text-[#E5C158] text-xs font-semibold shadow-xs hover:bg-[#2A2826] transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Primer Usuario</span>
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-[#F0EEE8]">
          {users.map((portalUser) => {
            const isOwner = isClientOwnerRole(portalUser.role);
            return (
              <li key={portalUser.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-[#1F1E1D] flex items-center justify-center font-bold text-xs flex-shrink-0">
                    {portalUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-[#1F1E1D] flex items-center gap-1.5 truncate">
                      {portalUser.name}
                      {isOwner ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          <Crown className="w-3 h-3 text-amber-500" /> Dueño
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-md border border-neutral-200">
                          Asesor
                        </span>
                      )}
                      {!portalUser.isActive && (
                        <span className="text-[10px] font-normal text-red-600 bg-red-50 px-1.5 py-0.5 rounded-md">
                          (inactivo)
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-[#82807C] truncate mt-0.5">{portalUser.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                  {/* Botón para generar enlace de acceso directo */}
                  {onGenerateResetLink && (
                    <button
                      type="button"
                      disabled={generatingResetId === portalUser.id}
                      onClick={() => handleGenerateReset(portalUser)}
                      title="Generar enlace de acceso / restablecer contraseña"
                      className="p-1.5 rounded-xl border border-[#E8E6DF] hover:bg-[#FAF9F5] text-[#716F6A] hover:text-[#1F1E1D] transition-colors text-xs flex items-center gap-1 cursor-pointer"
                    >
                      {generatingResetId === portalUser.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#D97757]" />
                      ) : (
                        <KeyRound className="w-3.5 h-3.5 text-[#D97757]" />
                      )}
                      <span className="text-[11px] hidden md:inline">Enlace Acceso</span>
                    </button>
                  )}

                  {/* Selector de Rol: Asesor vs Dueño */}
                  <select
                    aria-label={`Rol de ${portalUser.name}`}
                    value={isOwner ? ROLES.CLIENT_OWNER : ROLES.CLIENT}
                    disabled={savingId === portalUser.id}
                    onChange={(e) => onSetRole(portalUser.id, e.target.value as StoredUserRole)}
                    className="px-2.5 py-1.5 rounded-xl bg-white border border-[#E8E6DF] hover:border-[#1F1E1D] text-[11px] font-medium text-[#1F1E1D] disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
                  >
                    <option value={ROLES.CLIENT}>Asesor</option>
                    <option value={ROLES.CLIENT_OWNER}>Dueño</option>
                  </select>

                  {/* Botón para Eliminar Usuario */}
                  {onDeleteUser && (
                    <button
                      type="button"
                      disabled={savingId === portalUser.id || isDeletingUser}
                      onClick={() => {
                        setDeleteError(null);
                        setUserToDelete(portalUser);
                      }}
                      title={`Eliminar ${portalUser.name}`}
                      className="p-1.5 rounded-xl border border-red-200 hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="text-[11px] hidden lg:inline">Eliminar</span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Modal: Crear Nuevo Usuario para el Cliente */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-[#E8E6DF] shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Cabecera del Modal */}
            <div className="p-5 border-b border-[#F0EEE8] flex items-center justify-between bg-[#FAF9F5]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#1F1E1D] text-[#E5C158] flex items-center justify-center font-bold">
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-[#1F1E1D]">
                    Crear Usuario del Portal
                  </h4>
                  <p className="text-[11px] text-[#716F6A]">
                    {clientName ? `Para ${clientName}` : "Para esta empresa"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="p-1.5 rounded-xl hover:bg-neutral-200/60 text-[#716F6A] transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-4">
              {createdCredentials ? (
                /* Pantalla de Éxito con Credenciales Copiables */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">¡Usuario creado y activado exitosamente!</p>
                      <p className="text-[11px] text-emerald-800">
                        Copia las credenciales a continuación para enviarlas al cliente por WhatsApp o correo.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#FAF9F5] border border-[#E8E6DF] space-y-2.5 text-xs font-mono">
                    <div className="flex justify-between items-center text-[#716F6A] border-b border-[#E8E6DF] pb-2 text-[11px] font-sans">
                      <span>Credenciales de Acceso</span>
                      <span className="font-semibold text-neutral-900">
                        Rol: {createdCredentials.role === ROLES.CLIENT_OWNER ? "Dueño" : "Asesor"}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div>
                        <span className="text-[#8C887E]">Enlace de Login: </span>
                        <span className="text-[#1F1E1D] font-bold">{getLoginUrl()}</span>
                      </div>
                      <div>
                        <span className="text-[#8C887E]">Usuario (Correo): </span>
                        <span className="text-[#1F1E1D] font-bold">{createdCredentials.email}</span>
                      </div>
                      <div>
                        <span className="text-[#8C887E]">Contraseña: </span>
                        <span className="text-amber-800 font-bold bg-amber-100/70 px-2 py-0.5 rounded">
                          {createdCredentials.password}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        const msg = `¡Hola ${createdCredentials.name}! 👋\n\nTienes acceso al Portal de Clientes de Bunker CRM para ${clientName || "tu empresa"}.\n\n🔗 Enlace de acceso: ${getLoginUrl()}\n👤 Usuario: ${createdCredentials.email}\n🔑 Contraseña: ${createdCredentials.password}\n\nIngresa desde tu navegador para gestionar tus prospectos.`;
                        copyToClipboard(msg, () => setCopiedMessage(true));
                      }}
                      className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-[#1F1E1D] text-[#E5C158] font-semibold text-xs flex items-center justify-center gap-2 hover:bg-[#2A2826] transition-colors shadow-sm cursor-pointer"
                    >
                      {copiedMessage ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedMessage ? "¡Copiado al portapapeles!" : "Copiar Datos para WhatsApp / Email"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="w-full sm:w-auto py-2.5 px-4 rounded-xl border border-[#E8E6DF] hover:bg-[#FAF9F5] text-xs font-semibold text-[#1F1E1D] transition-colors cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                /* Formulario de Creación */
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  {createError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                      {createError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#1F1E1D]">
                      Nombre Completo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Carlos Gómez"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#1F1E1D]">
                      Correo Electrónico (Login) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="carlos@empresa.com"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl px-3 py-2 text-xs text-[#1F1E1D] focus:outline-none focus:border-[#D4AF37]"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-[#1F1E1D]">
                      Rol en el Portal de la Empresa
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCreateRole(ROLES.CLIENT)}
                        className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                          createRole === ROLES.CLIENT
                            ? "border-[#1F1E1D] bg-[#1F1E1D] text-white shadow-xs"
                            : "border-[#E8E6DF] bg-white text-[#716F6A] hover:bg-[#FAF9F5]"
                        }`}
                      >
                        <span className="block font-semibold text-xs">Vendedor Comercial</span>
                        <span className="block text-[10px] mt-0.5 opacity-80">
                          Vendedor 1, 2... Atiende leads, llamadas e inbox.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCreateRole(ROLES.CLIENT_OWNER)}
                        className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                          createRole === ROLES.CLIENT_OWNER
                            ? "border-amber-600 bg-amber-50 text-amber-900 shadow-xs"
                            : "border-[#E8E6DF] bg-white text-[#716F6A] hover:bg-[#FAF9F5]"
                        }`}
                      >
                        <span className="block font-semibold text-xs flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-500" /> Dueño / Admin Cliente
                        </span>
                        <span className="block text-[10px] mt-0.5 opacity-80">
                          Supervisa en vivo y escucha llamadas.
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-[#1F1E1D]">
                        Contraseña Inicial
                      </label>
                      <button
                        type="button"
                        onClick={() => setCreatePassword(generateRandomPassword())}
                        className="text-[11px] text-[#D97757] hover:underline font-medium flex items-center gap-1 cursor-pointer"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Generar aleatoria</span>
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={createPassword}
                        onChange={(e) => setCreatePassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full bg-[#FAF9F5] border border-[#E8E6DF] rounded-xl pl-3 pr-10 py-2 text-xs font-mono text-[#1F1E1D] focus:outline-none focus:border-[#D4AF37]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-[#9C9890] hover:text-[#1F1E1D] cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-[#8C887E]">
                      Se le enviará a este usuario para que inicie sesión por primera vez.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F0EEE8]">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setIsCreateOpen(false)}
                      className="px-4 py-2 rounded-xl border border-[#E8E6DF] hover:bg-[#FAF9F5] text-xs font-semibold text-[#716F6A] cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-black-gold px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Creando...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 text-[#E5C158]" />
                          <span>Crear Usuario</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Enlace de Acceso / Restablecimiento */}
      {resetModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-[#E8E6DF] shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0EEE8]">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-semibold text-xs text-[#1F1E1D]">Enlace de Acceso / Reset</h4>
                  <p className="text-[10px] text-[#716F6A]">{resetModalData.userName} ({resetModalData.userEmail})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalData(null)}
                className="p-1 rounded-lg hover:bg-neutral-100 text-[#716F6A] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#6B6966]">
              Este enlace permite al usuario acceder o restablecer su contraseña directamente en Supabase sin necesidad de recordar la anterior:
            </p>

            <div className="p-3 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-[11px] font-mono break-all text-[#1F1E1D]">
              {resetModalData.recoveryUrl}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(resetModalData.recoveryUrl, () => setCopiedResetUrl(true))}
                className="flex-1 py-2 px-3 rounded-xl bg-[#1F1E1D] text-[#E5C158] font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm hover:bg-[#2A2826] cursor-pointer"
              >
                {copiedResetUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedResetUrl ? "¡Enlace copiado!" : "Copiar Enlace"}</span>
              </button>
              <button
                type="button"
                onClick={() => setResetModalData(null)}
                className="px-3 py-2 rounded-xl border border-[#E8E6DF] text-xs font-semibold text-[#1F1E1D] hover:bg-[#FAF9F5] cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de Eliminación de Usuario */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl border border-red-200 shadow-2xl max-w-md w-full overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-[#F0EEE8]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-sm text-[#1F1E1D]">Eliminar Usuario</h4>
                  <p className="text-[11px] text-[#716F6A]">Acción permanente e irreversible</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="p-1 rounded-lg hover:bg-neutral-100 text-[#716F6A] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                {deleteError}
              </div>
            )}

            <p className="text-xs text-[#6B6966] leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente a{" "}
              <strong className="text-[#1F1E1D]">{userToDelete.name}</strong> ({userToDelete.email})?
            </p>

            <div className="p-3.5 rounded-xl bg-[#FAF9F5] border border-[#E8E6DF] text-[11px] text-[#716F6A] space-y-1">
              <p className="font-medium text-[#1F1E1D]">Se aplicará lo siguiente:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Se desvinculará de los prospectos, actividades y llamadas asociadas.</li>
                <li>Se eliminará su cuenta de acceso en Supabase Auth de forma inmediata.</li>
                <li>Se guardará un registro de auditoría de esta eliminación.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#F0EEE8]">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl border border-[#E8E6DF] hover:bg-[#FAF9F5] text-xs font-semibold text-[#716F6A] cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {isDeletingUser ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Definitivamente</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
