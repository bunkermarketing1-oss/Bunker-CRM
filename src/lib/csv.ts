/**
 * CSV helpers with protection against CSV / formula injection (OWASP).
 *
 * Any text cell whose first character could make a spreadsheet interpret it as a formula
 * ("=", "+", "-", "@", TAB, CR) is neutralised by prefixing a single quote.
 * Pure international phone numbers (e.g. "+52 55 1234 5678") only contain digits and
 * separators, so they cannot carry a formula/DDE payload and are kept untouched to avoid
 * corrupting legitimate data.
 */
const FORMULA_TRIGGER = /^[=+\-@\t\r]/;
const SAFE_PHONE = /^\+[\d\s().-]{6,}$/;

export function csvCell(value: unknown): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `"${value}"`;
  }

  let text = value === null || value === undefined ? "" : String(value);

  if (FORMULA_TRIGGER.test(text) && !SAFE_PHONE.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsv(headers: string[], rows: unknown[][]): string {
  const lines = [headers.map(csvCell).join(","), ...rows.map((row) => row.map(csvCell).join(","))];
  return lines.join("\r\n");
}
