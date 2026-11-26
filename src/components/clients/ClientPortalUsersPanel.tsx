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
import ActionMenu, { type ActionMenuItem } from "@/components/ui/ActionMenu";
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
    <section className="p-6 rounded-[28px] bg-white dark:bg-[#121417] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion space-y-5 transition-all">
      {/* Cabecera del Panel */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#F2F4F7] dark:border-[#1F242D]">
        <div className="space-y-1">
          <h3 className="font-black text-sm text-[#121417] dark:text-white tracking-tight">Usuarios del portal</h3>
          <p className="text-[11px] text-[#8C929D] font-medium leading-relaxed">
            {users.length} {users.length === 1 ? "usuario" : "usuarios"} · El Dueño supervisa; los Asesores atienden leads e inbox.
          </p>
        </div>

        {onCreateUser && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="px-4 py-2 rounded-full bg-[#121417] hover:bg-[#1E2229] dark:bg-white dark:hover:bg-[#F3F4F7] text-white dark:text-[#121417] font-bold text-xs flex items-center gap-1.5 shadow-orvion transition-all hover:scale-[1.01] active:scale-[0.99] self-start sm:self-auto flex-shrink-0 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400 dark:text-[#121417]" />
            <span>Crear Usuario</span>
          </button>
        )}
      </div>

      {error && (
        <div role="alert" className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-700 dark:text-rose-400">
          {error}
        </div>
      )}

      {/* Lista de Usuarios o Estado Vacío */}
      {users.length === 0 ? (
        <div className="p-8 rounded-2xl bg-[#F8F9FA] dark:bg-[#181B22] border border-dashed border-[#E2E5EB] dark:border-[#242A35] text-center space-y-3">
          <p className="text-xs font-bold text-[#121417] dark:text-white">
            Esta empresa todavía no tiene usuarios en el portal.
          </p>
          <p className="text-[11px] text-[#8C929D] font-medium max-w-md mx-auto">
            Crea las credenciales de acceso para que el dueño o sus asesores comerciales ingresen a gestionar sus prospectos en su portal de cliente.
          </p>
          {onCreateUser && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-[#121417] hover:bg-[#1E2229] dark:bg-white dark:hover:bg-[#F3F4F7] text-white dark:text-[#121417] text-xs font-bold shadow-orvion transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400 dark:text-[#121417]" />
              <span>Crear Primer Usuario</span>
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-[#F2F4F7] dark:divide-[#1F242D]">
          {users.map((portalUser) => {
            const isOwner = isClientOwnerRole(portalUser.role);
            const menuItems: ActionMenuItem[] = [
              ...(onGenerateResetLink
                ? [
                    {
                      key: "reset",
                      label: "Enlace de acceso / restablecer contraseña",
                      icon: KeyRound,
                      onSelect: () => {
                        if (generatingResetId !== portalUser.id) handleGenerateReset(portalUser);
                      },
                    },
                  ]
                : []),
              {
                key: "role",
                label: isOwner ? "Cambiar a Asesor" : "Cambiar a Dueño",
                icon: UserCog,
                onSelect: () => {
                  if (savingId !== portalUser.id) {
                    onSetRole(portalUser.id, isOwner ? ROLES.CLIENT : ROLES.CLIENT_OWNER);
                  }
                },
              },
              ...(onDeleteUser
                ? [
                    {
                      key: "delete",
                      label: "Eliminar usuario",
                      icon: Trash2,
                      onSelect: () => {
                        if (savingId === portalUser.id || isDeletingUser) return;
                        setDeleteError(null);
                        setUserToDelete(portalUser);
                      },
                    },
                  ]
                : []),
            ];
            return (
              <li key={portalUser.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#242A35] text-[#121417] dark:text-white flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-2xs">
                    {portalUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#121417] dark:text-white flex items-center gap-1.5 truncate">
                      {portalUser.name}
                      {!portalUser.isActive && (
                        <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/50">
                          Inactivo
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-[#8C929D] font-medium truncate mt-0.5">
                      {portalUser.email} · {isOwner ? "Dueño" : "Asesor"}
                    </p>
                  </div>
                </div>

                <div className="self-end sm:self-auto flex-shrink-0">
                  <ActionMenu items={menuItems} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Modal: Crear Nuevo Usuario para el Cliente */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white dark:bg-[#121417] rounded-[32px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion max-w-lg w-full overflow-hidden">
            {/* Cabecera del Modal */}
            <div className="p-5 border-b border-[#F2F4F7] dark:border-[#1F242D] flex items-center justify-between bg-[#F8F9FA] dark:bg-[#181B22]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-400/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <UserCog className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-[#121417] dark:text-white tracking-tight">
                    Crear Usuario del Portal
                  </h4>
                  <p className="text-[11px] text-[#8C929D] font-medium">
                    {clientName ? `Para ${clientName}` : "Para esta empresa"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="w-8 h-8 rounded-full bg-white dark:bg-[#242A35] border border-[#E2E5EB] dark:border-[#2A2E37] text-[#8C929D] hover:text-[#121417] dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 space-y-4">
              {createdCredentials ? (
                /* Pantalla de Éxito con Credenciales Copiables */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-900 dark:text-emerald-300 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold">¡Usuario creado y activado exitosamente!</p>
                      <p className="text-[11px] text-emerald-800 dark:text-emerald-400">
                        Copia las credenciales a continuación para enviarlas al cliente por WhatsApp o correo.
                      </p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-[#181B22] border border-[#E2E5EB] dark:border-[#242A35] space-y-2.5 text-xs font-mono">
                    <div className="flex justify-between items-center text-[#8C929D] border-b border-[#E2E5EB] dark:border-[#242A35] pb-2 text-[11px] font-sans">
                      <span>Credenciales de Acceso</span>
                      <span className="font-bold text-[#121417] dark:text-white">
                        Rol: {createdCredentials.role === ROLES.CLIENT_OWNER ? "Dueño" : "Asesor"}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-[11px]">
                      <div>
                        <span className="text-[#8C929D]">Enlace de Login: </span>
                        <span className="text-[#121417] dark:text-white font-bold">{getLoginUrl()}</span>
                      </div>
                      <div>
                        <span className="text-[#8C929D]">Usuario (Correo): </span>
                        <span className="text-[#121417] dark:text-white font-bold">{createdCredentials.email}</span>
                      </div>
                      <div>
                        <span className="text-[#8C929D]">Contraseña: </span>
                        <span className="text-amber-800 dark:text-amber-300 font-bold bg-amber-100/70 dark:bg-amber-950/50 px-2 py-0.5 rounded-md">
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
                      className="w-full sm:flex-1 py-2.5 px-4 rounded-full bg-[#121417] text-white hover:bg-[#1E2229] dark:bg-white dark:text-[#121417] font-bold text-xs flex items-center justify-center gap-2 shadow-orvion transition-all cursor-pointer"
                    >
                      {copiedMessage ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedMessage ? "¡Copiado al portapapeles!" : "Copiar Datos para WhatsApp / Email"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsCreateOpen(false)}
                      className="w-full sm:w-auto py-2.5 px-4 rounded-full border border-[#E2E5EB] dark:border-[#242A35] hover:bg-[#F8F9FA] dark:hover:bg-[#1A1D24] text-xs font-bold text-[#121417] dark:text-white transition-colors cursor-pointer"
                    >
                      Cerrar
                    </button>
                  </div>
                </div>
              ) : (
                /* Formulario de Creación */
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                  {createError && (
                    <div className="p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-700 dark:text-rose-400">
                      {createError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#121417] dark:text-white pl-1">
                      Nombre Completo <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Carlos Gómez"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#242A35] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#121417] dark:text-white pl-1">
                      Correo Electrónico (Login) <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="carlos@empresa.com"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#242A35] rounded-full px-4 py-2.5 text-xs text-[#121417] dark:text-white focus:outline-hidden focus:border-amber-400"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-[#121417] dark:text-white pl-1">
                      Rol en el Portal de la Empresa
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setCreateRole(ROLES.CLIENT)}
                        className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                          createRole === ROLES.CLIENT
                            ? "border-[#121417] bg-[#121417] text-white dark:border-white dark:bg-white dark:text-[#121417] shadow-xs"
                            : "border-[#E2E5EB] dark:border-[#242A35] bg-white dark:bg-[#1A1D24] text-[#8C929D] hover:bg-[#F8F9FA]"
                        }`}
                      >
                        <span className="block font-bold text-xs">Vendedor Comercial</span>
                        <span className="block text-[10px] mt-0.5 opacity-80">
                          Atiende prospectos, llamadas e inbox multicanal.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setCreateRole(ROLES.CLIENT_OWNER)}
                        className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${
                          createRole === ROLES.CLIENT_OWNER
                            ? "border-amber-500 bg-amber-500/10 text-amber-900 dark:text-amber-300 shadow-xs"
                            : "border-[#E2E5EB] dark:border-[#242A35] bg-white dark:bg-[#1A1D24] text-[#8C929D] hover:bg-[#F8F9FA]"
                        }`}
                      >
                        <span className="block font-bold text-xs flex items-center gap-1">
                          <Crown className="w-3 h-3 text-amber-500" /> Dueño / Director
                        </span>
                        <span className="block text-[10px] mt-0.5 opacity-80">
                          Supervisa en vivo, escucha llamadas y audita SLA.
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between pl-1">
                      <label className="text-xs font-bold text-[#121417] dark:text-white">
                        Contraseña Inicial
                      </label>
                      <button
                        type="button"
                        onClick={() => setCreatePassword(generateRandomPassword())}
                        className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline font-bold flex items-center gap-1 cursor-pointer"
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
                        className="w-full bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#242A35] rounded-full pl-4 pr-11 py-2.5 text-xs font-mono text-[#121417] dark:text-white focus:outline-hidden focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3.5 top-2.5 text-[#8C929D] hover:text-[#121417] dark:hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <p className="text-[10px] text-[#8C929D] pl-1 font-medium">
                      Se le entregará a este usuario para su primer inicio de sesión.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F2F4F7] dark:border-[#1F242D]">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => setIsCreateOpen(false)}
                      className="px-4 py-2 rounded-full border border-[#E2E5EB] dark:border-[#242A35] hover:bg-[#F8F9FA] dark:hover:bg-[#1A1D24] text-xs font-bold text-[#8C929D] hover:text-[#121417] dark:hover:text-white cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-5 py-2 rounded-full bg-[#121417] text-white hover:bg-[#1E2229] dark:bg-white dark:text-[#121417] text-xs font-bold flex items-center gap-1.5 shadow-orvion cursor-pointer disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Creando...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 text-amber-400 dark:text-[#121417]" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white dark:bg-[#121417] rounded-[32px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2F4F7] dark:border-[#1F242D]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-xs text-[#121417] dark:text-white">Enlace de Acceso Seguro</h4>
                  <p className="text-[10px] text-[#8C929D] font-medium">{resetModalData.userName} ({resetModalData.userEmail})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setResetModalData(null)}
                className="w-8 h-8 rounded-full bg-[#F8F9FA] dark:bg-[#1A1D24] text-[#8C929D] hover:text-[#121417] dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#8C929D] leading-relaxed">
              Este enlace permite al usuario acceder o restablecer su contraseña directamente en Supabase sin necesidad de recordar la anterior:
            </p>

            <div className="p-3.5 rounded-2xl bg-[#F8F9FA] dark:bg-[#181B22] border border-[#E2E5EB] dark:border-[#242A35] text-[11px] font-mono break-all text-[#121417] dark:text-white">
              {resetModalData.recoveryUrl}
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => copyToClipboard(resetModalData.recoveryUrl, () => setCopiedResetUrl(true))}
                className="flex-1 py-2.5 px-4 rounded-full bg-[#121417] hover:bg-[#1E2229] dark:bg-white dark:text-[#121417] text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-orvion cursor-pointer"
              >
                {copiedResetUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedResetUrl ? "¡Enlace copiado!" : "Copiar Enlace"}</span>
              </button>
              <button
                type="button"
                onClick={() => setResetModalData(null)}
                className="px-4 py-2.5 rounded-full border border-[#E2E5EB] dark:border-[#242A35] text-xs font-bold text-[#121417] dark:text-white hover:bg-[#F8F9FA] dark:hover:bg-[#1A1D24] cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmación de Eliminación de Usuario */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in-up">
          <div className="bg-white dark:bg-[#121417] rounded-[32px] border border-rose-200 dark:border-rose-900/60 shadow-orvion max-w-md w-full overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#F2F4F7] dark:border-[#1F242D]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-[#121417] dark:text-white">Eliminar Usuario</h4>
                  <p className="text-[11px] text-[#8C929D]">Acción permanente e irreversible</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={isDeletingUser}
                className="w-8 h-8 rounded-full bg-[#F8F9FA] dark:bg-[#1A1D24] text-[#8C929D] hover:text-[#121417] dark:hover:text-white flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {deleteError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-700 dark:text-rose-400">
                {deleteError}
              </div>
            )}

            <p className="text-xs text-[#8C929D] leading-relaxed">
              ¿Estás seguro de que deseas eliminar permanentemente a{" "}
              <strong className="text-[#121417] dark:text-white font-bold">{userToDelete.name}</strong> ({userToDelete.email})?
            </p>

            <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#242A35] text-[11px] text-[#8C929D] space-y-1.5">
              <p className="font-bold text-[#121417] dark:text-white">Se aplicará lo siguiente:</p>
              <ul className="list-disc list-inside space-y-0.5">
                <li>Se desvinculará de los prospectos, actividades y llamadas asociadas.</li>
                <li>Se eliminará su cuenta de acceso en Supabase Auth de forma inmediata.</li>
                <li>Se guardará un registro de auditoría de esta eliminación.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#F2F4F7] dark:border-[#1F242D]">
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-full border border-[#E2E5EB] dark:border-[#242A35] hover:bg-[#F8F9FA] dark:hover:bg-[#1A1D24] text-xs font-bold text-[#8C929D] hover:text-[#121417] dark:hover:text-white cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeletingUser}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-50"
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
