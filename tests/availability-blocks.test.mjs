import test from "node:test";
import assert from "node:assert/strict";
import { expandBlocksToIntervals, zonedWallTimeToUtcMs } from "../src/lib/availability-blocks.ts";

const weekly = (overrides = {}) => ({
  startsAt: null, endsAt: null, weekdays: [1, 2, 3, 4, 5], startTime: "13:00", endTime: "14:00", timezone: "America/Chicago", ...overrides,
});

test("la comida de 13:00 a 14:00 hora de Dallas cae en el instante UTC correcto, también con horario de verano", () => {
  // Invierno (CST, UTC-6) y verano (CDT, UTC-5)
  assert.equal(new Date(zonedWallTimeToUtcMs("2026-11-27", "13:00", "America/Chicago")).toISOString(), "2026-11-27T19:00:00.000Z");
  assert.equal(new Date(zonedWallTimeToUtcMs("2027-03-15", "13:00", "America/Chicago")).toISOString(), "2027-03-15T18:00:00.000Z");
  assert.equal(new Date(zonedWallTimeToUtcMs("2026-11-27", "13:00", "America/Bogota")).toISOString(), "2026-11-27T18:00:00.000Z");
});

test("un bloqueo semanal de lunes a viernes no genera intervalos en fin de semana", () => {
  // Del jueves 26 al lunes 30 de noviembre de 2026
  const from = Date.parse("2026-11-26T00:00:00Z");
  const to = Date.parse("2026-11-30T23:59:00Z");
  const days = expandBlocksToIntervals([weekly()], from, to).map((i) => i.scheduledAt.slice(0, 10));
  assert.deepEqual(days, ["2026-11-26", "2026-11-27", "2026-11-30"]);
});

test("cada intervalo semanal dura lo que dura el bloqueo", () => {
  const [first] = expandBlocksToIntervals([weekly({ startTime: "13:00", endTime: "14:20" })], Date.parse("2026-11-27T00:00:00Z"), Date.parse("2026-11-28T00:00:00Z"));
  assert.equal(first.durationMinutes, 80);
});

test("un bloqueo único se respeta y uno fuera del rango se ignora", () => {
  const once = { startsAt: "2026-11-27T15:00:00Z", endsAt: "2026-11-27T16:00:00Z", weekdays: [], startTime: null, endTime: null, timezone: null };
  assert.equal(expandBlocksToIntervals([once], Date.parse("2026-11-27T00:00:00Z"), Date.parse("2026-11-28T00:00:00Z")).length, 1);
  assert.equal(expandBlocksToIntervals([once], Date.parse("2026-12-01T00:00:00Z"), Date.parse("2026-12-02T00:00:00Z")).length, 0);
});

import { createAvailabilityBlockSchema } from "../src/lib/validations/availability.ts";

test("la validación acepta una comida semanal y rechaza horas al revés, días vacíos o zonas inventadas", () => {
  const ok = { kind: "weekly", title: "Comida", weekdays: [1, 2, 3, 4, 5], startTime: "13:00", endTime: "14:00", timezone: "America/Chicago" };
  assert.equal(createAvailabilityBlockSchema.safeParse(ok).success, true);
  assert.equal(createAvailabilityBlockSchema.safeParse({ ...ok, startTime: "14:00", endTime: "13:00" }).success, false);
  assert.equal(createAvailabilityBlockSchema.safeParse({ ...ok, weekdays: [] }).success, false);
  assert.equal(createAvailabilityBlockSchema.safeParse({ ...ok, timezone: "Marte/Olympus" }).success, false);
  assert.equal(createAvailabilityBlockSchema.safeParse({ ...ok, title: "   " }).success, false);
});

test("un bloqueo único exige que termine después de empezar", () => {
  const once = { kind: "once", title: "Dentista", startsAt: "2026-11-27T15:00:00Z", endsAt: "2026-11-27T16:00:00Z" };
  assert.equal(createAvailabilityBlockSchema.safeParse(once).success, true);
  assert.equal(createAvailabilityBlockSchema.safeParse({ ...once, endsAt: "2026-11-27T14:00:00Z" }).success, false);
});
