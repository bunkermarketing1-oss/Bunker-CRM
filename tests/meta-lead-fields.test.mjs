// tests/meta-lead-fields.test.mjs
// Mapeo del field_data de Meta Lead Ads a los campos del Lead. Lógica pura, sin servidor ni base.
// Uso: pnpm test:meta-lead-fields

import { test } from "node:test";
import assert from "node:assert/strict";
import { mapMetaLeadFields } from "../src/lib/integrations/meta-lead-fields.ts";

const field = (name, ...values) => ({ name, values });

test("a standard form fills name, email, phone and company", () => {
  const lead = mapMetaLeadFields([
    field("full_name", "Ana López"),
    field("email", "ana@example.com"),
    field("phone_number", "+525512345678"),
    field("company_name", "Carrito Naranja"),
  ]);
  assert.deepEqual(lead, {
    name: "Ana López",
    email: "ana@example.com",
    phone: "+525512345678",
    companyName: "Carrito Naranja",
    notes: null,
  });
});

test("forms that split first and last name still produce a full name", () => {
  const lead = mapMetaLeadFields([field("first_name", "Ana"), field("last_name", "López")]);
  assert.equal(lead.name, "Ana López");
});

test("custom questions are kept in notes so the advisor sees the answers", () => {
  const lead = mapMetaLeadFields([
    field("full_name", "Ana"),
    field("city", "Monterrey"),
    field("cual_es_tu_presupuesto?", "$10,000 - $20,000"),
  ]);
  assert.equal(lead.notes, "Ciudad: Monterrey\nCual es tu presupuesto?: $10,000 - $20,000");
});

test("a lead without a name falls back to email so it is identifiable in the list", () => {
  const lead = mapMetaLeadFields([field("email", "ana@example.com")]);
  assert.equal(lead.name, "ana@example.com");
});

test("work email and phone are used when the personal ones are missing", () => {
  const lead = mapMetaLeadFields([field("work_email", "ana@empresa.com"), field("work_phone_number", "8112345678")]);
  assert.equal(lead.email, "ana@empresa.com");
  assert.equal(lead.phone, "8112345678");
});

test("empty answers and multi-select values are cleaned up", () => {
  const lead = mapMetaLeadFields([
    field("full_name", "  Ana  "),
    field("email", ""),
    field("servicios_de_interes", "Pauta", "Contenido"),
  ]);
  assert.equal(lead.name, "Ana");
  assert.equal(lead.email, null);
  assert.equal(lead.notes, "Servicios de interes: Pauta, Contenido");
});

test("an empty form still yields a usable lead name", () => {
  assert.equal(mapMetaLeadFields([]).name, "Lead de Meta Ads");
});
