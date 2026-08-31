'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Trend } from '@/types/db';

interface Analysis {
  summary: string;
  trend: Trend;
  themes: string[];
}

export default function AnalyzePage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [transcript, setTranscript] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: participant } = await supabase
        .from('session_participants')
        .select('transcript')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (participant?.transcript) {
        setTranscript(participant.transcript);
      }

      const { data: existingAnalysis } = await supabase
        .from('ai_analyses')
        .select('summary, trend')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (existingAnalysis) {
        setAnalysis({
          summary: existingAnalysis.summary,
          trend: existingAnalysis.trend as Trend,
          themes: [],
        });
      }

      setLoading(false);
    }

    fetchData();
  }, [sessionId, router]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setError(null);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const trendConfig: Record<Trend, { label: string; color: string; bg: string; icon: string }> = {
    improving: {
      label: 'Improving',
      color: 'text-emerald-700',
      bg: 'bg-emerald-50 ring-emerald-600/20',
      icon: '↑',
    },
    stable: {
      label: 'Stable',
      color: 'text-gray-700',
      bg: 'bg-gray-50 ring-gray-500/20',
      icon: '→',
    },
    declining: {
      label: 'Declining',
      color: 'text-red-700',
      bg: 'bg-red-50 ring-red-600/20',
      icon: '↓',
    },
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-64 bg-gray-200 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Session Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">AI-powered insights from your session transcript.</p>
      </div>

      {transcript && (
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">Transcript</h2>
            <span className="text-xs text-gray-400">{transcript.split(/\s+/).length} words</span>
          </div>
          <div className="p-5 max-h-96 overflow-y-auto">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{transcript}</p>
          </div>
        </div>
      )}

      {!transcript && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No transcript available yet.</p>
          <p className="text-xs text-gray-400 mt-1">Transcripts are generated during sessions using browser speech recognition.</p>
        </div>
      )}

      {!analysis && transcript && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </div>
          <p className="text-sm text-gray-700 font-medium mb-1">Ready to analyze</p>
          <p className="text-xs text-gray-400 mb-4">AI will analyze your transcript for emotional trends and key themes.</p>
          {error && (
            <p className="text-sm text-red-600 mb-4">{error}</p>
          )}
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {analyzing ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Analyze with AI
              </>
            )}
          </button>
        </div>
      )}

      {analysis && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Trend</h3>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${trendConfig[analysis.trend].bg} ${trendConfig[analysis.trend].color}`}>
                {trendConfig[analysis.trend].icon} {trendConfig[analysis.trend].label}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Summary</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{analysis.summary}</p>
          </div>

          {analysis.themes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Key Themes</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.themes.map((theme) => (
                  <span
                    key={theme}
                    className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-200"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Disclaimer</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              This analysis is generated by AI and is not a clinical diagnosis. It is intended for
              self-reflection purposes only. If you are experiencing a mental health crisis, please
              contact a crisis helpline or seek professional help.
            </p>
          </div>
        </div>
      )}

      <div className="mt-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
