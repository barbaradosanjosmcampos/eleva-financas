// Real PostgreSQL engine (PGlite), with minimal Supabase auth roles/uid shim.
// This validates migration SQL and actual RLS; it does not validate hosted Auth.
import { PGlite } from "@electric-sql/pglite";
import { readFile } from "node:fs/promises";
import test from "node:test";
import assert from "node:assert/strict";
import { createAssetDraft, prepareAsset } from "../src/lib/assetDraft.mjs";
import { appendOperation, validateV2 } from "../src/lib/investments.mjs";
import { investmentCatalog } from "../src/lib/investmentCatalog.mjs";
import { emptyFinances } from "../src/lib/experience.mjs";
const A = "00000000-0000-4000-8000-000000000001",
  B = "00000000-0000-4000-8000-000000000002";
const tables = [
  "wallet_state",
  "transactions",
  "assets",
  "goals",
  "snapshots",
  "operations",
  "incomes",
  "migration_receipts",
];
const transaction = {
  id: "t",
  description: "Receita privada",
  type: "income",
  amount: 100,
  category: "Outros",
  date: "2026-01-01",
};
const asset = { id: "a", name: "CDB", current: 100 };
const fixtures = {
  transactions: transaction,
  assets: asset,
  goals: { id: "g", target: 100, saved: 0 },
  snapshots: { id: "s", value: 100 },
  operations: { id: "o", assetId: "a", type: "buy", amount: 100 },
  incomes: {
    id: "i",
    assetId: "a",
    type: "income",
    incomeType: "yield",
    amount: 10,
  },
};
test("migration SQL: isolamento, permissões, referências, CAS e importação atômica", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create schema auth;
   create table auth.users (id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema auth, public to anon, authenticated;
   grant execute on function auth.uid() to anon, authenticated;
   insert into auth.users values ('${A}'),('${B}');`);
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202611080001_secure_wallets.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      await readFile(
        new URL(
          "../supabase/migrations/202611080002_investment_remuneration.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    const asUser = async (id) => {
      await db.exec("reset role; set role authenticated;");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        id,
      ]);
    };
    const save = (data, revision, key = null) =>
      db.query(
        "select public.save_wallet($1::jsonb,$2::bigint,$3::text) as revision",
        [JSON.stringify(data), revision, key],
      );
    const load = async () =>
      (await db.query("select public.load_wallet() as result")).rows[0].result;
    await asUser(A);
    await db.query("insert into public.wallet_state(user_id) values($1)", [A]);
    for (const [table, payload] of Object.entries(fixtures)) {
      const extra = ["operations", "incomes"].includes(table);
      await db.query(
        `insert into public.${table}(user_id,id,payload${extra ? ",asset_id" : ""}) values($1,$2,$3::jsonb${extra ? ",'a'" : ""})`,
        [A, payload.id, JSON.stringify(payload)],
      );
    }
    await db.query(
      "insert into public.migration_receipts(user_id,fingerprint) values($1,$2)",
      [A, "a".repeat(64)],
    );
    await t.test(
      "usuário B não lê, altera ou exclui dados de A em nenhuma tabela",
      async () => {
        await asUser(B);
        for (const table of tables) {
          assert.equal(
            (await db.query(`select * from public.${table}`)).rows.length,
            0,
            table,
          );
          assert.equal(
            (
              await db.query(
                `delete from public.${table} where user_id=$1 returning *`,
                [A],
              )
            ).rows.length,
            0,
            table,
          );
          assert.equal(
            (
              await db.query(
                `update public.${table} set user_id=$1 where user_id=$1 returning *`,
                [A],
              )
            ).rows.length,
            0,
            table,
          );
        }
        assert.deepEqual((await load()).wallet, emptyFinances());
      },
    );
    await t.test(
      "inserção com proprietário falsificado é rejeitada em todas as tabelas",
      async () => {
        for (const [table, payload] of Object.entries(fixtures)) {
          const extra = ["operations", "incomes"].includes(table);
          await assert.rejects(
            db.query(
              `insert into public.${table}(user_id,id,payload${extra ? ",asset_id" : ""}) values($1,$2,$3::jsonb${extra ? ",'a'" : ""})`,
              [A, payload.id, JSON.stringify(payload)],
            ),
            (e) => e.code === "42501",
            table,
          );
        }
        await assert.rejects(
          db.query("insert into public.wallet_state(user_id) values($1)", [A]),
          (e) => e.code === "42501",
        );
        await assert.rejects(
          db.query(
            "insert into public.migration_receipts(user_id,fingerprint) values($1,$2)",
            [A, "b".repeat(64)],
          ),
          (e) => e.code === "42501",
        );
      },
    );
    await t.test(
      "operação não pode referenciar investimento de outro usuário",
      async () => {
        await assert.rejects(
          db.query(
            "insert into public.operations(user_id,id,payload,asset_id) values($1,'o',$2::jsonb,'a')",
            [B, JSON.stringify(fixtures.operations)],
          ),
          (e) => e.code === "23503",
        );
      },
    );
    await t.test(
      "proprietário pode editar mas não transferir seus registros",
      async () => {
        await asUser(A);
        for (const table of tables) {
          assert.ok(
            (
              await db.query(
                `update public.${table} set user_id=$1 where user_id=$1 returning *`,
                [A],
              )
            ).rows.length,
            table,
          );
          await assert.rejects(
            db.query(`update public.${table} set user_id=$1 where user_id=$2`, [
              B,
              A,
            ]),
            (e) => e.code === "42501",
            table,
          );
        }
      },
    );
    await t.test("anônimo não tem acesso a tabelas ou funções", async () => {
      await db.exec(
        "reset role; set role anon; select set_config('request.jwt.claim.sub','',false);",
      );
      for (const table of tables)
        await assert.rejects(
          db.query(`select * from public.${table}`),
          (e) => e.code === "42501",
          table,
        );
      await assert.rejects(load(), (e) => e.code === "42501");
      await assert.rejects(save(emptyFinances(), 0), (e) => e.code === "42501");
    });
    await t.test(
      "importação confirma revisão, impede repetição e preserva fonte",
      async () => {
        await asUser(B);
        const wallet = { ...emptyFinances(), transactions: [transaction] };
        assert.equal(
          (await save(wallet, 0, "b".repeat(64))).rows[0].revision,
          1,
        );
        assert.deepEqual((await load()).wallet, wallet);
        await assert.rejects(
          save(wallet, 1, "b".repeat(64)),
          (e) => e.code === "23505",
        );
        await assert.rejects(save(wallet, 1, "c".repeat(64)), /empty wallet/);
        assert.deepEqual((await load()).wallet, wallet);
      },
    );
    await t.test(
      "revisão obsoleta não sobrescreve; falha de FK reverte toda gravação",
      async () => {
        await assert.rejects(
          save(emptyFinances(), 0),
          (e) => e.code === "40001",
        );
        const before = await load();
        await assert.rejects(
          save({ ...emptyFinances(), operations: [fixtures.operations] }, 1),
          (e) => e.code === "23503",
        );
        assert.deepEqual(await load(), before);
        assert.equal((await save(emptyFinances(), 1)).rows[0].revision, 2);
        assert.deepEqual((await load()).wallet, emptyFinances());
        // Even after emptying the wallet the same import receipt is retained.
        await assert.rejects(
          save(
            { ...emptyFinances(), transactions: [transaction] },
            2,
            "b".repeat(64),
          ),
          (e) => e.code === "23505",
        );
      },
    );
    await t.test(
      "gravação completa preserva operações, proventos, ordem e todas as coleções",
      async () => {
        const date = "2026-01-01";
        const draft = {
          ...createAssetDraft(null, "full-asset"),
          investmentType: "fixed-income",
          trackingMode: "value",
          ...investmentCatalog["fixed-income"].example,
          openingDate: date,
        };
        let wallet = {
          ...emptyFinances(),
          assets: [prepareAsset(emptyFinances(), draft, undefined, date)],
          transactions: [transaction],
          goals: [
            {
              id: "full-goal",
              name: "Reserva",
              target: 1000,
              saved: 10,
              deadline: "2027-01-01",
            },
          ],
        };
        wallet = appendOperation(
          wallet,
          {
            id: "full-op",
            assetId: "full-asset",
            type: "contribution",
            incomeType: null,
            date,
            amount: 100,
            quantity: null,
            currentAfter: 10500,
            note: "",
          },
          date,
        );
        wallet = appendOperation(
          wallet,
          {
            id: "full-income",
            assetId: "full-asset",
            type: "income",
            incomeType: "yield",
            date,
            amount: 10,
            quantity: null,
            currentAfter: null,
            note: "",
          },
          date,
        );
        assert.ok(validateV2(wallet));
        await save(wallet, 2);
        assert.deepEqual((await load()).wallet, wallet);
        assert.equal(
          (await db.query("select count(*)::int as n from public.incomes"))
            .rows[0].n,
          1,
        );
        assert.equal(
          (await db.query("select count(*)::int as n from public.operations"))
            .rows[0].n,
          1,
        );
      },
    );
    await t.test(
      "remuneração opcional sobrevive ao RPC; taxas inválidas revertem a gravação sem afetar dados antigos",
      async () => {
        await asUser(B);
        for (const remuneration of [
          { version: 1, mode: "cdi", rate: 110 },
          { version: 1, mode: "fixed", rate: 12 },
          { version: 1, mode: "ipca", rate: 6 },
          { version: 1, mode: "other", description: "Outra regra do contrato" },
        ]) {
          const previous = await load();
          const wallet = structuredClone(previous.wallet);
          wallet.assets[0].remuneration = remuneration;
          wallet.assets[0].applicationDate = "2025-12-01";
          wallet.assets[0].valuationDate = "2026-01-01";
          await save(wallet, previous.revision);
          assert.deepEqual((await load()).wallet, wallet);
        }
        const previous = await load();
        for (const remuneration of [
          null,
          { version: 2, mode: "cdi", rate: 100 },
          { version: 1, mode: "fixed", rate: -1 },
          { version: 1, mode: "ipca", rate: "6" },
          { version: 1, mode: "other", description: "" },
        ]) {
          const wallet = structuredClone(previous.wallet);
          wallet.assets[0].remuneration = remuneration;
          await assert.rejects(
            save(wallet, previous.revision),
            (e) => e.code === "23514",
          );
          assert.deepEqual(await load(), previous);
        }
      },
    );
    await t.test(
      "script de homologação SQL também termina sem exceções",
      async () => {
        await db.exec("reset role;");
        await db.exec(
          await readFile(
            new URL("../supabase/tests/rls.sql", import.meta.url),
            "utf8",
          ),
        );
      },
    );
  } finally {
    await db.close();
  }
});
