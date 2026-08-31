'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AudioTranscriberProps {
  recordingId: string;
  fileUrl: string;
  onComplete: (transcript: string) => void;
}

export default function AudioTranscriber({ recordingId, onComplete }: AudioTranscriberProps) {
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTranscribe = useCallback(async () => {
    setTranscribing(true);
    setError(null);

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Not signed in');
        setTranscribing(false);
        return;
      }

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ recordingId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transcription failed');
      }

      onComplete(data.transcript);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed');
    } finally {
      setTranscribing(false);
    }
  }, [recordingId, onComplete]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
          <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Transcribe Audio</h3>
          <p className="text-xs text-gray-500">Uses Whisper AI to transcribe your uploaded audio file</p>
        </div>
      </div>

      {!transcribing && !error && (
        <button
          onClick={handleTranscribe}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
          </svg>
          Start Transcription
        </button>
      )}

      {transcribing && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-3 h-3 bg-indigo-500 rounded-full animate-pulse" />
              <div className="absolute inset-0 w-3 h-3 bg-indigo-400 rounded-full animate-ping" />
            </div>
            <span className="text-sm text-gray-700 font-medium">Transcribing audio with Whisper AI...</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-black h-2 rounded-full animate-pulse" style={{ width: '100%' }} />
          </div>
          <p className="text-xs text-gray-500">
            This may take a moment depending on the length of your audio.
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-200">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-xs text-red-600 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
