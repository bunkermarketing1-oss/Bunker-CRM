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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-5 bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-500 flex items-center justify-center font-bold shrink-0 shadow-2xs">
            <Users className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-[#121417] dark:text-white">Equipo y Usuarios</h2>
            <p className="text-xs text-[#8C929D] font-medium">
              {users.length} miembros registrados en la plataforma
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            className="w-10 h-10 rounded-full border border-[#E2E5EB] dark:border-[#2A2E37] bg-white dark:bg-[#1A1D24] hover:bg-[#F8F9FA] dark:hover:bg-[#2A2E37] text-[#121417] dark:text-white text-xs transition-all shadow-orvion flex items-center justify-center cursor-pointer"
            title="Refrescar lista"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-amber-500" : ""}`} />
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn-black-gold rounded-full px-5 py-2.5 text-xs font-bold flex items-center gap-2 shadow-orvion cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Crear Usuario</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-[28px] bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-800 dark:text-rose-300 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Controles de Búsqueda y Filtros Rápidos */}
      <div className="p-2.5 bg-white dark:bg-[#121417] rounded-full border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8C929D] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o correo..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs text-[#121417] dark:text-white placeholder:text-[#8C929D] bg-transparent focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 rounded-full border border-[#E2E5EB] dark:border-[#2A2E37] bg-[#F8F9FA] dark:bg-[#1A1D24] text-xs text-[#121417] dark:text-white font-semibold focus:outline-none cursor-pointer"
          >
            <option value="all" className="dark:bg-[#1A1D24]">Todos los roles</option>
            <option value="ADMIN" className="dark:bg-[#1A1D24]">Administrador / CEO</option>
            <option value="CLIENT_OWNER" className="dark:bg-[#1A1D24]">Director de Empresa</option>
            <option value="CLIENT" className="dark:bg-[#1A1D24]">Asesor de Ventas</option>
          </select>

          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="px-3 py-1.5 rounded-full border border-[#E2E5EB] dark:border-[#2A2E37] bg-[#F8F9FA] dark:bg-[#1A1D24] text-xs text-[#121417] dark:text-white font-semibold focus:outline-none cursor-pointer max-w-[180px] truncate"
          >
            <option value="all" className="dark:bg-[#1A1D24]">Todas las empresas</option>
            <option value="bunker" className="dark:bg-[#1A1D24]">Equipo Interno Bunker</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id} className="dark:bg-[#1A1D24]">
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-orvion overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#8C929D] font-medium">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
            <span>Cargando miembros del equipo...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-xs text-[#8C929D] space-y-1.5">
            <p className="font-bold text-sm text-[#121417] dark:text-white">No se encontraron usuarios</p>
            <p className="font-medium">Prueba ajustando los filtros de búsqueda o crea un nuevo miembro.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F8F9FA] dark:bg-[#16191F] border-b border-[#E2E5EB] dark:border-[#1F242D] text-[11px] font-bold uppercase tracking-wider text-[#8C929D]">
                <tr>
                  <th className="py-3 px-4">Usuario</th>
                  <th className="py-3 px-4">Rol en el Sistema</th>
                  <th className="py-3 px-4">Empresa Asignada</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E5EB] dark:divide-[#1F242D]">
                {filteredUsers.map((u) => {
                  const isOwner = u.role === ROLES.CLIENT_OWNER;
                  const isAdmin = u.role === ROLES.ADMIN;

                  return (
                    <tr key={u.id} className="hover:bg-[#F8F9FA] dark:hover:bg-[#1A1D24] transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-[#121417] dark:bg-white text-amber-400 dark:text-[#121417] font-black flex items-center justify-center text-xs shrink-0 shadow-orvion">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <span className="font-bold text-[#121417] dark:text-white block truncate">
                              {u.name}
                            </span>
                            <span className="text-[11px] text-[#8C929D] block truncate font-medium">
                              {u.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {isAdmin ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700/50 shadow-2xs">
                            <Crown className="w-3.5 h-3.5 text-amber-500" />
                            Administrador / CEO
                          </span>
                        ) : isOwner ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50 shadow-2xs">
                            <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                            Director de Empresa
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#F8F9FA] dark:bg-[#1A1D24] text-[#121417] dark:text-white border border-[#E2E5EB] dark:border-[#2A2E37] shadow-2xs">
                            <UserCog className="w-3.5 h-3.5 text-amber-500" />
                            Asesor de Ventas
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        {u.client ? (
                          <div className="flex items-center gap-1.5 font-bold text-[#121417] dark:text-white">
                            <Building2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <span className="truncate max-w-[160px]">{u.client.name}</span>
                          </div>
                        ) : (
                          <span className="text-[#8C929D] font-medium">Bunker Agency</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
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
                            className="p-2 rounded-full border border-[#E2E5EB] dark:border-[#2A2E37] hover:bg-[#F8F9FA] dark:hover:bg-[#1E2229] text-[#121417] dark:text-white text-xs transition-all shadow-2xs cursor-pointer"
                            title="Generar enlace de acceso directo"
                          >
                            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                          </button>

                          {/* Cambio de Rol (solo para usuarios de cliente) */}
                          {!isAdmin && (
                            <button
                              type="button"
                              onClick={() => setRole(u.id, isOwner ? ROLES.CLIENT : ROLES.CLIENT_OWNER)}
                              disabled={savingId === u.id}
                              className="px-3 py-1 rounded-full border border-[#E2E5EB] dark:border-[#2A2E37] hover:bg-[#F8F9FA] dark:hover:bg-[#1E2229] text-[#121417] dark:text-white text-[11px] font-bold transition-all shadow-2xs cursor-pointer"
                              title={isOwner ? "Degradar a Asesor de Ventas" : "Promover a Director de Empresa"}
                            >
                              {isOwner ? "Hacer Asesor" : "Hacer Director"}
                            </button>
                          )}

                          {/* Botón Eliminar */}
                          <button
                            type="button"
                            onClick={() => setUserToDelete(u)}
                            className="p-2 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E5EB] dark:border-[#1F242D]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-[#121417] dark:text-white">Nuevo Miembro del Equipo</h3>
                  <p className="text-[11px] text-[#8C929D] font-medium">
                    Crea un acceso con su rol correspondiente
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="text-[#8C929D] hover:text-[#121417] dark:hover:text-white p-1 rounded-full cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-[#121417] dark:text-white mb-1.5">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  placeholder="Ej: Laura Gómez"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#E2E5EB] dark:border-[#2A2E37] bg-[#F8F9FA] dark:bg-[#1A1D24] text-xs text-[#121417] dark:text-white placeholder:text-[#8C929D] focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-[#121417] dark:text-white mb-1.5">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={createEmail}
                  onChange={(e) => setCreateEmail(e.target.value)}
                  placeholder="laura@empresa.com"
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#E2E5EB] dark:border-[#2A2E37] bg-[#F8F9FA] dark:bg-[#1A1D24] text-xs text-[#121417] dark:text-white placeholder:text-[#8C929D] focus:outline-none focus:border-amber-500 transition-all"
                />
              </div>

              <div>
                <label className="block font-bold text-[#121417] dark:text-white mb-1.5">
                  Rol y Nivel de Acceso *
                </label>
                <select
                  value={createRole}
                  onChange={(e) => setCreateRole(e.target.value as StoredUserRole)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-[#E2E5EB] dark:border-[#2A2E37] bg-[#F8F9FA] dark:bg-[#1A1D24] text-xs text-[#121417] dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
                >
                  <option value={ROLES.CLIENT} className="dark:bg-[#1A1D24]">👤 Asesor de Ventas (Atiende prospectos, WhatsApp y llamadas)</option>
                  <option value={ROLES.CLIENT_OWNER} className="dark:bg-[#1A1D24]">🏢 Director de Empresa (Supervisión comercial y escucha de llamadas)</option>
                  <option value={ROLES.ADMIN} className="dark:bg-[#1A1D24]">👑 Administrador / CEO (Acceso total de Agencia)</option>
                </select>
              </div>

              {createRole !== ROLES.ADMIN && (
                <div>
                  <label className="block font-bold text-[#121417] dark:text-white mb-1.5">
                    Empresa Asignada *
                  </label>
                  <select
                    value={createClientId}
                    onChange={(e) => setCreateClientId(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-[#E2E5EB] dark:border-[#2A2E37] bg-[#F8F9FA] dark:bg-[#1A1D24] text-xs text-[#121417] dark:text-white focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id} className="dark:bg-[#1A1D24]">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block font-bold text-[#121417] dark:text-white">
                    Contraseña Inicial
                  </label>
                  <button
                    type="button"
                    onClick={() => setCreatePassword(generateRandomPassword())}
                    className="text-[11px] text-amber-600 dark:text-amber-400 font-bold hover:underline cursor-pointer"
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
                    className="w-full px-3.5 py-2.5 pr-10 rounded-2xl border border-[#E2E5EB] dark:border-[#2A2E37] bg-[#F8F9FA] dark:bg-[#1A1D24] text-xs font-mono text-[#121417] dark:text-white focus:outline-none focus:border-amber-500 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8C929D] hover:text-[#121417] dark:hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2.5 border-t border-[#E2E5EB] dark:border-[#1F242D]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-full border border-[#E2E5EB] dark:border-[#2A2E37] bg-white dark:bg-[#1A1D24] text-xs font-bold text-[#121417] dark:text-white hover:bg-[#F8F9FA] dark:hover:bg-[#2A2E37] cursor-pointer transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-black-gold rounded-full px-5 py-2 text-xs font-bold flex items-center gap-1.5 shadow-orvion cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-center shadow-2xs">
                <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#121417] dark:text-white">Usuario Creado con Éxito</h3>
                <p className="text-xs text-[#8C929D] font-medium">
                  Comparte las credenciales de acceso con el asesor
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#F8F9FA] dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-[#8C929D] font-medium">Nombre:</span>
                <span className="font-bold text-[#121417] dark:text-white">{createdCredentials.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C929D] font-medium">Correo:</span>
                <span className="font-bold text-[#121417] dark:text-white font-mono">{createdCredentials.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8C929D] font-medium">Contraseña:</span>
                <span className="font-bold text-[#121417] dark:text-white font-mono">{createdCredentials.password || "Enlace enviado"}</span>
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
                className="px-4 py-2 rounded-full bg-white dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] text-xs font-bold text-[#121417] dark:text-white hover:bg-[#F8F9FA] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                {copiedCredentials ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-amber-500" />}
                <span>{copiedCredentials ? "Copiado" : "Copiar Credenciales"}</span>
              </button>
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="btn-black-gold rounded-full px-5 py-2 text-xs font-bold cursor-pointer shadow-orvion"
              >
                Listo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Enlace de Acceso Directo */}
      {resetModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-500 border border-amber-200 dark:border-amber-800/50 flex items-center justify-center shadow-2xs">
                <KeyRound className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#121417] dark:text-white">Enlace de Acceso Rápido</h3>
                <p className="text-xs text-[#8C929D] font-medium">
                  Para {resetModalData.userName} ({resetModalData.userEmail})
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-[#F8F9FA] dark:bg-[#1A1D24] rounded-2xl border border-[#E2E5EB] dark:border-[#2A2E37] break-all text-xs font-mono text-[#121417] dark:text-white">
              {resetModalData.recoveryUrl}
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(resetModalData.recoveryUrl);
                  setCopiedResetUrl(true);
                  setTimeout(() => setCopiedResetUrl(false), 2500);
                }}
                className="px-4 py-2 rounded-full bg-white dark:bg-[#1A1D24] border border-[#E2E5EB] dark:border-[#2A2E37] text-xs font-bold text-[#121417] dark:text-white hover:bg-[#F8F9FA] flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
              >
                {copiedResetUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-amber-500" />}
                <span>{copiedResetUrl ? "Copiado" : "Copiar Enlace"}</span>
              </button>
              <button
                type="button"
                onClick={() => setResetModalData(null)}
                className="btn-black-gold rounded-full px-5 py-2 text-xs font-bold cursor-pointer shadow-orvion"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmación de Eliminación */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#121417] rounded-[28px] border border-[#E2E5EB] dark:border-[#1F242D] shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-11 h-11 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex items-center justify-center shrink-0 shadow-2xs">
                <ShieldAlert className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-[#121417] dark:text-white">¿Eliminar usuario?</h3>
                <p className="text-xs text-[#8C929D] font-medium">Esta acción revocará todo acceso a la plataforma</p>
              </div>
            </div>

            <p className="text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed font-medium">
              Estás a punto de eliminar permanentemente a <strong className="text-[#121417] dark:text-white">{userToDelete.name}</strong> ({userToDelete.email}).
              Esta acción no se puede deshacer.
            </p>

            {deleteError && (
              <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-xs font-semibold text-rose-700 dark:text-rose-300">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2 border-t border-[#E2E5EB] dark:border-[#1F242D]">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 rounded-full border border-[#E2E5EB] dark:border-[#2A2E37] bg-white dark:bg-[#1A1D24] text-xs font-bold text-[#121417] dark:text-white hover:bg-[#F8F9FA] cursor-pointer transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isDeleting}
                className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-orvion cursor-pointer"
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

