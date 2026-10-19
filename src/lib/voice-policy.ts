/**
 * Reglas puras de llamadas: a qué destinos se puede marcar y cuándo un estado avanza.
 * Sin imports con alias a propósito: se prueba directo con Node (tests/voice-policy.test.mjs).
 * Los valores (países, tipos, orden de estados) los pasa el llamador desde
 * `lib/constants/voice.ts`, así la política vive en un solo sitio.
 */

// "max" trae los metadatos completos: con los mínimos, `getType()` siempre devuelve undefined.
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export interface CallDestinationPolicy {
  /** Códigos ISO alfa-2 en mayúsculas (MX, CO, US…). */
  allowedCountries: readonly string[];
  /** Tipos de `getType()` permitidos (MOBILE, FIXED_LINE…). */
  allowedTypes: readonly string[];
}

const COUNTRY_CODE = /^[A-Z]{2}$/;

/**
 * Lista de países de `VOICE_ALLOWED_COUNTRIES` ("MX, co,US"). Si viene vacía o sin ningún
 * código válido se usa la de respaldo: un error de tipeo no debe abrir las llamadas a todo el mundo.
 */
export function parseAllowedCountries(raw: string | undefined, fallback: readonly string[]): string[] {
  const parsed = (raw ?? "")
    .split(",")
    .map((code) => code.trim().toUpperCase())
    .filter((code) => COUNTRY_CODE.test(code));
  return parsed.length ? Array.from(new Set(parsed)) : [...fallback];
}

/**
 * true si se le puede marcar a un número E.164: válido, de un país permitido y de un tipo
 * geográfico o móvil. Bloquea premium, costo compartido, satelitales (+881…) y no geográficos,
 * que son el blanco típico del fraude por tarifa compartida.
 */
export function isAllowedCallDestination(e164: string | null | undefined, policy: CallDestinationPolicy): boolean {
  if (!e164 || !e164.startsWith("+")) return false;
  const phone = parsePhoneNumberFromString(e164);
  if (!phone || !phone.isValid() || phone.number !== e164) return false;
  if (!phone.country || !policy.allowedCountries.includes(phone.country)) return false;
  const type = phone.getType();
  return Boolean(type && policy.allowedTypes.includes(type));
}

/**
 * Estados desde los que se puede pasar a `next` sin retroceder. Se usa como filtro de un
 * `updateMany`, así el "no retroceder" es atómico aunque lleguen dos callbacks a la vez.
 */
export function statusesThatCanAdvanceTo<S extends string>(next: S, rank: Record<S, number>): S[] {
  return (Object.keys(rank) as S[]).filter((status) => rank[status] < rank[next]);
}
