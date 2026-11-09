-- Optional v1 remuneration metadata; old payloads remain unchanged and valid.
-- JSON payloads and existing RPC signatures preserve backup compatibility.
-- No data rewrite, privilege change or RLS policy change.
begin;
create function public.valid_investment_remuneration(payload jsonb) returns boolean
language sql immutable security invoker set search_path = '' as $$
 select case
 when not (payload ? 'remuneration') then true
 when jsonb_typeof(payload->'remuneration') is distinct from 'object' then false
 when (coalesce(payload->>'investmentType', case payload->>'category'
   when 'Renda fixa' then 'fixed-income' when 'Tesouro Direto' then 'treasury' when 'Outros' then 'other' end)
   in ('fixed-income','treasury','other')) is not true then false
 when (payload->'remuneration'->'version') is distinct from '1'::jsonb then false
 when payload->'remuneration'->>'mode' = 'other' then
   jsonb_typeof(payload->'remuneration'->'description') = 'string'
   and length(btrim(payload->'remuneration'->>'description')) between 1 and 200
   and not (payload->'remuneration' ? 'rate')
 when payload->'remuneration'->>'mode' in ('cdi','fixed','ipca') then
   case when jsonb_typeof(payload->'remuneration'->'rate') = 'number' then
     (payload->'remuneration'->>'rate')::numeric between 0 and 1000
     and not (payload->'remuneration' ? 'description')
   else false end
 else false end is true;
$$;
alter table public.assets add constraint assets_remuneration_v1_check check (public.valid_investment_remuneration(payload));
revoke all on function public.valid_investment_remuneration(jsonb) from public, anon;
grant execute on function public.valid_investment_remuneration(jsonb) to authenticated;
commit;
