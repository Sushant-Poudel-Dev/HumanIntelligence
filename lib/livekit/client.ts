import { Room, RoomEvent, RemoteParticipant, Track, LocalAudioTrack, createLocalTracks, ConnectionQuality as LKConnectionQuality } from 'livekit-client';
import type { SessionParticipant, LocalParticipant, ConnectionQuality } from '@/types/session';

export interface LiveKitClientEvents {
  onConnected: () => void;
  onDisconnected: () => void;
  onParticipantConnected: (participant: SessionParticipant) => void;
  onParticipantDisconnected: (participantId: string) => void;
  onLocalTrackPublished: (track: LocalAudioTrack) => void;
  onLocalTrackUnpublished: (track: LocalAudioTrack) => void;
  onRemoteTrackSubscribed: (track: Track, participant: SessionParticipant) => void;
  onRemoteTrackUnsubscribed: (track: Track, participant: SessionParticipant) => void;
  onConnectionQualityChanged: (quality: ConnectionQuality) => void;
  onError: (error: Error) => void;
}

export class LiveKitClient {
  private room: Room;
  private events: Partial<LiveKitClientEvents>;
  private localParticipantData: LocalParticipant | null = null;
  private participants: Map<string, SessionParticipant> = new Map();

  constructor(events: Partial<LiveKitClientEvents> = {}) {
    this.room = new Room({
      adaptiveStream: true,
      dynacast: true,
    });
    this.events = events;
    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.room.on(RoomEvent.Connected, () => {
      this.events.onConnected?.();
      this.updateLocalParticipant();
    });

    this.room.on(RoomEvent.Disconnected, () => {
      this.events.onDisconnected?.();
      this.localParticipantData = null;
      this.participants.clear();
    });

    this.room.on(RoomEvent.ParticipantConnected, (participant) => {
      const sessionParticipant = this.mapRemoteParticipant(participant);
      this.participants.set(participant.identity, sessionParticipant);
      this.events.onParticipantConnected?.(sessionParticipant);
    });

    this.room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      this.participants.delete(participant.identity);
      this.events.onParticipantDisconnected?.(participant.identity);
    });

    this.room.on(RoomEvent.LocalTrackPublished, (publication) => {
      if (publication.track) {
        this.events.onLocalTrackPublished?.(publication.track as LocalAudioTrack);
        this.updateLocalParticipant();
      }
    });

    this.room.on(RoomEvent.LocalTrackUnpublished, (publication) => {
      if (publication.track) {
        this.events.onLocalTrackUnpublished?.(publication.track as LocalAudioTrack);
        this.updateLocalParticipant();
      }
    });

    this.room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
      const sessionParticipant = this.participants.get(participant.identity);
      if (sessionParticipant) {
        this.events.onRemoteTrackSubscribed?.(track, sessionParticipant);
      }
    });

    this.room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
      const sessionParticipant = this.participants.get(participant.identity);
      if (sessionParticipant) {
        this.events.onRemoteTrackUnsubscribed?.(track, sessionParticipant);
      }
    });

    this.room.on(RoomEvent.ConnectionQualityChanged, (quality: LKConnectionQuality) => {
      const qualityMap: Record<LKConnectionQuality, ConnectionQuality> = {
        [LKConnectionQuality.Unknown]: 'lost',
        [LKConnectionQuality.Lost]: 'lost',
        [LKConnectionQuality.Poor]: 'poor',
        [LKConnectionQuality.Good]: 'good',
        [LKConnectionQuality.Excellent]: 'excellent',
      };
      this.events.onConnectionQualityChanged?.(qualityMap[quality] || 'lost');
    });
  }

  private mapRemoteParticipant(participant: RemoteParticipant): SessionParticipant {
    let audioTrack: MediaStreamTrack | undefined;
    let isMuted = true;
    
    participant.trackPublications.forEach((publication) => {
      if (publication.kind === 'audio' && publication.track) {
        audioTrack = publication.track as unknown as MediaStreamTrack;
        isMuted = publication.isMuted;
      }
    });
    
    return {
      id: participant.identity,
      name: participant.name || 'Anonymous',
      audioTrack,
      isMuted,
      isRecording: false,
    };
  }

  private updateLocalParticipant() {
    const lkLocalParticipant = this.room.localParticipant;
    if (!lkLocalParticipant) return;
    
    let audioTrack: MediaStreamTrack | undefined;
    let isMuted = true;
    
    lkLocalParticipant.trackPublications.forEach((publication) => {
      if (publication.kind === 'audio' && publication.track) {
        audioTrack = publication.track as unknown as MediaStreamTrack;
        isMuted = publication.isMuted;
      }
    });

    const localData: LocalParticipant = {
      id: lkLocalParticipant.identity,
      name: lkLocalParticipant.name || 'You',
      audioTrack,
      isMuted,
      isRecording: false,
      isLocal: true,
      mediaStream: new MediaStream(),
    };

    lkLocalParticipant.trackPublications.forEach((publication) => {
      if (publication.track) {
        localData.mediaStream!.addTrack(publication.track as unknown as MediaStreamTrack);
      }
    });

    this.localParticipantData = localData;
  }

  async connect(url: string, token: string): Promise<void> {
    await this.room.connect(url, token);
  }

  async disconnect(): Promise<void> {
    await this.room.disconnect();
  }

  async enableMicrophone(enabled: boolean): Promise<void> {
    await this.room.localParticipant.setMicrophoneEnabled(enabled);
    this.updateLocalParticipant();
  }

  async enableCamera(enabled: boolean): Promise<void> {
    await this.room.localParticipant.setCameraEnabled(enabled);
    this.updateLocalParticipant();
  }

  getLocalParticipant(): LocalParticipant | null {
    return this.localParticipantData;
  }

  getParticipants(): SessionParticipant[] {
    return Array.from(this.participants.values());
  }

  getRoom(): Room {
    return this.room;
  }

  getConnectionState(): Room['state'] {
    return this.room.state;
  }

  async createLocalAudioTrack(): Promise<LocalAudioTrack> {
    const tracks = await createLocalTracks({ audio: true, video: false });
    return tracks[0] as LocalAudioTrack;
  }

  async publishAudioTrack(track: LocalAudioTrack): Promise<void> {
    await this.room.localParticipant.publishTrack(track);
  }
}

export function createLiveKitClient(events: Partial<LiveKitClientEvents> = {}): LiveKitClient {
  return new LiveKitClient(events);
}