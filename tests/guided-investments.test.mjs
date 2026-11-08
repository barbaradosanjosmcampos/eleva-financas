import test from "node:test";
import assert from "node:assert/strict";
import { createAssetDraft, prepareAsset } from "../src/lib/assetDraft.mjs";
import {
  trackingMode,
  position,
  consolidate,
  appendOperation,
  validateV2,
} from "../src/lib/investments.mjs";
import { loadFinances, STORAGE_KEY } from "../src/lib/storage.mjs";
import { investmentCatalog } from "../src/lib/investmentCatalog.mjs";
const date = "2026-11-08";
const empty = () => ({
  schemaVersion: 2,
  assets: [],
  operations: [],
  snapshots: [],
  transactions: [],
  goals: [],
});
const draft = (type = "fixed-income", extra = {}) => ({
  ...createAssetDraft(null, "new"),
  investmentType: type,
  trackingMode: investmentCatalog[type].defaultMode,
  ...investmentCatalog[type].example,
  openingDate: date,
  ...extra,
});
const valueAsset = () => prepareAsset(empty(), draft(), undefined, date);
const state = () => ({ ...empty(), assets: [valueAsset()] });
let sequence = 0;
const op = (type, amount, extra = {}) => ({
  id: `op-${++sequence}`,
  assetId: "new",
  type,
  incomeType: null,
  date,
  amount,
  quantity: null,
  currentAfter: 0,
  note: "",
  ...extra,
});

test("CDB por valor usa capital e saldo, sem criar uma quantidade artificial", () => {
  const a = valueAsset();
  assert.equal(a.openingQuantity, null);
  assert.equal(a.openingInvested, 10000);
  assert.equal(a.current, 10350);
  assert.equal(trackingMode(a), "value");
  const p = position(a, []);
  assert.equal(p.quantity, null);
  assert.equal(p.averagePrice, null);
  assert.equal(p.priceResult, 350);
  assert.ok(Math.abs(p.simpleReturn - 3.5) < 1e-8);
  assert.equal(p.cashFlow, 0);
  assert.ok(validateV2(state()));
});
test("cadastro de posição inicial não gera operação, provento ou alteração em outros registros", () => {
  const d = empty();
  d.transactions = [
    {
      id: "t",
      description: "Receita",
      category: "Salário",
      amount: 1000,
      type: "income",
      date,
    },
  ];
  d.goals = [
    { id: "g", name: "Meta", target: 1000, saved: 100, deadline: "2027-01-01" },
  ];
  const copy = structuredClone(d);
  prepareAsset(d, draft(), undefined, date);
  assert.deepEqual(d, copy);
  assert.equal(d.operations.length, 0);
});
test("todos os tipos têm exemplos válidos nos controles suportados", () => {
  for (const [type, entry] of Object.entries(investmentCatalog)) {
    const a = prepareAsset(empty(), draft(type), undefined, date);
    assert.equal(a.investmentType, type);
    assert.ok(validateV2({ ...empty(), assets: [a] }));
    if (["fixed-income", "treasury", "other"].includes(type))
      assert.equal(
        prepareAsset(
          empty(),
          draft(type, { trackingMode: "value" }),
          undefined,
          date,
        ).openingQuantity,
        null,
      );
  }
});
test("por unidades calcula capital e custo médio sem mudar a lógica anterior", () => {
  const a = prepareAsset(empty(), draft("stocks"), undefined, date);
  assert.equal(a.openingQuantity, 100);
  assert.equal(a.openingInvested, 2000);
  assert.equal(a.current, 2150);
  assert.equal(position(a, []).averagePrice, 20);
  assert.equal(position(a, []).unrealized, 150);
});
test("renda fixa também pode usar unidades quando o extrato as fornece", () => {
  const a = prepareAsset(
    empty(),
    draft("fixed-income", { trackingMode: "units" }),
    undefined,
    date,
  );
  assert.equal(a.openingQuantity, 100);
  assert.equal(a.openingInvested, 10000);
});
test("aporte por valor aumenta custo uma única vez e não aumenta a valorização", () => {
  const d = appendOperation(
    state(),
    op("contribution", 2000, { currentAfter: 12350 }),
    date,
  );
  const p = position(d.assets[0], d.operations);
  assert.equal(d.assets[0].current, 12350);
  assert.equal(p.basis, 12000);
  assert.equal(p.contributed, 12000);
  assert.equal(p.unrealized, 350);
  assert.equal(p.cashFlow, -2000);
  assert.equal(p.quantity, null);
});
test("resgate parcial usa capital baixado do extrato, separado do recebido", () => {
  const d = appendOperation(
    state(),
    op("redemption", 2200, { redeemedPrincipal: 2000, currentAfter: 8150 }),
    date,
  );
  const p = position(d.assets[0], d.operations);
  assert.equal(p.basis, 8000);
  assert.equal(p.realized, 200);
  assert.equal(p.unrealized, 150);
  assert.equal(p.result, 350);
  assert.equal(p.cashFlow, 2200);
});
test("resgate total com perda zera custo e mantém resultado e capital aportado", () => {
  const d = appendOperation(
    state(),
    op("redemption", 9000, { redeemedPrincipal: 10000, currentAfter: 0 }),
    date,
  );
  const p = position(d.assets[0], d.operations);
  assert.equal(p.basis, 0);
  assert.equal(p.realized, -1000);
  assert.equal(p.contributed, 10000);
  assert.equal(p.result, -1000);
  assert.equal(p.simpleReturn, -10);
});
test("renda fixa com aporte, resgate, provento e reinvestimento não duplica resultado", () => {
  let d = state();
  d.assets[0].current = 11000;
  d = appendOperation(
    d,
    op("contribution", 2000, { currentAfter: 13000 }),
    date,
  );
  d = appendOperation(
    d,
    op("redemption", 2200, { redeemedPrincipal: 2000, currentAfter: 10800 }),
    date,
  );
  d = appendOperation(
    d,
    op("income", 100, { incomeType: "interest", currentAfter: null }),
    date,
  );
  assert.equal(d.assets[0].current, 10800);
  d = appendOperation(
    d,
    op("contribution", 100, { currentAfter: 10900 }),
    date,
  );
  const t = consolidate(d.assets, d.operations);
  assert.equal(t.result, 1100);
  assert.equal(t.priceResult, 1000);
  assert.equal(t.income, 100);
  assert.equal(t.contributed, 12100);
  assert.equal(t.current - 10000 + t.cashFlow, 1100);
});
test("resgates inválidos são rejeitados sem inferir capital a partir de saldo", () => {
  assert.throws(
    () =>
      appendOperation(
        state(),
        op("redemption", 1000, { currentAfter: 9350 }),
        date,
      ),
    /capital resgatado/,
  );
  assert.throws(
    () =>
      appendOperation(
        state(),
        op("redemption", 1000, {
          redeemedPrincipal: 11000,
          currentAfter: 9350,
        }),
        date,
      ),
    /capital resgatado/,
  );
  assert.throws(
    () =>
      appendOperation(
        state(),
        op("redemption", 10000, { redeemedPrincipal: 9000, currentAfter: 0 }),
        date,
      ),
    /todo o capital/,
  );
  assert.throws(
    () =>
      appendOperation(
        state(),
        op("contribution", 100, { quantity: 1, currentAfter: 10450 }),
        date,
      ),
    /não utilizam quantidades/,
  );
});
test("posição por valor pode começar vazia e receber o primeiro aporte", () => {
  const a = prepareAsset(
    empty(),
    draft("fixed-income", { openingInvested: "0", current: "0" }),
    undefined,
    date,
  );
  const d = appendOperation(
    { ...empty(), assets: [a] },
    op("contribution", 500, { currentAfter: 500 }),
    date,
  );
  assert.equal(consolidate(d.assets, d.operations).result, 0);
});
test("bloqueia duplicidade semântica inclusive compra repetida como aporte", () => {
  let d = state();
  const first = op("contribution", 1000, { currentAfter: 11350 });
  d = appendOperation(d, first, date);
  assert.throws(
    () =>
      appendOperation(
        d,
        { ...first, id: "different-id", type: "buy", currentAfter: 12350 },
        date,
      ),
    /já foi registrada/,
  );
  assert.equal(d.operations.length, 1);
  assert.equal(d.assets[0].invested, 11000);
});
test("referências distinguem operações legítimas iguais e repetição da referência é bloqueada", () => {
  let d = appendOperation(
    state(),
    op("contribution", 1000, { currentAfter: 11350, reference: " Ordem 123 " }),
    date,
  );
  assert.throws(
    () =>
      appendOperation(
        d,
        op("contribution", 2000, {
          currentAfter: 13350,
          reference: "ordem 123",
        }),
        date,
      ),
    /já foi registrada/,
  );
  d = appendOperation(
    d,
    op("contribution", 1000, { currentAfter: 12350, reference: "Ordem 124" }),
    date,
  );
  assert.equal(d.operations.length, 2);
  assert.equal(d.assets[0].invested, 12000);
});
test("proventos iguais no mesmo dia precisam de referência distinta", () => {
  const d = appendOperation(
    state(),
    op("income", 100, { incomeType: "yield", currentAfter: null }),
    date,
  );
  assert.throws(
    () =>
      appendOperation(
        d,
        op("income", 100, { incomeType: "yield", currentAfter: null }),
        date,
      ),
    /já foi registrada/,
  );
  const next = appendOperation(
    d,
    op("income", 100, {
      incomeType: "yield",
      currentAfter: null,
      reference: "pagamento 2",
    }),
    date,
  );
  assert.equal(consolidate(next.assets, next.operations).income, 200);
});
test("cadastros duplicados por contrato/instituição ou nome/instituição são bloqueados", () => {
  const d = state();
  assert.throws(
    () => prepareAsset(d, { ...draft(), id: "another" }, undefined, date),
    /Já existe/,
  );
  const a = prepareAsset(empty(), draft("stocks"), undefined, date);
  assert.throws(
    () =>
      prepareAsset(
        { ...empty(), assets: [a] },
        draft("stocks", { id: "other", name: "Outro nome" }),
        undefined,
        date,
      ),
    /Já existe/,
  );
  assert.doesNotThrow(() =>
    prepareAsset(
      { ...empty(), assets: [a] },
      draft("stocks", { id: "other", institution: "Outra corretora" }),
      undefined,
      date,
    ),
  );
});
test("edição por valor preserva custo, quantidade ausente, operações e outros dados", () => {
  const d = appendOperation(
    state(),
    op("contribution", 2000, { currentAfter: 12350 }),
    date,
  );
  const copy = structuredClone(d);
  const edit = createAssetDraft(d.assets[0], "ignored");
  edit.name = "CDB renomeado";
  edit.current = "12500";
  edit.openingInvested = "99999";
  const a = prepareAsset(d, edit, "new", date);
  assert.equal(a.openingInvested, 10000);
  assert.equal(a.invested, 12000);
  assert.equal(a.current, 12500);
  assert.equal(a.openingQuantity, null);
  assert.deepEqual(d, copy);
});
test("controle só pode ser convertido explicitamente antes de operações de capital", () => {
  const a = valueAsset();
  const asUnits = {
    ...createAssetDraft(a, "ignored"),
    trackingMode: "units",
    quantity: "100",
  };
  const converted = prepareAsset(state(), asUnits, "new", date);
  assert.equal(converted.openingInvested, 10000);
  assert.equal(converted.openingQuantity, 100);
  const d = appendOperation(
    state(),
    op("contribution", 100, { currentAfter: 10450 }),
    date,
  );
  assert.throws(
    () => prepareAsset(d, asUnits, "new", date),
    /não pode ser alterada/,
  );
});
test("v2 anterior mantém a semântica por unidades e não é regravada na leitura", () => {
  const a = {
    id: "legacy",
    name: "Ativo antigo",
    category: "Renda fixa",
    code: "",
    institution: "",
    openingDate: date,
    openingInvested: 5000,
    openingQuantity: null,
    invested: 5000,
    current: 5300,
  };
  const old = { ...empty(), assets: [a] };
  const raw = JSON.stringify(old);
  let writes = 0;
  const storage = {
    getItem: (k) => (k === STORAGE_KEY ? raw : null),
    setItem: () => writes++,
  };
  const read = loadFinances(
    storage,
    () => {
      throw Error("não usar demo");
    },
    date,
  );
  assert.equal(read.writable, true);
  assert.equal(read.needsSave, false);
  assert.equal(writes, 0);
  assert.deepEqual(read.data, old);
  assert.equal(trackingMode(read.data.assets[0]), "units");
  const edit = { ...createAssetDraft(a, "ignored"), trackingMode: "value" };
  const converted = prepareAsset(old, edit, "legacy", date);
  assert.equal(converted.current, 5300);
  assert.equal(converted.openingQuantity, null);
  assert.equal(converted.invested, 5000);
});
test("campos obrigatórios, limites, valores monetários e coerência são validados", () => {
  for (const change of [
    { investmentType: "" },
    { name: "  " },
    { institution: " " },
    { openingInvested: "" },
    { openingInvested: "-1" },
    { current: "" },
    { current: "Infinity" },
    { openingDate: "2026-02-30" },
    { openingDate: "2027-01-01" },
    { current: "10.001" },
  ])
    assert.throws(() =>
      prepareAsset(empty(), draft("fixed-income", change), undefined, date),
    );
  for (const change of [
    { quantity: "" },
    { quantity: "-1" },
    { averagePrice: "" },
    { quantity: "0", current: "100" },
    { trackingMode: "value" },
    { quantity: "0.0000001" },
  ])
    assert.throws(() =>
      prepareAsset(empty(), draft("stocks", change), undefined, date),
    );
});
test("schema rejeita controle incompatível e quantidade artificial por valor", () => {
  const d = state();
  d.assets[0].openingQuantity = 1;
  assert.equal(validateV2(d), false);
  d.assets[0].openingQuantity = null;
  d.assets[0].investmentType = "stocks";
  assert.equal(validateV2(d), false);
});

test("edição cadastral preserva precisão de saldos anteriores sem arredondamento silencioso", () => {
  const a = {
    id: "precise",
    name: "Ativo anterior",
    category: "Renda fixa",
    code: "",
    institution: "",
    openingDate: date,
    openingInvested: 333.333,
    openingQuantity: null,
    invested: 333.333,
    current: 350.123,
  };
  const d = { ...empty(), assets: [a] };
  const edit = createAssetDraft(a, "ignored");
  edit.name = "Ativo renomeado";
  const saved = prepareAsset(d, edit, "precise", date);
  assert.equal(saved.invested, 333.333);
  assert.equal(saved.openingInvested, 333.333);
  assert.equal(saved.current, 350.123);
});

test("perdas reais e perda total são posições válidas para todos os tipos", () => {
  for (const type of Object.keys(investmentCatalog)) {
    for (const current of ["0", "1", "500"]) {
      const a = prepareAsset(empty(), draft(type, { current }), undefined, date);
      assert.equal(a.current, Number(current));
      assert.ok(position(a, []).unrealized < 0);
      assert.ok(validateV2({ ...empty(), assets: [a] }));
      const edit = createAssetDraft(a, "ignored");
      assert.equal(edit.current, current);
      const edited = prepareAsset({ ...empty(), assets: [a] }, { ...edit, name: "Renomeado" }, a.id, date);
      assert.equal(edited.current, Number(current));
    }
  }
});

test("saldo inválido não altera a carteira nem vira perda confirmável", () => {
  const d = state();
  const before = structuredClone(d);
  for (const current of ["-1", "NaN", "Infinity", "abc", "1000000000001", "1.001", ""]) {
    assert.throws(() => prepareAsset(d, { ...createAssetDraft(d.assets[0], "ignored"), current }, "new", date));
    assert.deepEqual(d, before);
  }
});
