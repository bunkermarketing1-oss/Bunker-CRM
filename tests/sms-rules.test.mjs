// tests/sms-rules.test.mjs
// Estados de entrega, a quién pertenece una respuesta y destinatarios del masivo.
// Lógica pura, sin servidor ni base.
// Uso: pnpm test:sms-rules

import { test } from "node:test";
import assert from "node:assert/strict";
import { planBulkRecipients, resolveReplyTarget, shouldApplyStatus, smsDedupKey } from "../src/lib/messaging/sms-rules.ts";
import { MESSAGE_STATUS_RANK } from "../src/lib/constants/messaging.ts";

const apply = (current, next) => shouldApplyStatus(MESSAGE_STATUS_RANK, current, next);

test("a status only moves forward so a late 'sent' never hides a delivery", () => {
  assert.equal(apply("pending", "sent"), true);
  assert.equal(apply("sent", "delivered"), true);
  assert.equal(apply("sent", "failed"), true);
  assert.equal(apply("delivered", "sent"), false);
  assert.equal(apply("sent", "sent"), false);
});

test("a final status is never overwritten by the other final one", () => {
  assert.equal(apply("delivered", "failed"), false);
  assert.equal(apply("failed", "delivered"), false);
});

test("an unknown status from Twilio is ignored", () => {
  assert.equal(apply("sent", "queued"), false);
});

const candidate = (organizationId, clientId, leadId) => ({ organizationId, clientId, leadId, contactId: null });

test("a reply goes to the latest conversation when every candidate is the same client", () => {
  const target = resolveReplyTarget([candidate("org1", "c1", "lead-new"), candidate("org1", "c1", "lead-old")]);
  assert.deepEqual(target, { ...candidate("org1", "c1", "lead-new"), ambiguous: false });
});

test("a reply is not attached to a lead when the number talked with two clients, so it never leaks to the wrong portal", () => {
  const target = resolveReplyTarget([candidate("org1", "c2", "lead-b"), candidate("org1", "c1", "lead-a")]);
  assert.deepEqual(target, { organizationId: "org1", clientId: null, leadId: null, contactId: null, ambiguous: true });
});

test("across organizations the reply stays in the latest organization without client or lead", () => {
  const target = resolveReplyTarget([candidate("org2", "c9", "lead-z"), candidate("org1", "c9", "lead-a")]);
  assert.equal(target.organizationId, "org2");
  assert.equal(target.leadId, null);
  assert.equal(target.ambiguous, true);
});

test("without candidates the reply has no owner", () => {
  assert.equal(resolveReplyTarget([]), null);
});

const lead = (id, normalizedPhone) => ({ id, normalizedPhone });
const render = (l) => `Hola ${l.id}`;

test("bulk sends one SMS per number and skips no phone, opted-out and recently sent numbers", () => {
  const leads = [
    lead("a", "+521"),
    lead("b", null),
    lead("c", "+522"),
    lead("d", "+521"),
    lead("e", "+523"),
  ];
  const plan = planBulkRecipients(leads, new Set(["+522"]), new Set([smsDedupKey("+523", "Hola e")]), render);
  assert.deepEqual(plan.recipients.map((r) => r.lead.id), ["a"]);
  assert.equal(plan.recipients[0].body, "Hola a");
  assert.equal(plan.withoutPhone, 1);
  assert.equal(plan.optedOut, 1);
  assert.equal(plan.duplicates, 1);
  assert.equal(plan.recentlySent, 1);
});

test("a different text to a recently messaged number is still sent", () => {
  const plan = planBulkRecipients([lead("a", "+521")], new Set(), new Set([smsDedupKey("+521", "Otro texto")]), render);
  assert.equal(plan.recipients.length, 1);
});

test("the dedup key ignores surrounding whitespace in the body", () => {
  assert.equal(smsDedupKey("+521", " Hola "), smsDedupKey("+521", "Hola"));
});
