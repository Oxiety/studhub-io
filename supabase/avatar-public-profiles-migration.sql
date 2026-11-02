-- StudHub: общие аватарки пользователей через Supabase Storage.
-- Выполнить один раз в Supabase → SQL Editor. Повторный запуск безопасен.

-- 1. URL аватарки хранится в профиле, а не в localStorage.
alter table public.profiles add column if not exists avatar_url text;

-- 2. Разрешаем читать только публичные поля профиля всем посетителям.
-- SECURITY INVOKER у view заставляет PostgreSQL проверять права вызывающего пользователя.
drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles
  for select to anon, authenticated using (true);

revoke select on public.profiles from anon, authenticated;
grant select (id, name, username, subtitle, bio, city, campus, interests, avatar_url, created_at)
  on public.profiles to anon, authenticated;
grant update (name, username, subtitle, bio, city, campus, interests, avatar_url)
  on public.profiles to authenticated;

create or replace view public.public_profiles
with (security_invoker = true) as
select id, name, username, subtitle, bio, city, campus, interests, created_at, avatar_url
from public.profiles;
grant select on public.public_profiles to anon, authenticated;

-- 3. Публичный bucket: URL аватарки можно открывать без авторизации.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif'];

-- Пользователь может загружать/заменять/удалять только файл в своей папке <auth.uid()>.
drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- 4. RPC чата/поиска тоже возвращают avatar_url, чтобы аватар был доступен везде.
drop function if exists public.chat_find_profiles(text, integer);
create function public.chat_find_profiles(q text default '', lim integer default 8)
returns table (
  id uuid, name text, username text, subtitle text, bio text, city text,
  campus text, interests text, created_at timestamptz, avatar_url text
)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.username, p.subtitle, p.bio, p.city,
         p.campus, p.interests, p.created_at, p.avatar_url
  from public.profiles p
  where p.id <> auth.uid()
    and (btrim(coalesce(q, '')) = ''
         or p.name ilike '%' || replace(replace(btrim(q), '%', ''), '_', '') || '%'
         or p.username ilike '%' || replace(replace(btrim(q), '%', ''), '_', '') || '%')
  order by p.created_at desc
  limit least(greatest(coalesce(lim, 8), 1), 20)
$$;
revoke all on function public.chat_find_profiles(text, integer) from public, anon;
grant execute on function public.chat_find_profiles(text, integer) to authenticated;

drop function if exists public.chat_get_profiles(uuid[]);
create function public.chat_get_profiles(ids uuid[])
returns table (
  id uuid, name text, username text, subtitle text, bio text, city text,
  campus text, interests text, created_at timestamptz, avatar_url text
)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.username, p.subtitle, p.bio, p.city,
         p.campus, p.interests, p.created_at, p.avatar_url
  from public.profiles p
  where p.id = any(ids)
  limit 50
$$;
revoke all on function public.chat_get_profiles(uuid[]) from public, anon;
grant execute on function public.chat_get_profiles(uuid[]) to authenticated;
