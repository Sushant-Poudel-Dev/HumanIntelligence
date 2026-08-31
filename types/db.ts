export type SessionType = 'peer' | 'peer_counselor' | 'one_on_one';

export type Trend = 'improving' | 'stable' | 'declining';

export type ProgressNoteAuthor = 'ai' | 'professional';

export type HelplineStatus = 'pending' | 'contacted' | 'resolved';

export interface User {
  id: string;
  auth_id: string;
  display_name: string;
  created_at: string;
}

export interface Professional {
  id: string;
  auth_id: string;
  name: string;
  credentials: string | null;
  verified: boolean;
  created_at: string;
}

export interface Group {
  id: string;
  topic: string;
  description: string | null;
  session_type: SessionType;
  created_at: string;
}

export interface Session {
  id: string;
  group_id: string;
  professional_id: string | null;
  started_at: string;
  ended_at: string | null;
}

// SessionInsert - professional_id and ended_at are nullable and can be omitted on insert
export interface SessionInsert {
  group_id: string;
  professional_id?: string | null;
  ended_at?: string | null;
}

export interface SessionParticipant {
  id: string;
  session_id: string;
  user_id: string;
  audio_recording_url: string | null;
  transcript: string | null;
  created_at: string;
}

// SessionParticipantInsert - audio_recording_url and transcript are nullable and can be omitted on insert
export interface SessionParticipantInsert {
  session_id: string;
  user_id: string;
  audio_recording_url?: string | null;
  transcript?: string | null;
}

export interface Transcript {
  id: string;
  session_participant_id: string;
  text: string;
  created_at: string;
}

export interface AIAnalysis {
  id: string;
  user_id: string;
  session_id: string | null;
  summary: string;
  trend: Trend;
  created_at: string;
}

export interface ProgressNote {
  id: string;
  user_id: string;
  author: ProgressNoteAuthor;
  professional_id: string | null;
  note: string;
  created_at: string;
}

export interface JournalEntry {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface ForumPrompt {
  id: string;
  prompt: string;
  active: boolean;
  created_at: string;
}

export interface ForumResponse {
  id: string;
  user_id: string;
  prompt_id: string;
  response: string;
  created_at: string;
}

export interface HelplineRequest {
  id: string;
  user_id: string;
  status: HelplineStatus;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: { Row: User; Insert: Omit<User, 'id' | 'created_at'>; Update: Partial<Omit<User, 'id' | 'created_at'>> };
      professionals: { Row: Professional; Insert: Omit<Professional, 'id' | 'created_at'>; Update: Partial<Omit<Professional, 'id' | 'created_at'>> };
      groups: { Row: Group; Insert: Omit<Group, 'id' | 'created_at'>; Update: Partial<Omit<Group, 'id' | 'created_at'>> };
      sessions: { Row: Session; Insert: SessionInsert; Update: Partial<Omit<Session, 'id' | 'started_at'>> };
      session_participants: { Row: SessionParticipant; Insert: SessionParticipantInsert; Update: Partial<Omit<SessionParticipant, 'id' | 'created_at'>> };
      transcripts: { Row: Transcript; Insert: Omit<Transcript, 'id' | 'created_at'>; Update: Partial<Omit<Transcript, 'id' | 'created_at'>> };
      ai_analyses: { Row: AIAnalysis; Insert: Omit<AIAnalysis, 'id' | 'created_at'>; Update: Partial<Omit<AIAnalysis, 'id' | 'created_at'>> };
      progress_notes: { Row: ProgressNote; Insert: Omit<ProgressNote, 'id' | 'created_at'>; Update: Partial<Omit<ProgressNote, 'id' | 'created_at'>> };
      journal_entries: { Row: JournalEntry; Insert: Omit<JournalEntry, 'id' | 'created_at'>; Update: Partial<Omit<JournalEntry, 'id' | 'created_at'>> };
      forum_prompts: { Row: ForumPrompt; Insert: Omit<ForumPrompt, 'id' | 'created_at'>; Update: Partial<Omit<ForumPrompt, 'id' | 'created_at'>> };
      forum_responses: { Row: ForumResponse; Insert: Omit<ForumResponse, 'id' | 'created_at'>; Update: Partial<Omit<ForumResponse, 'id' | 'created_at'>> };
      helpline_requests: { Row: HelplineRequest; Insert: Omit<HelplineRequest, 'id' | 'created_at'>; Update: Partial<Omit<HelplineRequest, 'id' | 'created_at'>> };
    };
    Views: Record<string, never>;
    Functions: {
      current_app_user_id: { Args: Record<string, never>; Returns: string };
      current_professional_id: { Args: Record<string, never>; Returns: string };
      is_verified_professional: { Args: Record<string, never>; Returns: boolean };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}