-- AXIOM: удаление аккаунта силами самого пользователя.
-- Применить после 0001 в Supabase Dashboard → SQL Editor.
--
-- Security definer нужен, чтобы удалить запись из auth.users: обычному
-- authenticated-пользователю эта схема недоступна. Функция удаляет только
-- себя (auth.uid()), а строки journeys и memory_events уходят каскадом.

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
