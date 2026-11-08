import { test } from "node:test";
import assert from "node:assert/strict";
import { plan, independenceTarget } from "../src/lib/independence.mjs";
import { project } from "../src/lib/projection.mjs";
test("annual effective rate, end-of-month deposits and existing simulator agree", () => {
  const p = plan(1000, 100, 12, 1, 4).at(-1);
  const r = 1.12 ** (1 / 12) - 1;
  assert.ok(
    Math.abs(p.balance - (1120 + (100 * ((1 + r) ** 12 - 1)) / r)) < 1e-8,
  );
  assert.equal(p.balance, project(1000, 100, 12, 1).at(-1).balance);
  assert.equal(p.invested, 2200);
  assert.equal(p.growth, p.balance - 2200);
  assert.equal(p.real, p.balance / 1.04);
});
test("zero rate, zero horizon, zero capital and negative growth", () => {
  assert.equal(plan(100, 10, 0, 1, 0).at(-1).balance, 220);
  assert.deepEqual(plan(100, 10, 0, 0, 0), [
    { year: 0, invested: 100, balance: 100, growth: 0, real: 100 },
  ]);
  assert.equal(plan(0, 0, 100, 100, 100).at(-1).balance, 0);
  assert.ok(plan(100, 0, -50, 1, 0).at(-1).growth < 0);
  assert.ok(
    plan(1e9, 1e6, 100, 100, 100).every((p) => Number.isFinite(p.real)),
  );
  assert.throws(() => plan(1e9, 1e6, 100, 100, -99.99));
});
test("rejects missing finite rates, invalid bounds and fractional years", () => {
  for (const args of [
    [NaN, 0, 1, 1, 1],
    [0, 0, -100, 1, 1],
    [0, 0, 1, 1, -100],
    [-1, 0, 0, 1, 0],
    [0, -1, 0, 1, 0],
    [0, 0, 0, 101, 0],
    [0, 0, 0, 1.5, 0],
  ])
    assert.throws(() => plan(...args));
});
test("withdrawal target uses annual income in current purchasing power", () => {
  assert.equal(independenceTarget(3000, 4), 900000);
  assert.equal(independenceTarget(0, 4), 0);
  for (const rate of [0, -1, Infinity, NaN, 101])
    assert.throws(() => independenceTarget(3000, rate));
});
