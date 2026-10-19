// tests/twilio-webhook.test.mjs
// Firma de webhooks de Twilio y palabras de baja. Lógica pura, sin servidor ni base.
// Uso: pnpm test:twilio-webhook

import { test } from "node:test";
import assert from "node:assert/strict";
import { isKeywordHandledByTwilio, isOptInMessage, isOptOutMessage, normalizeSmsKeyword, twimlResponse, verifyTwilioSignature } from "../src/lib/integrations/twilio-webhook.ts";

// Ejemplo oficial de https://www.twilio.com/docs/usage/webhooks/webhooks-security
const DOC_URL = "https://mycompany.com/myapp.php?foo=1&bar=2";
const DOC_PARAMS = {
  CallSid: "CA1234567890ABCDE",
  Caller: "+12349013030",
  Digits: "1234",
  From: "+12349013030",
  To: "+18005551212",
};
const DOC_SIGNATURE = "0/KCTR6DLpKmkAf8muzZqo1nDgQ=";

test("the signature from Twilio's documentation example is accepted", () => {
  assert.equal(verifyTwilioSignature(DOC_URL, DOC_PARAMS, DOC_SIGNATURE, "12345"), true);
});

test("a tampered parameter invalidates the signature so nobody can fake a reply", () => {
  assert.equal(verifyTwilioSignature(DOC_URL, { ...DOC_PARAMS, From: "+19999999999" }, DOC_SIGNATURE, "12345"), false);
});

test("a different URL invalidates the signature", () => {
  assert.equal(verifyTwilioSignature("http://mycompany.com/myapp.php?foo=1&bar=2", DOC_PARAMS, DOC_SIGNATURE, "12345"), false);
});

test("without auth token or signature header every request is rejected", () => {
  assert.equal(verifyTwilioSignature(DOC_URL, DOC_PARAMS, DOC_SIGNATURE, undefined), false);
  assert.equal(verifyTwilioSignature(DOC_URL, DOC_PARAMS, null, "12345"), false);
});

test("opt-out words are recognized regardless of case, accents or punctuation", () => {
  for (const body of ["BAJA", "baja", " Stop ", "ALTO!", "Cancelar.", "cancelár", "STOPALL"]) {
    assert.equal(isOptOutMessage(body), true, body);
  }
});

test("a normal reply that merely contains an opt-out word does not unsubscribe the lead", () => {
  for (const body of ["Sí, llámenme", "No pares de escribirme", "baja el precio?", "stop por favor no", ""]) {
    assert.equal(isOptOutMessage(body), false, body);
  }
});

test("English opt-out words are left to Twilio so the lead does not get two confirmations", () => {
  assert.equal(isKeywordHandledByTwilio("STOP"), true);
  assert.equal(isKeywordHandledByTwilio("Baja"), false);
});

test("START, UNSTOP, ALTA and SUSCRIBIR re-subscribe a number that had opted out", () => {
  for (const body of ["START", "unstop", " Alta ", "ALTA!", "Suscribir."]) {
    assert.equal(isOptInMessage(body), true, body);
    assert.equal(isOptOutMessage(body), false, body);
  }
});

test("a casual yes or a sentence with alta does not re-subscribe anyone by accident", () => {
  for (const body of ["YES", "Sí", "si", "dar de alta mi cuenta", "prioridad alta", ""]) {
    assert.equal(isOptInMessage(body), false, body);
  }
});

test("Twilio confirms its own START/UNSTOP, but the Spanish ALTA confirmation is ours", () => {
  assert.equal(isKeywordHandledByTwilio("START"), true);
  assert.equal(isKeywordHandledByTwilio("unstop"), true);
  assert.equal(isKeywordHandledByTwilio("ALTA"), false);
});

test("the stored keyword is normalized so audits compare the same word", () => {
  assert.equal(normalizeSmsKeyword(" Cancelár! "), "cancelar");
});

test("the TwiML reply escapes XML so a template can never break the response", () => {
  assert.equal(twimlResponse(), '<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  assert.match(twimlResponse("A & B <ok>"), /<Message>A &amp; B &lt;ok&gt;<\/Message>/);
});
