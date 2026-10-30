"use client";

import { useEffect, useState } from "react";

export interface CallableLead {
  id: string;
  name: string;
  phone: string;
}

/** Leads del usuario que tienen teléfono (la API ya aplica el scope del cliente). */
export function useCallableLeads(clientId?: string | null) {
  const [leads, setLeads] = useState<CallableLead[]>([]);

  useEffect(() => {
    let cancelled = false;
    const clientQuery = clientId && clientId !== "all" ? `?clientId=${encodeURIComponent(clientId)}` : "";
    fetch(`/api/leads${clientQuery}`)
      .then((res) => res.json())
      .then((json: { success: boolean; leads?: { id: string; name: string; phone: string | null }[] }) => {
        if (cancelled || !json.success) return;
        setLeads((json.leads || []).filter((l) => l.phone).map((l) => ({ id: l.id, name: l.name, phone: l.phone as string })));
      })
      .catch(() => {
        // Sin leads el marcador queda vacío; el error de red ya lo muestra el historial.
      });
    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return leads;
}
