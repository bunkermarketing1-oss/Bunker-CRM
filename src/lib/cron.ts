import { timingSafeEqual } from "crypto";

/** Valida `Authorization: Bearer <CRON_SECRET>` de los endpoints programados. */
export function isValidCronAuthorization(authorizationHeader: string | null) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("[CRON_AUTH] Error: La variable de entorno CRON_SECRET no está definida en el sistema.");
    return false;
  }
  const header = (authorizationHeader || "").trim();
  if (!header.startsWith("Bearer ")) {
    console.warn("[CRON_AUTH] Advertencia: Encabezado Authorization ausente o no contiene prefijo 'Bearer '.");
    return false;
  }
  const given = Buffer.from(header.slice(7).trim());
  const expected = Buffer.from(secret.trim());
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) {
    console.warn("[CRON_AUTH] Advertencia: El token proporcionado no coincide con CRON_SECRET.");
    return false;
  }
  return true;
}
