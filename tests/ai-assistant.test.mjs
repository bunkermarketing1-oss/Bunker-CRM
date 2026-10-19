// tests/ai-assistant.test.mjs
// Asistente de IA fuera de horario: horario en la zona del cliente, prompt, limpieza de la
// respuesta y cuándo no se contesta. Lógica pura, sin servidor, base ni OpenAI.
// Uso: pnpm test:ai-assistant

import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidTimeZone, isWithinBusinessHours, localWeekdayAndMinutes, parseTimeOfDay } from "../src/lib/ai-assistant/business-hours.ts";
import { buildAiReplyMessages, redactContactData, sanitizeAiReply } from "../src/lib/ai-assistant/prompt.ts";
import { aiReplySkipReason } from "../src/lib/ai-assistant/reply-guards.ts";
import { AI_REPLY_MAX_LENGTH, AI_REPLY_SKIP_REASON, DEFAULT_BUSINESS_HOURS } from "../src/lib/constants/ai-assistant.ts";

// ---------------------------------------------------------------------------
// Horario
// ---------------------------------------------------------------------------

const WEEKDAYS_9_TO_18 = {
  mon: { start: "09:00", end: "18:00" },
  tue: { start: "09:00", end: "18:00" },
  wed: { start: "09:00", end: "18:00" },
  thu: { start: "09:00", end: "18:00" },
  fri: { start: "09:00", end: "18:00" },
  sat: null,
  sun: null,
};

test("times of day parse only valid 24h values", () => {
  assert.equal(parseTimeOfDay("08:30"), 510);
  assert.equal(parseTimeOfDay("23:59"), 1439);
  assert.equal(parseTimeOfDay("24:00"), null);
  assert.equal(parseTimeOfDay("8:30"), null);
});

test("only IANA time zones known by the runtime are accepted", () => {
  assert.equal(isValidTimeZone("America/Bogota"), true);
  assert.equal(isValidTimeZone("America/Mexico_City"), true);
  assert.equal(isValidTimeZone("Bogota"), false);
  assert.equal(isValidTimeZone(""), false);
});

test("the local hour is computed in the client time zone, not the server's", () => {
  // Lunes 2026-10-19 13:30 UTC = 08:30 en Bogotá (UTC-5) y 07:30 en Ciudad de México (UTC-6).
  const date = new Date("2026-10-19T13:30:00Z");
  assert.deepEqual(localWeekdayAndMinutes(date, "America/Bogota"), { weekday: "mon", minutes: 8 * 60 + 30 });
  assert.deepEqual(localWeekdayAndMinutes(date, "America/Mexico_City"), { weekday: "mon", minutes: 7 * 60 + 30 });
});

test("the weekday also follows the client time zone near midnight", () => {
  // Martes 03:00 UTC sigue siendo lunes 22:00 en Bogotá.
  assert.deepEqual(localWeekdayAndMinutes(new Date("2026-10-20T03:00:00Z"), "America/Bogota"), { weekday: "mon", minutes: 22 * 60 });
});

test("the same instant can be open for one client and closed for another", () => {
  // Lunes 14:30 UTC: 09:30 en Bogotá (abierto), 08:30 en Ciudad de México (cerrado).
  const date = new Date("2026-10-19T14:30:00Z");
  assert.equal(isWithinBusinessHours(date, "America/Bogota", WEEKDAYS_9_TO_18), true);
  assert.equal(isWithinBusinessHours(date, "America/Mexico_City", WEEKDAYS_9_TO_18), false);
});

test("the opening minute counts as open and the closing minute as closed", () => {
  assert.equal(isWithinBusinessHours(new Date("2026-10-19T14:00:00Z"), "America/Bogota", WEEKDAYS_9_TO_18), true); // 09:00
  assert.equal(isWithinBusinessHours(new Date("2026-10-19T22:59:00Z"), "America/Bogota", WEEKDAYS_9_TO_18), true); // 17:59
  assert.equal(isWithinBusinessHours(new Date("2026-10-19T23:00:00Z"), "America/Bogota", WEEKDAYS_9_TO_18), false); // 18:00
});

test("a closed day is out of business hours all day long", () => {
  // Sábado 2026-10-24 12:00 en Bogotá.
  assert.equal(isWithinBusinessHours(new Date("2026-10-24T17:00:00Z"), "America/Bogota", WEEKDAYS_9_TO_18), false);
  assert.equal(isWithinBusinessHours(new Date("2026-10-24T17:00:00Z"), "America/Bogota", DEFAULT_BUSINESS_HOURS), true);
});

test("daylight saving time is respected for clients in zones that use it", () => {
  // 13:30 UTC es 09:30 en Nueva York en octubre (EDT, UTC-4) y 08:30 en diciembre (EST, UTC-5).
  assert.equal(isWithinBusinessHours(new Date("2026-10-19T13:30:00Z"), "America/New_York", WEEKDAYS_9_TO_18), true);
  assert.equal(isWithinBusinessHours(new Date("2026-12-07T13:30:00Z"), "America/New_York", WEEKDAYS_9_TO_18), false);
});

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

const promptInput = {
  clientName: "Carrito Naranja",
  knowledgeBase: "Plan básico: $99.000 al mes. Sede: Calle 10 # 5-20, Bogotá.",
  instructions: "Tutea al cliente.",
  leadFirstName: "Ana",
  conversation: [
    { fromLead: false, body: "Hola Ana, gracias por tu interés en Carrito Naranja." },
    { fromLead: true, body: "¿Cuánto cuesta? Mi correo es ana@example.com y mi cel +57 300 123 4567" },
  ],
  maxLength: AI_REPLY_MAX_LENGTH,
};

test("the system prompt restricts answers to the knowledge base, in Spanish and within the SMS length", () => {
  const [system] = buildAiReplyMessages(promptInput);
  assert.equal(system.role, "system");
  assert.match(system.content, /ÚNICAMENTE la información de la BASE DE CONOCIMIENTO/);
  assert.match(system.content, /No inventes precios/);
  assert.match(system.content, /en español/);
  assert.match(system.content, new RegExp(`Máximo ${AI_REPLY_MAX_LENGTH} caracteres`));
  assert.match(system.content, /un asesor le escribirá en horario de atención/);
  assert.match(system.content, /Plan básico: \$99\.000 al mes/);
  assert.match(system.content, /Tutea al cliente/);
});

test("the conversation becomes chat turns: the lead is the user and our messages the assistant", () => {
  const [, first, second] = buildAiReplyMessages(promptInput);
  assert.equal(first.role, "assistant");
  assert.equal(second.role, "user");
});

test("emails and phone numbers typed by the lead never reach OpenAI", () => {
  const all = buildAiReplyMessages(promptInput).map((m) => m.content).join("\n");
  assert.doesNotMatch(all, /ana@example\.com/);
  assert.doesNotMatch(all, /300 123 4567/);
  assert.match(all, /\[correo\]/);
  assert.match(all, /\[teléfono\]/);
});

test("prices written with thousands separators are not mistaken for phone numbers", () => {
  assert.equal(redactContactData("¿Sigue en $1.500.000?"), "¿Sigue en $1.500.000?");
  assert.equal(redactContactData("Llámame al 3001234567"), "Llámame al [teléfono]");
});

test("empty messages are left out of the conversation", () => {
  const messages = buildAiReplyMessages({ ...promptInput, conversation: [{ fromLead: true, body: "   " }] });
  assert.equal(messages.length, 1);
});

// ---------------------------------------------------------------------------
// Respuesta del modelo
// ---------------------------------------------------------------------------

test("a reply is flattened to one plain line without wrapping quotes or markdown", () => {
  assert.equal(sanitizeAiReply('  "Hola **Ana**,\n\nel plan cuesta $99.000."  ', 320), "Hola Ana, el plan cuesta $99.000.");
});

test("an empty reply is treated as no reply so the handoff message is sent instead", () => {
  assert.equal(sanitizeAiReply("", 320), null);
  assert.equal(sanitizeAiReply('  ""  ', 320), null);
  assert.equal(sanitizeAiReply(null, 320), null);
});

test("a long reply is cut at a sentence or word boundary within the SMS limit", () => {
  const long = `${"Tenemos varios planes disponibles para ti. ".repeat(10)}Fin`;
  const reply = sanitizeAiReply(long, 320);
  assert.ok(reply.length <= 320);
  assert.ok(reply.endsWith("."));

  const words = sanitizeAiReply("palabra ".repeat(60), 50);
  assert.ok(words.length <= 50);
  assert.ok(words.endsWith("palabra"));
});

// ---------------------------------------------------------------------------
// Cuándo no se contesta
// ---------------------------------------------------------------------------

const replyable = {
  duplicate: false,
  hasLead: true,
  ambiguous: false,
  isKeyword: false,
  optedOut: false,
  body: "¿Qué horario tienen?",
  enabled: true,
  withinBusinessHours: false,
  repliesInWindow: 0,
  maxRepliesPerDay: 3,
};
const skip = (changes) => aiReplySkipReason({ ...replyable, ...changes }, AI_REPLY_SKIP_REASON);

test("a lead writing out of business hours to an enabled client gets an AI reply", () => {
  assert.equal(skip({}), null);
});

test("inside business hours the advisors answer, not the AI", () => {
  assert.equal(skip({ withinBusinessHours: true }), AI_REPLY_SKIP_REASON.BUSINESS_HOURS);
});

test("an ambiguous reply (several clients share the number) is never answered on anyone's behalf", () => {
  assert.equal(skip({ ambiguous: true, hasLead: false }), AI_REPLY_SKIP_REASON.AMBIGUOUS);
});

test("unknown numbers and conversations without a lead are not answered", () => {
  assert.equal(skip({ hasLead: false }), AI_REPLY_SKIP_REASON.NO_LEAD);
});

test("opt-out and opt-in keywords are confirmed by the webhook, not by the AI", () => {
  assert.equal(skip({ isKeyword: true }), AI_REPLY_SKIP_REASON.KEYWORD);
});

test("a number that opted out never receives an AI reply", () => {
  assert.equal(skip({ optedOut: true }), AI_REPLY_SKIP_REASON.OPTED_OUT);
});

test("a Twilio retry of an already processed SMS is not answered twice", () => {
  assert.equal(skip({ duplicate: true }), AI_REPLY_SKIP_REASON.DUPLICATE);
});

test("clients without the assistant enabled get no AI replies", () => {
  assert.equal(skip({ enabled: false }), AI_REPLY_SKIP_REASON.DISABLED);
});

test("the per-conversation cap stops a lead from chatting indefinitely with the bot", () => {
  assert.equal(skip({ repliesInWindow: 2 }), null);
  assert.equal(skip({ repliesInWindow: 3 }), AI_REPLY_SKIP_REASON.DAILY_CAP);
});

test("an empty inbound SMS (e.g. only an image) is not answered", () => {
  assert.equal(skip({ body: "  " }), AI_REPLY_SKIP_REASON.EMPTY_BODY);
});
