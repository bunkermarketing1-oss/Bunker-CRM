// tests/sms-rule-selection.test.mjs
// Elección de la regla "lead nuevo → SMS": un solo SMS por lead. Lógica pura, sin servidor ni base.
// Uso: node --test tests/sms-rule-selection.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { pickLeadCreatedSmsRule } from "../src/lib/automations/sms-rule-selection.ts";

const rule = (id, clientId, { sources = [], template = "Hola {{nombre}}", createdAt = "2026-01-01" } = {}) => ({
  id,
  clientId,
  sources,
  template,
  createdAt: new Date(createdAt),
});
const META_LEAD = { clientId: "c1", source: "meta_ads" };

test("when a client rule and a general rule both apply only the client rule fires", () => {
  const picked = pickLeadCreatedSmsRule([rule("general", null), rule("client", "c1")], META_LEAD);
  assert.equal(picked.id, "client");
});

test("the general rule fires when the client has no rule of its own", () => {
  const picked = pickLeadCreatedSmsRule([rule("general", null), rule("other", "c2")], META_LEAD);
  assert.equal(picked.id, "general");
});

test("a rule of another client never fires", () => {
  assert.equal(pickLeadCreatedSmsRule([rule("other", "c2")], META_LEAD), null);
});

test("a lead without client only gets general rules", () => {
  const picked = pickLeadCreatedSmsRule([rule("client", "c1"), rule("general", null)], { clientId: null, source: "meta_ads" });
  assert.equal(picked.id, "general");
});

test("a client rule filtered out by source falls back to the general rule", () => {
  const picked = pickLeadCreatedSmsRule(
    [rule("client", "c1", { sources: ["website"] }), rule("general", null, { sources: ["meta_ads"] })],
    META_LEAD
  );
  assert.equal(picked.id, "general");
});

test("rules without template are skipped", () => {
  const picked = pickLeadCreatedSmsRule([rule("empty", "c1", { template: "  " }), rule("general", null)], META_LEAD);
  assert.equal(picked.id, "general");
});

test("among several client rules the oldest wins so the text is stable", () => {
  const picked = pickLeadCreatedSmsRule(
    [rule("newer", "c1", { createdAt: "2026-05-01" }), rule("older", "c1", { createdAt: "2026-02-01" })],
    META_LEAD
  );
  assert.equal(picked.id, "older");
});

test("no applicable rule means no SMS", () => {
  assert.equal(pickLeadCreatedSmsRule([], META_LEAD), null);
});
