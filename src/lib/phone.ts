import { parsePhoneNumber, isValidPhoneNumber, CountryCode } from "libphonenumber-js";

export const DEFAULT_PHONE_COUNTRY: CountryCode =
  (process.env.DEFAULT_PHONE_COUNTRY as CountryCode) || "MX";

export interface PhoneValidationResult {
  isValid: boolean;
  normalized: string | null; // E.164 format (+525512345678)
  formatted: string | null;  // International readable format (+52 55 1234 5678)
  country?: string;
  error: string | null;
}

/**
 * Validates and normalizes international telephone numbers to E.164.
 * If no international '+' prefix is provided, uses DEFAULT_PHONE_COUNTRY (default MX).
 */
export function validateAndNormalizePhone(
  rawPhone?: string | null,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY
): PhoneValidationResult {
  if (!rawPhone || typeof rawPhone !== "string" || rawPhone.trim() === "") {
    return {
      isValid: true,
      normalized: null,
      formatted: null,
      error: null,
    };
  }

  const cleaned = rawPhone.trim();

  try {
    // If user provided a '+' or national number
    if (!isValidPhoneNumber(cleaned, defaultCountry)) {
      return {
        isValid: false,
        normalized: null,
        formatted: null,
        error:
          "El número telefónico no es válido para su región. Incluya el prefijo internacional si corresponde (ej. +52 55 1234 5678).",
      };
    }

    const phoneNumber = parsePhoneNumber(cleaned, defaultCountry);

    return {
      isValid: true,
      normalized: phoneNumber.number, // E.164 (+525512345678)
      formatted: phoneNumber.formatInternational(), // +52 55 1234 5678
      country: phoneNumber.country,
      error: null,
    };
  } catch (err: any) {
    return {
      isValid: false,
      normalized: null,
      formatted: null,
      error:
        "Formato de teléfono no reconocido. Ingrese un número válido (ej. +52 55 1234 5678).",
    };
  }
}
