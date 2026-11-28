"use client";

import { useSearchParams } from "next/navigation";

/**
 * Marca (empresa cliente) que se eligió en la barra lateral: viaja en la dirección como `?clientId=…`.
 * null significa "vista de toda la agencia". Es la única fuente de verdad: las pantallas no deben guardar su
 * propia copia de la marca activa.
 */
export function useActiveClientId(): string | null {
  const value = useSearchParams()?.get("clientId");
  return value && value !== "all" ? value : null;
}
