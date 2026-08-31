-- ============================================================
-- Fix circular RLS recursion between sessions ↔ session_participants
-- 0004_fix_session_rls_recursion.sql
-- ============================================================

-- Helper: check if current user is a professional assigned to a given session
-- SECURITY DEFINER → runs as owner, bypasses RLS on sessions → breaks the cycle
create or replace function public.is_professional_for_session(sess_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.sessions s
    where s.id = sess_id
      and s.professional_id = (select p.id from public.professionals p where p.auth_id = auth.uid())
  )
$$;

-- Helper: check if current user is a participant of a given session
create or replace function public.is_participant_in_session(sess_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.session_participants sp
    where sp.session_id = sess_id
      and sp.user_id = (select u.id from public.users u where u.auth_id = auth.uid())
  )
$$;

-- ============================================================
-- Drop recursive policies
-- ============================================================

drop policy if exists "participants can view their sessions" on public.sessions;
drop policy if exists "professionals can view participants in their sessions" on public.session_participants;

-- ============================================================
-- sessions — rewritten policies (no circular refs)
-- ============================================================

create policy "participants can view their sessions"
  on public.sessions for select
  using (
    public.is_participant_in_session(id)
    or public.is_professional_for_session(id)
  );

-- insert policy (from 0003, recreated here to be safe)
drop policy if exists "authenticated users can create sessions" on public.sessions;
create policy "authenticated users can create sessions"
  on public.sessions for insert
  with check (auth.role() = 'authenticated');

-- ============================================================
-- session_participants — rewritten policies (no circular refs)
-- ============================================================

-- Users view own rows (unchanged — doesn't reference sessions)
drop policy if exists "users can view own participation rows" on public.session_participants;
create policy "users can view own participation rows"
  on public.session_participants for select
  using (user_id = public.current_app_user_id());

-- Professionals view participants in their sessions (uses security definer func)
create policy "professionals can view participants in their sessions"
  on public.session_participants for select
  using (
    public.current_professional_id() is not null
    and public.is_professional_for_session(session_id)
  );
