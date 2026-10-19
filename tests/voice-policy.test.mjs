// tests/voice-policy.test.mjs
// Antifraude de salientes y orden de estados de una llamada. Lógica pura, sin servidor ni base.
// Uso: node --test tests/voice-policy.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedCallDestination, parseAllowedCountries, statusesThatCanAdvanceTo } from "../src/lib/voice-policy.ts";
import {
  CALL_STATUS,
  CALL_STATUS_RANK,
  DEFAULT_VOICE_ALLOWED_COUNTRIES,
  VOICE_ALLOWED_NUMBER_TYPES,
} from "../src/lib/constants/voice.ts";

const POLICY = { allowedCountries: DEFAULT_VOICE_ALLOWED_COUNTRIES, allowedTypes: VOICE_ALLOWED_NUMBER_TYPES };

test("mobile and landline numbers of the allowed countries can be called", () => {
  assert.equal(isAllowedCallDestination("+525512345678", POLICY), true); // MX
  assert.equal(isAllowedCallDestination("+573001234567", POLICY), true); // CO móvil
  assert.equal(isAllowedCallDestination("+576012345678", POLICY), true); // CO fijo
  assert.equal(isAllowedCallDestination("+12025550123", POLICY), true); // US
});

test("a lead from a country outside the allowlist is never dialed, even sharing the +1 code", () => {
  assert.equal(isAllowedCallDestination("+447911123456", POLICY), false); // Reino Unido / Guernsey
  assert.equal(isAllowedCallDestination("+18765550123", POLICY), false); // Jamaica (+1 876)
  assert.equal(isAllowedCallDestination("+14165550123", POLICY), false); // Canadá
});

test("premium-rate and toll-free numbers are blocked inside allowed countries (toll fraud)", () => {
  assert.equal(isAllowedCallDestination("+19005550123", POLICY), false); // US 900
  assert.equal(isAllowedCallDestination("+529001234567", POLICY), false); // MX 900
  assert.equal(isAllowedCallDestination("+18005550123", POLICY), false); // US 800
  assert.equal(isAllowedCallDestination("+528001234567", POLICY), false); // MX 800
});

test("satellite and non-geographic numbers are blocked because they have no country", () => {
  assert.equal(isAllowedCallDestination("+881612345678", POLICY), false);
});

test("invalid, non-E.164 or empty destinations are rejected", () => {
  assert.equal(isAllowedCallDestination(null, POLICY), false);
  assert.equal(isAllowedCallDestination("", POLICY), false);
  assert.equal(isAllowedCallDestination("5512345678", POLICY), false);
  assert.equal(isAllowedCallDestination("+52 55 1234 5678", POLICY), false);
  assert.equal(isAllowedCallDestination("+5215512345678", POLICY), false);
});

test("the country allowlist from env is normalized and a typo falls back to the safe default", () => {
  assert.deepEqual(parseAllowedCountries(" mx, CO ,mx", DEFAULT_VOICE_ALLOWED_COUNTRIES), ["MX", "CO"]);
  assert.deepEqual(parseAllowedCountries(undefined, DEFAULT_VOICE_ALLOWED_COUNTRIES), ["MX", "CO", "US"]);
  assert.deepEqual(parseAllowedCountries("Mexico,,", DEFAULT_VOICE_ALLOWED_COUNTRIES), ["MX", "CO", "US"]);
});

test("a late 'ringing' callback cannot move an answered call back", () => {
  const fromRinging = statusesThatCanAdvanceTo(CALL_STATUS.RINGING, CALL_STATUS_RANK);
  assert.deepEqual(fromRinging, [CALL_STATUS.INITIATED]);
  assert.ok(!fromRinging.includes(CALL_STATUS.IN_PROGRESS));
});

test("an in-progress status only applies to calls that are still starting or ringing", () => {
  assert.deepEqual(statusesThatCanAdvanceTo(CALL_STATUS.IN_PROGRESS, CALL_STATUS_RANK), [CALL_STATUS.INITIATED, CALL_STATUS.RINGING]);
});

test("a finished call never changes again", () => {
  const fromCompleted = statusesThatCanAdvanceTo(CALL_STATUS.COMPLETED, CALL_STATUS_RANK);
  assert.ok(!fromCompleted.includes(CALL_STATUS.BUSY));
  assert.ok(!fromCompleted.includes(CALL_STATUS.COMPLETED));
});
