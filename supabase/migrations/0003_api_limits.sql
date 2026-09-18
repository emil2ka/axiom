-- AXIOM: лимиты внешних API (LLM и TTS) на аккаунт и на гостя.
-- Применить после 0001/0002 в Supabase Dashboard → SQL Editor.
--
-- Счётчики пишутся только security definer-функциями: у пользователя нет
-- прямого доступа к таблицам, поэтому обнулить свой лимит через клиент нельзя.
-- Лимиты аккаунта: LLM 100 запросов в месяц, TTS 20 озвучек в месяц.
-- Лимиты гостя (по хешу IP, сбрасываются ежедневно): LLM 15, TTS 5.
-- STT не лимитируется.

create table public.api_usage (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null constraint api_usage_kind_check check (kind in ('llm', 'tts')),
  period_start date not null default date_trunc('month', now())::date,
  used integer not null default 0,
  primary key (user_id, kind, period_start)
);

alter table public.api_usage enable row level security;
revoke all on public.api_usage from anon, authenticated;

create table public.api_usage_anon (
  ip_hash text not null,
  kind text not null constraint api_usage_anon_kind_check check (kind in ('llm', 'tts')),
  period_start date not null default (now() at time zone 'utc')::date,
  used integer not null default 0,
  primary key (ip_hash, kind, period_start)
);

alter table public.api_usage_anon enable row level security;
revoke all on public.api_usage_anon from anon, authenticated;

create or replace function public.api_quota_limit(p_kind text)
returns integer
language sql
immutable
as $$
  select case p_kind when 'llm' then 100 when 'tts' then 20 else null end;
$$;

revoke all on function public.api_quota_limit(text) from public, anon, authenticated;

create or replace function public.consume_api_quota(p_kind text, p_amount integer default 1)
returns table (allowed boolean, used integer, quota integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount integer := greatest(coalesce(p_amount, 1), 1);
  v_limit integer := public.api_quota_limit(p_kind);
  v_period date := date_trunc('month', now())::date;
  v_used integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  if v_limit is null then
    return query select true, 0, null::integer;
    return;
  end if;

  insert into public.api_usage as usage (user_id, kind, period_start, used)
  values (auth.uid(), p_kind, v_period, v_amount)
  on conflict (user_id, kind, period_start) do update
    set used = usage.used + v_amount
    where usage.used + v_amount <= v_limit
  returning usage.used into v_used;

  if v_used is null then
    select coalesce(api_usage.used, 0) into v_used
    from public.api_usage
    where user_id = auth.uid() and kind = p_kind and period_start = v_period;
    return query select false, coalesce(v_used, 0), v_limit;
    return;
  end if;

  return query select true, v_used, v_limit;
end;
$$;

revoke all on function public.consume_api_quota(text, integer) from public, anon;
grant execute on function public.consume_api_quota(text, integer) to authenticated;

create or replace function public.consume_anon_api_quota(
  p_ip_hash text,
  p_kind text,
  p_amount integer default 1
)
returns table (allowed boolean, used integer, quota integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_amount integer := greatest(coalesce(p_amount, 1), 1);
  v_limit integer := case p_kind when 'llm' then 15 when 'tts' then 5 else null end;
  v_period date := (now() at time zone 'utc')::date;
  v_used integer;
begin
  if p_ip_hash is null or length(p_ip_hash) < 8 then
    raise exception 'bad_ip_hash';
  end if;

  if v_limit is null then
    return query select true, 0, null::integer;
    return;
  end if;

  insert into public.api_usage_anon as usage (ip_hash, kind, period_start, used)
  values (p_ip_hash, p_kind, v_period, v_amount)
  on conflict (ip_hash, kind, period_start) do update
    set used = usage.used + v_amount
    where usage.used + v_amount <= v_limit
  returning usage.used into v_used;

  if v_used is null then
    select coalesce(api_usage_anon.used, 0) into v_used
    from public.api_usage_anon
    where ip_hash = p_ip_hash and kind = p_kind and period_start = v_period;
    return query select false, coalesce(v_used, 0), v_limit;
    return;
  end if;

  return query select true, v_used, v_limit;
end;
$$;

revoke all on function public.consume_anon_api_quota(text, text, integer) from public;
grant execute on function public.consume_anon_api_quota(text, text, integer) to anon, authenticated;

create or replace function public.api_usage_status()
returns table (kind text, used integer, quota integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_period date := date_trunc('month', now())::date;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  return query
    select kinds.kind, coalesce(usage.used, 0), public.api_quota_limit(kinds.kind)
    from (values ('llm'), ('tts')) as kinds(kind)
    left join public.api_usage usage
      on usage.user_id = auth.uid()
      and usage.kind = kinds.kind
      and usage.period_start = v_period;
end;
$$;

revoke all on function public.api_usage_status() from public, anon;
grant execute on function public.api_usage_status() to authenticated;
