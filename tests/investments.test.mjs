import test from "node:test";
import assert from "node:assert/strict";
import {
  position,
  consolidate,
  appendOperation,
  migrateV1,
  validateV2,
  recordSnapshot,
  validDate,
} from "../src/lib/investments.mjs";
import {
  loadFinances,
  persistFinances,
  LEGACY_KEY,
  STORAGE_KEY,
} from "../src/lib/storage.mjs";
const date = "2026-11-08";
const asset = () => ({
  id: "a",
  name: "Ativo",
  category: "Ações",
  code: "TEST3",
  institution: "Demo",
  openingDate: "2026-11-01",
  openingInvested: 1000,
  openingQuantity: 10,
  invested: 1000,
  current: 1100,
});
const data = () => ({
  schemaVersion: 2,
  assets: [asset()],
  transactions: [],
  goals: [],
  operations: [],
  snapshots: [],
});
let id = 0;
const op = (type, amount, quantity, currentAfter, extra = {}) => ({
  id: `o${++id}`,
  assetId: "a",
  type,
  date,
  amount,
  quantity,
  currentAfter,
  incomeType: null,
  note: "",
  ...extra,
});
const near = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-7, `${actual} ≠ ${expected}`);
function storage(initial = {}) {
  const entries = new Map(Object.entries(initial));
  return {
    getItem: (k) => entries.get(k) ?? null,
    setItem: (k, v) => entries.set(k, v),
  };
}
const legacy = () => ({
  transactions: [
    {
      id: "t",
      description: "Salário",
      amount: 5000,
      type: "income",
      category: "Salário",
      date,
    },
  ],
  assets: [
    {
      id: "a",
      name: "Meu ativo antigo",
      category: "Renda variável",
      invested: 1000,
      current: 1100,
    },
  ],
  goals: [
    { id: "g", name: "Meta", target: 5000, saved: 100, deadline: "2027-12-01" },
  ],
});

test("posição inicial não é recriada como compra nem contada duas vezes", () => {
  const t = consolidate(data().assets, []);
  assert.equal(t.current, 1100);
  assert.equal(t.contributed, 1000);
  assert.equal(t.priceResult, 100);
  assert.equal(t.cashFlow, 0);
  assert.equal(t.simpleReturn, 10);
});
test("compra aumenta posição e custo, mas não cria rentabilidade", () => {
  const d = appendOperation(data(), op("buy", 500, 5, 1600), date);
  const p = position(d.assets[0], d.operations);
  assert.equal(p.quantity, 15);
  assert.equal(p.basis, 1500);
  assert.equal(p.averagePrice, 100);
  assert.equal(p.contributed, 1500);
  assert.equal(p.priceResult, 100);
  assert.equal(p.cashFlow, -500);
  assert.equal(d.assets[0].current, 1600);
  assert.ok(validateV2(d));
});
test("aporte é uma entrada alternativa à compra, sem uma segunda movimentação", () => {
  const d = appendOperation(data(), op("contribution", 500, 5, 1600), date);
  const t = consolidate(d.assets, d.operations);
  assert.equal(t.contributed, 1500);
  assert.equal(t.basis, 1500);
  assert.equal(t.result, 100);
  assert.equal(d.operations.length, 1);
});
test("venda parcial baixa custo médio e separa ganho realizado do caixa recebido", () => {
  const d = appendOperation(data(), op("sell", 600, 5, 550), date);
  const p = position(d.assets[0], d.operations);
  assert.equal(p.quantity, 5);
  assert.equal(p.basis, 500);
  assert.equal(p.realized, 100);
  assert.equal(p.unrealized, 50);
  assert.equal(p.priceResult, 150);
  assert.equal(p.cashFlow, 600);
  assert.equal(p.contributed, 1000);
});
test("resgate total zera quantidade e custo sem perder ganho realizado e aportes", () => {
  const d = appendOperation(data(), op("redemption", 1200, 10, 0), date);
  const p = position(d.assets[0], d.operations);
  assert.equal(p.quantity, 0);
  assert.equal(p.basis, 0);
  assert.equal(p.averagePrice, null);
  assert.equal(p.realized, 200);
  assert.equal(p.simpleReturn, 20);
  assert.ok(validateV2(d));
});
test("saída total não deixa resíduos com quantidades fracionárias", () => {
  const d = data();
  d.assets[0] = { ...asset(), openingQuantity: 0.3 };
  const a = appendOperation(d, op("sell", 500, 0.1, 750), date);
  const b = appendOperation(a, op("sell", 800, 0.2, 0), date);
  const p = position(b.assets[0], b.operations);
  assert.equal(p.quantity, 0);
  assert.equal(p.basis, 0);
});
for (const incomeType of ["dividend", "interest", "yield"])
  test(`${incomeType}: provento muda resultado e caixa, sem aumentar patrimônio ou custo`, () => {
    const d = appendOperation(
      data(),
      op("income", 100, null, null, { incomeType }),
      date,
    );
    const t = consolidate(d.assets, d.operations);
    assert.equal(t.current, 1100);
    assert.equal(t.basis, 1000);
    assert.equal(t.income, 100);
    assert.equal(t.priceResult, 100);
    assert.equal(t.result, 200);
    assert.equal(t.cashFlow, 100);
    assert.equal(t.simpleReturn, 20);
    assert.equal(d.snapshots.length, 0);
  });
test("reinvestimento não duplica proventos no resultado", () => {
  let d = appendOperation(data(), op("buy", 500, 5, 1600), date);
  d = appendOperation(d, op("sell", 600, 5, 1100), date);
  d = appendOperation(
    d,
    op("income", 100, null, null, { incomeType: "dividend" }),
    date,
  );
  d = appendOperation(d, op("buy", 100, 1, 1200), date);
  const t = consolidate(d.assets, d.operations);
  assert.equal(t.contributed, 1600);
  assert.equal(t.income, 100);
  assert.equal(t.realized, 100);
  assert.equal(t.unrealized, 100);
  assert.equal(t.result, 300);
  assert.equal(t.cashFlow, 100);
  near(t.result, t.current - 1000 + t.cashFlow);
  assert.equal(t.simpleReturn, 18.75);
});
test("preço médio pondera novas compras por quantidade e custo", () => {
  const d = appendOperation(data(), op("buy", 750, 5, 1800), date);
  const p = position(d.assets[0], d.operations);
  near(p.averagePrice, 1750 / 15);
});
test("perdas e carteira sem base não geram percentuais inválidos", () => {
  const a = asset();
  a.current = 700;
  assert.equal(consolidate([a], []).result, -300);
  assert.equal(consolidate([a], []).simpleReturn, -30);
  assert.equal(consolidate([], []).simpleReturn, null);
  assert.equal(consolidate([], []).current, 0);
});
test("posição zero pode começar com uma primeira compra", () => {
  const d = data();
  d.assets[0] = {
    ...asset(),
    openingInvested: 0,
    openingQuantity: 0,
    invested: 0,
    current: 0,
  };
  const next = appendOperation(d, op("buy", 100, 1, 100), date);
  assert.equal(consolidate(next.assets, next.operations).result, 0);
  assert.ok(validateV2(next));
});
test("rejeita venda excessiva, quantidades inválidas e posição zerada com saldo", () => {
  assert.throws(
    () => appendOperation(data(), op("sell", 1500, 11, 0), date),
    /excede/,
  );
  assert.throws(
    () => appendOperation(data(), op("buy", 100, 0, 1200), date),
    /quantidade/,
  );
  assert.throws(
    () => appendOperation(data(), op("buy", NaN, 1, 1200), date),
    /inválida/,
  );
  assert.throws(
    () => appendOperation(data(), op("sell", 1200, 10, 10), date),
    /zerada/,
  );
});
test("bloqueia operações anteriores à abertura, futuras e fora de ordem", () => {
  assert.throws(
    () =>
      appendOperation(
        data(),
        op("buy", 100, 1, 1200, { date: "2026-10-31" }),
        date,
      ),
    /anterior/,
  );
  assert.throws(
    () =>
      appendOperation(
        data(),
        op("buy", 100, 1, 1200, { date: "2026-11-09" }),
        date,
      ),
    /futuras/,
  );
  const d = appendOperation(data(), op("buy", 100, 1, 1200), date);
  assert.throws(
    () =>
      appendOperation(d, op("buy", 100, 1, 1300, { date: "2026-11-07" }), date),
    /ordem/,
  );
  const duplicate = d.operations[0];
  assert.throws(() => appendOperation(d, duplicate, date), /já foi/);
});
test("datas inexistentes são rejeitadas", () => {
  assert.equal(validDate("2026-02-30"), false);
  assert.equal(validDate("2024-02-29"), true);
  assert.equal(validDate("2026-2-01"), false);
});
test("migração preserva todos os registros v1 e não inventa quantidades ou histórico", () => {
  const old = legacy();
  const copy = JSON.stringify(old);
  const next = migrateV1(old, date);
  assert.deepEqual(next.transactions, old.transactions);
  assert.deepEqual(next.goals, old.goals);
  assert.equal(next.assets[0].invested, 1000);
  assert.equal(next.assets[0].current, 1100);
  assert.equal(next.assets[0].openingQuantity, null);
  assert.equal(next.assets[0].institution, "");
  assert.equal(next.operations.length, 0);
  assert.equal(next.snapshots.length, 1);
  assert.equal(next.snapshots[0].date, date);
  assert.equal(next.snapshots[0].value, 1100);
  assert.equal(JSON.stringify(old), copy);
  assert.ok(validateV2(next));
});
test("quantidade desconhecida na migração bloqueia compra e permite provento", () => {
  const d = migrateV1(legacy(), date);
  assert.throws(
    () => appendOperation(d, op("buy", 100, 1, 1200), date),
    /posição inicial/,
  );
  const next = appendOperation(
    d,
    op("income", 50, null, null, { incomeType: "interest" }),
    date,
  );
  assert.equal(next.assets[0].current, 1100);
});
test("v2 tem prioridade; persistência não altera a chave v1 e é idempotente", () => {
  const raw = JSON.stringify(legacy());
  const s = storage({ [LEGACY_KEY]: raw });
  const first = loadFinances(s, legacy, date);
  assert.equal(first.needsSave, true);
  persistFinances(s, first.data);
  assert.equal(s.getItem(LEGACY_KEY), raw);
  const second = loadFinances(
    s,
    () => {
      throw Error("não usar demo");
    },
    date,
  );
  assert.equal(second.needsSave, false);
  assert.deepEqual(second.data, first.data);
  persistFinances(s, second.data);
  assert.equal(s.getItem(LEGACY_KEY), raw);
});
test("dados corrompidos não são substituídos por demonstração nem sobrescritos", () => {
  for (const entries of [
    { [LEGACY_KEY]: "{bad" },
    { [LEGACY_KEY]: JSON.stringify(legacy()), [STORAGE_KEY]: "{bad" },
    {
      [STORAGE_KEY]: JSON.stringify({
        ...data(),
        operations: [{ id: "invalid" }],
      }),
    },
  ]) {
    const s = storage(entries);
    const loaded = loadFinances(
      s,
      () => {
        throw Error("demo não pode substituir");
      },
      date,
    );
    assert.equal(loaded.writable, false);
    assert.ok(loaded.warning);
    for (const [key, value] of Object.entries(entries))
      assert.equal(s.getItem(key), value);
  }
});
test("falha de gravação mantém os dados anteriores intactos", () => {
  const raw = JSON.stringify(legacy());
  const s = storage({ [LEGACY_KEY]: raw });
  s.setItem = () => {
    throw Error("QuotaExceededError");
  };
  const loaded = loadFinances(s, legacy, date);
  assert.throws(() => persistFinances(s, loaded.data), /Quota/);
  assert.equal(s.getItem(LEGACY_KEY), raw);
  assert.equal(s.getItem(STORAGE_KEY), null);
});
test("validação detecta custo adulterado e referências órfãs", () => {
  const d = data();
  assert.ok(validateV2(d));
  d.assets[0].invested = 1001;
  assert.equal(validateV2(d), false);
  const orphan = data();
  orphan.operations = [op("buy", 10, 1, 1110, { assetId: "missing" })];
  assert.equal(validateV2(orphan), false);
});
test("histórico só contém valores registrados, com um fechamento por dia", () => {
  const d = migrateV1(legacy(), date);
  const next = recordSnapshot(d, {
    id: "manual",
    date: "2026-10-01",
    value: 900,
    source: "manual",
    note: "Extrato",
  });
  assert.deepEqual(
    next.snapshots.map((s) => s.date),
    ["2026-10-01", date],
  );
  assert.equal(next.assets[0].current, 1100);
  assert.equal(next.operations.length, 0);
  const updated = recordSnapshot(next, {
    id: "today",
    date,
    value: 1250,
    source: "manual",
    note: "Fechamento",
  });
  assert.equal(updated.snapshots.length, 2);
  assert.equal(updated.snapshots[1].value, 1250);
  assert.equal(updated.assets[0].current, 1100);
  assert.equal(consolidate(updated.assets, updated.operations).result, 100);
});
