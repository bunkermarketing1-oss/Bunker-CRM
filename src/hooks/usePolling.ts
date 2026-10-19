"use client";

import { useEffect } from "react";

/**
 * Ejecuta `task` al montar y cada `intervalMs` mientras la pestaña está visible. Con la pestaña
 * oculta se pausa (no tiene sentido consultar la base cada pocos segundos para nadie) y al
 * volver se refresca de inmediato. `task` debe venir de `useCallback`: si cambia (p. ej. otro
 * filtro), el ciclo se reinicia y consulta en el acto. `enabled = false` no consulta nada.
 */
export function usePolling(task: () => void | Promise<void>, intervalMs: number, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setInterval> | null = null;

    const stop = () => {
      if (timer) clearInterval(timer);
      timer = null;
    };
    const start = () => {
      stop();
      void task();
      timer = setInterval(() => void task(), intervalMs);
    };
    const onVisibilityChange = () => (document.hidden ? stop() : start());

    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [task, intervalMs, enabled]);
}
