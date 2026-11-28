import test from "node:test";
import assert from "node:assert/strict";
import { findUnattendedChats, formatWaitLabel } from "../src/lib/unattended-chats.ts";

const NOW = Date.parse("2026-11-28T15:00:00Z");
const chat = (id, minutesAgo, waiting = true) => ({
  id, senderName: id, waitingForReply: waiting, lastInboundTime: waiting ? new Date(NOW - minutesAgo * 60_000).toISOString() : null,
});

test("solo cuentan los chats que esperan respuesta desde hace 5 minutos o más, el más antiguo primero", () => {
  const result = findUnattendedChats([chat("reciente", 2), chat("limite", 5), chat("viejo", 250), chat("respondido", 600, false)], NOW);
  assert.deepEqual(result.map((c) => c.id), ["viejo", "limite"]);
});

test("el tiempo de espera se muestra en minutos, horas o días", () => {
  assert.equal(formatWaitLabel(125), "2 min");
  assert.equal(formatWaitLabel(4 * 3600 + 12 * 60), "4 h 12 min");
  assert.equal(formatWaitLabel(51 * 3600), "2 d 3 h");
});
