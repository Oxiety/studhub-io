-- StudHub V1.8.9: avatar storage and server-side text limits.
-- Run once in Supabase -> SQL Editor. Safe to re-run.

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists subtitle text not null default '';
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists city text not null default '';
alter table public.profiles add column if not exists campus text not null default '';
alter table public.profiles add column if not exists interests text not null default '';

-- Public profile projection contains no email/private auth data.
create or replace view public.public_profiles as
select id, name, username, subtitle, bio, city, campus, interests, created_at, avatar_url
from public.profiles;
alter view public.public_profiles set (security_invoker = true);
grant select on public.public_profiles to anon, authenticated;

-- Required by security_invoker: public profile fields are readable under caller RLS.
drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read on public.profiles for select to anon, authenticated using (true);
revoke select on public.profiles from anon, authenticated;
grant select (id, name, username, subtitle, bio, city, campus, interests, created_at, avatar_url)
  on public.profiles to anon, authenticated;
grant update (name, username, avatar_url, subtitle, bio, city, campus, interests) on public.profiles to authenticated;

-- Public read; each signed-in user may upload/update only their own avatar folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update set public = true, file_size_limit = 2097152,
  allowed_mime_types = array['image/png','image/jpeg','image/webp','image/gif'];

drop policy if exists avatars_public_read on storage.objects;
create policy avatars_public_read on storage.objects for select
using (bucket_id = 'avatars');
drop policy if exists avatars_insert_own on storage.objects;
create policy avatars_insert_own on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_update_own on storage.objects;
create policy avatars_update_own on storage.objects for update to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_delete_own on storage.objects;
create policy avatars_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- Constraints are enforced by PostgreSQL even when requests bypass the UI.
do $$
begin
  alter table public.profiles drop constraint if exists profiles_subtitle_len;
  alter table public.profiles add constraint profiles_subtitle_len check (char_length(subtitle) <= 120) not valid;
  alter table public.profiles drop constraint if exists profiles_bio_len;
  alter table public.profiles add constraint profiles_bio_len check (char_length(bio) <= 1000) not valid;
  alter table public.profiles drop constraint if exists profiles_city_len;
  alter table public.profiles add constraint profiles_city_len check (char_length(city) <= 100) not valid;
  alter table public.profiles drop constraint if exists profiles_campus_len;
  alter table public.profiles add constraint profiles_campus_len check (char_length(campus) <= 80) not valid;
  alter table public.profiles drop constraint if exists profiles_interests_len;
  alter table public.profiles add constraint profiles_interests_len check (char_length(interests) <= 500) not valid;

  alter table public.projects drop constraint if exists projects_owner_name_len;
  alter table public.projects add constraint projects_owner_name_len check (char_length(owner_name) <= 40) not valid;
  alter table public.projects drop constraint if exists projects_category_len;
  alter table public.projects add constraint projects_category_len check (char_length(category) <= 60) not valid;

  alter table public.donations drop constraint if exists donations_reward_len;
  alter table public.donations add constraint donations_reward_len check (char_length(coalesce(reward,'')) <= 140) not valid;
  alter table public.donations drop constraint if exists donations_donor_name_len;
  alter table public.donations add constraint donations_donor_name_len check (char_length(coalesce(donor_name,'')) <= 40) not valid;
  alter table public.transactions drop constraint if exists transactions_title_len;
  alter table public.transactions add constraint transactions_title_len check (char_length(coalesce(title,'')) <= 160) not valid;
  alter table public.notifications drop constraint if exists notifications_text_len;
  alter table public.notifications add constraint notifications_text_len check (char_length(text) <= 500) not valid;

  alter table public.discussion_comments drop constraint if exists discussion_comments_author_name_len;
  alter table public.discussion_comments add constraint discussion_comments_author_name_len check (char_length(author_name) <= 40) not valid;
  alter table public.discussions drop constraint if exists discussions_author_name_len;
  alter table public.discussions add constraint discussions_author_name_len check (char_length(author_name) <= 40) not valid;

  if to_regclass('public.content_comments') is not null then
    alter table public.content_comments drop constraint if exists content_comments_author_name_len;
    alter table public.content_comments add constraint content_comments_author_name_len check (char_length(author_name) <= 40) not valid;
  end if;
  if to_regclass('public.messages') is not null then
    alter table public.messages drop constraint if exists messages_body_len;
    alter table public.messages add constraint messages_body_len check (char_length(body) between 1 and 1000) not valid;
  end if;
end $$;

-- Existing profile and post limits (also reasserted for databases created from older scripts).
do $$
begin
  if to_regclass('public.user_posts') is not null then
    alter table public.user_posts drop constraint if exists user_posts_title_len;
    alter table public.user_posts add constraint user_posts_title_len check (char_length(title) between 1 and 160) not valid;
    alter table public.user_posts drop constraint if exists user_posts_body_len;
    alter table public.user_posts add constraint user_posts_body_len check (char_length(body) <= 10000) not valid;
    alter table public.user_posts drop constraint if exists user_posts_tag_len;
    alter table public.user_posts add constraint user_posts_tag_len check (char_length(tag) <= 40) not valid;
  end if;
end $$;
