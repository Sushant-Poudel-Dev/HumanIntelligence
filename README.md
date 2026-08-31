# Sahara — Anonymous Peer Support Platform

An anonymous peer-support platform where users join video or text-based group sessions to talk through what they're dealing with. Sessions are recorded, transcribed post-session, and analyzed by AI using the user's history to track wellbeing trends and route to human professionals when needed.

---

## Core Loop

```
Join Session (peer group / group + counselor / 1:1 counselor)
  → Talk → Audio recorded
  → Post-session transcription (Groq Whisper)
  → AI analysis against user history
  → Progress tracked
  → Escalate to human professional if needed
```

---

## Tech Stack

| Layer        | Choice                                          |
| ------------ | ----------------------------------------------- |
| Frontend     | Next.js (App Router), TypeScript, Tailwind CSS  |
| Auth         | Supabase Auth (email/password + Google OAuth)   |
| Database     | Supabase Postgres with Row Level Security (RLS) |
| File Storage | Supabase Storage (audio recordings)             |
| Video/Audio  | LiveKit (real-time video, recording)            |
| STT          | Groq Whisper API (`whisper-large-v3-turbo`)     |
| AI Analysis  | LLM API (Claude/GPT-class)                      |
| Testing      | Playwright                                      |

---

## Features

- Separate login/signup flows for Users and Professionals
- Google sign-in with automatic profile creation
- Session overview, journal count, recordings table
- LiveKit video rooms with mic/cam/leave controls
- Start/end session endpoints, group listing
- Row-level security on every table, identity anonymization
- Per-participant audio capture and storage
- Post-session transcription (Groq Whisper)
- AI analysis with history-aware trend detection
- Journal (private, feeds AI context)
- Forums (periodic engagement prompts)
- Progress tracking with trend visualization
- Helpline connect (emergency escalation)
- Professional dashboard with client management

---

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase project (or local Supabase via `supabase` CLI)
- LiveKit server or LiveKit Cloud account

### Environment Variables

Create a `.env.local` file with the following:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# LiveKit
LIVEKIT_API_KEY=your_livekit_api_key
LIVEKIT_API_SECRET=your_livekit_api_secret
LIVEKIT_URL=your_livekit_url

# AI (Phase 3+)
GROQ_API_KEY=your_groq_api_key
LLM_API_KEY=your_llm_api_key
```

### Install and Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The app is available at `http://localhost:3000`.

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Production build check
npm run start        # Start production server
npm run lint         # Run ESLint
npm run typecheck    # Run TypeScript type checking (tsc --noEmit)
npm run test         # Run Playwright tests
```

---

## Project Structure

```
app/
  (auth)/              # Auth pages (login, signup, professional flows)
  (user)/              # User-facing pages (dashboard, sessions, journal, etc.)
  (professional)/      # Professional/counselor pages
  api/                 # API routes (sessions, transcription, analysis, etc.)
  auth/                # OAuth callback, logout routes
  page.tsx             # Root landing page
lib/
  supabase/            # Supabase client (server + browser)
  auth/                # Auth helpers (getCurrentUser, requireUser, etc.)
  livekit/             # LiveKit integration (token generation, room management)
  ai/                  # AI modules (STT, analysis, embeddings)
components/            # Reusable UI components
types/                 # TypeScript types (db.ts, session.ts)
supabase/
  migrations/          # Database migrations (0001_init.sql → 0013...)
  config.toml          # Supabase local dev configuration
tests/                 # Playwright tests
```

---

## Database Schema

The database uses Supabase Postgres with Row Level Security (RLS) enforced on every table. Key tables:

| Table                               | Purpose                                                       |
| ----------------------------------- | ------------------------------------------------------------- |
| `users`                             | Anonymous user profiles (linked to auth via `auth_id`)        |
| `professionals`                     | Verified counselor accounts                                   |
| `groups`                            | Topic-based support groups (peer, peer+counselor, 1:1)        |
| `sessions`                          | Session instances (linked to group and optional professional) |
| `session_participants`              | User participation records with audio URLs                    |
| `transcripts`                       | Post-session transcription text                               |
| `ai_analyses`                       | AI-generated wellbeing trend analysis                         |
| `progress_notes`                    | AI or professional-authored progress notes                    |
| `journal_entries`                   | Private user journal entries                                  |
| `forum_prompts` / `forum_responses` | Community engagement prompts                                  |
| `helpline_requests`                 | Emergency escalation requests                                 |

---

## Security

- **RLS on every table** — no exceptions. User identity is hidden from other users by default.
- **Service role key** — only used in server-side files, never exposed to client bundles.
- **Auth boundaries** — Server Components by default; `"use client"` only where interactivity is required.
- **No raw Supabase instantiation** — all queries go through `lib/supabase/`.
- **Transcript/journal content** — never logged to server logs.

---

## Database Migrations

All schema changes go through Supabase CLI migrations:

```bash
# Apply migrations
supabase db push

# Or run locally
supabase start
supabase db push
```

Every new table includes its RLS policy in the same migration that creates it.

---

## Testing

Playwright tests live in `tests/` and cover:

- Auth flows (login, signup, OAuth)
- RLS boundary behavior (user A cannot fetch user B's data)
- Session state transitions

```bash
npm run test
```

---

## Contributing

- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`
- One logical change per commit
- Run `npm run lint` + `npm run typecheck` before committing
- RLS policy required for every new table

---

## License

MIT
