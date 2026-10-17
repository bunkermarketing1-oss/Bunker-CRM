"use client";

import { useCallback, useState } from "react";
import type { BulkSmsPreview, BulkSmsResult } from "@/types/sms";

export interface BulkSmsDraftFilter {
  clientId: string | null;
  statuses: string[];
  sources: string[];
}

async function postBulk(body: object) {
  const res = await fetch("/api/messages/sms/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({ success: false, error: "Respuesta inválida del servidor." }));
}

export function useBulkSms() {
  const [preview, setPreview] = useState<BulkSmsPreview | null>(null);
  const [result, setResult] = useState<BulkSmsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (filter: BulkSmsDraftFilter, template: string, dryRun: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const json = await postBulk({ filter, template, dryRun });
      if (!json.success) {
        setError(json.error);
        return false;
      }
      if (dryRun) {
        setPreview(json.preview);
        setResult(null);
      } else {
        setResult(json.result);
        setPreview(null);
      }
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setPreview(null);
    setResult(null);
    setError(null);
  }, []);

  return {
    preview,
    result,
    loading,
    error,
    reset,
    previewRecipients: (filter: BulkSmsDraftFilter, template: string) => run(filter, template, true),
    send: (filter: BulkSmsDraftFilter, template: string) => run(filter, template, false),
  };
}
