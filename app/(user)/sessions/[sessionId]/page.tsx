import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/helpers';
import { notFound } from 'next/navigation';
import SessionRoomContent from './SessionRoomContent';
import type { Session } from '@/types/db';

interface PageProps {
  params: Promise<{ sessionId: string }>;
}

async function getSessionWithGroup(sessionId: string) {
  const supabase = createServiceRoleClient();
  
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select(`
      *,
      groups!inner(*)
    `)
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return null;
  }

  return session as Session & { groups: { topic: string; session_type: string } };
}

export default async function SessionPage({ params }: PageProps) {
  const user = await requireUser();
  const { sessionId } = await params;
  
  const session = await getSessionWithGroup(sessionId);

  if (!session) {
    notFound();
  }

  // Check if user is a participant
  const supabase = createServiceRoleClient();
  const { data: participant } = await supabase
    .from('session_participants')
    .select('*')
    .eq('session_id', sessionId)
    .eq('user_id', user.id)
    .single();

  if (!participant) {
    notFound();
  }

  // Get LiveKit credentials from env
  const livekitUrl = process.env.LIVEKIT_URL;
  const livekitApiKey = process.env.LIVEKIT_API_KEY;
  const livekitApiSecret = process.env.LIVEKIT_API_SECRET;

  if (!livekitUrl || !livekitApiKey || !livekitApiSecret) {
    return (
      <div className="max-w-2xl mx-auto mt-16 p-6 bg-white dark:bg-gray-800 rounded-lg shadow text-center">
        <h1 className="text-2xl font-bold mb-4">LiveKit Not Configured</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Please set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET in your environment variables.
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-500 font-mono">
          Session ID: {sessionId}
        </p>
      </div>
    );
  }

  // Generate token server-side for initial load
  const { generateParticipantToken } = await import('@/lib/livekit/server');
  const roomName = `session-${sessionId}`;
  const token = await generateParticipantToken(
    user.id,
    user.display_name,
    roomName,
    true,
    true
  );

  return (
    <SessionRoomContent
      token={token}
      url={livekitUrl}
      roomName={roomName}
      sessionId={sessionId}
      groupId={session.group_id}
      groupTopic={session.groups.topic}
      sessionType={session.groups.session_type}
    />
  );
}