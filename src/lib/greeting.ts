export type GreetingKey = "greeting.morning" | "greeting.afternoon" | "greeting.evening";

/** Clave de traducción del saludo según la hora local del navegador. */
export function greetingKeyFor(date: Date): GreetingKey {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "greeting.morning";
  if (hour >= 12 && hour < 19) return "greeting.afternoon";
  return "greeting.evening";
}

export function initialsOf(name: string | null | undefined, fallback: string): string {
  if (!name?.trim()) return fallback;
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
