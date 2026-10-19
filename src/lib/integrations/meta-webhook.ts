/**
 * Validación de la firma del webhook de Meta. Solo depende de `crypto`: lógica pura que
 * se prueba directo con Node.
 * Docs: https://developers.facebook.com/docs/graph-api/webhooks/getting-started#validate-payloads
 */

import { createHmac, timingSafeEqual } from "crypto";

const SIGNATURE_PREFIX = "sha256=";
// HMAC-SHA256 en hex: 32 bytes = 64 caracteres [0-9a-f].
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/i;

/**
 * Valida la cabecera `X-Hub-Signature-256` ("sha256=<hex>") que Meta firma con el secreto
 * de la app sobre el body crudo. Sin secreto configurado se rechaza todo.
 * Se valida el formato hex antes de comparar: una firma de 64 caracteres no ASCII ocupa
 * más bytes en UTF-8 y `timingSafeEqual` lanzaría (500) en vez de rechazar (401).
 */
export function verifyMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string | undefined = process.env.META_APP_SECRET
) {
  if (!appSecret || !signatureHeader?.startsWith(SIGNATURE_PREFIX)) return false;
  const givenHex = signatureHeader.slice(SIGNATURE_PREFIX.length);
  if (!SHA256_HEX_PATTERN.test(givenHex)) return false;

  const given = Buffer.from(givenHex, "hex");
  const expected = createHmac("sha256", appSecret).update(rawBody, "utf8").digest();
  return given.length === expected.length && timingSafeEqual(given, expected);
}
