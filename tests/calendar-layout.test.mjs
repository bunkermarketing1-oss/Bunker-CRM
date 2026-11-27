import test from "node:test";
import assert from "node:assert/strict";
import { addMonths, isSameDay, layoutDayEvents, monthGrid, startOfWeek, visibleRange, weekDays, snapMinutes } from "../src/lib/calendar-layout.ts";

const at = (h, m = 0, day = 27) => new Date(2026, 10, day, h, m);
const event = (id, start, end) => ({ id, kind: "appointment", title: id, start, end });

test("la semana empieza en lunes, aunque el día elegido sea domingo", () => {
  assert.equal(startOfWeek(new Date(2026, 10, 29)).getDate(), 23); // domingo 29 -> lunes 23
  assert.deepEqual(weekDays(new Date(2026, 10, 27)).map((d) => d.getDate()), [23, 24, 25, 26, 27, 28, 29]);
});

test("el mes se dibuja con 6 semanas completas que empiezan en lunes", () => {
  const grid = monthGrid(new Date(2026, 10, 15)); // noviembre 2026 empieza en domingo
  assert.equal(grid.length, 42);
  assert.equal(grid[0].getDay(), 1);
  assert.ok(isSameDay(grid[0], new Date(2026, 9, 26)));
});

test("sumar un mes desde el 31 cae en el último día del mes siguiente", () => {
  assert.ok(isSameDay(addMonths(new Date(2027, 0, 31), 1), new Date(2027, 1, 28)));
});

test("citas seguidas no se traslapan; dos al mismo tiempo quedan lado a lado", () => {
  const seguidas = layoutDayEvents([event("a", at(9), at(9, 20)), event("b", at(9, 20), at(9, 40))], at(0), 540, 1080);
  assert.deepEqual(seguidas.map((p) => [p.column, p.columns]), [[0, 1], [0, 1]]);

  const juntas = layoutDayEvents([event("a", at(9), at(9, 40)), event("b", at(9, 20), at(10))], at(0), 540, 1080);
  assert.deepEqual(juntas.map((p) => [p.event.id, p.column, p.columns]), [["a", 0, 2], ["b", 1, 2]]);
});

test("el rango visible se amplía si hay una cita fuera del horario de atención", () => {
  assert.deepEqual(visibleRange([], 540, 1080), { startMin: 540, endMin: 1080 });
  assert.deepEqual(visibleRange([event("tarde", at(19, 10), at(19, 30))], 540, 1080), { startMin: 540, endMin: 1200 });
});

test("tocar a las 9:25 elige el bloque de las 9:20", () => {
  assert.equal(snapMinutes(9 * 60 + 25, 20), 9 * 60 + 20);
});
