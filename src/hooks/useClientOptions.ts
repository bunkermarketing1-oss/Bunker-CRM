"use client";

import { useEffect, useState, useCallback } from "react";

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

/** Lista de clientes (id, nombre y logo) para selectores y barra lateral. */
export function useClientOptions() {
  const [clients, setClients] = useState<ClientOption[]>([]);

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

  return clients;
}
