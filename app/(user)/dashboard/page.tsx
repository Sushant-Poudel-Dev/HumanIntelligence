import { getCurrentUser } from '@/lib/auth/helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { Session, SessionParticipant, Group } from '@/types/db';
import RecordingsTable from './RecordingsTable';

async function getUserJournalCount(userId: string): Promise<number> {
  const supabase = await createServiceRoleClient();
  const { count } = await supabase
    .from('journal_entries')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  return count || 0;
}

async function getUserSessions(userId: string): Promise<(Session & { group: Group | null })[]> {
  const supabase = await createServiceRoleClient();

  const { data: participants } = await supabase
    .from('session_participants')
    .select('*, sessions(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (!participants) return [];

  const sessions: (Session & { group: Group | null })[] = [];
  for (const p of participants as SessionParticipant[]) {
    const session = (p as unknown as { sessions: Session }).sessions;
    if (!session) continue;

    const { data: group } = await supabase
      .from('groups')
      .select('*')
      .eq('id', session.group_id)
      .single();

    sessions.push({ ...session, group });
  }

  return sessions;
}

async function getUserRecordings(userId: string) {
  const supabase = await createServiceRoleClient();

  const { data: sessionRecordings } = await supabase
    .from('session_participants')
    .select('id, audio_recording_url, transcript, created_at, session_id, sessions(group_id, started_at, ended_at)')
    .eq('user_id', userId)
    .not('audio_recording_url', 'is', null)
    .order('created_at', { ascending: false });

  const sessionRecs = (sessionRecordings || []).map((rec) => {
    const sessions = rec.sessions as { group_id: string; started_at: string; ended_at: string | null }[] | null;
    const session = sessions?.[0] ?? null;
    return {
      id: rec.id,
      session_id: rec.session_id,
      audio_recording_url: rec.audio_recording_url,
      transcript: rec.transcript,
      created_at: rec.created_at,
      topic: 'Session recording',
      started_at: session?.started_at,
      ended_at: session?.ended_at,
    };
  });

  const { data: manualRecordings } = await supabase
    .from('recordings')
    .select('id, file_url, file_name, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  const manualRecs = (manualRecordings || []).map((rec) => ({
    id: rec.id,
    session_id: null as string | null,
    audio_recording_url: rec.file_url,
    transcript: null as string | null,
    created_at: rec.created_at,
    topic: rec.file_name || 'Uploaded audio',
    started_at: undefined as string | undefined,
    ended_at: undefined as string | undefined,
  }));

  return [...sessionRecs, ...manualRecs].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto mt-16 p-6 bg-white rounded-xl border border-gray-200 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Not signed in</h1>
        <p className="text-sm text-gray-500 mb-6">Please sign in to access your dashboard.</p>
        <Link href="/login" className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors">
          Sign In
        </Link>
      </div>
    );
  }

  const [sessions, journalCount, recordings] = await Promise.all([
    getUserSessions(user.id),
    getUserJournalCount(user.id),
    getUserRecordings(user.id),
  ]);

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(s => s.ended_at).length;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
          Welcome back, {user.display_name}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Here&apos;s an overview of your recent activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalSessions}</p>
              <p className="text-xs text-gray-500">Total sessions</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{completedSessions}</p>
              <p className="text-xs text-gray-500">Completed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{journalCount}</p>
              <p className="text-xs text-gray-500">Journal entries</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 mb-8">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Recent sessions</h2>
          <Link href="/sessions" className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
            View all
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>
        {sessions.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm text-gray-500">No sessions yet</p>
            <Link href="/sessions" className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-500 transition-colors">
              Join your first session
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sessions.map((session) => (
              <div key={session.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${session.ended_at ? 'bg-gray-300' : 'bg-emerald-500'}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {session.group?.topic || 'Unknown group'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(session.started_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {session.ended_at && ` · ${Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)} min`}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${session.ended_at ? 'bg-gray-100 text-gray-600' : 'bg-emerald-50 text-emerald-700'}`}>
                  {session.ended_at ? 'Completed' : 'Active'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <RecordingsTable recordings={recordings} />
    </div>
  );
}
