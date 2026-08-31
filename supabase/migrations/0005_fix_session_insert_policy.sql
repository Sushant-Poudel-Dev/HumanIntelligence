-- ============================================================
-- Fix RLS policies: auth.role() unreliable with anon key + cookie auth
-- 0005_fix_session_insert_policy.sql
-- ============================================================

-- Sessions INSERT
drop policy if exists "authenticated users can create sessions" on public.sessions;
create policy "authenticated users can create sessions"
  on public.sessions for insert
  with check (auth.uid() is not null);

-- Groups INSERT/UPDATE/DELETE (was using auth.role())
drop policy if exists "authenticated users can create groups" on public.groups;
create policy "authenticated users can create groups"
  on public.groups for insert
  with check (auth.uid() is not null);

drop policy if exists "authenticated users can update groups" on public.groups;
create policy "authenticated users can update groups"
  on public.groups for update
  using (auth.uid() is not null);

drop policy if exists "authenticated users can delete groups" on public.groups;
create policy "authenticated users can delete groups"
  on public.groups for delete
  using (auth.uid() is not null);

-- Groups SELECT
drop policy if exists "authenticated users can view groups" on public.groups;
create policy "authenticated users can view groups"
  on public.groups for select
  using (auth.uid() is not null);

-- Professionals SELECT (verified)
drop policy if exists "authenticated users can view verified professionals" on public.professionals;
create policy "authenticated users can view verified professionals"
  on public.professionals for select
  using (verified = true and auth.uid() is not null);

-- Forum prompts SELECT
drop policy if exists "authenticated users can view active prompts" on public.forum_prompts;
create policy "authenticated users can view active prompts"
  on public.forum_prompts for select
  using (active = true and auth.uid() is not null);
