// tests/task-rules.test.mjs
// Reglas que crean tareas (onboarding, seguimiento por etapa, reactivación). Lógica pura, sin servidor ni base.
// Uso: node --experimental-strip-types --test tests/task-rules.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  daysSince,
  lastTouchAt,
  parseRuleJson,
  pickRulesForClient,
  readOnboardingConfig,
  readStageFollowupConfig,
  readStaleReactivationConfig,
  serializeOnboardingConfig,
  serializeStageFollowupConfig,
  serializeStaleReactivationConfig,
  stageMatches,
  staleCutoff,
  staleTaskDescription,
} from "../src/lib/automations/task-rules.ts";
import { TASK_AUTOMATION_DEFAULTS as DEFAULTS } from "../src/lib/constants/automations.ts";

const NOW = new Date("2026-10-19T12:00:00Z");

test("broken or non-object JSON in a rule is treated as empty instead of crashing the automation", () => {
  assert.deepEqual(parseRuleJson("{not json"), {});
  assert.deepEqual(parseRuleJson("[1,2]"), {});
  assert.deepEqual(parseRuleJson(null), {});
});

test("an onboarding rule without tasks falls back to the default checklist", () => {
  const config = readOnboardingConfig({ tasks: ["", "  "] }, DEFAULTS);
  assert.deepEqual(config.tasks, DEFAULTS.onboardingTasks);
  assert.equal(config.dueInDays, DEFAULTS.onboardingDueInDays);
});

test("onboarding config survives a save and read round trip", () => {
  const config = { tasks: ["Kickoff", "Accesos"], dueInDays: 0 };
  const stored = serializeOnboardingConfig(config);
  assert.deepEqual(readOnboardingConfig(parseRuleJson(stored.actionPayload), DEFAULTS), config);
});

test("legacy stage rules with only hoursDue keep working with the default task title", () => {
  const config = readStageFollowupConfig({ stageNameMatch: "Propuesta" }, { hoursDue: 24 }, DEFAULTS);
  assert.deepEqual(config, { stageNameMatch: "Propuesta", taskTitle: DEFAULTS.followupTaskTitle, hoursDue: 24 });
});

test("stage follow-up and stale configs survive a save and read round trip", () => {
  const stage = { stageNameMatch: "Negociación", taskTitle: "Llamar", hoursDue: 12 };
  const s = serializeStageFollowupConfig(stage);
  assert.deepEqual(readStageFollowupConfig(parseRuleJson(s.conditionJson), parseRuleJson(s.actionPayload), DEFAULTS), stage);

  const stale = { inactiveDays: 30, suggestedMessage: "Hola, ¿sigues interesado?" };
  const t = serializeStaleReactivationConfig(stale);
  assert.deepEqual(readStaleReactivationConfig(parseRuleJson(t.conditionJson), parseRuleJson(t.actionPayload), DEFAULTS), stale);
});

test("a stale rule with an invalid threshold uses the default days instead of flagging every lead", () => {
  assert.equal(readStaleReactivationConfig({ inactiveDays: 0 }, {}, DEFAULTS).inactiveDays, DEFAULTS.staleInactiveDays);
  assert.equal(readStaleReactivationConfig({ inactiveDays: "7" }, {}, DEFAULTS).inactiveDays, DEFAULTS.staleInactiveDays);
});

test("stage match ignores accents and case so 'negociacion' fires on 'Negociación'", () => {
  assert.equal(stageMatches("Negociación", "negociacion"), true);
  assert.equal(stageMatches("Propuesta enviada", "propuesta"), true);
  assert.equal(stageMatches("Ganado", "propuesta"), false);
  assert.equal(stageMatches(undefined, "propuesta"), false);
});

test("a stage rule without filter fires on any stage", () => {
  assert.equal(stageMatches("Cualquiera", null), true);
});

test("a client's own rules replace the general ones so tasks are not duplicated", () => {
  const rules = [{ id: "general", clientId: null }, { id: "own", clientId: "c1" }, { id: "other", clientId: "c2" }];
  assert.deepEqual(pickRulesForClient(rules, "c1").map((r) => r.id), ["own"]);
  assert.deepEqual(pickRulesForClient(rules, "c3").map((r) => r.id), ["general"]);
  assert.deepEqual(pickRulesForClient(rules, null).map((r) => r.id), ["general"]);
});

test("stale cutoff is exactly N days before now", () => {
  assert.equal(staleCutoff(NOW, 14).toISOString(), "2026-10-05T12:00:00.000Z");
});

test("days inactive counts from the most recent touch among updatedAt, activities, messages and calls", () => {
  const touch = lastTouchAt([new Date("2026-09-01"), undefined, new Date("2026-09-20T12:00:00Z"), null]);
  assert.equal(touch.toISOString(), "2026-09-20T12:00:00.000Z");
  assert.equal(daysSince(touch, NOW), 29);
  assert.equal(lastTouchAt([null, undefined]), null);
});

test("the reactivation task carries the suggested message for the advisor when the rule has one", () => {
  const withMessage = staleTaskDescription({ daysInactive: 20, ruleName: "Reactivar", suggestedMessage: "Hola Ana" });
  assert.match(withMessage, /20 días/);
  assert.match(withMessage, /Hola Ana/);
  assert.doesNotMatch(staleTaskDescription({ daysInactive: 20, ruleName: "Reactivar", suggestedMessage: null }), /sugerido/);
});
