// Opt-in only: use two confirmed, dedicated test accounts in homologation.
// Do not run against production. No service_role or database password is used.
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { publicConfig } from "../src/lib/cloud.mjs";
const names = [
  "ELEVA_TEST_SUPABASE_URL",
  "ELEVA_TEST_SUPABASE_PUBLIC_KEY",
  "ELEVA_TEST_USER_A_EMAIL",
  "ELEVA_TEST_USER_A_PASSWORD",
  "ELEVA_TEST_USER_B_EMAIL",
  "ELEVA_TEST_USER_B_PASSWORD",
];
const missing = names.filter((n) => !process.env[n]);
test(
  "Supabase hospedado: login real e isolamento entre duas contas",
  {
    skip: missing.length
      ? `Configuração ausente: ${missing.join(", ")}`
      : false,
  },
  async () => {
    const config = publicConfig(
      process.env.ELEVA_TEST_SUPABASE_URL,
      process.env.ELEVA_TEST_SUPABASE_PUBLIC_KEY,
    );
    const client = () =>
      createClient(config.url, config.key, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });
    const a = client(),
      b = client(),
      anon = client();
    const ids = [];
    const fail = (msg) => {
      throw Error(msg);
    };
    try {
      const ar = await a.auth.signInWithPassword({
        email: process.env.ELEVA_TEST_USER_A_EMAIL,
        password: process.env.ELEVA_TEST_USER_A_PASSWORD,
      });
      const br = await b.auth.signInWithPassword({
        email: process.env.ELEVA_TEST_USER_B_EMAIL,
        password: process.env.ELEVA_TEST_USER_B_PASSWORD,
      });
      if (ar.error || br.error)
        fail(
          "Login real falhou; revise contas de teste confirmadas e configuração.",
        );
      const au = ar.data.user.id,
        bu = br.data.user.id;
      assert.notEqual(au, bu);
      assert.equal((await a.auth.getUser()).data.user.id, au);
      assert.equal((await b.auth.getUser()).data.user.id, bu);
      const assetId = `eleva-test-${randomUUID()}`;
      const fixtures = {
        assets: { id: assetId, name: "Fixture de teste", current: 100 },
        transactions: {
          id: `eleva-test-${randomUUID()}`,
          type: "income",
          amount: 10,
        },
        goals: { id: `eleva-test-${randomUUID()}`, target: 100, saved: 0 },
        snapshots: { id: `eleva-test-${randomUUID()}`, value: 100 },
        operations: {
          id: `eleva-test-${randomUUID()}`,
          type: "buy",
          assetId,
          amount: 10,
        },
        incomes: {
          id: `eleva-test-${randomUUID()}`,
          type: "income",
          incomeType: "yield",
          assetId,
          amount: 10,
        },
      };
      for (const [table, payload] of Object.entries(fixtures)) {
        const row = {
          user_id: au,
          id: payload.id,
          payload,
          ...(["operations", "incomes"].includes(table)
            ? { asset_id: assetId }
            : {}),
        };
        const { error } = await a.from(table).insert(row);
        if (error) fail(`INSERT próprio falhou: ${table}`);
        ids.push([table, payload.id]);
        const own = await a.from(table).select("id").eq("id", payload.id);
        assert.equal(own.error, null);
        assert.equal(own.data.length, 1);
        const other = await b.from(table).select("id").eq("id", payload.id);
        assert.equal(other.error, null);
        assert.equal(other.data.length, 0);
        const modified = await b
          .from(table)
          .update({ user_id: bu })
          .eq("id", payload.id)
          .select("id");
        assert.equal(modified.error, null);
        assert.equal(modified.data.length, 0);
        const deleted = await b
          .from(table)
          .delete()
          .eq("id", payload.id)
          .select("id");
        assert.equal(deleted.error, null);
        assert.equal(deleted.data.length, 0);
        const spoofId = `spoof-${randomUUID()}`;
        const spoof = await b
          .from(table)
          .insert({
            ...row,
            id: spoofId,
            payload: { ...payload, id: spoofId },
          });
        assert.equal(spoof.error?.code, "42501", `spoof ${table}`);
        const anonymous = await anon
          .from(table)
          .select("id")
          .eq("id", payload.id);
        assert.ok(anonymous.error, `anon ${table}`);
      }
      assert.ok((await anon.rpc("load_wallet")).error);
      const read = await a.rpc("load_wallet");
      assert.equal(read.error, null);
      assert.ok(read.data.wallet);
      const fake = await anon.auth.signInWithPassword({
        email: process.env.ELEVA_TEST_USER_A_EMAIL,
        password: `invalid-${randomUUID()}`,
      });
      assert.ok(fake.error);
    } finally {
      // Only remove fixture IDs created by this run; never replace a user's wallet.
      let cleanupFailed = false;
      for (const [table, id] of ids.reverse()) {
        const { error } = await a.from(table).delete().eq("id", id);
        if (error) cleanupFailed = true;
      }
      await Promise.all([
        a.auth.signOut({ scope: "local" }),
        b.auth.signOut({ scope: "local" }),
      ]);
      if (cleanupFailed)
        fail(
          "Limpeza incompleta; revise fixtures com prefixo eleva-test- no projeto de homologação.",
        );
    }
  },
);
