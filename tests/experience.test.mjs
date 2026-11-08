import test from "node:test";
import assert from "node:assert/strict";
import {
  EXPERIENCE_KEY,
  emptyExperience,
  emptyFinances,
  loadExperience,
  selectMode,
  updateActive,
  saveExperience,
  makeBackup,
  parseBackup,
  restoreWallet,
  validateExperience,
  rawRecords,
} from "../src/lib/experience.mjs";
import { LEGACY_KEY, STORAGE_KEY } from "../src/lib/storage.mjs";
const date = "2026-11-08";
const data = (name = "Carteira pessoal", current = 1100) => ({
  ...emptyFinances(),
  assets: [
    {
      id: "a",
      name,
      category: "Renda fixa",
      code: "",
      institution: "Banco",
      openingDate: date,
      openingInvested: 1000,
      openingQuantity: null,
      invested: 1000,
      current,
    },
  ],
});
const legacy = () => ({
  assets: [
    {
      id: "demo",
      name: "Exemplo",
      category: "Renda fixa",
      invested: 500,
      current: 600,
    },
  ],
  transactions: [],
  goals: [],
});
function storage(entries = {}) {
  const m = new Map(Object.entries(entries));
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) };
}
const personal = () => ({
  ...emptyExperience(),
  activeMode: "personal",
  personal: data(),
});

test("primeiro acesso não gera demonstração nem grava antes da escolha", () => {
  const s = storage();
  const loaded = loadExperience(s, date);
  assert.equal(loaded.session.activeMode, null);
  assert.equal(loaded.session.personal, null);
  assert.equal(loaded.session.demo, null);
  assert.equal(loaded.needsSave, false);
  assert.equal(s.getItem(EXPERIENCE_KEY), null);
});
test("começar do zero cria somente uma carteira pessoal vazia", () => {
  const s = selectMode(
    emptyExperience(),
    "personal",
    () => {
      throw Error("não criar exemplos");
    },
    date,
  );
  assert.deepEqual(s.personal, emptyFinances());
  assert.equal(s.demo, null);
  assert.equal(s.activeMode, "personal");
  assert.ok(validateExperience(s));
});
test("escolher demonstração não preenche a carteira pessoal", () => {
  const s = selectMode(emptyExperience(), "demo", legacy, date);
  assert.equal(s.personal, null);
  assert.equal(s.demo.assets[0].name, "Exemplo");
  const next = selectMode(s, "personal", legacy, date);
  assert.equal(next.personal.assets.length, 0);
  assert.equal(next.demo.assets.length, 1);
});
test("alternância preserva as duas carteiras, inclusive após edição e recarga", () => {
  let s = personal();
  const original = structuredClone(s.personal);
  s = selectMode(s, "demo", legacy, date);
  s = updateActive(s, data("Demonstração alterada", 9000));
  assert.deepEqual(s.personal, original);
  const db = storage();
  saveExperience(db, s);
  s = loadExperience(db, date).session;
  s = selectMode(s, "personal", legacy, date);
  assert.deepEqual(s.personal, original);
  assert.equal(s.demo.assets[0].current, 9000);
  s = selectMode(
    s,
    "demo",
    () => {
      throw Error("não reinicializar");
    },
    date,
  );
  assert.equal(s.demo.assets[0].name, "Demonstração alterada");
});
test("voltar à carteira pessoal nunca a reinicializa", () => {
  const s = personal();
  const next = selectMode(
    selectMode(s, "demo", legacy, date),
    "personal",
    legacy,
    date,
  );
  assert.deepEqual(next.personal, s.personal);
  assert.equal(next.personal.assets.length, 1);
});
test("v2 existente é preservada exatamente e tem preferência sobre v1", () => {
  const raw = JSON.stringify(data());
  const old = JSON.stringify(legacy());
  const db = storage({ [STORAGE_KEY]: raw, [LEGACY_KEY]: old });
  const result = loadExperience(db, date);
  assert.equal(result.session.activeMode, "personal");
  assert.equal(result.session.legacyImported, true);
  assert.equal(result.needsSave, true);
  assert.deepEqual(result.session.personal, data());
  saveExperience(db, result.session, null);
  assert.equal(db.getItem(STORAGE_KEY), raw);
  assert.equal(db.getItem(LEGACY_KEY), old);
  assert.deepEqual(loadExperience(db, date).session.personal, data());
});
test("v1 é migrada sem remover, filtrar exemplos ou recriar operações", () => {
  const raw = JSON.stringify(legacy());
  const db = storage({ [LEGACY_KEY]: raw });
  const result = loadExperience(db, date);
  assert.equal(result.session.personal.assets[0].id, "demo");
  assert.equal(result.session.personal.assets[0].current, 600);
  assert.equal(result.session.personal.operations.length, 0);
  saveExperience(db, result.session, null);
  assert.equal(db.getItem(LEGACY_KEY), raw);
  assert.equal(db.getItem(STORAGE_KEY), null);
});
test("dados inválidos bloqueiam gravação sem fallback destrutivo", () => {
  for (const key of [EXPERIENCE_KEY, STORAGE_KEY, LEGACY_KEY]) {
    const db = storage({ [key]: "{invalid" });
    const loaded = loadExperience(db, date);
    assert.equal(loaded.blocked, true);
    assert.equal(loaded.needsSave, false);
    assert.ok(loaded.warning.includes("preservados"));
    assert.equal(db.getItem(key), "{invalid");
  }
});
test("nova experiência tem prioridade e não reimporta registros antigos", () => {
  const s = personal();
  s.personal = emptyFinances();
  const db = storage({
    [EXPERIENCE_KEY]: JSON.stringify(s),
    [STORAGE_KEY]: JSON.stringify(data()),
  });
  assert.equal(loadExperience(db, date).session.personal.assets.length, 0);
});
test("exportação e leitura de backup preservam ambos os modos sem mesclar", () => {
  let s = selectMode(personal(), "demo", legacy, date);
  const p = parseBackup(JSON.stringify(makeBackup(s, {}, date)), date);
  assert.deepEqual(p.wallets.personal, s.personal);
  assert.deepEqual(p.wallets.demo, s.demo);
  assert.equal(p.legacy, false);
  s.legacyImported = true;
  assert.equal(
    parseBackup(JSON.stringify(makeBackup(s, {}, date)), date).legacy,
    true,
  );
});
test("restauração exige confirmação e não modifica o objeto original", () => {
  const s = personal(),
    copy = structuredClone(s);
  assert.throws(
    () =>
      restoreWallet(
        s,
        { wallets: { personal: data("Novo") }, legacy: false },
        "personal",
        false,
        date,
      ),
    /confirmação/,
  );
  assert.deepEqual(s, copy);
});
test("restaura carteira inteira sem duplicar e guarda a anterior", () => {
  const s = selectMode(personal(), "demo", legacy, date);
  const backup = {
    wallets: { personal: data("Restaurada", 3000) },
    legacy: false,
  };
  const next = restoreWallet(s, backup, "personal", true, date);
  assert.equal(next.personal.assets.length, 1);
  assert.equal(next.personal.assets[0].name, "Restaurada");
  assert.deepEqual(next.demo, s.demo);
  assert.deepEqual(next.recoveryCopies[0].data, s.personal);
  assert.deepEqual(s.personal, data());
  assert.ok(validateExperience(next));
  const twice = restoreWallet(next, backup, "personal", true, date);
  assert.equal(twice.personal.assets.length, 1);
  assert.equal(twice.recoveryCopies.length, 2);
});
test("restaurar demonstração não altera carteira pessoal e não pode importar como pessoal", () => {
  const s = selectMode(personal(), "demo", legacy, date);
  const p = { wallets: { demo: data("Apenas demo") }, legacy: false };
  assert.throws(() => restoreWallet(s, p, "personal", true, date), /válida/);
  const next = restoreWallet(s, p, "demo", true, date);
  assert.deepEqual(next.personal, s.personal);
  assert.equal(next.demo.assets[0].name, "Apenas demo");
});
test("cópias anteriores podem ser recuperadas a partir de um novo backup", () => {
  const s = restoreWallet(
    personal(),
    { wallets: { personal: data("Substituta") }, legacy: false },
    "personal",
    true,
    date,
  );
  const preview = parseBackup(JSON.stringify(makeBackup(s, {}, date)), date);
  assert.equal(preview.copies.length, 1);
  assert.deepEqual(preview.copies[0].data, data());
});
test("restauração após corrupção arquiva os dados brutos em vez de apagá-los", () => {
  const raw = {
    [EXPERIENCE_KEY]: "{corrupt",
    [STORAGE_KEY]: JSON.stringify(data()),
  };
  const next = restoreWallet(
    emptyExperience(),
    { wallets: { personal: data() }, legacy: false },
    "personal",
    true,
    date,
    raw,
  );
  assert.deepEqual(next.recoveryCopies[0].raw, raw);
  assert.ok(validateExperience(next));
});
test("backups v1, v2 e exportações antigas são aceitos sem perder registros", () => {
  for (const input of [
    legacy(),
    data(),
    { exportedAt: date, memory: data(), stored: {} },
  ]) {
    const p = parseBackup(JSON.stringify(input), date);
    assert.equal(p.legacy, true);
    assert.equal(p.wallets.personal.assets.length, 1);
    assert.equal(p.wallets.demo, undefined);
  }
});
test("backups malformados, versões futuras e operações inconsistentes são recusados", () => {
  const inconsistent = data();
  inconsistent.assets[0].invested = 999;
  for (const input of [
    "{broken",
    "null",
    JSON.stringify({ schemaVersion: 99 }),
    JSON.stringify(inconsistent),
    JSON.stringify({
      format: "eleva-financas-backup",
      version: 2,
      session: personal(),
    }),
  ])
    assert.throws(() => parseBackup(input, date));
});
test("seleção e gravação recusam dados inválidos sem alterar armazenamento", () => {
  const db = storage({ [EXPERIENCE_KEY]: "original" });
  assert.throws(() => selectMode(personal(), "unknown", legacy, date));
  const s = personal();
  s.activeMode = "demo";
  assert.throws(() => saveExperience(db, s));
  assert.equal(db.getItem(EXPERIENCE_KEY), "original");
});
test("concorrência entre abas bloqueia gravações sobre dados mais recentes", () => {
  const db = storage();
  const s = personal();
  saveExperience(db, s, null);
  const baseline = db.getItem(EXPERIENCE_KEY);
  const newer = updateActive(s, data("Mais recente", 5000));
  saveExperience(db, newer, baseline);
  assert.throws(
    () => saveExperience(db, selectMode(s, "demo", legacy, date), baseline),
    /outra aba/,
  );
  assert.equal(
    JSON.parse(db.getItem(EXPERIENCE_KEY)).personal.assets[0].current,
    5000,
  );
});
test("falha de armazenamento não remove carteiras nem chaves históricas", () => {
  const db = storage({
    [STORAGE_KEY]: "histórico",
    [EXPERIENCE_KEY]: JSON.stringify(personal()),
  });
  const before = db.getItem(EXPERIENCE_KEY);
  db.setItem = () => {
    throw Error("quota");
  };
  assert.throws(
    () =>
      saveExperience(db, selectMode(personal(), "demo", legacy, date), before),
    /quota/,
  );
  assert.equal(db.getItem(EXPERIENCE_KEY), before);
  assert.equal(db.getItem(STORAGE_KEY), "histórico");
});
test("preferência do guia é independente por modo e persiste", () => {
  const s = selectMode(personal(), "demo", legacy, date);
  s.guideDismissed.personal = true;
  const db = storage();
  saveExperience(db, s);
  const next = loadExperience(db, date).session;
  assert.equal(next.guideDismissed.personal, true);
  assert.equal(next.guideDismissed.demo, false);
});
test("backup bruto inclui as chaves antigas e a nova, sem alterações", () => {
  const db = storage({
    [LEGACY_KEY]: "v1",
    [STORAGE_KEY]: "v2",
    [EXPERIENCE_KEY]: "new",
  });
  assert.deepEqual(rawRecords(db), {
    [LEGACY_KEY]: "v1",
    [STORAGE_KEY]: "v2",
    [EXPERIENCE_KEY]: "new",
  });
});
