create table public.simulator_purchases (
  order_id text primary key,
  buyer_email text not null,
  approved_at timestamptz,
  expires_at timestamptz,
  revoked boolean not null default false
);
create index simulator_purchases_buyer on public.simulator_purchases (buyer_email);
alter table public.simulator_purchases enable row level security;
revoke all on public.simulator_purchases from public, anon, authenticated;

create function public.record_simulator_purchase(
  purchase_id text, email text, approval timestamptz, revoke_access boolean
) returns void
language sql security definer set search_path = ''
as $$
  insert into public.simulator_purchases as p (order_id, buyer_email, approved_at, expires_at, revoked)
  values (purchase_id, lower(trim(email)), approval,
    (approval at time zone 'UTC' + interval '12 months') at time zone 'UTC', revoke_access)
  on conflict (order_id) do update set revoked = p.revoked or excluded.revoked;
$$;
revoke all on function public.record_simulator_purchase(text,text,timestamptz,boolean) from public, anon, authenticated;
grant execute on function public.record_simulator_purchase(text,text,timestamptz,boolean) to service_role;

create function public.simulator_access_until() returns timestamptz
language sql stable security definer set search_path = ''
as $$
  select max(p.expires_at)
  from public.simulator_purchases p
  join auth.users u on lower(u.email) = p.buyer_email
  where u.id = auth.uid() and u.email_confirmed_at is not null
    and not p.revoked and p.expires_at > now();
$$;
revoke all on function public.simulator_access_until() from public, anon;
grant execute on function public.simulator_access_until() to authenticated;

create function public.simulate_premium_investment(
  initial numeric, monthly numeric, annual_rate numeric, years integer
) returns table(year integer, invested numeric, balance numeric)
language plpgsql stable security invoker set search_path = ''
as $$
declare
  monthly_factor numeric;
begin
  if public.simulator_access_until() is null then
    raise exception 'Acesso Premium indisponível.' using errcode = '42501';
  end if;
  if initial is null or initial not between 0 and 1000000000
    or monthly is null or monthly not between 0 and 1000000
    or annual_rate is null or annual_rate not between -50 and 50
    or years is null or years not between 1 and 50 then
    raise exception 'Parâmetros de simulação inválidos.';
  end if;
  monthly_factor := power(1 + annual_rate / 100, 1::numeric / 12);
  return query
    with recursive projection(month, amount) as (
      select 0, initial
      union all
      select month + 1, round(amount * monthly_factor + monthly, 12)
      from projection where month < years * 12
    )
    select month / 12, initial + monthly * month, round(amount, 2)
    from projection where month % 12 = 0 order by month;
end;
$$;
revoke all on function public.simulate_premium_investment(numeric,numeric,numeric,integer) from public, anon;
grant execute on function public.simulate_premium_investment(numeric,numeric,numeric,integer) to authenticated;
