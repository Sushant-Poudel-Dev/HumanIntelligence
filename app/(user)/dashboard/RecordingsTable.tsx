'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Recording {
  id: string;
  session_id: string | null;
  audio_recording_url: string;
  transcript: string | null;
  created_at: string;
  topic: string;
  started_at: string | undefined;
  ended_at: string | null | undefined;
  is_manual?: boolean;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins} min`;
}

function formatSessionDuration(started: string, ended: string): string {
  const seconds = (new Date(ended).getTime() - new Date(started).getTime()) / 1000;
  return formatDuration(seconds);
}

export default function RecordingsTable({ recordings }: { recordings: Recording[] }) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});

  const loadDuration = useCallback((id: string, url: string) => {
    if (durations[id] !== undefined) return;
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      setDurations(prev => ({ ...prev, [id]: audio.duration }));
    };
    audio.src = url;
  }, [durations]);

  const getDuration = (rec: Recording) => {
    if (rec.started_at && rec.ended_at) {
      return formatSessionDuration(rec.started_at, rec.ended_at);
    }
    const seconds = durations[rec.id];
    if (seconds !== undefined) return formatDuration(seconds);
    return '...';
  };

  useEffect(() => {
    recordings.forEach(rec => {
      if (!rec.started_at || !rec.ended_at) {
        loadDuration(rec.id, rec.audio_recording_url);
      }
    });
  }, [recordings, loadDuration]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError(null);

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUploadError('Not signed in');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('id')
        .eq('auth_id', user.id)
        .single();

      if (!profile) {
        setUploadError('User profile not found');
        return;
      }

      const fileName = `${user.id}/upload-${Date.now()}-${file.name}`;
      const { error: storageError } = await supabase.storage
        .from('audio-recordings')
        .upload(fileName, file, {
          contentType: file.type || 'audio/webm',
          upsert: false,
        });

      if (storageError) {
        setUploadError('Upload failed: ' + storageError.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('audio-recordings')
        .getPublicUrl(fileName);

      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) {
        setUploadError('Failed to get upload URL');
        return;
      }

      const { error: dbError } = await supabase
        .from('recordings')
        .insert({
          user_id: profile.id,
          file_url: publicUrl,
          file_name: file.name,
        });

      if (dbError) {
        setUploadError('Failed to save record: ' + dbError.message);
        return;
      }

      window.location.reload();
    } catch {
      setUploadError('Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Session Recordings</h2>
            <p className="text-xs text-gray-500">{recordings.length} recording{recordings.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleUpload}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {uploading ? (
              <>
                <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Uploading...
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Upload audio
              </>
            )}
          </button>
        </div>
      </div>

      {uploadError && (
        <div className="px-5 py-2 bg-red-50 border-b border-red-100">
          <p className="text-xs text-red-600">{uploadError}</p>
        </div>
      )}

      {recordings.length === 0 ? (
        <div className="p-8 text-center">
          <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">No recordings yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload an audio file or join a session to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Session</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Date</th>
              <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Duration</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Audio</th>
              <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-5 py-3">Analysis</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {recordings.map((rec) => (
              <tr key={rec.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-5 py-3.5">
                  <span className="text-sm font-medium text-gray-900">{rec.topic}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm text-gray-500">{formatDate(rec.created_at)}</span>
                </td>
                <td className="px-5 py-3.5">
                  <span className="text-sm text-gray-500">{getDuration(rec)}</span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <audio
                    id={`audio-${rec.id}`}
                    src={rec.audio_recording_url}
                    onPlay={() => setPlayingId(rec.id)}
                    onPause={() => setPlayingId(null)}
                    onEnded={() => setPlayingId(null)}
                    preload="none"
                    className="hidden"
                  />
                  <button
                    onClick={() => {
                      const audio = document.getElementById(`audio-${rec.id}`) as HTMLAudioElement;
                      if (playingId === rec.id) {
                        audio?.pause();
                      } else {
                        audio?.play();
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                      playingId === rec.id
                        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 ring-1 ring-inset ring-gray-200'
                    }`}
                  >
                    {playingId === rec.id ? (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25v13.5m-7.5-13.5v13.5" />
                        </svg>
                        Pause
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                        </svg>
                        Play
                      </>
                    )}
                  </button>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <Link
                    href={rec.session_id ? `/sessions/${rec.session_id}/analyze` : `/analyze/${rec.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20 hover:bg-indigo-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                    </svg>
                    Analyze
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
