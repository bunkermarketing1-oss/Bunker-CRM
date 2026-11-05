"use client";

import { useEffect, useState } from "react";

export interface CallableLead {
  id: string;
  name: string;
  companyName?: string | null;
  phone: string;
  source: string;
  clientName?: string | null;
  status?: string | null;
}

interface RawLead {
  id: string;
  name: string;
  companyName?: string | null;
  phone?: string | null;
  normalizedPhone?: string | null;
  source?: string | null;
  status?: string | null;
  client?: { id: string; name: string } | null;
}

/**
 * Leads del usuario que tienen número de teléfono real para llamar.
 * Filtra en el servidor con hasPhone=true para evitar descargar decenas de miles
 * de conversaciones o e-mails sin número de teléfono.
 */
export function useCallableLeads(clientId?: string | null): CallableLead[] {
  const [leads, setLeads] = useState<CallableLead[]>([]);

  useEffect(() => {
    let cancelled = false;
    const clientParam = clientId && clientId !== "all" ? `&clientId=${encodeURIComponent(clientId)}` : "";

    fetch(`/api/leads?hasPhone=true${clientParam}`)
      .then((res) => res.json())
      .then((json: { success: boolean; leads?: RawLead[] }) => {
        if (cancelled || !json.success) return;
        const callable = (json.leads || [])
          .filter((l) => (l.normalizedPhone || l.phone) && (l.normalizedPhone || l.phone)!.trim().length >= 6)
          .map((l) => ({
            id: l.id,
            name: l.name || "Prospecto sin nombre",
            companyName: l.companyName || null,
            phone: (l.normalizedPhone || l.phone)!.trim(),
            source: (l.source || "general").toLowerCase(),
            clientName: l.client?.name || null,
            status: l.status || null,
          }));
        setLeads(callable);
      })
      .catch((err) => {
        console.error("Error al cargar prospectos contactables:", err);
      });

    return () => {
      cancelled = true;
    };
  }, [clientId]);

  return leads;
}
