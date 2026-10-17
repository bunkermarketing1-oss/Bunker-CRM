/**
 * Access Token de Twilio para el Voice SDK del navegador, sin el SDK de servidor.
 * Solo depende de `crypto`: lógica pura que se prueba directo con Node.
 * Formato: https://www.twilio.com/docs/iam/access-tokens (JWT HS256, cty twilio-fpa;v=1).
 */

import { createHmac } from "crypto";

export interface VoiceTokenInput {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
  /** TwiML App al que Twilio manda las llamadas salientes del navegador. */
  twimlAppSid: string;
  /** Identidad del navegador; las entrantes se dirigen a ella con <Client>. */
  identity: string;
  ttlSeconds: number;
  /** Para tests; por defecto, ahora. */
  nowSeconds?: number;
}

const base64url = (input: string | Buffer) =>
  Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

export function createVoiceAccessToken(input: VoiceTokenInput) {
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const header = { typ: "JWT", alg: "HS256", cty: "twilio-fpa;v=1" };
  const payload = {
    jti: `${input.apiKeySid}-${now}`,
    iss: input.apiKeySid,
    sub: input.accountSid,
    iat: now,
    nbf: now,
    exp: now + input.ttlSeconds,
    grants: {
      identity: input.identity,
      voice: {
        incoming: { allow: true },
        outgoing: { application_sid: input.twimlAppSid },
      },
    },
  };

  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = base64url(createHmac("sha256", input.apiKeySecret).update(unsigned).digest());
  return `${unsigned}.${signature}`;
}
