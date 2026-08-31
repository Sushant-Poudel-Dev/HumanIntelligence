'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import AudioTranscriber from '@/components/AudioTranscriber';
import type { Trend } from '@/types/db';

interface RecordingData {
  id: string;
  file_url: string;
  file_name: string | null;
  created_at: string;
  transcript: string | null;
}

interface Analysis {
  summary: string;
  trend: Trend;
  themes: string[];
}

export default function AnalyzeRecordingPage() {
  const params = useParams();
  const router = useRouter();
  const recordingId = params.recordingId as string;

  const [recording, setRecording] = useState<RecordingData | null>(null);
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

      const { data: rec } = await supabase
        .from('recordings')
        .select('id, file_url, file_name, created_at, transcript')
        .eq('id', recordingId)
        .single();

      if (!rec) {
        setError('Recording not found');
        setLoading(false);
        return;
      }

      setRecording(rec);
      setTranscript(rec.transcript);
      setLoading(false);
    }

    fetchData();
  }, [recordingId, router]);

  const handleTranscribeComplete = (newTranscript: string) => {
    setTranscript(newTranscript);
    setRecording(prev => prev ? { ...prev, transcript: newTranscript } : prev);
  };

  const handleAnalyze = async () => {
    if (!transcript) return;

    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Analysis failed');
      }

      setAnalysis(data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analysis failed');
    } finally {
      setAnalyzing(false);
    }
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
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Recording Analysis</h1>
        <p className="mt-1 text-sm text-gray-500">Transcribe and analyze your uploaded audio file.</p>
      </div>

      {error && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-5 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {recording && (
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">{recording.file_name || 'Uploaded recording'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Uploaded {new Date(recording.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
          <div className="p-5">
            <audio controls className="w-full" src={recording.file_url}>
              Your browser does not support the audio element.
            </audio>
          </div>
        </div>
      )}

      {!transcript && recording && (
        <AudioTranscriber
          recordingId={recordingId}
          fileUrl={recording.file_url}
          onComplete={handleTranscribeComplete}
        />
      )}

      {transcript && (
        <div className="bg-white rounded-xl border border-gray-200 mb-6">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Transcript</h3>
                <p className="text-xs text-gray-400">{transcript.split(/\s+/).length} words</p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="max-h-60 overflow-y-auto">
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{transcript}</p>
            </div>
          </div>
        </div>
      )}

      {transcript && !analysis && (
        <button
          onClick={handleAnalyze}
          disabled={analyzing}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
      )}

      {analysis && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Trend</h3>
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ring-inset ${
                analysis.trend === 'improving' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' :
                analysis.trend === 'declining' ? 'bg-red-50 text-red-700 ring-red-600/20' :
                'bg-gray-50 text-gray-700 ring-gray-500/20'
              }`}>
                {analysis.trend === 'improving' ? '\u2191' : analysis.trend === 'declining' ? '\u2193' : '\u2192'} {analysis.trend}
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
                  <span key={theme} className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-50 text-gray-700 ring-1 ring-inset ring-gray-200">
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 bg-white text-gray-700 text-sm font-medium border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
