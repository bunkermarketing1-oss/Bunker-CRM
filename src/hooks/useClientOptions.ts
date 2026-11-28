"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useActiveClientId } from "@/hooks/useActiveClientId";

export interface ClientOption {
  id: string;
  name: string;
  logoUrl?: string | null;
}

export const CLIENTS_UPDATED_EVENT = "bunker:clients-updated";

/** Notifica a los componentes que la lista de clientes o sus datos cambiaron. */
export function emitClientsUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CLIENTS_UPDATED_EVENT));
  }
}

interface UseClientOptionsConfig {
  /** Solo para el selector de marcas de la barra lateral: es lo único que debe listar todas las marcas siempre. */
  includeAll?: boolean;
}

/**
 * Lista de clientes (id, nombre y logo) para selectores y formularios.
 * Regla de la app: dentro de una marca NO aparece ninguna otra (ni en filtros, ni en formularios, ni en listas);
 * para ver otra marca se cambia de marca en la barra lateral. Por eso, con una marca activa, la lista tiene solo esa marca.
 */
export function useClientOptions({ includeAll = false }: UseClientOptionsConfig = {}) {
  const [allClients, setClients] = useState<ClientOption[]>([]);
  const activeClientId = useActiveClientId();

  const fetchClients = useCallback(() => {
    let cancelled = false;
    fetch("/api/clients")
      .then((res) => res.json())
      .then((json: { success: boolean; clients?: Array<{ id: string; name: string; logoUrl?: string | null }> }) => {
        if (!cancelled && json.success) {
          setClients(
            (json.clients || []).map((c) => ({
              id: c.id,
              name: c.name,
              logoUrl: c.logoUrl || null,
            }))
          );
        }
      })
      .catch(() => {
        // Sin clientes el selector solo ofrece "Todos los clientes": la regla se puede crear igual.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancel = fetchClients();

    const handleUpdate = () => {
      cancel?.();
      cancel = fetchClients();
    };

    if (typeof window !== "undefined") {
      window.addEventListener(CLIENTS_UPDATED_EVENT, handleUpdate);
      window.addEventListener("focus", handleUpdate);
    }

    return () => {
      cancel?.();
      if (typeof window !== "undefined") {
        window.removeEventListener(CLIENTS_UPDATED_EVENT, handleUpdate);
        window.removeEventListener("focus", handleUpdate);
      }
    };
  }, [fetchClients]);

  return useMemo(
    () => (includeAll || !activeClientId ? allClients : allClients.filter((client) => client.id === activeClientId)),
    [allClients, includeAll, activeClientId]
  );
}
