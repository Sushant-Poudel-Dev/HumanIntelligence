import { getCurrentUser } from '@/lib/auth/helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';
import Link from 'next/link';
import type { AIAnalysis } from '@/types/db';

interface TranscriptEntry {
  id: string;
  transcript: string;
  created_at: string;
  source: string;
  topic: string;
  word_count: number;
}

async function getAnalyses(userId: string): Promise<AIAnalysis[]> {
  const supabase = await createServiceRoleClient();
  const { data } = await supabase
    .from('ai_analyses')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data as AIAnalysis[]) || [];
}

async function getTranscripts(userId: string): Promise<TranscriptEntry[]> {
  const supabase = await createServiceRoleClient();

  const { data: sessionTranscripts } = await supabase
    .from('session_participants')
    .select('id, transcript, created_at, session_id, sessions(group_id, groups(topic))')
    .eq('user_id', userId)
    .not('transcript', 'is', null);

  const { data: uploadTranscripts } = await supabase
    .from('recordings')
    .select('id, transcript, created_at, file_name')
    .eq('user_id', userId)
    .not('transcript', 'is', null);

  const { data: journalTranscripts } = await supabase
    .from('journal_entries')
    .select('id, content, created_at')
    .eq('user_id', userId)
    .eq('include_in_analysis', true);

  const sessionEntries: TranscriptEntry[] = (sessionTranscripts || []).map((t) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessions = (t as any).sessions;
    const session = Array.isArray(sessions) ? sessions[0] : sessions;
    const groups = session?.groups;
    const group = Array.isArray(groups) ? groups[0] : groups;
    const transcript = t.transcript || '';
    return {
      id: t.id,
      transcript,
      created_at: t.created_at,
      source: 'session',
      topic: group?.topic || 'Session',
      word_count: transcript.split(/\s+/).filter(Boolean).length,
    };
  });

  const uploadEntries: TranscriptEntry[] = (uploadTranscripts || []).map((t) => {
    const transcript = t.transcript || '';
    return {
      id: t.id,
      transcript,
      created_at: t.created_at,
      source: 'upload',
      topic: t.file_name || 'Uploaded audio',
      word_count: transcript.split(/\s+/).filter(Boolean).length,
    };
  });

  const journalEntries: TranscriptEntry[] = (journalTranscripts || []).map((t) => {
    const content = t.content || '';
    return {
      id: t.id,
      transcript: content,
      created_at: t.created_at,
      source: 'journal',
      topic: 'Journal entry',
      word_count: content.split(/\s+/).filter(Boolean).length,
    };
  });

  return [...sessionEntries, ...uploadEntries, ...journalEntries].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

function TrendBadge({ trend }: { trend: string }) {
  const styles: Record<string, { bg: string; text: string; label: string }> = {
    improving: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Improving' },
    stable: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Stable' },
    declining: { bg: 'bg-red-50', text: 'text-red-700', label: 'Declining' },
  };
  const s = styles[trend] || styles.stable;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      {trend === 'improving' && (
        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 19.5l15-15m0 0H8.25m11.25 0v11.25" />
        </svg>
      )}
      {trend === 'declining' && (
        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
        </svg>
      )}
      {s.label}
    </span>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default async function ProgressPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto mt-16 p-6 bg-white rounded-xl border border-gray-200 text-center">
        <h1 className="text-xl font-bold text-gray-900 mb-2">Not signed in</h1>
        <p className="text-sm text-gray-500 mb-6">Please sign in to view your progress.</p>
        <Link href="/login" className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors">
          Sign In
        </Link>
      </div>
    );
  }

  const [analyses, transcripts] = await Promise.all([
    getAnalyses(user.id),
    getTranscripts(user.id),
  ]);

  const totalWords = transcripts.reduce((sum, t) => sum + t.word_count, 0);
  const latestAnalysis = analyses[0] || null;

  // Aggregate themes across all analyses
  const themeCounts: Record<string, number> = {};
  analyses.forEach((a) => {
    const themes = a.summary.match(/theme[s]?:?\s*(.+)/i);
    if (themes) {
      themes[1].split(/[,;]/).forEach((t) => {
        const trimmed = t.trim().toLowerCase();
        if (trimmed) {
          themeCounts[trimmed] = (themeCounts[trimmed] || 0) + 1;
        }
      });
    }
  });

  const topThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  // Trend distribution
  const trendCounts = { improving: 0, stable: 0, declining: 0 };
  analyses.forEach((a) => {
    if (a.trend in trendCounts) trendCounts[a.trend as keyof typeof trendCounts]++;
  });

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Your Progress</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your wellbeing journey across sessions and recordings.
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 sm:grid-cols-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{transcripts.length}</p>
              <p className="text-xs text-gray-500">Transcripts</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.282 48.282 0 005.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalWords.toLocaleString()}</p>
              <p className="text-xs text-gray-500">Words analyzed</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{analyses.length}</p>
              <p className="text-xs text-gray-500">AI analyses</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{latestAnalysis?.trend || '—'}</p>
              <p className="text-xs text-gray-500">Current trend</p>
            </div>
          </div>
        </div>
      </div>

      {analyses.length === 0 && transcripts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">No data yet</h2>
          <p className="text-sm text-gray-500 max-w-md mx-auto mb-6">
            Join a session or upload an audio recording to start tracking your progress.
            Your transcripts will be analyzed for wellbeing trends.
          </p>
          <Link href="/sessions" className="inline-flex items-center gap-2 px-4 py-2.5 bg-black text-white text-sm font-semibold rounded-lg hover:bg-gray-800 transition-colors">
            Browse sessions
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left column: Analysis timeline */}
          <div className="lg:col-span-2 space-y-6">
            {/* Latest AI Analysis */}
            {latestAnalysis && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-gray-900">Latest Analysis</h2>
                  <TrendBadge trend={latestAnalysis.trend} />
                </div>
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <p className="text-sm text-gray-700 leading-relaxed">{latestAnalysis.summary}</p>
                </div>
                <p className="text-xs text-gray-400">{formatDate(latestAnalysis.created_at)}</p>
              </div>
            )}

            {/* Trend Timeline */}
            {analyses.length > 1 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Trend Timeline</h2>
                <div className="space-y-3">
                  {analyses.map((analysis, i) => (
                    <div key={analysis.id} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 rounded-full shrink-0 mt-1 ${
                          analysis.trend === 'improving' ? 'bg-emerald-400' :
                          analysis.trend === 'declining' ? 'bg-red-400' : 'bg-amber-400'
                        }`} />
                        {i < analyses.length - 1 && <div className="w-px h-full bg-gray-200 min-h-[2rem]" />}
                      </div>
                      <div className="flex-1 min-w-0 pb-4">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendBadge trend={analysis.trend} />
                          <span className="text-xs text-gray-400">{formatDate(analysis.created_at)}</span>
                        </div>
                        <p className="text-xs text-gray-600 line-clamp-2">{analysis.summary}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transcript History */}
            {transcripts.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Transcript History</h2>
                <div className="divide-y divide-gray-100">
                  {transcripts.map((t) => (
                    <div key={t.id} className="py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            t.source === 'session' ? 'bg-indigo-50 text-indigo-700' :
                            t.source === 'journal' ? 'bg-violet-50 text-violet-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {t.source === 'session' ? 'Session' : t.source === 'journal' ? 'Journal' : 'Upload'}
                          </span>
                          <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">{t.topic}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span>{t.word_count.toLocaleString()} words</span>
                          <span>{formatDate(t.created_at)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 line-clamp-2 mt-1">{t.transcript}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right column: Insights */}
          <div className="space-y-6">
            {/* Trend Distribution */}
            {analyses.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Trend Distribution</h2>
                <div className="space-y-3">
                  {(['improving', 'stable', 'declining'] as const).map((trend) => {
                    const count = trendCounts[trend];
                    const pct = analyses.length > 0 ? Math.round((count / analyses.length) * 100) : 0;
                    return (
                      <div key={trend}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="capitalize text-gray-600">{trend}</span>
                          <span className="text-gray-400">{count} ({pct}%)</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              trend === 'improving' ? 'bg-emerald-400' :
                              trend === 'declining' ? 'bg-red-400' : 'bg-amber-400'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Top Themes */}
            {topThemes.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-sm font-semibold text-gray-900 mb-4">Recurring Themes</h2>
                <div className="flex flex-wrap gap-2">
                  {topThemes.map(([theme, count]) => (
                    <span key={theme} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-600">
                      {theme}
                      {count > 1 && <span className="text-gray-400">({count})</span>}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4">Quick Actions</h2>
              <div className="space-y-2">
                <Link href="/sessions" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </div>
                  Join a session
                </Link>
                <Link href="/journal" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  Write in journal
                </Link>
                <Link href="/dashboard" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                  </div>
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <p className="mt-8 text-xs text-gray-400 text-center">
        AI analyses are for informational purposes only and do not constitute medical advice.
      </p>
    </div>
  );
}
