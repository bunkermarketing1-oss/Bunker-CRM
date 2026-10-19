// tests/team-live.test.mjs
// Vista en vivo del equipo: corte de "hoy" en la zona horaria del cliente y estado del asesor.
// Lógica pura, sin servidor ni base.
// Uso: node --test tests/team-live.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import {
  countByUser,
  elapsedSeconds,
  formatClock,
  latestDate,
  resolveAdvisorStatus,
  startOfDayInTimeZone,
} from "../src/lib/team-live.ts";
import { ADVISOR_IDLE_MINUTES, ADVISOR_STATUS, DEFAULT_TEAM_TIME_ZONE } from "../src/lib/constants/team.ts";

const STATUSES = { onCall: ADVISOR_STATUS.ON_CALL, available: ADVISOR_STATUS.AVAILABLE, idle: ADVISOR_STATUS.IDLE };
const IDLE_MS = ADVISOR_IDLE_MINUTES * 60 * 1000;

test("in Bogotá the day starts at 05:00 UTC, not at the server's UTC midnight", () => {
  const now = new Date("2026-10-19T15:30:00Z"); // 10:30 en Bogotá
  assert.equal(startOfDayInTimeZone(now, DEFAULT_TEAM_TIME_ZONE).toISOString(), "2026-10-19T05:00:00.000Z");
});

test("at 9 p.m. in Bogotá (already tomorrow in UTC) the counters still belong to today", () => {
  const now = new Date("2026-10-20T02:00:00Z"); // 19 oct, 21:00 en Bogotá
  assert.equal(startOfDayInTimeZone(now, DEFAULT_TEAM_TIME_ZONE).toISOString(), "2026-10-19T05:00:00.000Z");
});

test("right after local midnight a new day starts", () => {
  const now = new Date("2026-10-20T05:00:30Z"); // 20 oct, 00:00:30 en Bogotá
  assert.equal(startOfDayInTimeZone(now, DEFAULT_TEAM_TIME_ZONE).toISOString(), "2026-10-20T05:00:00.000Z");
});

test("a time zone with daylight saving uses the offset of that day's midnight", () => {
  // 8 mar 2026: Nueva York pasa a horario de verano a las 2 a. m.; la medianoche aún es UTC-5.
  assert.equal(startOfDayInTimeZone(new Date("2026-03-08T18:00:00Z"), "America/New_York").toISOString(), "2026-03-08T05:00:00.000Z");
  assert.equal(startOfDayInTimeZone(new Date("2026-03-09T18:00:00Z"), "America/New_York").toISOString(), "2026-03-09T04:00:00.000Z");
});

test("an advisor on a live call is shown on call even without other activity", () => {
  const now = new Date();
  assert.equal(resolveAdvisorStatus({ hasLiveCall: true, lastActivityAt: null, now, idleMs: IDLE_MS }, STATUSES), ADVISOR_STATUS.ON_CALL);
});

test("an advisor is available while their last activity is within the idle window, idle after it", () => {
  const now = new Date("2026-10-19T15:30:00Z");
  const recent = new Date(now.getTime() - (IDLE_MS - 1000));
  const old = new Date(now.getTime() - (IDLE_MS + 1000));
  assert.equal(resolveAdvisorStatus({ hasLiveCall: false, lastActivityAt: recent, now, idleMs: IDLE_MS }, STATUSES), ADVISOR_STATUS.AVAILABLE);
  assert.equal(resolveAdvisorStatus({ hasLiveCall: false, lastActivityAt: old, now, idleMs: IDLE_MS }, STATUSES), ADVISOR_STATUS.IDLE);
  assert.equal(resolveAdvisorStatus({ hasLiveCall: false, lastActivityAt: null, now, idleMs: IDLE_MS }, STATUSES), ADVISOR_STATUS.IDLE);
});

test("last activity is the latest of calls and activities, ignoring missing ones", () => {
  const a = new Date("2026-10-19T10:00:00Z");
  const b = new Date("2026-10-19T11:00:00Z");
  assert.equal(latestDate(a, null, b, undefined), b);
  assert.equal(latestDate(null, undefined), null);
});

test("leads contacted counts distinct user-lead pairs per advisor", () => {
  const counts = countByUser([
    { userId: "u1", leadId: "l1" },
    { userId: "u1", leadId: "l2" },
    { userId: "u2", leadId: "l1" },
    { userId: null, leadId: "l3" },
  ]);
  assert.equal(counts.get("u1"), 2);
  assert.equal(counts.get("u2"), 1);
  assert.equal(counts.size, 2);
});

test("call durations never go negative and are shown as m:ss or h:mm:ss", () => {
  const now = new Date("2026-10-19T15:30:00Z");
  assert.equal(elapsedSeconds(new Date("2026-10-19T15:31:00Z"), now), 0);
  assert.equal(elapsedSeconds(new Date("2026-10-19T15:28:55Z"), now), 65);
  assert.equal(elapsedSeconds(null, now), 0);
  assert.equal(formatClock(65), "1:05");
  assert.equal(formatClock(3725), "1:02:05");
  assert.equal(formatClock(0), "0:00");
});
