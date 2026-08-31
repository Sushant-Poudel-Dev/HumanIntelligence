import { AccessToken, RoomServiceClient } from 'livekit-server-sdk';

export function getLiveKitCredentials() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !url) {
    throw new Error('LiveKit credentials not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL');
  }

  return { apiKey, apiSecret, url };
}

export function createRoomServiceClient() {
  const { apiKey, apiSecret, url } = getLiveKitCredentials();
  return new RoomServiceClient(url, apiKey, apiSecret);
}

export async function createLiveKitRoom(roomName: string) {
  const roomService = createRoomServiceClient();
  
  try {
    await roomService.createRoom({ name: roomName });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes('room already exists') || message.includes('duplicate')) {
      // Room already exists, that's fine
      return;
    }
    throw error;
  }
}

export async function generateParticipantToken(
  userId: string,
  userName: string,
  roomName: string,
  canPublish: boolean = true,
  canSubscribe: boolean = true
): Promise<string> {
  const { apiKey, apiSecret } = getLiveKitCredentials();

  const token = new AccessToken(apiKey, apiSecret, {
    identity: userId,
    name: userName,
  });

  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish,
    canSubscribe,
    canPublishData: true,
  });

  return token.toJwt();
}

export async function deleteRoom(roomName: string) {
  const roomService = createRoomServiceClient();
  await roomService.deleteRoom(roomName);
}

export async function getRoomParticipants(roomName: string) {
  const roomService = createRoomServiceClient();
  return roomService.listParticipants(roomName);
}