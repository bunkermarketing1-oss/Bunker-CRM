import test from "node:test";
import assert from "node:assert/strict";
import { buildDaySlots, isSlotTaken, intervalsOverlap } from "../src/lib/appointment-slots.ts";

test("la agenda se divide en bloques de 20 minutos y el último cabe completo antes del cierre", () => {
  assert.deepEqual(buildDaySlots("09:00", "10:00", 20), ["09:00", "09:20", "09:40"]);
  const day = buildDaySlots("09:00", "18:00", 20);
  assert.equal(day.length, 27);
  assert.equal(day.at(-1), "17:40");
});

test("una cita de 20 minutos solo bloquea su propio bloque, no los vecinos", () => {
  const booked = [{ scheduledAt: "2026-11-27T14:20:00Z", durationMinutes: 20 }];
  assert.equal(isSlotTaken(new Date("2026-11-27T14:00:00Z"), 20, booked), false);
  assert.equal(isSlotTaken(new Date("2026-11-27T14:20:00Z"), 20, booked), true);
  assert.equal(isSlotTaken(new Date("2026-11-27T14:40:00Z"), 20, booked), false);
});

test("una cita antigua de 45 minutos bloquea todos los bloques de 20 minutos que alcanza", () => {
  const booked = [{ scheduledAt: "2026-11-27T14:00:00Z", durationMinutes: 45 }];
  assert.equal(isSlotTaken(new Date("2026-11-27T14:00:00Z"), 20, booked), true);
  assert.equal(isSlotTaken(new Date("2026-11-27T14:20:00Z"), 20, booked), true);
  assert.equal(isSlotTaken(new Date("2026-11-27T14:40:00Z"), 20, booked), true);
  assert.equal(isSlotTaken(new Date("2026-11-27T15:00:00Z"), 20, booked), false);
});

test("citas pegadas una tras otra no se consideran traslape", () => {
  const start = Date.parse("2026-11-27T14:00:00Z");
  assert.equal(intervalsOverlap(start, 20, start + 20 * 60_000, 20), false);
});
