// tests/twilio-voice.test.mjs
// Access Token del navegador y TwiML de llamadas. Lógica pura, sin servidor ni base.
// Uso: pnpm test:twilio-voice

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { createVoiceAccessToken } from "../src/lib/integrations/twilio-voice-token.ts";
import { conferenceTwiml, dialClientsTwiml, sayTwiml } from "../src/lib/integrations/twilio-twiml.ts";

const decode = (part) => JSON.parse(Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString());

const TOKEN_INPUT = {
  accountSid: "AC123",
  apiKeySid: "SK456",
  apiKeySecret: "secreto",
  twimlAppSid: "AP789",
  identity: "u_abc",
  ttlSeconds: 3600,
  nowSeconds: 1_700_000_000,
};

test("the access token has the header Twilio requires for voice grants", () => {
  const [header] = createVoiceAccessToken(TOKEN_INPUT).split(".");
  assert.deepEqual(decode(header), { typ: "JWT", alg: "HS256", cty: "twilio-fpa;v=1" });
});

test("the token lets the browser call out through the TwiML App and receive calls as its identity", () => {
  const [, payload] = createVoiceAccessToken(TOKEN_INPUT).split(".");
  const claims = decode(payload);
  assert.equal(claims.iss, "SK456");
  assert.equal(claims.sub, "AC123");
  assert.equal(claims.exp - claims.iat, 3600);
  assert.deepEqual(claims.grants, {
    identity: "u_abc",
    voice: { incoming: { allow: true }, outgoing: { application_sid: "AP789" } },
  });
});

test("the token is signed with the API key secret, so it cannot be forged without it", () => {
  const [header, payload, signature] = createVoiceAccessToken(TOKEN_INPUT).split(".");
  const expected = createHmac("sha256", "secreto").update(`${header}.${payload}`).digest("base64url");
  assert.equal(signature, expected);
  const forged = createHmac("sha256", "otro").update(`${header}.${payload}`).digest("base64url");
  assert.notEqual(signature, forged);
});

test("the advisor opens the conference and ends it when hanging up", () => {
  const xml = conferenceTwiml({ name: "call_1", startConferenceOnEnter: true, endConferenceOnExit: true });
  assert.match(xml, /<Dial><Conference startConferenceOnEnter="true" endConferenceOnExit="true" beep="false">call_1<\/Conference><\/Dial>/);
});

test("a listening supervisor is muted and never ends the call for the others", () => {
  const xml = conferenceTwiml({ name: "call_1", startConferenceOnEnter: false, endConferenceOnExit: false, muted: true });
  assert.match(xml, /startConferenceOnEnter="false" endConferenceOnExit="false" muted="true"/);
  assert.doesNotMatch(xml, /coach=/);
});

test("a whispering supervisor coaches only the advisor's leg", () => {
  const xml = conferenceTwiml({ name: "call_1", startConferenceOnEnter: false, endConferenceOnExit: false, coach: "CAagent" });
  assert.match(xml, /coach="CAagent"/);
  assert.doesNotMatch(xml, /muted=/);
});

test("recording is only requested when the line has it enabled", () => {
  const base = { name: "c", startConferenceOnEnter: true, endConferenceOnExit: true, recordingStatusCallback: "https://x/rec" };
  assert.doesNotMatch(conferenceTwiml(base), /record=/);
  assert.match(conferenceTwiml({ ...base, record: true }), /record="record-from-start" recordingStatusCallback="https:\/\/x\/rec"/);
});

test("an inbound call rings every advisor browser and passes the call id to them", () => {
  const xml = dialClientsTwiml({
    identities: ["u_a", "u_b"],
    timeoutSeconds: 25,
    action: "https://x/status?callId=1&leg=dial",
    parameters: { callId: "1" },
  });
  assert.match(xml, /<Dial timeout="25" action="https:\/\/x\/status\?callId=1&amp;leg=dial" method="POST">/);
  assert.equal(xml.match(/<Client>/g).length, 2);
  assert.match(xml, /<Client><Identity>u_a<\/Identity><Parameter name="callId" value="1"\/><\/Client>/);
});

test("spoken text is escaped so a lead name can never break the TwiML", () => {
  assert.match(sayTwiml('Hola <Ana> & "Cía"'), /Hola &lt;Ana&gt; &amp; &quot;Cía&quot;/);
});
