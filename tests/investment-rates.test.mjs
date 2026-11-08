import test from "node:test";
import assert from "node:assert/strict";
import {
  prepareRemuneration,
  validRemuneration,
  simulateContract,
  contractLabel,
} from "../src/lib/investmentRates.mjs";
import { loadIndicator } from "../src/lib/indicators.mjs";
import { createAssetDraft, prepareAsset } from "../src/lib/assetDraft.mjs";
import { validateV2, appendOperation } from "../src/lib/investments.mjs";
import {
  emptyFinances,
  loadExperience,
  makeBackup,
  parseBackup,
} from "../src/lib/experience.mjs";
import { saveCloud, loadCloud, importFingerprint } from "../src/lib/cloud.mjs";
const day = "2026-11-08";
const draft = () => ({
  ...createAssetDraft(null, "rate-asset"),
  investmentType: "fixed-income",
  name: "CDB",
  institution: "Banco",
  openingDate: "2026-01-01",
  openingInvested: "1000",
  current: "1100",
  valuationDate: day,
});
const contract = (mode, rate) => ({ version: 1, mode, rate });
const ref = (indicator, annualRate) => ({
  indicator,
  annualRate,
  asOf: day,
  source: "Hipótese de teste",
});
const simulate = (mode, rate, extra = {}) =>
  simulateContract({
    contract: contract(mode, rate),
    principal: 1000,
    periods: 365,
    confirmed: true,
    ...extra,
  });
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} vs ${b}`);

test("modalidades válidas, limites e campos condicionais não assumem taxa por banco", () => {
  assert.equal(prepareRemuneration("", "", "", "fixed-income"), undefined);
  for (const mode of ["cdi", "fixed", "ipca"]) {
    assert.deepEqual(
      prepareRemuneration(mode, "0", "", "treasury"),
      contract(mode, 0),
    );
    for (const rate of ["", "NaN", "Infinity", "-1", "1001", "abc"])
      assert.throws(() => prepareRemuneration(mode, rate, "", "fixed-income"));
  }
  assert.deepEqual(
    prepareRemuneration("other", "999", " Regra própria ", "other"),
    { version: 1, mode: "other", description: "Regra própria" },
  );
  assert.throws(() => prepareRemuneration("other", "", " ", "treasury"));
  assert.throws(() => prepareRemuneration("selic", "10", "", "treasury"));
  assert.throws(() => prepareRemuneration("fixed", "10", "", "stocks"));
  assert.equal(
    validRemuneration({ version: 2, mode: "fixed", rate: 10 }),
    false,
  );
  assert.equal(
    validRemuneration({ version: 1, mode: "fixed", rate: "10" }),
    false,
  );
  assert.equal(validRemuneration(null), false);
  assert.equal(contractLabel(undefined), "Taxa contratada não informada");
  assert.match(contractLabel(contract("cdi", 110)), /110% do CDI/);
});
test("prefixado composto e IPCA multiplicativo com inflação, deflação e taxa zero", () => {
  close(simulate("fixed", 10).value, 1100);
  close(simulate("fixed", 10, { periods: 730 }).value, 1210);
  close(simulate("fixed", 0).value, 1000);
  close(simulate("ipca", 6, { reference: ref("ipca", 4) }).value, 1102.4);
  close(simulate("ipca", 0, { reference: ref("ipca", -2) }).value, 980);
  assert.notEqual(
    simulate("ipca", 6, { reference: ref("ipca", 4) }).returnPercent,
    10,
  );
});
test("CDI usa participação na taxa diária e prazo em dias úteis, não multiplicação anual exata", () => {
  close(
    simulate("cdi", 100, { periods: 252, reference: ref("cdi", 10) }).value,
    1100,
  );
  const expected = 1000 * (1 + (1.1 ** (1 / 252) - 1) * 1.2) ** 252;
  const result = simulate("cdi", 120, {
    periods: 252,
    reference: ref("cdi", 10),
  });
  close(result.value, expected);
  assert.ok(result.value > 1120);
  close(
    simulate("cdi", 0, { periods: 252, reference: ref("cdi", 10) }).value,
    1000,
  );
});
test("cenários exigem hipóteses, referência temporal e dados coerentes; não mutam entradas", () => {
  for (const extra of [
    { confirmed: false },
    { periods: 0 },
    { periods: 1.5 },
    { periods: Infinity },
    { principal: -1 },
    { principal: 0 },
    { principal: NaN },
    { periods: 36500, contract: contract("fixed", 1000) },
  ])
    assert.throws(() => simulate("fixed", 10, extra));
  for (const reference of [
    undefined,
    ref("cdi", 10),
    { ...ref("ipca", 4), asOf: "2026-02-30" },
    { ...ref("ipca", 4), source: " " },
    ref("ipca", -100),
  ])
    assert.throws(() => simulate("ipca", 6, { reference }));
  assert.throws(() => simulate("cdi", 100, { reference: ref("cdi", -1) }));
  assert.throws(() => simulate("other", 1));
  const reference = ref("ipca", 4),
    before = structuredClone(reference);
  simulate("ipca", 6, { reference });
  assert.deepEqual(reference, before);
});
test("adaptador de indicadores distingue ausência, falha, data antiga, inválida e resposta válida", async () => {
  assert.equal(
    (await loadIndicator("cdi", { today: day })).status,
    "unavailable",
  );
  const call = (fetch) =>
    loadIndicator("cdi", { today: day, provider: { fetch } });
  assert.equal(
    (
      await call(async () => {
        throw Error("sem conexão");
      })
    ).status,
    "error",
  );
  assert.equal((await call(async () => ref("ipca", 4))).status, "invalid");
  assert.equal(
    (await call(async () => ({ ...ref("cdi", 10), asOf: "2027-01-01" })))
      .status,
    "invalid",
  );
  assert.equal(
    (await call(async () => ({ ...ref("cdi", 10), asOf: "2026-01-01" })))
      .status,
    "stale",
  );
  assert.deepEqual(await call(async () => ref("cdi", 10)), {
    status: "ready",
    reference: ref("cdi", 10),
  });
});
test("dados antigos não recebem modalidade ou data inferida ao abrir ou salvar edição", () => {
  const old = prepareAsset(
    emptyFinances(),
    { ...draft(), valuationDate: "" },
    undefined,
    day,
  );
  assert.equal(Object.hasOwn(old, "remuneration"), false);
  assert.equal(Object.hasOwn(old, "valuationDate"), false);
  assert.equal(Object.hasOwn(old, "applicationDate"), false);
  const data = { ...emptyFinances(), assets: [old] },
    before = structuredClone(data);
  const edit = createAssetDraft(old, "unused");
  assert.equal(edit.remunerationMode, "");
  assert.equal(edit.valuationDate, "");
  assert.equal(edit.applicationDate, "");
  assert.deepEqual(prepareAsset(data, edit, old.id, day), old);
  assert.deepEqual(data, before);
});
test("metadados retrocompatíveis sobrevivem ao backup, revisão na nuvem e atualização com perda", async () => {
  const a = prepareAsset(
    emptyFinances(),
    {
      ...draft(),
      remunerationMode: "ipca",
      contractedRate: "6",
      applicationDate: "2025-12-01",
    },
    undefined,
    day,
  );
  const data = { ...emptyFinances(), assets: [a] };
  assert.ok(validateV2(data));
  const storage = {
    getItem: (k) => (k === "eleva-financas-v2" ? JSON.stringify(data) : null),
  };
  const { session } = loadExperience(storage, day);
  const backup = makeBackup(session, {}, `${day}T12:00:00Z`);
  assert.deepEqual(
    parseBackup(JSON.stringify(backup), day).wallets.personal,
    data,
  );
  const edit = createAssetDraft(a, "unused");
  const updated = prepareAsset(
    data,
    { ...edit, current: "0", contractedRate: "7" },
    a.id,
    day,
  );
  assert.equal(updated.current, 0);
  assert.equal(updated.remuneration.rate, 7);
  const wallet = { ...data, assets: [updated] };
  let remote, revision;
  const client = {
    rpc: async (name, args) => {
      if (name === "save_wallet") {
        remote = structuredClone(args.wallet);
        revision = args.expected_revision + 1;
        return { data: revision };
      }
      return { data: { wallet: remote, revision } };
    },
  };
  await saveCloud(client, wallet, 2);
  assert.deepEqual((await loadCloud(client)).wallet, wallet);
  assert.notEqual(
    await importFingerprint(wallet),
    await importFingerprint(data),
  );
  assert.deepEqual(data.assets[0], a);
});
test("datas incoerentes e metadados incompatíveis são rejeitados; operação atualiza somente data e saldo explícitos", () => {
  for (const applicationDate of ["2026-02-30", "2027-01-01", "2026-01-02"])
    assert.throws(() =>
      prepareAsset(
        emptyFinances(),
        { ...draft(), applicationDate },
        undefined,
        day,
      ),
    );
  for (const valuationDate of ["2026-02-30", "2027-01-01", "2025-01-01"])
    assert.throws(() =>
      prepareAsset(
        emptyFinances(),
        { ...draft(), valuationDate },
        undefined,
        day,
      ),
    );
  const a = prepareAsset(
    emptyFinances(),
    { ...draft(), remunerationMode: "fixed", contractedRate: "10" },
    undefined,
    day,
  );
  const data = { ...emptyFinances(), assets: [a] };
  assert.equal(
    validateV2({
      ...data,
      assets: [
        { ...a, investmentType: "stocks", remuneration: a.remuneration },
      ],
    }),
    false,
  );
  const next = appendOperation(
    data,
    {
      id: "op",
      assetId: a.id,
      type: "contribution",
      incomeType: null,
      date: day,
      amount: 100,
      quantity: null,
      currentAfter: 1200,
      note: "",
    },
    day,
  );
  assert.deepEqual(next.assets[0].remuneration, a.remuneration);
  assert.equal(next.assets[0].valuationDate, day);
  assert.equal(next.assets[0].current, 1200);
});
