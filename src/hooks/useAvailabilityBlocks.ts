"use client";

import { useCallback, useEffect, useState } from "react";
import type { AvailabilityBlockDto, AvailabilityBlocksResponse, CreateAvailabilityBlockInput } from "@/types/availability";

/** Bloqueos de horario del vendedor en sesión. `create` y `remove` devuelven el mensaje de error, o null si salió bien. */
export function useAvailabilityBlocks() {
  const [blocks, setBlocks] = useState<AvailabilityBlockDto[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/availability-blocks");
      const json: AvailabilityBlocksResponse = await res.json();
      if (json.success) setBlocks(json.blocks);
    } catch (error) {
      console.error("Error al cargar los bloqueos de horario:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(
    async (input: CreateAvailabilityBlockInput): Promise<string | null> => {
      try {
        const res = await fetch("/api/availability-blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        });
        const json = await res.json();
        if (!json.success) return json.error || "No se pudo guardar el bloqueo.";
        await refresh();
        return null;
      } catch {
        return "Error de conexión al guardar el bloqueo.";
      }
    },
    [refresh]
  );

  const remove = useCallback(
    async (id: string): Promise<string | null> => {
      try {
        const res = await fetch(`/api/availability-blocks?id=${encodeURIComponent(id)}`, { method: "DELETE" });
        const json = await res.json();
        if (!json.success) return json.error || "No se pudo eliminar el bloqueo.";
        setBlocks((prev) => prev.filter((block) => block.id !== id));
        return null;
      } catch {
        return "Error de conexión al eliminar el bloqueo.";
      }
    },
    []
  );

  return { blocks, loading, create, remove };
}
