"use client";

import { useEffect, useState } from "react";
import { formatClock } from "@/lib/team-live";

/** Cronómetro "m:ss" desde `startedAt` (ms); null mientras no haya empezado. */
export function useElapsed(startedAt: number | null) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!startedAt) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);
  if (!startedAt) return null;
  return formatClock((now - startedAt) / 1000);
}
