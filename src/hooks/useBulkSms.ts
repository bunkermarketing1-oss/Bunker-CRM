"use client";

import { useCallback, useState } from "react";
import type { BulkSmsPreview, BulkSmsResult } from "@/types/sms";

export interface BulkSmsDraftFilter {
  clientId: string | null;
  statuses: string[];
  sources: string[];
}

// Sin respuesta no sabemos si el servidor alcanzó a enviar: el lote puede seguir corriendo.
const NO_RESPONSE_ERROR =
  "No se recibió respuesta del servidor. El envío puede seguir en curso: revisa el historial antes de volver a enviar.";

async function postBulk(body: object) {
  const res = await fetch("/api/messages/sms/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({ success: false, error: NO_RESPONSE_ERROR }));
}

export function useBulkSms() {
  const [preview, setPreview] = useState<BulkSmsPreview | null>(null);
  // Clave del lote: una por vista previa. Si el envío se reintenta con la misma clave, el
  // servidor no lo repite.
  const [batchId, setBatchId] = useState<string | null>(null);
  const [result, setResult] = useState<BulkSmsResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const previewRecipients = useCallback(async (filter: BulkSmsDraftFilter, template: string) => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const json = await postBulk({ filter, template, dryRun: true });
      if (!json.success) {
        setError(json.error);
        return false;
      }
      setPreview(json.preview);
      setBatchId(crypto.randomUUID());
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de red");
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const send = useCallback(
    async (filter: BulkSmsDraftFilter, template: string) => {
      if (!batchId) return false;
      setLoading(true);
      setError(null);
      try {
        const json = await postBulk({ filter, template, dryRun: false, batchId });
        if (!json.success) {
          setError(json.error);
          return false;
        }
        setResult(json.result);
        return true;
      } catch {
        setError(NO_RESPONSE_ERROR);
        return false;
      } finally {
        // Pase lo que pase, la vista previa se consume: para volver a enviar hay que
        // recalcular (con otra clave), y así el botón no queda armado en silencio.
        setPreview(null);
        setBatchId(null);
        setLoading(false);
      }
    },
    [batchId]
  );

  const reset = useCallback(() => {
    setPreview(null);
    setBatchId(null);
    setResult(null);
    setError(null);
  }, []);

  return { preview, result, loading, error, reset, previewRecipients, send };
}
