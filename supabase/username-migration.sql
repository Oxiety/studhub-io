-- StudHub: уникальные юзернеймы для существующих и новых аккаунтов.
-- Выполнить один раз в Supabase → SQL Editor → New query → Run.
-- Миграция сохраняет существующие профили и автоматически назначает им юзернеймы.

alter table public.profiles add column if not exists username text;

-- Назначаем существующим профилям уникальные юзернеймы на основе email.
do $$
declare
  r record;
  base_name text;
  candidate text;
  suffix text;
  n integer;
begin
  for r in
    select p.id, u.email
    from public.profiles p
    left join auth.users u on u.id = p.id
    where p.username is null or btrim(p.username) = ''
    order by p.created_at nulls first, p.id
  loop
    base_name := lower(regexp_replace(split_part(coalesce(r.email, ''), '@', 1), '[^a-zA-Z0-9_.]', '', 'g'));
    base_name := trim(both '._' from base_name);
    if char_length(base_name) < 3 then base_name := 'student'; end if;
    base_name := left(base_name, 20);
    candidate := base_name;
    n := 1;
    while exists (select 1 from public.profiles p where lower(p.username) = lower(candidate) and p.id <> r.id) loop
      n := n + 1;
      suffix := '_' || n::text;
      candidate := left(base_name, 20 - char_length(suffix)) || suffix;
    end loop;
    update public.profiles set username = candidate where id = r.id;
  end loop;
end $$;

-- Проверяем формат и уникальность без учёта регистра.
create unique index if not exists profiles_username_lower_uidx on public.profiles (lower(username));
alter table public.profiles alter column username set not null;
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format
  check (username = lower(username) and username ~ '^[a-z0-9_.]{3,20}$');

-- Новые аккаунты получают username из формы регистрации (auth user metadata).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  nm text;
  un text;
begin
  nm := left(trim(coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))), 40);
  if char_length(nm) < 2 then nm := 'Студент'; end if;
  un := lower(trim(coalesce(new.raw_user_meta_data->>'username', '')));
  if un !~ '^[a-z0-9_.]{3,20}$' then
    un := lower(regexp_replace(split_part(coalesce(new.email, ''), '@', 1), '[^a-zA-Z0-9_.]', '', 'g'));
    un := trim(both '._' from un);
    if char_length(un) < 3 then un := 'student_' || left(replace(new.id::text, '-', ''), 6); end if;
    un := left(un, 20);
  end if;
  insert into public.profiles(id, name, username) values (new.id, nm, un);
  insert into public.wallets(user_id) values (new.id);
  return new;
end $$;

-- Разрешаем пользователю обновлять только свой профиль, включая username.
grant update (name, username) on public.profiles to authenticated;


-- Проверка доступности юзернейма до регистрации. Вызывается из браузера через Supabase RPC.
create or replace function public.is_username_available(candidate text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select candidate ~ '^[a-z0-9_.]{3,20}$'
     and not exists (
       select 1 from public.profiles p
       where lower(p.username) = lower(candidate)
     );
$$;
revoke all on function public.is_username_available(text) from public;
grant execute on function public.is_username_available(text) to anon, authenticated;

-- Убеждаемся, что триггер регистрации использует обновлённую функцию.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
