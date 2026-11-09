import test from "node:test";
import assert from "node:assert/strict";
import {
  publicConfig,
  migrationPreview,
  importFingerprint,
  loadCloud,
  saveCloud,
  cloudError,
} from "../src/lib/cloud.mjs";
import {
  emptyFinances,
  loadExperience,
  rawRecords,
  makeBackup,
  parseBackup,
} from "../src/lib/experience.mjs";
const wallet = () => ({
  ...emptyFinances(),
  transactions: [
    {
      id: "local-income",
      description: "Trabalho",
      amount: 125,
      type: "income",
      category: "Salário",
      date: "2026-01-01",
    },
  ],
});
test("cliente aceita apenas configuração pública e rejeita chave privilegiada", () => {
  assert.equal(publicConfig("", ""), null);
  assert.equal(
    publicConfig("https://example.supabase.co", "sb_publishable_public").url,
    "https://example.supabase.co",
  );
  const jwt = (role) => `a.${btoa(JSON.stringify({ role }))}.b`;
  assert.ok(publicConfig("https://example.supabase.co", jwt("anon")));
  for (const key of [
    "sb_secret_private",
    jwt("service_role"),
    jwt("authenticated"),
    "garbage",
  ])
    assert.throws(() => publicConfig("https://example.supabase.co", key));
  assert.throws(() =>
    publicConfig("http://example.com", "sb_publishable_public"),
  );
});
test("prévia de importação não altera originais, exige destino vazio e rejeita ids repetidos", () => {
  const original = wallet(),
    before = structuredClone(original);
  const preview = migrationPreview(original, emptyFinances());
  assert.deepEqual(preview.counts, {
    transactions: 1,
    assets: 0,
    operations: 0,
    goals: 0,
    snapshots: 0,
  });
  preview.data.transactions[0].amount = 99;
  assert.deepEqual(original, before);
  assert.throws(() => migrationPreview(original, wallet()), /vazia/);
  const invalid = wallet();
  invalid.transactions.push({ ...invalid.transactions[0] });
  assert.throws(
    () => migrationPreview(invalid, emptyFinances()),
    /duplicados|inválida/,
  );
});
test("fingerprint é determinístico e independe da ordem das propriedades", async () => {
  const data = wallet();
  const reversed = Object.fromEntries(Object.entries(data).reverse());
  assert.equal(
    await importFingerprint(data),
    await importFingerprint(reversed),
  );
  assert.notEqual(
    await importFingerprint(data),
    await importFingerprint(emptyFinances()),
  );
});
test("API envia revisão e fingerprint; erros de permissão e concorrência nunca viram sucesso", async () => {
  const calls = [];
  const client = {
    rpc: async (...args) => {
      calls.push(args);
      return { data: 2, error: null };
    },
  };
  assert.equal(await saveCloud(client, wallet(), 1, "a".repeat(64)), 2);
  assert.deepEqual(calls[0], [
    "save_wallet",
    { wallet: wallet(), expected_revision: 1, import_key: "a".repeat(64) },
  ]);
  for (const code of ["42501", "40001", "23505"]) {
    await assert.rejects(
      saveCloud({ rpc: async () => ({ error: { code } }) }, wallet(), 1),
      (e) => e.code === code,
    );
    assert.notEqual(cloudError({ code }), cloudError({}));
  }
  await assert.rejects(
    loadCloud({ rpc: async () => ({ data: { wallet: {} }, error: null }) }),
    /inválida/,
  );
});
test("prévia e API não tocam chaves históricas, carteira local ou backup JSON", async () => {
  const entries = new Map([["eleva-financas-v2", JSON.stringify(wallet())]]);
  const storage = {
    getItem: (k) => entries.get(k) ?? null,
    setItem: () => {
      throw Error("não deve gravar");
    },
  };
  const before = rawRecords(storage);
  const { session } = loadExperience(storage, "2026-01-01");
  const backup = makeBackup(session, before, "2026-01-01T00:00:00Z");
  const preview = migrationPreview(
    parseBackup(JSON.stringify(backup), "2026-01-01").wallets.personal,
    emptyFinances(),
  );
  await saveCloud(
    { rpc: async () => ({ data: 1, error: null }) },
    preview.data,
    0,
  );
  assert.deepEqual(rawRecords(storage), before);
  assert.deepEqual(session.personal, wallet());
});
