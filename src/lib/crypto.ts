import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

/**
 * Cifrado simétrico AES-256-GCM para tokens de terceros (Meta, TikTok, etc.).
 * Formato almacenado: base64(iv).base64(authTag).base64(ciphertext)
 *
 * Requiere INTEGRATIONS_ENCRYPTION_KEY (cualquier cadena larga y aleatoria;
 * se deriva a 32 bytes con SHA-256). Generar con: openssl rand -base64 32
 */
function getKey(): Buffer {
  const secret = process.env.INTEGRATIONS_ENCRYPTION_KEY;
  if (!secret || secret.length < 16) {
    throw new Error("Falta INTEGRATIONS_ENCRYPTION_KEY (mínimo 16 caracteres) en las variables de entorno.");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((b) => b.toString("base64")).join(".");
}

export function decryptSecret(payload: string): string {
  const [iv, tag, data] = payload.split(".").map((p) => Buffer.from(p, "base64"));
  if (!iv || !tag || !data) {
    throw new Error("Token cifrado con formato inválido.");
  }
  const decipher = createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
