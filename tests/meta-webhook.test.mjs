// tests/meta-webhook.test.mjs
// Firma del webhook de Meta y reglas de la captura de leads. Lógica pura, sin servidor ni base.
// Uso: node --test tests/meta-webhook.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyMetaSignature } from "../src/lib/integrations/meta-webhook.ts";
import { isRecentMetaLead, resolvePageConnection } from "../src/lib/integrations/meta-lead-policy.ts";

const SECRET = "app-secret";
const BODY = JSON.stringify({ object: "page", entry: [] });
const sign = (body, secret = SECRET) => `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;

test("a signature made with the app secret is accepted", () => {
  assert.equal(verifyMetaSignature(BODY, sign(BODY), SECRET), true);
});

test("hex case does not matter because Meta may send uppercase digests", () => {
  assert.equal(verifyMetaSignature(BODY, sign(BODY).toUpperCase().replace("SHA256=", "sha256="), SECRET), true);
});

test("a tampered body is rejected so nobody can inject fake leads", () => {
  assert.equal(verifyMetaSignature(`${BODY} `, sign(BODY), SECRET), false);
});

test("a signature made with another secret is rejected", () => {
  assert.equal(verifyMetaSignature(BODY, sign(BODY, "other"), SECRET), false);
});

test("without a configured secret everything is rejected", () => {
  assert.equal(verifyMetaSignature(BODY, sign(BODY), undefined), false);
});

test("a missing or unprefixed header is rejected", () => {
  assert.equal(verifyMetaSignature(BODY, null, SECRET), false);
  assert.equal(verifyMetaSignature(BODY, sign(BODY).slice("sha256=".length), SECRET), false);
});

test("a 64-char non-ASCII signature is rejected instead of throwing a 500", () => {
  assert.doesNotThrow(() => verifyMetaSignature(BODY, `sha256=${"ñ".repeat(64)}`, SECRET));
  assert.equal(verifyMetaSignature(BODY, `sha256=${"ñ".repeat(64)}`, SECRET), false);
});

test("non-hex or wrong-length signatures are rejected", () => {
  assert.equal(verifyMetaSignature(BODY, `sha256=${"z".repeat(64)}`, SECRET), false);
  assert.equal(verifyMetaSignature(BODY, `sha256=${"a".repeat(62)}`, SECRET), false);
  assert.equal(verifyMetaSignature(BODY, `${sign(BODY)}00`, SECRET), false);
});

const NOW = new Date("2026-10-19T12:00:00Z");

test("a lead filled a few minutes ago gets the automatic SMS", () => {
  assert.equal(isRecentMetaLead("2026-10-19T11:50:00+0000", NOW, 30), true);
});

test("an old lead recovered by the 48h backfill does not get the automatic SMS", () => {
  assert.equal(isRecentMetaLead("2026-10-18T09:00:00+0000", NOW, 30), false);
});

test("a lead exactly at the limit still counts as recent", () => {
  assert.equal(isRecentMetaLead("2026-10-19T11:30:00Z", NOW, 30), true);
  assert.equal(isRecentMetaLead("2026-10-19T11:29:59Z", NOW, 30), false);
});

test("a Meta clock slightly ahead still counts as recent", () => {
  assert.equal(isRecentMetaLead("2026-10-19T12:00:05Z", NOW, 30), true);
});

test("a missing or invalid created_time does not send SMS", () => {
  assert.equal(isRecentMetaLead(undefined, NOW, 30), false);
  assert.equal(isRecentMetaLead("", NOW, 30), false);
  assert.equal(isRecentMetaLead("not a date", NOW, 30), false);
});

const conn = (id, organizationId, clientId = null) => ({ id, organizationId, clientId });

test("a page with no active connection resolves to none", () => {
  assert.deepEqual(resolvePageConnection([]), { kind: "none" });
});

test("a page connected once resolves to that connection", () => {
  const page = conn("a", "org1", "c1");
  assert.deepEqual(resolvePageConnection([page]), { kind: "single", page });
});

test("a page connected in two organizations is refused so a lead never leaks to another tenant", () => {
  const result = resolvePageConnection([conn("a", "org1", "c1"), conn("b", "org2", "c2")]);
  assert.equal(result.kind, "ambiguous");
  assert.equal(result.owners.length, 2);
});

test("a page assigned to two clients of the same organization is also refused", () => {
  assert.equal(resolvePageConnection([conn("a", "org1", "c1"), conn("b", "org1", "c2")]).kind, "ambiguous");
  assert.equal(resolvePageConnection([conn("a", "org1", null), conn("b", "org1", "c1")]).kind, "ambiguous");
});

test("duplicate connections of the same owner pick the same row regardless of query order", () => {
  const first = resolvePageConnection([conn("b", "org1", "c1"), conn("a", "org1", "c1")]);
  const second = resolvePageConnection([conn("a", "org1", "c1"), conn("b", "org1", "c1")]);
  assert.equal(first.kind, "single");
  assert.equal(first.page.id, "a");
  assert.equal(second.page.id, "a");
});
