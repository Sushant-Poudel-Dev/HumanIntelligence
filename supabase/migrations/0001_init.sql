-- ============================================================
-- Peer Support Platform — Initial Schema + RLS
-- supabase/migrations/0001_init.sql
-- ============================================================

-- Extensions
create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "vector";     -- pgvector, for future history embeddings

-- ============================================================
-- Tables
-- ============================================================

create table public.users (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.professionals (
  id uuid primary key default gen_random_uuid(),
  auth_id uuid not null unique references auth.users(id) on delete cascade,
  name text not null,
  credentials text,
  verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  description text,
  session_type text not null check (session_type in ('peer', 'peer_counselor', 'one_on_one')),
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete restrict,
  professional_id uuid references public.professionals(id) on delete set null,
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table public.session_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  audio_recording_url text,
  created_at timestamptz not null default now(),
  unique (session_id, user_id)
);

create table public.transcripts (
  id uuid primary key default gen_random_uuid(),
  session_participant_id uuid not null references public.session_participants(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

create table public.ai_analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  session_id uuid references public.sessions(id) on delete set null,
  summary text not null,
  trend text check (trend in ('improving', 'stable', 'declining')),
  created_at timestamptz not null default now()
);

create table public.progress_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  author text not null check (author in ('ai', 'professional')),
  professional_id uuid references public.professionals(id) on delete set null,
  note text not null,
  created_at timestamptz not null default now()
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now()
);

create table public.forum_prompts (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.forum_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  prompt_id uuid not null references public.forum_prompts(id) on delete cascade,
  response text not null,
  created_at timestamptz not null default now()
);

create table public.helpline_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'contacted', 'resolved')),
  created_at timestamptz not null default now()
);

-- Indexes on common lookup columns
create index on public.session_participants (user_id);
create index on public.session_participants (session_id);
create index on public.transcripts (session_participant_id);
create index on public.ai_analyses (user_id);
create index on public.progress_notes (user_id);
create index on public.journal_entries (user_id);
create index on public.forum_responses (user_id);
create index on public.helpline_requests (user_id);
create index on public.sessions (group_id);
create index on public.sessions (professional_id);

-- ============================================================
-- Helper functions (security definer — safe to use inside RLS)
-- ============================================================

create or replace function public.current_app_user_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.users where auth_id = auth.uid();
$$;

create or replace function public.current_professional_id()
returns uuid
language sql
security definer
stable
set search_path = public
as $$
  select id from public.professionals where auth_id = auth.uid();
$$;

create or replace function public.is_verified_professional()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select verified from public.professionals where auth_id = auth.uid()), false);
$$;

-- ============================================================
-- Enable RLS on every table
-- ============================================================

alter table public.users enable row level security;
alter table public.professionals enable row level security;
alter table public.groups enable row level security;
alter table public.sessions enable row level security;
alter table public.session_participants enable row level security;
alter table public.transcripts enable row level security;
alter table public.ai_analyses enable row level security;
alter table public.progress_notes enable row level security;
alter table public.journal_entries enable row level security;
alter table public.forum_prompts enable row level security;
alter table public.forum_responses enable row level security;
alter table public.helpline_requests enable row level security;

-- ============================================================
-- Policies: users
-- Identity is hidden from other users — a user can only ever
-- see/update their own row. No general SELECT policy exists,
-- so by default other users get zero rows back.
-- ============================================================

create policy "users can view own row"
  on public.users for select
  using (auth_id = auth.uid());

create policy "users can insert own row"
  on public.users for insert
  with check (auth_id = auth.uid());

create policy "users can update own row"
  on public.users for update
  using (auth_id = auth.uid());

-- ============================================================
-- Policies: professionals
-- ============================================================

create policy "professionals can view own row"
  on public.professionals for select
  using (auth_id = auth.uid());

create policy "professionals can insert own row"
  on public.professionals for insert
  with check (auth_id = auth.uid());

create policy "professionals can update own row"
  on public.professionals for update
  using (auth_id = auth.uid());

-- Any authenticated user can see verified professionals' public info
-- (needed for matching/booking flows). Adjust columns exposed via a
-- view if you don't want the full row visible.
create policy "authenticated users can view verified professionals"
  on public.professionals for select
  using (verified = true and auth.role() = 'authenticated');

-- ============================================================
-- Policies: groups (public catalog, read-only to end users)
-- ============================================================

create policy "authenticated users can view groups"
  on public.groups for select
  using (auth.role() = 'authenticated');

-- Writes to groups restricted to service role (admin tooling) —
-- no insert/update/delete policy for regular users or professionals.

-- ============================================================
-- Policies: sessions
-- Visible to participants and the assigned professional only.
-- ============================================================

create policy "participants can view their sessions"
  on public.sessions for select
  using (
    exists (
      select 1 from public.session_participants sp
      where sp.session_id = sessions.id
        and sp.user_id = public.current_app_user_id()
    )
    or professional_id = public.current_professional_id()
  );

create policy "professionals can update assigned sessions"
  on public.sessions for update
  using (professional_id = public.current_professional_id());

-- ============================================================
-- Policies: session_participants
-- ============================================================

create policy "users can view own participation rows"
  on public.session_participants for select
  using (user_id = public.current_app_user_id());

create policy "professionals can view participants in their sessions"
  on public.session_participants for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = session_participants.session_id
        and s.professional_id = public.current_professional_id()
    )
  );

create policy "users can insert own participation rows"
  on public.session_participants for insert
  with check (user_id = public.current_app_user_id());

-- ============================================================
-- Policies: transcripts
-- Sensitive — visible to the owning user and the session's
-- assigned professional only.
-- ============================================================

create policy "users can view own transcripts"
  on public.transcripts for select
  using (
    exists (
      select 1 from public.session_participants sp
      where sp.id = transcripts.session_participant_id
        and sp.user_id = public.current_app_user_id()
    )
  );

create policy "professionals can view transcripts for their sessions"
  on public.transcripts for select
  using (
    exists (
      select 1 from public.session_participants sp
      join public.sessions s on s.id = sp.session_id
      where sp.id = transcripts.session_participant_id
        and s.professional_id = public.current_professional_id()
    )
  );

-- Inserts happen via a server-side job (service role) after
-- transcription completes — no client-facing insert policy.

-- ============================================================
-- Policies: ai_analyses
-- Sensitive — same visibility shape as transcripts.
-- ============================================================

create policy "users can view own analyses"
  on public.ai_analyses for select
  using (user_id = public.current_app_user_id());

create policy "professionals can view analyses for their sessions"
  on public.ai_analyses for select
  using (
    exists (
      select 1 from public.sessions s
      where s.id = ai_analyses.session_id
        and s.professional_id = public.current_professional_id()
    )
  );

-- Inserts happen via a server-side job (service role) — no
-- client-facing insert policy.

-- ============================================================
-- Policies: progress_notes
-- ============================================================

create policy "users can view own progress notes"
  on public.progress_notes for select
  using (user_id = public.current_app_user_id());

create policy "professionals can view notes for their clients"
  on public.progress_notes for select
  using (
    exists (
      select 1 from public.sessions s
      join public.session_participants sp on sp.session_id = s.id
      where sp.user_id = progress_notes.user_id
        and s.professional_id = public.current_professional_id()
    )
  );

create policy "professionals can insert notes for their clients"
  on public.progress_notes for insert
  with check (
    author = 'professional'
    and professional_id = public.current_professional_id()
    and exists (
      select 1 from public.sessions s
      join public.session_participants sp on sp.session_id = s.id
      where sp.user_id = progress_notes.user_id
        and s.professional_id = public.current_professional_id()
    )
  );

-- AI-authored notes are inserted via service role, not this policy.

-- ============================================================
-- Policies: journal_entries
-- Private to the user — no professional access by default.
-- ============================================================

create policy "users can view own journal entries"
  on public.journal_entries for select
  using (user_id = public.current_app_user_id());

create policy "users can insert own journal entries"
  on public.journal_entries for insert
  with check (user_id = public.current_app_user_id());

create policy "users can update own journal entries"
  on public.journal_entries for update
  using (user_id = public.current_app_user_id());

create policy "users can delete own journal entries"
  on public.journal_entries for delete
  using (user_id = public.current_app_user_id());

-- ============================================================
-- Policies: forum_prompts / forum_responses
-- ============================================================

create policy "authenticated users can view active prompts"
  on public.forum_prompts for select
  using (active = true and auth.role() = 'authenticated');

create policy "users can view own forum responses"
  on public.forum_responses for select
  using (user_id = public.current_app_user_id());

create policy "users can insert own forum responses"
  on public.forum_responses for insert
  with check (user_id = public.current_app_user_id());

-- ============================================================
-- Policies: helpline_requests
-- ============================================================

create policy "users can view own helpline requests"
  on public.helpline_requests for select
  using (user_id = public.current_app_user_id());

create policy "users can insert own helpline requests"
  on public.helpline_requests for insert
  with check (user_id = public.current_app_user_id());

-- Status updates (pending -> contacted -> resolved) happen via
-- service role (helpline staff tooling), not directly by users.