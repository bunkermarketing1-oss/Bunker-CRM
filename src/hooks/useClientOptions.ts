"use client";

import { useEffect, useState } from "react";

export interface ClientOption {
  id: string;
  name: string;
}

/** Lista corta de clientes (id y nombre) para selectores. */
export function useClientOptions() {
  const [clients, setClients] = useState<ClientOption[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/clients")
      .then((res) => res.json())
      .then((json: { success: boolean; clients?: ClientOption[] }) => {
        if (!cancelled && json.success) setClients((json.clients || []).map((c) => ({ id: c.id, name: c.name })));
      })
      .catch(() => {
        // Sin clientes el selector solo ofrece "Todos los clientes": la regla se puede crear igual.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return clients;
}
