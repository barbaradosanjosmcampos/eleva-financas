import test from "node:test";
import assert from "node:assert/strict";
import { plan, scenarioDefaults } from "../src/lib/independence.mjs";
import { project } from "../src/lib/projection.mjs";
const base = {
  initial: 1000,
  monthly: 100,
  years: 10,
  rate: 7,
  inflation: 4,
  income: 3000,
  withdrawal: 4,
};
const close = (a, b) =>
  assert.ok(
    Math.abs(a - b) < Math.max(1e-6, Math.abs(b) * 1e-10),
    `${a} != ${b}`,
  );
test("independência reutiliza o simulador, sem duplicar patrimônio inicial", () => {
  const p = plan(base);
  assert.deepEqual(
    p.series.map(({ year, invested, balance }) => ({
      year,
      invested,
      balance,
    })),
    project(1000, 100, 7, 10),
  );
  assert.equal(p.last.invested, 13000);
  close(p.last.growth + p.last.invested, p.last.balance);
});
test("inflação descontada, meta e diferença usam a mesma unidade monetária", () => {
  const p = plan(base);
  close(p.last.real, p.last.balance / 1.04 ** 10);
  assert.equal(p.target, 900000);
  close(p.gap, p.last.real - 900000);
});
test("aporte no fim do mês com taxa efetiva mensal", () => {
  const r = 1.12 ** (1 / 12) - 1;
  close(
    plan({ ...base, initial: 0, monthly: 500, years: 1, rate: 12 }).last
      .balance,
    (500 * ((1 + r) ** 12 - 1)) / r,
  );
});
test("retorno igual à inflação conserva poder de compra sem aportes", () => {
  close(plan({ ...base, monthly: 0, rate: 4 }).last.real, 1000);
});
test("taxas zero, perdas, deflação e patrimônio vazio", () => {
  const zero = plan({ ...base, rate: 0, inflation: 0 });
  assert.equal(zero.last.balance, 13000);
  assert.equal(zero.last.growth, 0);
  assert.equal(zero.last.real, 13000);
  const loss = plan({ ...base, monthly: 0, years: 1, rate: -99 });
  close(loss.last.balance, 10);
  assert.ok(loss.last.growth < 0);
  assert.ok(
    plan({ ...base, inflation: -5 }).last.real > plan(base).last.balance,
  );
  const empty = plan({ ...base, initial: 0, monthly: 0, income: 0, age: 30 });
  assert.equal(empty.target, 0);
  assert.equal(empty.gap, 0);
  assert.equal(empty.finalAge, 40);
  assert.equal(plan(base).finalAge, null);
});
test("limites máximos continuam finitos e cada cenário é independente", () => {
  const p = plan({
    ...base,
    initial: 1e9,
    monthly: 1e6,
    years: 80,
    rate: 50,
    inflation: -20,
  });
  assert.ok(Number.isFinite(p.last.real));
  assert.equal(p.series.length, 81);
  const results = scenarioDefaults.map(
    (s) => plan({ ...base, rate: s.rate }).last.balance,
  );
  assert.ok(results[0] < results[1] && results[1] < results[2]);
  assert.equal(base.rate, 7);
});
test("rejeita entradas ausentes, não finitas, fora dos limites e prazos fracionários", () => {
  for (const [key, values] of Object.entries({
    initial: [-1, Infinity, NaN],
    monthly: [-1, 1e7],
    years: [0, 81, 1.5],
    rate: [-100, 51],
    inflation: [-100, 51],
    income: [-1, Infinity],
    withdrawal: [0, -1, 21],
    age: [-1, 121, 20.5],
  }))
    for (const value of values)
      assert.throws(() => plan({ ...base, [key]: value }));
});

test("meta responde à renda e à retirada; retorno e inflação mudam apenas a projeção", () => {
  assert.equal(plan(base).annualIncome, 36000);
  assert.equal(plan({ ...base, income: 6000 }).target, 1800000);
  assert.equal(plan({ ...base, withdrawal: 2 }).target, 1800000);
  assert.equal(plan({ ...base, withdrawal: 8 }).target, 450000);
  for (const change of [{ rate: 10 }, { inflation: 8 }, { years: 30 }, { monthly: 800 }]) {
    const changed = plan({ ...base, ...change });
    assert.equal(changed.target, plan(base).target);
    assert.notEqual(changed.last.real, plan(base).last.real);
    close(changed.gap, changed.last.real - changed.target);
  }
  for (const withdrawal of [NaN, Infinity, -Infinity, undefined, 0.09, 20.01])
    assert.throws(() => plan({ ...base, withdrawal }), /Taxa de retirada/);
});

test("rendimentos e retiradas separados, sem dupla contagem e com perdas", async () => {
  const { wealthExample } = await import("../src/lib/independence.mjs");
  assert.deepEqual(wealthExample(100000, 5, 8000), { initial: 100000, earnings: 5000, withdrawal: 8000, final: 97000 });
  assert.equal(wealthExample(100000, 5, 0).final, 105000);
  assert.equal(wealthExample(100000, 5, 5000).final, 100000);
  assert.equal(wealthExample(100000, -10, 8000).final, 82000);
  assert.equal(wealthExample(100000, -100, 0).final, 0);
  assert.equal(wealthExample(0, 0, 0).final, 0);
  for (const args of [[100, 0, 101], [-1, 5, 0], [100, NaN, 0], [100, 5, -1], [100, -101, 0]])
    assert.throws(() => wealthExample(...args));
});
