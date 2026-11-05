"use client";

import { useCallback, useEffect, useState } from "react";
import type { StoredUserRole } from "@/lib/roles";
import { USER_ACTION } from "@/lib/validations/users";

export interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: string;
  clientId: string | null;
  isActive: boolean;
  createdAt: string;
  client?: {
    id: string;
    name: string;
    companyName: string | null;
  } | null;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password?: string;
  role: StoredUserRole;
  clientId?: string | null;
}

export interface CreateUserResult {
  success: boolean;
  user?: ManagedUser;
  tempPassword?: string;
  error?: string;
}

export interface ResetLinkResult {
  success: boolean;
  recoveryUrl?: string | null;
  error?: string;
}

export interface DeleteUserResult {
  success: boolean;
  error?: string;
}

/**
 * Hook centralizado para la administración integral de usuarios y permisos en Bunker CRM.
 */
export function useUsersManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/users");
      const json = await res.json();
      if (json.success) {
        setUsers(json.users || []);
      } else {
        setError(json.error || "No se pudieron cargar los usuarios.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión al cargar usuarios.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const setRole = useCallback(
    async (userId: string, role: StoredUserRole): Promise<boolean> => {
      setSavingId(userId);
      setError(null);
      try {
        const res = await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: userId, role }),
        });
        const json = await res.json();
        if (!json.success) {
          setError(json.error || "No se pudo actualizar el rol.");
          return false;
        }
        await fetchUsers();
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error de red al actualizar rol.");
        return false;
      } finally {
        setSavingId(null);
      }
    },
    [fetchUsers]
  );

  const createUser = useCallback(
    async (payload: CreateUserInput): Promise<CreateUserResult> => {
      setError(null);
      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) {
          return { success: false, error: json.error || "No se pudo crear el usuario." };
        }
        await fetchUsers();
        return {
          success: true,
          user: json.user as ManagedUser,
          tempPassword: (json.tempPassword as string) || payload.password || "",
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error de conexión al crear usuario.";
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [fetchUsers]
  );

  const generateResetLink = useCallback(async (userId: string): Promise<ResetLinkResult> => {
    try {
      const res = await fetch("/api/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: userId,
          action: USER_ACTION.RESET_PASSWORD,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        return { success: false, error: json.error || "No se pudo generar el enlace de acceso." };
      }
      return { success: true, recoveryUrl: (json.recoveryUrl as string | null) ?? null };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Error de red al generar enlace.",
      };
    }
  }, []);

  const deleteUser = useCallback(
    async (userId: string): Promise<DeleteUserResult> => {
      setSavingId(userId);
      setError(null);
      try {
        const res = await fetch(`/api/users?id=${encodeURIComponent(userId)}`, {
          method: "DELETE",
        });
        const json = await res.json();
        if (!json.success) {
          setError(json.error || "No se pudo eliminar el usuario.");
          return { success: false, error: json.error || "No se pudo eliminar el usuario." };
        }
        await fetchUsers();
        return { success: true };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error de red al eliminar usuario.";
        setError(msg);
        return { success: false, error: msg };
      } finally {
        setSavingId(null);
      }
    },
    [fetchUsers]
  );

  return {
    users,
    loading,
    error,
    savingId,
    refresh: fetchUsers,
    setRole,
    createUser,
    generateResetLink,
    deleteUser,
  };
}

