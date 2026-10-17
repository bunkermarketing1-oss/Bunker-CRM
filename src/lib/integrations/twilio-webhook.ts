/**
 * Validación de webhooks de Twilio y lectura de respuestas del lead.
 * Solo depende de `crypto`: lógica pura que se prueba directo con Node.
 * Docs: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */

import { createHmac, timingSafeEqual } from "crypto";

/**
 * Twilio firma `url + cada parámetro POST ordenado por nombre (nombre + valor)` con
 * HMAC-SHA1 usando el Auth Token, en base64. La URL debe ser exactamente la que Twilio
 * llamó (la pública), no la que ve el servidor detrás del proxy.
 */
export function verifyTwilioSignature(
  url: string,
  params: Record<string, string>,
  signatureHeader: string | null,
  authToken: string | undefined
) {
  if (!authToken || !signatureHeader) return false;
  const payload = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], url);
  const expected = createHmac("sha1", authToken).update(payload, "utf8").digest("base64");
  const a = Buffer.from(signatureHeader);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Twilio procesa estas palabras por su cuenta: bloquea el número y responde la confirmación.
// https://help.twilio.com/articles/223134027
const TWILIO_OPT_OUT_WORDS = ["stop", "stopall", "unsubscribe", "cancel", "end", "quit"];
// Las que se usan en México y LatAm; para estas la confirmación la mandamos nosotros.
const SPANISH_OPT_OUT_WORDS = ["baja", "alto", "cancelar", "parar"];
const OPT_OUT_WORDS = new Set([...TWILIO_OPT_OUT_WORDS, ...SPANISH_OPT_OUT_WORDS]);
const TWILIO_HANDLED = new Set(TWILIO_OPT_OUT_WORDS);

/** El lead respondió solo una palabra de baja (con o sin signos, mayúsculas o acentos). */
export function isOptOutMessage(body: string) {
  return OPT_OUT_WORDS.has(normalizeWord(body));
}

/** Baja que Twilio ya confirma al lead: responder también duplicaría el mensaje. */
export function isOptOutHandledByTwilio(body: string) {
  return TWILIO_HANDLED.has(normalizeWord(body));
}

function normalizeWord(body: string) {
  return body
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    // Sin acentos, todas las palabras de baja son ASCII (el target es5 no admite \p{L}).
    .replace(/[^a-z]/g, "");
}

/** Respuesta TwiML: vacía (no contestar) o con un SMS de vuelta al lead. */
export function twimlResponse(reply?: string) {
  const escaped = reply?.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<?xml version="1.0" encoding="UTF-8"?><Response>${escaped ? `<Message>${escaped}</Message>` : ""}</Response>`;
}
