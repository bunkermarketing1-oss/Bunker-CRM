import { timingSafeEqual } from "crypto";

/** Valida `Authorization: Bearer <CRON_SECRET>` de los endpoints programados. */
export function isValidCronAuthorization(authorizationHeader: string | null) {
  const secret = process.env.CRON_SECRET;
  const header = authorizationHeader || "";
  if (!secret || !header.startsWith("Bearer ")) return false;
  const given = Buffer.from(header.slice(7));
  const expected = Buffer.from(secret);
  return given.length === expected.length && timingSafeEqual(given, expected);
}
