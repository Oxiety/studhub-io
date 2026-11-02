-- StudHub: комментарии к постам/проектам, оценки постов/проектов/обсуждений.
-- Запустить один раз в Supabase → SQL Editor. Не удаляет пользовательские данные.

create table if not exists public.content_comments (
  id bigint generated always as identity primary key,
  target_type text not null check (target_type in ('post','project')),
  target_id text not null,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name text not null default 'Студент',
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists content_comments_target_created_idx
  on public.content_comments(target_type, target_id, created_at);
alter table public.content_comments enable row level security;
revoke all on public.content_comments from anon, authenticated;
drop policy if exists content_comments_read on public.content_comments;
create policy content_comments_read on public.content_comments for select to anon, authenticated using (true);
drop policy if exists content_comments_insert_own on public.content_comments;
create policy content_comments_insert_own on public.content_comments for insert to authenticated
  with check (author_id = auth.uid() and target_type in ('post','project'));
drop policy if exists content_comments_delete_own on public.content_comments;
create policy content_comments_delete_own on public.content_comments for delete to authenticated using (author_id = auth.uid());
grant select on public.content_comments to anon, authenticated;
grant insert (target_type, target_id, author_id, author_name, body) on public.content_comments to authenticated;
grant delete on public.content_comments to authenticated;


create table if not exists public.content_votes (
  target_type text not null check (target_type in ('post','project','discussion')),
  target_id text not null,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  created_at timestamptz not null default now(),
  primary key (target_type, target_id, user_id)
);
create index if not exists content_votes_target_idx on public.content_votes(target_type, target_id);
alter table public.content_votes enable row level security;
revoke all on public.content_votes from anon, authenticated;
drop policy if exists content_votes_read on public.content_votes;
create policy content_votes_read on public.content_votes for select to anon, authenticated using (true);
drop policy if exists content_votes_insert_own on public.content_votes;
create policy content_votes_insert_own on public.content_votes for insert to authenticated with check (user_id = auth.uid());
drop policy if exists content_votes_update_own on public.content_votes;
create policy content_votes_update_own on public.content_votes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists content_votes_delete_own on public.content_votes;
create policy content_votes_delete_own on public.content_votes for delete to authenticated using (user_id = auth.uid());
grant select on public.content_votes to anon, authenticated;
grant insert (target_type, target_id, user_id, value) on public.content_votes to authenticated;
grant update (value) on public.content_votes to authenticated;
grant delete on public.content_votes to authenticated;

-- В исходной схеме owner_id IS NULL использовался только для демо-проектов.
-- Удаляем эти пять seed-проектов и связанные с ними данные, не трогая проекты аккаунтов.
delete from public.projects where owner_id is null;
