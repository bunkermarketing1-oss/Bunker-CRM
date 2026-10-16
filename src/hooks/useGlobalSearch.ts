"use client";

import { useEffect, useState } from "react";
import { SEARCH_DEBOUNCE_MS, SEARCH_MIN_LENGTH } from "@/lib/constants/search";
import type { SearchResult } from "@/types/search";

/** Busca con debounce y descarta respuestas viejas si el usuario siguió escribiendo. */
export function useGlobalSearch(term: string) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = term.trim();
    if (query.length < SEARCH_MIN_LENGTH) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
        const json = await res.json();
        if (json.success) {
          setResults(json.results);
          setError(null);
        } else {
          setError(json.error);
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Error de red");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  return { results, loading, error };
}
