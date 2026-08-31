'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  LiveKitRoom,
  useRoomContext,
  useParticipantTracks,
  useLocalParticipant,
  useRemoteParticipants,
  VideoTrack,
  TrackMutedIndicator,
} from '@livekit/components-react';
import { Track, ConnectionQuality, RoomEvent } from 'livekit-client';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { createClient } from '@/lib/supabase/client';

interface SessionRoomProps {
  token: string;
  url: string;
  roomName: string;
  sessionId: string;
  groupId: string;
  groupTopic: string;
  sessionType: string;
}

interface ParticipantTileProps {
  participant: {
    identity: string;
    name?: string;
  };
  isLocal: boolean;
  connectionQuality?: ConnectionQuality;
}

function ParticipantTile({ participant, isLocal, connectionQuality }: ParticipantTileProps) {
  const qualityColor = connectionQuality === ConnectionQuality.Excellent ? 'bg-emerald-500'
    : connectionQuality === ConnectionQuality.Good ? 'bg-yellow-500'
    : connectionQuality === ConnectionQuality.Poor ? 'bg-orange-500'
    : 'bg-gray-300';
  const tracks = useParticipantTracks(
    [Track.Source.Camera, Track.Source.Microphone],
    participant.identity
  );

  const videoTrack = tracks.find(t => t.source === Track.Source.Camera);
  const audioTrack = tracks.find(t => t.source === Track.Source.Microphone);

  return (
    <div className="relative flex flex-col bg-gray-100 rounded-xl overflow-hidden aspect-video max-h-[280px]">
      {videoTrack ? (
        <VideoTrack trackRef={videoTrack} className="flex-1 w-full h-full object-cover" />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-gray-200">
          <div className="w-14 h-14 rounded-full bg-gray-300 flex items-center justify-center">
            <svg className="w-7 h-7 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
          </div>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 p-2.5 flex items-center justify-between bg-gradient-to-t from-black/50 to-transparent">
        <span className="text-xs font-medium text-white truncate">
          {participant.name || participant.identity}
          {isLocal && <span className="ml-1 text-indigo-300">(You)</span>}
        </span>
        <div className="flex items-center gap-1.5">
          {audioTrack && (
            <TrackMutedIndicator
              trackRef={audioTrack}
              className="text-white/80"
            />
          )}
          <div className={`w-1.5 h-1.5 rounded-full ${qualityColor}`} />
        </div>
      </div>
    </div>
  );
}

function ParticipantLoopComponent() {
  const remoteParticipants = useRemoteParticipants();

  return (
    <>
      {remoteParticipants.map((p) => (
        <ParticipantTile key={p.identity} participant={p} isLocal={false} connectionQuality={p.connectionQuality} />
      ))}
    </>
  );
}

function LocalParticipantTile() {
  const { localParticipant } = useLocalParticipant();
  if (!localParticipant) return null;
  return (
    <ParticipantTile
      participant={{ identity: localParticipant.identity, name: localParticipant.name }}
      isLocal={true}
      connectionQuality={localParticipant.connectionQuality}
    />
  );
}

function AudioRecorder({ sessionId }: { sessionId: string }) {
  const room = useRoomContext();
  const { state, formattedDuration, error, startRecording, stopRecording, cleanup } = useAudioRecorder();
  const uploadedRef = useRef(false);

  const uploadRecording = useCallback(async (blob: Blob) => {
    if (uploadedRef.current) return;
    uploadedRef.current = true;

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const fileName = `${user.id}/${sessionId}-${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from('audio-recordings')
        .upload(fileName, blob, {
          contentType: 'audio/webm',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('audio-recordings')
        .getPublicUrl(fileName);

      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) return;

      await fetch(`/api/sessions/recording`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, recordingUrl: publicUrl }),
      });
    } catch (err) {
      console.error('Failed to upload recording:', err);
    }
  }, [sessionId]);

  useEffect(() => {
    startRecording();

    const handleDisconnect = async () => {
      const blob = await stopRecording();
      if (blob && blob.size > 0) {
        await uploadRecording(blob);
      }
    };

    room.on(RoomEvent.Disconnected, handleDisconnect);

    return () => {
      room.off(RoomEvent.Disconnected, handleDisconnect);
      if (!uploadedRef.current) {
        stopRecording().then((blob) => {
          if (blob && blob.size > 0) {
            uploadRecording(blob);
          }
        });
      }
      cleanup();
    };
  }, [room, startRecording, stopRecording, cleanup, uploadRecording]);

  if (state === 'recording') {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-xs font-medium text-red-600">{formattedDuration}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="w-2 h-2 rounded-full bg-yellow-500" />
        <span className="text-xs text-yellow-600">Recording unavailable</span>
      </div>
    );
  }

  return null;
}

function TranscriptionRecorder({ sessionId }: { sessionId: string }) {
  const room = useRoomContext();
  const { isListening, startListening, stopListening } = useSpeechRecognition();
  const savedRef = useRef(false);

  useEffect(() => {
    startListening();

    const handleDisconnect = async () => {
      const finalTranscript = stopListening();
      if (savedRef.current) return;
      savedRef.current = true;

      if (!finalTranscript) return;

      try {
        await fetch('/api/sessions/recording', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId, transcript: finalTranscript }),
        });
      } catch (err) {
        console.error('Failed to save transcript:', err);
      }
    };

    room.on(RoomEvent.Disconnected, handleDisconnect);

    return () => {
      room.off(RoomEvent.Disconnected, handleDisconnect);
      if (!savedRef.current) {
        handleDisconnect();
      }
    };
  }, [room, sessionId, startListening, stopListening]);

  if (!isListening) return null;

  return (
    <div className="flex items-center gap-1.5">
      <svg className="w-3.5 h-3.5 text-indigo-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
      </svg>
      <span className="text-xs text-indigo-600">Transcribing</span>
    </div>
  );
}

function Controls({ groupId }: { groupId: string }) {
  const room = useRoomContext();
  const localParticipant = useLocalParticipant();
  const router = useRouter();
  const [leaveConfirm, setLeaveConfirm] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const joinUrl = `${window.location.origin}/sessions/join/${groupId}`;
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt('Copy this link to share:', joinUrl);
    }
  };

  const handleLeave = async () => {
    await room.disconnect();
    router.push('/dashboard');
  };

  const toggleMic = async () => {
    await room.localParticipant.setMicrophoneEnabled(!localParticipant.isMicrophoneEnabled);
  };

  const toggleCamera = async () => {
    await room.localParticipant.setCameraEnabled(!localParticipant.isCameraEnabled);
  };

  if (leaveConfirm) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-full max-w-sm p-6 bg-white rounded-xl shadow-xl border border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Leave Session?</h2>
              <p className="text-sm text-gray-500">You can rejoin until the session ends.</p>
            </div>
          </div>
          <div className="flex gap-2 mt-5">
            <button
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              onClick={() => setLeaveConfirm(false)}
            >
              Stay
            </button>
            <button
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              onClick={handleLeave}
            >
              Leave
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40">
      <div className="bg-white/95 backdrop-blur-xl border-t border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              className={`p-2.5 rounded-lg transition-colors ${localParticipant.isMicrophoneEnabled ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
              onClick={toggleMic}
              aria-label={localParticipant.isMicrophoneEnabled ? 'Mute' : 'Unmute'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                {localParticipant.isMicrophoneEnabled ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
                )}
              </svg>
            </button>
            <button
              className={`p-2.5 rounded-lg transition-colors ${localParticipant.isCameraEnabled ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-red-50 text-red-600 hover:bg-red-100'}`}
              onClick={toggleCamera}
              aria-label={localParticipant.isCameraEnabled ? 'Disable Camera' : 'Enable Camera'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                {localParticipant.isCameraEnabled ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25zM6.75 12h.008v.008H6.75V12z" />
                )}
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${copied ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}
              onClick={handleShare}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  Copied!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                  </svg>
                  Share link
                </>
              )}
            </button>
            <button
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-red-600 bg-red-50 border border-red-200 hover:bg-red-100 transition-colors"
              onClick={() => setLeaveConfirm(true)}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
              Leave
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SessionHeader({ groupTopic, sessionType, sessionId }: { groupTopic: string; sessionType: string; sessionId: string }) {
  const room = useRoomContext();
  const [duration, setDuration] = useState('00:00');

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const mins = Math.floor(elapsed / 60000);
      const secs = Math.floor((elapsed % 60000) / 1000);
      setDuration(`${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [room]);

  return (
    <div className="fixed top-0 left-0 right-0 z-40">
      <div className="bg-white/95 backdrop-blur-xl border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <div>
              <h1 className="text-sm font-semibold text-gray-900">{groupTopic}</h1>
              <p className="text-xs text-gray-500">{duration}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AudioRecorder sessionId={sessionId} />
            <TranscriptionRecorder sessionId={sessionId} />
            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
              {sessionType}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SessionRoomContent({
  token,
  url,
  sessionId,
  groupId,
  groupTopic,
  sessionType
}: SessionRoomProps) {
  return (
    <LiveKitRoom
      token={token}
      serverUrl={url}
      connect={true}
      onDisconnected={() => {}}
    >
      <div className="relative h-screen w-full flex flex-col overflow-hidden bg-gray-50">
        <SessionHeader groupTopic={groupTopic} sessionType={sessionType} sessionId={sessionId} />

        <div className="flex-1 flex flex-col p-4 pt-16 pb-20 overflow-hidden">
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-max">
            <LocalParticipantTile />
            <ParticipantLoopComponent />
          </div>
        </div>

        <Controls groupId={groupId} />
      </div>
    </LiveKitRoom>
  );
}
