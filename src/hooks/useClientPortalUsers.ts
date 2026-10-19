"use client";

import { useCallback, useEffect, useState } from "react";
import type { StoredUserRole } from "@/lib/roles";

export interface PortalUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
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

  return { users, error, savingId, setRole };
}
