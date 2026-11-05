"use client";

import React, { useState, useMemo } from "react";
import {
  Users,
  Plus,
  Search,
  KeyRound,
  Trash2,
  Check,
  Copy,
  AlertTriangle,
  X,
  Building2,
  Crown,
  UserCheck,
  UserCog,
  RefreshCw,
  Eye,
  EyeOff,
  ShieldAlert,
} from "lucide-react";
import { ROLES, type StoredUserRole } from "@/lib/roles";
import { useUsersManagement, type ManagedUser } from "@/hooks/useUsersManagement";
import { useClientOptions } from "@/hooks/useClientOptions";

export function UsersManagementPanel() {
  const {
    users,
    loading,
    error,
    savingId,
    refresh,
    setRole,
    createUser,
    generateResetLink,
    deleteUser,
  } = useUsersManagement();

  const clients = useClientOptions();

  // Filtros
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [clientFilter, setClientFilter] = useState<string>("all");

  // Modal de Crear Usuario
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState<StoredUserRole>(ROLES.CLIENT);
  const [createClientId, setCreateClientId] = useState<string>("");
  const [createPassword, setCreatePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Credenciales generadas
  const [createdCredentials, setCreatedCredentials] = useState<{
    name: string;
    email: string;
    password?: string;
    role: StoredUserRole;
  } | null>(null);
  const [copiedCredentials, setCopiedCredentials] = useState(false);

  // Modal Enlace de Acceso
  const [resetModalData, setResetModalData] = useState<{
    userName: string;
    userEmail: string;
    recoveryUrl: string;
  } | null>(null);
  const [generatingResetId, setGeneratingResetId] = useState<string | null>(null);
  const [copiedResetUrl, setCopiedResetUrl] = useState(false);

  // Modal Eliminación
  const [userToDelete, setUserToDelete] = useState<ManagedUser | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
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
    setCreateClientId(clients[0]?.id || "");
    setCreatePassword(generateRandomPassword());
    setCreateError(null);
    setIsCreateOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim() || !createEmail.trim()) {
      setCreateError("Completa el nombre y correo electrónico.");
      return;
    }

    setIsSubmitting(true);
    setCreateError(null);

    const payload = {
      name: createName.trim(),
      email: createEmail.trim().toLowerCase(),
      password: createPassword || undefined,
      role: createRole,
      clientId: createRole === ROLES.ADMIN ? null : createClientId || null,
    };

    const res = await createUser(payload);
    setIsSubmitting(false);

    if (res.success) {
      setIsCreateOpen(false);
      setCreatedCredentials({
        name: createName.trim(),
        email: createEmail.trim().toLowerCase(),
        password: res.tempPassword,
        role: createRole,
      });
    } else {
      setCreateError(res.error || "No se pudo crear el usuario.");
    }
  };

  const handleGenerateReset = async (user: ManagedUser) => {
    setGeneratingResetId(user.id);
    const res = await generateResetLink(user.id);
    setGeneratingResetId(null);
    if (res.success && res.recoveryUrl) {
      setResetModalData({
        userName: user.name,
        userEmail: user.email,
        recoveryUrl: res.recoveryUrl,
      });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setDeleteError(null);
    const res = await deleteUser(userToDelete.id);
    setIsDeleting(false);
    if (res.success) {
      setUserToDelete(null);
    } else {
      setDeleteError(res.error || "No se pudo eliminar el usuario.");
    }
  };

  // Filtrado
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchRole =
        roleFilter === "all" ||
        (roleFilter === "ADMIN" && u.role === "ADMIN") ||
        (roleFilter === "CLIENT_OWNER" && u.role === "CLIENT_OWNER") ||
        (roleFilter === "CLIENT" && u.role === "CLIENT");
      const matchClient =
        clientFilter === "all" ||
        (clientFilter === "bunker" && !u.clientId) ||
        u.clientId === clientFilter;
      return matchSearch && matchRole && matchClient;
    });
  }, [users, search, roleFilter, clientFilter]);

  return (
    <div className="space-y-4">
      {/* Barra de cabecera: Título, Filtros y Botón de Creación */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-[#EAECF0] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold shrink-0">
            <Users className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#101828]">Equipo y Usuarios</h2>
            <p className="text-xs text-[#667085]">
              {users.length} miembros registrados en la plataforma
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="p-2.5 rounded-xl border border-[#EAECF0] bg-white hover:bg-[#F8F9FA] text-[#475467] text-xs transition-colors shadow-2xs"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-600" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn-black-gold rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Crear Usuario</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Controles de Búsqueda y Filtros Rápidos */}
      <div className="p-2.5 bg-white rounded-xl border border-[#EAECF0] shadow-2xs flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#98A2B3] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full pl-9 pr-3 py-1.5 text-xs text-[#101828] placeholder:text-[#98A2B3] bg-transparent focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[#EAECF0] bg-[#F9FAFB] text-xs text-[#344054] font-medium focus:outline-none cursor-pointer"
          >
            <option value="all">Todos los roles</option>
            <option value="ADMIN">Administrador / CEO</option>
            <option value="CLIENT_OWNER">Manager de Empresa</option>
            <option value="CLIENT">Ejecutivo de Ventas</option>
          </select>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[#EAECF0] bg-[#F9FAFB] text-xs text-[#344054] font-medium focus:outline-none cursor-pointer max-w-[180px] truncate"
          >
            <option value="all">Todas las empresas</option>
            <option value="bunker">Equipo Interno Bunker</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-2xs overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#667085]">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-600" />
            <span>Cargando miembros del equipo...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#667085] space-y-1.5">
            <p className="font-semibold text-[#101828]">No se encontraron usuarios</p>
            <p>Prueba ajustando los filtros de búsqueda o crea un nuevo miembro.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] border-b border-[#EAECF0] text-[11px] font-bold uppercase tracking-wider text-[#475467]">
                <tr>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Rol en el Sistema</th>
                  <th className="py-3 px-4">Empresa Asignada</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EAECF0]">
                {filteredUsers.map((u) => {
                  const isOwner = u.role === ROLES.CLIENT_OWNER;
                  const isAdmin = u.role === ROLES.ADMIN;
                  const isSeller = u.role === ROLES.CLIENT;

                  return (
                    <tr key={u.id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-900 text-amber-300 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-[#101828] block truncate">
                              {u.name}
                            </span>
                            <span className="text-[11px] text-[#667085] block truncate">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-300/80">
                            <Crown className="w-3 h-3 text-amber-600" />
                            Administrador / CEO
                          </span>
                        ) : isOwner ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            <UserCheck className="w-3 h-3 text-blue-600" />
                            Manager de Empresa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200">
                            <UserCog className="w-3 h-3 text-slate-500" />
                            Ejecutivo de Ventas
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {u.client ? (
                          <div className="flex items-center gap-1.5 font-medium text-[#101828]">
                            <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span className="truncate max-w-[160px]">{u.client.name}</span>
                          </div>
                        ) : (
                          <span className="text-[#667085] font-medium">Bunker Agency</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Activo
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón Enlace de Acceso */}
                          <button
                            type="button"
                            onClick={() => handleGenerateReset(u)}
                            disabled={generatingResetId === u.id}
                            className="p-1.5 rounded-lg border border-[#EAECF0] hover:bg-white text-[#475467] hover:text-[#101828] text-xs transition-colors shadow-2xs"
                            title="Generar enlace de acceso directo"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-600" />
                          </button>

                          {/* Cambio de Rol (solo para usuarios de cliente) */}
                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={() => setRole(u.id, isOwner ? ROLES.CLIENT : ROLES.CLIENT_OWNER)}
                              disabled={savingId === u.id}
                              className="px-2 py-1 rounded-lg border border-[#EAECF0] hover:bg-white text-[#475467] hover:text-[#101828] text-[11px] font-medium transition-colors shadow-2xs"
                              title={isOwner ? "Degradar a Ejecutivo de Ventas" : "Promover a Manager de Empresa"}
                            >
                              {isOwner ? "Hacer Asesor" : "Hacer Manager"}
                            </button>
                          )}

                          {/* Botón Eliminar */}
                          <button
                            type="button"
                            onClick={() => setUserToDelete(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: Crear Usuario Centralizado */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#EAECF0] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAECF0]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#101828]">Nuevo Usuario</h3>
                  <p className="text-[11px] text-[#667085]">
                    Crea un acceso con su rol correspondiente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-[#98A2B3] hover:text-[#101828]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#344054] mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Ej: Laura Gómez"
                  className="w-full px-3 py-2 rounded-xl border border-[#D0D5DD] bg-white text-xs text-[#101828] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#344054] mb-1">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="laura@empresa.com"
                  className="w-full px-3 py-2 rounded-xl border border-[#D0D5DD] bg-white text-xs text-[#101828] focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#344054] mb-1">
                  Rol y Nivel de Acceso *
                </label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as StoredUserRole)}
                  className="w-full px-3 py-2 rounded-xl border border-[#D0D5DD] bg-white text-xs text-[#101828] focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value={ROLES.CLIENT}>Ejecutivo de Ventas (Atención y llamadas)</option>
                  <option value={ROLES.CLIENT_OWNER}>Manager de Empresa (Supervisión comercial)</option>
                  <option value={ROLES.ADMIN}>Administrador / CEO (Acceso total)</option>
                </select>
              </div>

              {createRole !== ROLES.ADMIN && (
                <div>
                  <label className="block font-semibold text-[#344054] mb-1">
                    Empresa Asignada *
                  </label>
                  <select
                    value={createClientId}
                    onChange={(e) => setCreateClientId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[#D0D5DD] bg-white text-xs text-[#101828] focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-[#344054]">
                    Contraseña Inicial
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreatePassword(generateRandomPassword())}
                    className="text-[11px] text-amber-700 hover:text-amber-800 font-semibold underline"
                  >
                    Generar segura
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Contraseña inicial"
                    className="w-full px-3 py-2 pr-9 rounded-xl border border-[#D0D5DD] bg-white text-xs font-mono text-[#101828] focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#101828]"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-[#EAECF0]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[#D0D5DD] bg-white text-xs font-semibold text-[#344054] hover:bg-[#F8F9FA]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-black-gold rounded-xl px-5 py-2 text-xs font-semibold flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <span>Crear Usuario</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Credenciales creadas */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#EAECF0] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#101828]">Usuario Creado con Éxito</h3>
                <p className="text-xs text-[#667085]">
                  Comparte las credenciales de acceso con el usuario
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F8F9FA] border border-[#EAECF0] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#667085]">Nombre:</span>
                <span className="font-semibold text-[#101828]">{createdCredentials.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Correo:</span>
                <span className="font-semibold text-[#101828] font-mono">{createdCredentials.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#667085]">Contraseña:</span>
                <span className="font-semibold text-[#101828] font-mono">{createdCredentials.password || "Enlace enviado"}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const text = `Hola ${createdCredentials.name}, tu acceso a Bunker CRM:\nCorreo: ${createdCredentials.email}\nContraseña: ${createdCredentials.password || ""}\nEnlace: https://bunkervip.com/login`;
                  navigator.clipboard.writeText(text);
                  setCopiedCredentials(true);
                  setTimeout(() => setCopiedCredentials(false), 2500);
                }}
                className="px-4 py-2 rounded-xl bg-white border border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F8F9FA] flex items-center gap-1.5"
              >
                {copiedCredentials ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-amber-600" />}
                <span>{copiedCredentials ? "Copiado" : "Copiar Credenciales"}</span>
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="btn-black-gold rounded-xl px-5 py-2 text-xs font-semibold"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Enlace de Acceso Directo */}
      {resetModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#EAECF0] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#101828]">Enlace de Acceso Rápido</h3>
                <p className="text-xs text-[#667085]">
                  Para {resetModalData.userName} ({resetModalData.userEmail})
                </p>
              </div>
            </div>

            <div className="p-3 bg-[#F8F9FA] rounded-xl border border-[#EAECF0] break-all text-xs font-mono text-slate-800">
              {resetModalData.recoveryUrl}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(resetModalData.recoveryUrl);
                  setCopiedResetUrl(true);
                  setTimeout(() => setCopiedResetUrl(false), 2500);
                }}
                className="px-4 py-2 rounded-xl bg-white border border-[#D0D5DD] text-xs font-semibold text-[#344054] hover:bg-[#F8F9FA] flex items-center gap-1.5"
              >
                {copiedResetUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-amber-600" />}
                <span>{copiedResetUrl ? "Enlace Copiado" : "Copiar Enlace"}</span>
              </button>
              <button
                type="button"
                onClick={() => setResetModalData(null)}
                className="btn-black-gold rounded-xl px-5 py-2 text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmación de Eliminación */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#EAECF0] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#101828]">¿Eliminar usuario?</h3>
                <p className="text-xs text-[#667085]">Esta acción revocará todo acceso a la plataforma</p>
              </div>
            </div>

            <p className="text-xs text-[#475467] leading-relaxed">
              Estás a punto de eliminar permanentemente a <strong>{userToDelete.name}</strong> ({userToDelete.email}).
              Esta acción no se puede deshacer.
            </p>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-[#EAECF0]">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-xl border border-[#D0D5DD] bg-white text-xs font-semibold text-[#344054] hover:bg-[#F8F9FA]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
              >
                {isDeleting ? "Eliminando..." : "Eliminar Definitivamente"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

