-- ELEVA: run in a new Supabase project. No production data is imported.
begin;
create table public.wallet_state (
 user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
 revision bigint not null default 0 check (revision >= 0)
);
create table public.transactions (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 id text not null check (length(id) between 1 and 200),
 -- Versioned domain record preserves the existing lossless JSON backup format.
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload ? 'id' and (payload->>'id' = id) is true),
 ordinal integer not null default 0 check (ordinal >= 0),
 primary key (user_id, id),
 check ((payload->>'type' in ('income','expense') and jsonb_typeof(payload->'amount') = 'number' and (payload->>'amount')::numeric > 0) is true)
);
create table public.assets (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 id text not null check (length(id) between 1 and 200),
 -- Versioned domain record preserves the existing lossless JSON backup format.
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload ? 'id' and (payload->>'id' = id) is true),
 ordinal integer not null default 0 check (ordinal >= 0),
 primary key (user_id, id),
 check ((jsonb_typeof(payload->'current') = 'number' and (payload->>'current')::numeric >= 0) is true)
);
create table public.goals (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 id text not null check (length(id) between 1 and 200),
 -- Versioned domain record preserves the existing lossless JSON backup format.
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload ? 'id' and (payload->>'id' = id) is true),
 ordinal integer not null default 0 check (ordinal >= 0),
 primary key (user_id, id),
 check ((jsonb_typeof(payload->'target') = 'number' and (payload->>'target')::numeric > 0 and jsonb_typeof(payload->'saved') = 'number' and (payload->>'saved')::numeric >= 0) is true)
);
create table public.snapshots (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 id text not null check (length(id) between 1 and 200),
 -- Versioned domain record preserves the existing lossless JSON backup format.
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload ? 'id' and (payload->>'id' = id) is true),
 ordinal integer not null default 0 check (ordinal >= 0),
 primary key (user_id, id),
 check ((jsonb_typeof(payload->'value') = 'number' and (payload->>'value')::numeric >= 0) is true)
);
create table public.operations (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 id text not null check (length(id) between 1 and 200),
 -- Versioned domain record preserves the existing lossless JSON backup format.
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload ? 'id' and (payload->>'id' = id) is true),
 ordinal integer not null default 0 check (ordinal >= 0),
 asset_id text not null,
 foreign key (user_id, asset_id) references public.assets(user_id, id),
 primary key (user_id, id),
 check ((payload->>'type' in ('buy','sell','contribution','redemption') and payload->>'assetId' = asset_id and jsonb_typeof(payload->'amount') = 'number' and (payload->>'amount')::numeric > 0) is true)
);
create table public.incomes (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 id text not null check (length(id) between 1 and 200),
 -- Versioned domain record preserves the existing lossless JSON backup format.
 payload jsonb not null check (jsonb_typeof(payload) = 'object' and payload ? 'id' and (payload->>'id' = id) is true),
 ordinal integer not null default 0 check (ordinal >= 0),
 asset_id text not null,
 foreign key (user_id, asset_id) references public.assets(user_id, id),
 primary key (user_id, id),
 check ((payload->>'type' = 'income' and payload->>'assetId' = asset_id and payload->>'incomeType' in ('dividend','interest','yield') and jsonb_typeof(payload->'amount') = 'number' and (payload->>'amount')::numeric > 0) is true)
);
create table public.migration_receipts (
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
 imported_at timestamptz not null default now(),
 primary key (user_id, fingerprint)
);
alter table public.wallet_state enable row level security;
alter table public.wallet_state force row level security;
revoke all on public.wallet_state from anon, authenticated;
grant select, insert, update, delete on public.wallet_state to authenticated;
create policy own_select on public.wallet_state for select to authenticated using ((select auth.uid()) = user_id);
create policy own_insert on public.wallet_state for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_update on public.wallet_state for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_delete on public.wallet_state for delete to authenticated using ((select auth.uid()) = user_id);
alter table public.transactions enable row level security;
alter table public.transactions force row level security;
revoke all on public.transactions from anon, authenticated;
grant select, insert, update, delete on public.transactions to authenticated;
create policy own_select on public.transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy own_insert on public.transactions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_update on public.transactions for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_delete on public.transactions for delete to authenticated using ((select auth.uid()) = user_id);
alter table public.assets enable row level security;
alter table public.assets force row level security;
revoke all on public.assets from anon, authenticated;
grant select, insert, update, delete on public.assets to authenticated;
create policy own_select on public.assets for select to authenticated using ((select auth.uid()) = user_id);
create policy own_insert on public.assets for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_update on public.assets for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_delete on public.assets for delete to authenticated using ((select auth.uid()) = user_id);
alter table public.goals enable row level security;
alter table public.goals force row level security;
revoke all on public.goals from anon, authenticated;
grant select, insert, update, delete on public.goals to authenticated;
create policy own_select on public.goals for select to authenticated using ((select auth.uid()) = user_id);
create policy own_insert on public.goals for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_update on public.goals for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_delete on public.goals for delete to authenticated using ((select auth.uid()) = user_id);
alter table public.snapshots enable row level security;
alter table public.snapshots force row level security;
revoke all on public.snapshots from anon, authenticated;
grant select, insert, update, delete on public.snapshots to authenticated;
create policy own_select on public.snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy own_insert on public.snapshots for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_update on public.snapshots for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_delete on public.snapshots for delete to authenticated using ((select auth.uid()) = user_id);
alter table public.operations enable row level security;
alter table public.operations force row level security;
revoke all on public.operations from anon, authenticated;
grant select, insert, update, delete on public.operations to authenticated;
create policy own_select on public.operations for select to authenticated using ((select auth.uid()) = user_id);
create policy own_insert on public.operations for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_update on public.operations for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_delete on public.operations for delete to authenticated using ((select auth.uid()) = user_id);
alter table public.incomes enable row level security;
alter table public.incomes force row level security;
revoke all on public.incomes from anon, authenticated;
grant select, insert, update, delete on public.incomes to authenticated;
create policy own_select on public.incomes for select to authenticated using ((select auth.uid()) = user_id);
create policy own_insert on public.incomes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_update on public.incomes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_delete on public.incomes for delete to authenticated using ((select auth.uid()) = user_id);
alter table public.migration_receipts enable row level security;
alter table public.migration_receipts force row level security;
revoke all on public.migration_receipts from anon, authenticated;
grant select, insert, update, delete on public.migration_receipts to authenticated;
create policy own_select on public.migration_receipts for select to authenticated using ((select auth.uid()) = user_id);
create policy own_insert on public.migration_receipts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy own_update on public.migration_receipts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy own_delete on public.migration_receipts for delete to authenticated using ((select auth.uid()) = user_id);

-- Invoker functions run under caller RLS, never with service_role privileges.
create function public.load_wallet() returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise insufficient_privilege using message = 'Authentication required'; end if;
 select jsonb_build_object(
  'revision', coalesce((select revision from public.wallet_state where user_id = auth.uid()), 0),
  'wallet', jsonb_build_object(
   'schemaVersion', 2,
   'transactions', coalesce((select jsonb_agg(payload order by ordinal, id) from public.transactions where user_id = auth.uid()), '[]'::jsonb),
   'assets', coalesce((select jsonb_agg(payload order by ordinal, id) from public.assets where user_id = auth.uid()), '[]'::jsonb),
   'goals', coalesce((select jsonb_agg(payload order by ordinal, id) from public.goals where user_id = auth.uid()), '[]'::jsonb),
   'snapshots', coalesce((select jsonb_agg(payload order by ordinal, id) from public.snapshots where user_id = auth.uid()), '[]'::jsonb),
   'operations', coalesce((select jsonb_agg(payload order by ordinal, id) from (
    select payload, ordinal, id from public.operations where user_id = auth.uid()
    union all select payload, ordinal, id from public.incomes where user_id = auth.uid()
   ) as all_operations), '[]'::jsonb)
  )
 ) into result;
 return result;
end;
$$;

create function public.save_wallet(wallet jsonb, expected_revision bigint, import_key text default null) returns bigint
language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); current_revision bigint; k text;
begin
 if uid is null then raise insufficient_privilege using message = 'Authentication required'; end if;
 if wallet is null or (wallet->>'schemaVersion') is distinct from '2' or expected_revision is null then raise exception 'Invalid wallet'; end if;
 foreach k in array array['transactions','assets','goals','snapshots','operations'] loop
  if jsonb_typeof(wallet->k) is distinct from 'array' then raise exception 'Invalid collection'; end if;
 end loop;
 if exists (select 1 from jsonb_array_elements(wallet->'operations') as a(item) group by item->>'id' having count(*) > 1) then
  raise exception 'Duplicate operation identifier' using errcode = '23505';
 end if;
 insert into public.wallet_state(user_id) values(uid) on conflict do nothing;
 select revision into current_revision from public.wallet_state where user_id = uid for update;
 if current_revision <> expected_revision then raise exception 'Wallet changed' using errcode = '40001'; end if;
 if import_key is not null then
  -- Receipt and records commit together; any error rolls back the entire import.
  insert into public.migration_receipts(user_id, fingerprint) values(uid, import_key);
  if exists(select 1 from public.transactions where user_id = uid)
   or exists(select 1 from public.assets where user_id = uid)
   or exists(select 1 from public.goals where user_id = uid)
   or exists(select 1 from public.snapshots where user_id = uid)
   or exists(select 1 from public.operations where user_id = uid)
   or exists(select 1 from public.incomes where user_id = uid)
  then raise exception 'Initial import requires an empty wallet'; end if;
 end if;
 delete from public.operations where user_id = uid;
 delete from public.incomes where user_id = uid;
 delete from public.assets where user_id = uid;
 delete from public.transactions where user_id = uid;
 delete from public.goals where user_id = uid;
 delete from public.snapshots where user_id = uid;
 insert into public.transactions(user_id, id, payload, ordinal) select uid, item->>'id', item, ord::integer from jsonb_array_elements(wallet->'transactions') with ordinality as a(item, ord);
 insert into public.assets(user_id, id, payload, ordinal) select uid, item->>'id', item, ord::integer from jsonb_array_elements(wallet->'assets') with ordinality as a(item, ord);
 insert into public.goals(user_id, id, payload, ordinal) select uid, item->>'id', item, ord::integer from jsonb_array_elements(wallet->'goals') with ordinality as a(item, ord);
 insert into public.snapshots(user_id, id, payload, ordinal) select uid, item->>'id', item, ord::integer from jsonb_array_elements(wallet->'snapshots') with ordinality as a(item, ord);
 insert into public.operations(user_id, id, payload, ordinal, asset_id) select uid, item->>'id', item, ord::integer, item->>'assetId' from jsonb_array_elements(wallet->'operations') with ordinality as a(item, ord) where item->>'type' is distinct from 'income';
 insert into public.incomes(user_id, id, payload, ordinal, asset_id) select uid, item->>'id', item, ord::integer, item->>'assetId' from jsonb_array_elements(wallet->'operations') with ordinality as a(item, ord) where item->>'type' = 'income';
 update public.wallet_state set revision = current_revision + 1 where user_id = uid;
 return current_revision + 1;
end;
$$;
revoke all on function public.load_wallet() from public, anon;
revoke all on function public.save_wallet(jsonb, bigint, text) from public, anon;
grant execute on function public.load_wallet() to authenticated;
grant execute on function public.save_wallet(jsonb, bigint, text) to authenticated;
commit;
