-- ============================================================
-- Allow authenticated users to create groups
-- supabase/migrations/0002_allow_group_creation.sql
-- ============================================================

-- Allow authenticated users to create groups
create policy "authenticated users can create groups"
  on public.groups for insert
  with check (auth.role() = 'authenticated');

-- Allow users to update groups they conceptually own
-- (no created_by column in MVP, so we allow all authenticated users to update)
create policy "authenticated users can update groups"
  on public.groups for update
  using (auth.role() = 'authenticated');

-- Allow users to delete groups (MVP: any authenticated user)
create policy "authenticated users can delete groups"
  on public.groups for delete
  using (auth.role() = 'authenticated');
