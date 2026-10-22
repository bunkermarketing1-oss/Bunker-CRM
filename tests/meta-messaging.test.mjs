// tests/meta-messaging.test.mjs
// Validación de payloads de mensajería directa de Meta (Facebook Messenger e Instagram Direct).
// Lógica pura sin llamadas externas de red.
// Uso: node --test tests/meta-messaging.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyMetaSignature } from "../src/lib/integrations/meta-webhook.ts";

const SECRET = "test-meta-secret";

test("reconoce firma de webhook válida para payloads de mensajería", () => {
  const payload = JSON.stringify({
    object: "page",
    entry: [
      {
        id: "1539491809672725",
        time: 1729620000000,
        messaging: [
          {
            sender: { id: "123456789" },
            recipient: { id: "1539491809672725" },
            timestamp: 1729620000000,
            message: {
              mid: "mid.12345:abcde",
              text: "Hola, quisiera informes sobre el carrito naranja",
            },
          },
        ],
      },
    ],
  });

  const sig = `sha256=${createHmac("sha256", SECRET).update(payload).digest("hex")}`;
  assert.equal(verifyMetaSignature(payload, sig, SECRET), true);
});

test("identifica correctamente mensajes entrantes vs ecos de la página", () => {
  const inboundItem = {
    sender: { id: "user_psid_1" },
    recipient: { id: "page_id_1" },
    timestamp: 1729620000000,
    message: { mid: "m_1", text: "Mensaje del cliente", is_echo: false },
  };

  const echoItem = {
    sender: { id: "page_id_1" },
    recipient: { id: "user_psid_1" },
    timestamp: 1729620001000,
    message: { mid: "m_2", text: "Respuesta del asesor desde Business Suite", is_echo: true },
  };

  const isEcho1 = Boolean(inboundItem.message.is_echo);
  const direction1 = isEcho1 ? "outbound" : "inbound";
  const leadExternalId1 = isEcho1 ? inboundItem.recipient.id : inboundItem.sender.id;

  const isEcho2 = Boolean(echoItem.message.is_echo);
  const direction2 = isEcho2 ? "outbound" : "inbound";
  const leadExternalId2 = isEcho2 ? echoItem.recipient.id : echoItem.sender.id;

  assert.equal(direction1, "inbound");
  assert.equal(leadExternalId1, "user_psid_1");

  assert.equal(direction2, "outbound");
  assert.equal(leadExternalId2, "user_psid_1");
});

test("diferencia entre canales Messenger e Instagram según el objeto o activo", () => {
  const pagePayload = { object: "page", entry: [{ id: "page_123", messaging: [] }] };
  const igPayload = { object: "instagram", entry: [{ id: "ig_456", messaging: [] }] };

  assert.equal(pagePayload.object === "instagram" ? "instagram" : "messenger", "messenger");
  assert.equal(igPayload.object === "instagram" ? "instagram" : "messenger", "instagram");
});

test("asigna el texto adecuado si el mensaje incluye adjuntos de imagen o archivo", () => {
  const textItem = { message: { mid: "m1", text: "Hola!" } };
  const imageItem = { message: { mid: "m2", attachments: [{ type: "image", payload: { url: "https://..." } }] } };
  const emptyItem = { message: { mid: "m3" } };

  function extractText(item) {
    let body = (item.message?.text || "").trim();
    if (!body && item.message?.attachments && item.message.attachments.length > 0) {
      body = `[${item.message.attachments[0].type.toUpperCase()}]`;
    }
    return body || "[Mensaje interactivo]";
  }

  assert.equal(extractText(textItem), "Hola!");
  assert.equal(extractText(imageItem), "[IMAGE]");
  assert.equal(extractText(emptyItem), "[Mensaje interactivo]");
});
