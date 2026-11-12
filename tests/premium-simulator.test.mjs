import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("simulador exige compra ativa de uma conta confirmada e processa reenvios", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role anon;
      create role authenticated;
      create role service_role;
      create schema auth;
      create table auth.users (id uuid, email text, email_confirmed_at timestamptz);
      create function auth.uid() returns uuid language sql stable
        as $$ select current_setting('request.jwt.claim.sub', true)::uuid $$;
      insert into auth.users values
        ('00000000-0000-0000-0000-000000000001', 'aluna@example.com', now()),
        ('00000000-0000-0000-0000-000000000002', 'outra@example.com', now()),
        ('00000000-0000-0000-0000-000000000003', 'semconfirmar@example.com', null);
    `);
    await db.exec(await readFile(new URL("../supabase/migrations/202611120001_premium_simulator.sql", import.meta.url), "utf8"));
    const record = (id, email, date, revoked = false) => db.query(
      "select public.record_simulator_purchase($1,$2,$3,$4)", [id, email, date, revoked]
    );
    const asUser = async (id) => {
      await db.exec("reset role");
      await db.query("select set_config('request.jwt.claim.sub',$1,false)", [
        "00000000-0000-0000-0000-00000000000" + id,
      ]);
      await db.exec("set role authenticated");
    };
    const calculate = () => db.query("select * from public.simulate_premium_investment(1000,100,0,1)");
    const date = new Date().toISOString();
    await db.exec("set role anon");
    await assert.rejects(calculate);
    await db.exec("set role service_role");
    await record("premium", " ALUNA@example.com ", date);
    await record("premium", "aluna@example.com", "2090-01-01T00:00:00Z");
    await record("vencido", "outra@example.com", "2000-01-01T00:00:00Z");
    await record("sem-confirmacao", "semconfirmar@example.com", date);
    await asUser(1);
    const { rows } = await calculate();
    assert.equal(Number(rows[1].balance), 2200);
    await assert.rejects(record("forjado", "aluna@example.com", date));
    await assert.rejects(db.query("select * from public.simulator_purchases"));
    await asUser(2);
    await assert.rejects(calculate, /Acesso Premium/);
    await asUser(3);
    await assert.rejects(calculate, /Acesso Premium/);
    await db.exec("set role service_role");
    await record("premium", "aluna@example.com", null, true);
    await record("premium", "aluna@example.com", date);
    await asUser(1);
    await assert.rejects(calculate, /Acesso Premium/);
  } finally {
    await db.close();
  }
});
