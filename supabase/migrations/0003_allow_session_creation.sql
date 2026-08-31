-- ============================================================
-- Allow authenticated users to create sessions and join them
-- supabase/migrations/0003_allow_session_creation.sql
-- ============================================================

-- Allow authenticated users to create sessions (start new sessions)
create policy "authenticated users can create sessions"
  on public.sessions for insert
  with check (auth.role() = 'authenticated');
