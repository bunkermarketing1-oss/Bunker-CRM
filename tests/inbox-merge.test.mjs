import test from "node:test";
import assert from "node:assert/strict";
import { mergeConversations, conversationMatchesChannel } from "../src/lib/inbox-merge.ts";

const message = (id, createdAt) => ({ id, senderName: "x", body: id, createdAt, direction: "inbound" });
const conversation = (id, channel, lastMessageTime, messages = []) => ({
  id, channel, senderName: id, recipient: id, clientId: null, clientName: null,
  connectedAccountId: null, accountName: null, unreadCount: 0, lastMessageText: "", lastMessageTime, messages,
});

test("al cambiar de pestaña las conversaciones ya cargadas no desaparecen aunque el lote nuevo no las traiga", () => {
  const cache = [conversation("wa1", "whatsapp", "2026-11-26T10:00:00Z"), conversation("ms1", "messenger", "2026-11-26T09:00:00Z")];
  const merged = mergeConversations(cache, [conversation("ms2", "messenger", "2026-11-26T11:00:00Z")]);
  assert.deepEqual(merged.map((c) => c.id), ["ms2", "wa1", "ms1"]);
});

test("un mensaje nuevo actualiza la conversación sin perder el historial largo ya cargado", () => {
  const cache = [conversation("wa1", "whatsapp", "2026-11-26T10:00:00Z", [message("m1", "2026-11-25T10:00:00Z"), message("m2", "2026-11-26T10:00:00Z")])];
  const incoming = [conversation("wa1", "whatsapp", "2026-11-26T12:00:00Z", [message("m2", "2026-11-26T10:00:00Z"), message("m3", "2026-11-26T12:00:00Z")])];
  const [merged] = mergeConversations(cache, incoming);
  assert.deepEqual(merged.messages.map((m) => m.id), ["m1", "m2", "m3"]);
  assert.equal(merged.lastMessageTime, "2026-11-26T12:00:00Z");
});

test("la pestaña Comentarios agrupa los comentarios de Facebook e Instagram", () => {
  assert.equal(conversationMatchesChannel("facebook_comment", "comments"), true);
  assert.equal(conversationMatchesChannel("instagram_comment", "comments"), true);
  assert.equal(conversationMatchesChannel("messenger", "comments"), false);
  assert.equal(conversationMatchesChannel("sms", "all"), true);
  assert.equal(conversationMatchesChannel("whatsapp", "messenger"), false);
});
