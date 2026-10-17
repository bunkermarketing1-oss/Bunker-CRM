// tests/sms-template.test.mjs
// Plantillas del SMS automático al recibir lead. Lógica pura, sin servidor ni base.
// Uso: pnpm test:sms-template

import { test } from "node:test";
import assert from "node:assert/strict";
import { findUnknownTemplateVariables, firstNameOf, renderSmsTemplate } from "../src/lib/automations/sms-template.ts";

const ALLOWED = ["nombre", "nombre_completo", "cliente", "campana"];

test("variables are replaced with the lead data", () => {
  const sms = renderSmsTemplate("Hola {{nombre}}, gracias por escribir a {{cliente}}.", { nombre: "Ana", cliente: "Carrito Naranja" });
  assert.equal(sms, "Hola Ana, gracias por escribir a Carrito Naranja.");
});

test("spacing inside the braces and uppercase names are accepted", () => {
  assert.equal(renderSmsTemplate("Hola {{ NOMBRE }}!", { nombre: "Ana" }), "Hola Ana!");
});

test("a missing value leaves no double spaces or a space before punctuation", () => {
  // Lead sin nombre: el SMS no debe verse roto ("Hola , gracias").
  assert.equal(renderSmsTemplate("Hola {{nombre}}, gracias.", { nombre: null }), "Hola, gracias.");
  assert.equal(renderSmsTemplate("Hola {{nombre}} de {{cliente}}", { cliente: "CN" }), "Hola de CN");
});

test("line breaks written by the admin are preserved", () => {
  assert.equal(renderSmsTemplate("Hola {{nombre}}\nResponde SI", { nombre: "Ana" }), "Hola Ana\nResponde SI");
});

test("typos in variables are detected before saving the rule", () => {
  assert.deepEqual(findUnknownTemplateVariables("Hola {{nombr}} y {{cliente}} {{nombr}}", ALLOWED), ["nombr"]);
  assert.deepEqual(findUnknownTemplateVariables("Hola {{nombre}}", ALLOWED), []);
});

test("the SMS greets by first name only", () => {
  assert.equal(firstNameOf("  Ana María López "), "Ana");
  assert.equal(firstNameOf(null), "");
});
