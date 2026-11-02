-- Отдельная миграция только для вкладки «Обсуждения».
-- Если основной schema.sql уже запускался, выполните этот файл в Supabase SQL Editor.


/* ================= Обсуждения и ответы ================= */
create table if not exists public.discussions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name text not null default '',
  title text not null check (char_length(title) between 4 and 120),
  body text not null default '' check (char_length(body) <= 5000),
  category text not null default 'Вопросы' check (category in ('Вопросы','Идеи','Учёба','Общага','Ищу команду','Оффтоп')),
  score integer not null default 0,
  comment_count integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists discussions_created_idx on public.discussions(created_at desc);
create index if not exists discussions_category_idx on public.discussions(category);

create table if not exists public.discussion_comments (
  id uuid primary key default gen_random_uuid(),
  discussion_id uuid not null references public.discussions(id) on delete cascade,
  author_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name text not null default '',
  body text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists discussion_comments_discussion_idx on public.discussion_comments(discussion_id, created_at);

create or replace function public.discussion_set_author() returns trigger
language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select name into nm from public.profiles where id = auth.uid();
  if nm is null then raise exception 'profile_missing'; end if;
  new.author_id := auth.uid();
  new.author_name := nm;
  return new;
end $$;
drop trigger if exists discussions_set_author on public.discussions;
create trigger discussions_set_author before insert on public.discussions for each row execute function public.discussion_set_author();
drop trigger if exists discussion_comments_set_author on public.discussion_comments;
create trigger discussion_comments_set_author before insert on public.discussion_comments for each row execute function public.discussion_set_author();

create or replace function public.discussion_update_comment_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.discussions set comment_count = comment_count + 1 where id = new.discussion_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.discussions set comment_count = greatest(0, comment_count - 1) where id = old.discussion_id;
    return old;
  end if;
  return null;
end $$;
drop trigger if exists discussion_comments_count_insert on public.discussion_comments;
create trigger discussion_comments_count_insert after insert on public.discussion_comments for each row execute function public.discussion_update_comment_count();
drop trigger if exists discussion_comments_count_delete on public.discussion_comments;
create trigger discussion_comments_count_delete after delete on public.discussion_comments for each row execute function public.discussion_update_comment_count();

alter table public.discussions enable row level security;
alter table public.discussion_comments enable row level security;
drop policy if exists discussions_read_all on public.discussions;
create policy discussions_read_all on public.discussions for select to anon, authenticated using (true);
drop policy if exists discussions_create_authors on public.discussions;
create policy discussions_create_authors on public.discussions for insert to authenticated with check (author_id = auth.uid());
drop policy if exists discussions_delete_own on public.discussions;
create policy discussions_delete_own on public.discussions for delete to authenticated using (author_id = auth.uid());
drop policy if exists discussion_comments_read_all on public.discussion_comments;
create policy discussion_comments_read_all on public.discussion_comments for select to anon, authenticated using (true);
drop policy if exists discussion_comments_create_authors on public.discussion_comments;
create policy discussion_comments_create_authors on public.discussion_comments for insert to authenticated with check (author_id = auth.uid());
drop policy if exists discussion_comments_delete_own on public.discussion_comments;
create policy discussion_comments_delete_own on public.discussion_comments for delete to authenticated using (author_id = auth.uid());
grant select on public.discussions, public.discussion_comments to anon, authenticated;
grant insert (title, body, category) on public.discussions to authenticated;
grant delete on public.discussions to authenticated;
grant insert (discussion_id, body) on public.discussion_comments to authenticated;
grant delete on public.discussion_comments to authenticated;
