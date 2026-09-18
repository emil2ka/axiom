-- AXIOM: аккаунты, облачная память и прогресс.
-- Применить: Supabase Dashboard → SQL Editor → вставить целиком → Run.
-- Либо через CLI: supabase db push (проект уже связан).
--
-- Модель доступа: только authenticated, каждая строка видна лишь владельцу (RLS).
-- service_role нигде не используется на клиенте.

-- Один активный маршрут на пользователя; архивные остаются на будущее.
create table public.journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Мой маршрут',
  status text not null default 'active' constraint journeys_status_check check (status in ('active', 'archived')),
  -- Снимок клиентского состояния: memories, messages, whatIf, favorites, targetProgramId.
  state jsonb not null default '{}'::jsonb,
  -- Прогресс отдельно от профиля: roadmapDone, compareIds.
  progress jsonb not null default '{}'::jsonb,
  -- Оптимистичный контроль версий: клиент пишет, только если revision совпал.
  revision bigint not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index journeys_one_active_idx
  on public.journeys (user_id)
  where status = 'active';

create index journeys_user_idx on public.journeys (user_id, updated_at desc);

-- Журнал правок памяти: таймлайн «как менялся профиль», основа для ачивок и стрика.
create table public.memory_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  journey_id uuid not null references public.journeys (id) on delete cascade,
  field text not null,
  action text not null constraint memory_events_action_check check (action in ('add', 'update', 'remove')),
  before jsonb,
  after jsonb,
  at timestamptz not null default now()
);

create index memory_events_journey_idx on public.memory_events (journey_id, at desc);
create index memory_events_user_idx on public.memory_events (user_id, at desc);

-- updated_at всегда ставит сервер, клиент его не контролирует.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger journeys_touch_updated_at
  before update on public.journeys
  for each row
  execute function public.touch_updated_at();

alter table public.journeys enable row level security;
alter table public.memory_events enable row level security;

create policy "journeys_select_own" on public.journeys
  for select to authenticated
  using (auth.uid() = user_id);

create policy "journeys_insert_own" on public.journeys
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "journeys_update_own" on public.journeys
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "journeys_delete_own" on public.journeys
  for delete to authenticated
  using (auth.uid() = user_id);

create policy "memory_events_select_own" on public.memory_events
  for select to authenticated
  using (auth.uid() = user_id);

create policy "memory_events_insert_own" on public.memory_events
  for insert to authenticated
  with check (auth.uid() = user_id);

create policy "memory_events_delete_own" on public.memory_events
  for delete to authenticated
  using (auth.uid() = user_id);
