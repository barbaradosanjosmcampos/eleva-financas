-- Run only in a disposable/homologation Supabase project, after migration.
-- Run the complete file as postgres (SQL Editor). Any exception is a failure.
-- No credentials are needed here. All fixtures roll back.
begin;
insert into auth.users(id) values
 ('e1e1e1e1-0000-4000-8000-000000000001'),
 ('e1e1e1e1-0000-4000-8000-000000000002');
set local role authenticated;
select set_config('request.jwt.claim.sub','e1e1e1e1-0000-4000-8000-000000000001',true);
select public.save_wallet('{"schemaVersion":2,"transactions":[{"id":"private","type":"income","amount":10,"description":"RLS test","category":"Outros","date":"2026-01-01"}],"assets":[],"operations":[],"goals":[],"snapshots":[]}',0,null);
select set_config('request.jwt.claim.sub','e1e1e1e1-0000-4000-8000-000000000002',true);
do $$
declare n integer; t text;
begin
 select count(*) into n from public.transactions;
 if n <> 0 then raise exception 'Cross-user SELECT leaked data'; end if;
 update public.transactions set payload = payload || '{"amount":20}' where id='private';
 get diagnostics n = row_count;
 if n <> 0 then raise exception 'Cross-user UPDATE affected data'; end if;
 delete from public.transactions where id='private';
 get diagnostics n = row_count;
 if n <> 0 then raise exception 'Cross-user DELETE affected data'; end if;
 begin
  insert into public.transactions(user_id,id,payload) values ('e1e1e1e1-0000-4000-8000-000000000001','spoof','{"id":"spoof","type":"income","amount":10}');
  raise exception 'Spoofed owner was accepted';
 exception when insufficient_privilege then null;
 end;
 foreach t in array array['wallet_state','transactions','assets','operations','incomes','goals','snapshots','migration_receipts'] loop
  if not exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=t and c.relrowsecurity and c.relforcerowsecurity) then
   raise exception 'Missing RLS: %', t;
  end if;
 end loop;
end $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$
begin
 begin perform public.load_wallet(); raise exception 'Anonymous RPC was accepted'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.transactions; raise exception 'Anonymous SELECT was accepted'; exception when insufficient_privilege then null; end;
end $$;
rollback;
-- Passing means every statement completed, with ROLLBACK and no exception.
