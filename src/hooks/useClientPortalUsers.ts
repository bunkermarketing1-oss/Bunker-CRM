"use client";

import { useCallback, useEffect, useState } from "react";
import type { StoredUserRole } from "@/lib/roles";
import { USER_ACTION } from "@/lib/validations/users";

export interface PortalUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface CreatePortalUserInput {
  name: string;
  email: string;
  password?: string;
  role: StoredUserRole;
}

export interface CreatePortalUserResult {
  success: boolean;
  user?: PortalUser;
  tempPassword?: string;
  error?: string;
}

export interface ResetLinkResult {
  success: boolean;
  recoveryUrl?: string | null;
  error?: string;
}

/**
 * Usuarios del portal de un cliente y cambio de rol asesor ↔ dueño (solo Bunker: la API
 * responde 403 a cualquier otro). `enabled = false` no consulta nada.
 */
export function useClientPortalUsers(clientId: string, enabled: boolean) {
  const [users, setUsers] = useState<PortalUser[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/users?clientId=${encodeURIComponent(clientId)}`);
      const json = await res.json();
      if (json.success) setUsers(json.users);
      else setError(json.error || "No se pudieron cargar los usuarios.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
    }
  }, [clientId]);

  useEffect(() => {
    if (enabled && clientId) refresh();
  }, [enabled, clientId, refresh]);

  const setRole = useCallback(
    async (userId: string, role: StoredUserRole) => {
      setSavingId(userId);
      setError(null);
      try {
        const res = await fetch("/api/users", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: userId, role }),
        });
        const json = await res.json();
        if (!json.success) setError(json.error || "No se pudo cambiar el rol.");
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error de red");
      } finally {
        setSavingId(null);
      }
    },
    [refresh]
  );

  const createUser = useCallback(
    async (payload: CreatePortalUserInput): Promise<CreatePortalUserResult> => {
      setError(null);
      try {
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...payload,
            clientId,
          }),
        });
        const json = await res.json();
        if (!json.success) {
          return { success: false, error: json.error || "No se pudo crear el usuario." };
        }
        await refresh();
        return {
          success: true,
          user: json.user as PortalUser,
          tempPassword: (json.tempPassword as string) || payload.password || "",
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Error de red";
        setError(msg);
        return { success: false, error: msg };
      }
    },
    [clientId, refresh]
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
        return { success: false, error: json.error || "No se pudo generar el enlace." };
      }
      return { success: true, recoveryUrl: (json.recoveryUrl as string | null) ?? null };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : "Error de red" };
    }
  }, []);

  return { users, error, savingId, setRole, createUser, generateResetLink, refresh };
}
