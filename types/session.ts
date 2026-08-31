import type { SessionType } from './db';

export interface LiveKitToken {
  token: string;
  roomName: string;
  userId: string;
  userName: string;
}

export interface SessionJoinResult {
  sessionId: string;
  livekit: LiveKitToken;
  group: {
    id: string;
    topic: string;
    sessionType: SessionType;
  };
}

export interface SessionState {
  status: 'idle' | 'joining' | 'connected' | 'disconnected' | 'ended';
  sessionId: string | null;
  roomName: string | null;
  participants: SessionParticipant[];
  localParticipant: LocalParticipant | null;
  error: string | null;
}

export interface SessionParticipant {
  id: string;
  name: string;
  audioTrack?: MediaStreamTrack;
  isMuted: boolean;
  isRecording: boolean;
}

export interface LocalParticipant extends SessionParticipant {
  isLocal: true;
  mediaStream: MediaStream | null;
}

export interface RecordingState {
  isRecording: boolean;
  recordingUrl: string | null;
  error: string | null;
}

export type ConnectionQuality = 'excellent' | 'good' | 'poor' | 'lost';