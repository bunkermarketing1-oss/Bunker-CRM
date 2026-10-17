/**
 * Plantillas de SMS con variables `{{nombre}}`. Sin imports a propósito: lógica pura que
 * se prueba directo con Node. La lista de variables válidas vive en
 * `SMS_TEMPLATE_VARIABLES` (`lib/constants/automations.ts`) y se pasa como argumento.
 */

const VARIABLE_PATTERN = /\{\{\s*([a-z_]+)\s*\}\}/gi;

/** Reemplaza cada `{{variable}}` por su valor; una variable sin valor queda vacía. */
export function renderSmsTemplate(template: string, values: Record<string, string | null | undefined>) {
  return template
    .replace(VARIABLE_PATTERN, (_match, key: string) => values[key.toLowerCase()]?.trim() ?? "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/ +([,.!?])/g, "$1")
    .trim();
}

/** Variables usadas en la plantilla que no existen (p. ej. un error de dedo `{{nombr}}`). */
export function findUnknownTemplateVariables(template: string, allowed: readonly string[]) {
  const known = new Set(allowed);
  const unknown = new Set<string>();
  for (const match of Array.from(template.matchAll(VARIABLE_PATTERN))) {
    const key = match[1].toLowerCase();
    if (!known.has(key)) unknown.add(key);
  }
  return Array.from(unknown);
}

/** "Ana María López" -> "Ana". Un SMS se lee más cercano con el primer nombre. */
export function firstNameOf(fullName: string | null | undefined) {
  return fullName?.trim().split(/\s+/)[0] ?? "";
}
