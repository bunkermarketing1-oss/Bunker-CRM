// tests/url-helper.test.mjs
// Verificación de resolución de URL base y sanitización de 0.0.0.0 para Meta OAuth.
// Lógica pura, sin servidor ni base de datos.
// Uso: node --experimental-strip-types --no-warnings --test tests/url-helper.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeHost, isSecureConnection, resolveAppBaseUrl } from "../src/lib/url.ts";

test("sanitizeHost replaces 0.0.0.0 with localhost and preserves port", () => {
  assert.equal(sanitizeHost("0.0.0.0:3000"), "localhost:3000");
  assert.equal(sanitizeHost("http://0.0.0.0:3000/callback"), "http://localhost:3000/callback");
  assert.equal(sanitizeHost("https://bunker.crm.com"), "https://bunker.crm.com");
});

test("isSecureConnection only enables secure cookies on remote HTTPS, never localhost HTTP", () => {
  assert.equal(isSecureConnection("http://localhost:3000"), false);
  assert.equal(isSecureConnection("https://localhost:3000"), false);
  assert.equal(isSecureConnection("http://127.0.0.1:3000"), false);
  assert.equal(isSecureConnection("http://crm.bunkermarketing.com"), false);
  assert.equal(isSecureConnection("https://crm.bunkermarketing.com"), true);
});

test("resolveAppBaseUrl sanitizes 0.0.0.0 binding from NextRequest mock", () => {
  const map = new Map([["host", "0.0.0.0:3000"]]);
  const req = {
    headers: {
      get: (k) => map.get(k.toLowerCase()) ?? null,
    },
    nextUrl: {
      host: "0.0.0.0:3000",
      protocol: "http:",
    },
  };

  const url = resolveAppBaseUrl(req);
  assert.equal(url, "http://localhost:3000");
  assert.ok(!url.includes("0.0.0.0"), "No debe contener 0.0.0.0");
});

test("resolveAppBaseUrl prioritizes reverse proxy forwarded headers for Dokploy/production", () => {
  const map = new Map([
    ["x-forwarded-host", "crm.bunkermarketing.com"],
    ["x-forwarded-proto", "https"],
    ["host", "0.0.0.0:3000"],
  ]);
  const req = {
    headers: {
      get: (k) => map.get(k.toLowerCase()) ?? null,
    },
  };

  const url = resolveAppBaseUrl(req);
  assert.equal(url, "https://crm.bunkermarketing.com");
});

test("resolveAppBaseUrl falls back safely to NEXT_PUBLIC_APP_URL or localhost", () => {
  const old = process.env.NEXT_PUBLIC_APP_URL;
  try {
    process.env.NEXT_PUBLIC_APP_URL = "https://app.bunker.com";
    assert.equal(resolveAppBaseUrl(null), "https://app.bunker.com");

    process.env.NEXT_PUBLIC_APP_URL = "http://0.0.0.0:3000";
    assert.equal(resolveAppBaseUrl(null), "http://localhost:3000");
  } finally {
    process.env.NEXT_PUBLIC_APP_URL = old;
  }
});
