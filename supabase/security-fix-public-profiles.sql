-- Fix Supabase Security Advisor: public_profiles must honor caller privileges and RLS.
-- PostgreSQL 15+ (Supabase supported). Safe to run repeatedly.

-- The view exposes only explicitly public profile fields.
alter view public.public_profiles set (security_invoker = true);

-- With security_invoker=true, the caller's RLS policy applies to profiles.
drop policy if exists profiles_public_read on public.profiles;
create policy profiles_public_read
  on public.profiles
  for select
  to anon, authenticated
  using (true);

-- Avoid granting table-wide SELECT. Grant only columns exposed by public_profiles
-- and used by the application. This prevents accidental exposure of future columns.
revoke select on public.profiles from anon, authenticated;
grant select (
  id, name, username, subtitle, bio, city, campus, interests, created_at, avatar_url
) on public.profiles to anon, authenticated;

grant select on public.public_profiles to anon, authenticated;
