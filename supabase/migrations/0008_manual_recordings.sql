-- Manual audio recordings table for user uploads (not from sessions)
create table public.recordings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  file_url text not null,
  file_name text,
  created_at timestamptz default now() not null
);

alter table public.recordings enable row level security;

-- Users can read their own recordings
create policy "Users can view own recordings"
  on public.recordings for select
  using (auth.uid() = user_id);

-- Users can insert their own recordings
create policy "Users can insert own recordings"
  on public.recordings for insert
  with check (auth.uid() = user_id);

-- Users can delete their own recordings
create policy "Users can delete own recordings"
  on public.recordings for delete
  using (auth.uid() = user_id);
