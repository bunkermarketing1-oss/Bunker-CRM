"use client";

import { useCallback, useState } from "react";
import type { AccountType, AdProvider } from "@/lib/constants/integrations";

export interface ConnectSocialAccountPayload {
  provider: AdProvider;
  accountType: AccountType;
  accountName: string;
  externalId: string;
  /** null = portafolio de la agencia (desasigna de forma explícita). */
  clientId: string | null;
  accessToken: string | null;
}

export interface ConnectSocialAccountResult {
  success: boolean;
  error?: string | null;
  message?: string | null;
}

/** Registro manual de una cuenta publicitaria/página contra POST /api/integrations/accounts. */
export function useConnectSocialAccount() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async (payload: ConnectSocialAccountPayload): Promise<ConnectSocialAccountResult> => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/integrations/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        return { success: true, message: json.message };
      }
      const errMsg = json.error || "No se pudo conectar la cuenta.";
      setError(errMsg);
      return { success: false, error: errMsg };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Error de red al conectar";
      setError(errMsg);
      return { success: false, error: errMsg };
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { connect, submitting, error, setError };
}
