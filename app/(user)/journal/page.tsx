'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { JournalEntry } from '@/types/db';

interface DayGroup {
  date: string;
  label: string;
  entries: JournalEntry[];
}

function groupByDay(entries: JournalEntry[]): DayGroup[] {
  const groups: Record<string, JournalEntry[]> = {};
  for (const entry of entries) {
    const d = new Date(entry.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  }

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  return Object.entries(groups)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, dayEntries]) => {
      let label: string;
      if (date === todayKey) {
        label = 'Today';
      } else if (date === yesterdayKey) {
        label = 'Yesterday';
      } else {
        label = new Date(date + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        });
      }
      return { date, label, entries: dayEntries.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) };
    });
}

function AnalysisToggle({ entry, onToggle }: { entry: JournalEntry; onToggle: (id: string, value: boolean) => void }) {
  const [loading, setLoading] = useState(false);

  const handleToggle = async () => {
    setLoading(true);
    try {
      await fetch('/api/journal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entryId: entry.id, includeInAnalysis: !entry.include_in_analysis }),
      });
      onToggle(entry.id, !entry.include_in_analysis);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
        entry.include_in_analysis
          ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20'
          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
      }`}
      title={entry.include_in_analysis ? 'Included in AI analysis' : 'Click to include in AI analysis'}
    >
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
      </svg>
      {entry.include_in_analysis ? 'Analyzing' : 'Analyze'}
    </button>
  );
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [newEntry, setNewEntry] = useState('');
  const [includeInAnalysis, setIncludeInAnalysis] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!profile || cancelled) return;

      const { data } = await supabase
        .from('journal_entries')
        .select('*')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: false });

      if (!cancelled) {
        setEntries((data as JournalEntry[]) || []);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const handleSave = async () => {
    if (!newEntry.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newEntry, includeInAnalysis }),
      });
      if (res.ok) {
        const { entry } = await res.json();
        setEntries(prev => [entry, ...prev]);
        setNewEntry('');
        setIncludeInAnalysis(false);
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/journal?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        setEntries(prev => prev.filter(e => e.id !== id));
      }
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = (id: string, value: boolean) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, include_in_analysis: value } : e));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  const groups = groupByDay(entries);
  const analyzingCount = entries.filter(e => e.include_in_analysis).length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Journal</h1>
            <p className="mt-1 text-sm text-gray-500">
              Private space for your thoughts and reflections.
            </p>
          </div>
          {analyzingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-50 text-xs font-medium text-indigo-700">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {analyzingCount} entr{analyzingCount === 1 ? 'y' : 'ies'} in analysis
            </span>
          )}
        </div>
      </div>

      {/* New entry */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-8">
        <textarea
          value={newEntry}
          onChange={(e) => setNewEntry(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="What's on your mind?"
          rows={4}
          className="w-full text-sm text-gray-900 placeholder-gray-400 border-0 resize-none focus:outline-none focus:ring-0"
        />
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIncludeInAnalysis(!includeInAnalysis)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                includeInAnalysis
                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
              </svg>
              {includeInAnalysis ? 'Analyzing' : 'Analyze'}
            </button>
            <p className="text-xs text-gray-400">
              {newEntry.trim() ? `${newEntry.trim().split(/\s+/).length} words` : 'Ctrl+Enter to save'}
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={!newEntry.trim() || saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
                Save
              </>
            )}
          </button>
        </div>
      </div>

      {/* Entries by day */}
      {loading ? (
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse">
              <div className="h-4 w-32 bg-gray-200 rounded mb-3" />
              <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                <div className="h-3 bg-gray-100 rounded w-full" />
                <div className="h-3 bg-gray-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : groups.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-violet-50 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Start writing</h2>
          <p className="text-sm text-gray-500 max-w-sm mx-auto">
            Your journal entries are private and only visible to you.
            Toggle &quot;Analyze&quot; to include entries in your AI wellbeing analysis.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.date}>
              <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-indigo-400" />
                {group.label}
                <span className="text-xs font-normal text-gray-400">
                  {group.entries.length} entry{group.entries.length !== 1 ? 's' : ''}
                </span>
              </h2>
              <div className="space-y-3">
                {group.entries.map((entry) => (
                  <div key={entry.id} className="bg-white rounded-xl border border-gray-200 p-5 group hover:border-gray-300 transition-colors">
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {entry.content}
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-3">
                        <AnalysisToggle entry={entry} onToggle={handleToggle} />
                        <span className="text-xs text-gray-400">
                          {new Date(entry.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        disabled={deletingId === entry.id}
                        className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete entry"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
