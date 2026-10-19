"use client";

import { useCallback, useEffect, useState } from "react";
import type { UnassignedAccountOption } from "@/types/integrations";

export interface ClientOnboardingPayload {
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry: string;
  revenue: string;
  ownerId?: string;
  notes?: string;
  primaryContact: {
    firstName: string;
    lastName?: string;
    jobTitle?: string;
    email?: string;
    phone?: string;
  };
  connectedAccountId?: string;
  adAccountExternalId?: string;
  initialDeal: {
    enabled: boolean;
    title: string;
    value?: number;
  };
}

interface IntegrationAccountsResponse {
  success: boolean;
  integrations?: {
    name: string;
    connectedAccounts?: { id: string; accountName: string; externalId: string | null; clientId: string | null }[];
  }[];
}

/** Cuentas sin cliente para el paso 3 del asistente y alta del cliente contra POST /api/clients. */
export function useClientOnboarding(isOpen: boolean) {
  const [unassignedAccounts, setUnassignedAccounts] = useState<UnassignedAccountOption[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUnassignedAccounts = useCallback(async () => {
    try {
      const res = await fetch("/api/integrations");
      const json: IntegrationAccountsResponse = await res.json();
      if (!json.success || !Array.isArray(json.integrations)) return;
      setUnassignedAccounts(
        json.integrations.flatMap((it) =>
          (it.connectedAccounts ?? [])
            .filter((acc) => !acc.clientId)
            .map((acc) => ({ id: acc.id, accountName: acc.accountName, externalId: acc.externalId, providerName: it.name }))
        )
      );
    } catch (err) {
      console.error("Error al cargar cuentas del portafolio:", err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) loadUnassignedAccounts();
  }, [isOpen, loadUnassignedAccounts]);

  const createClient = useCallback(async (payload: ClientOnboardingPayload): Promise<boolean> => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) return true;
      setError(json.error || "No se pudo registrar el cliente.");
      return false;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al conectar con el servidor.");
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { unassignedAccounts, submitting, error, setError, createClient };
}
