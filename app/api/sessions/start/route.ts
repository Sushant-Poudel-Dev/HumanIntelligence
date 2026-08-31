import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/helpers';
import { createLiveKitRoom, generateParticipantToken } from '@/lib/livekit/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  const logs: string[] = [];

  try {
    logs.push('1: calling requireUser');
    const user = await requireUser();
    logs.push(`2: user=${user.id}`);

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');
    logs.push(`3: groupId=${groupId}`);

    if (!groupId) {
      return NextResponse.json({ error: 'groupId is required', logs }, { status: 400 });
    }

    const supabase = createServiceRoleClient();
    logs.push('4: supabase created');

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .single();

    logs.push(`5: group query done, error=${groupError?.message ?? 'none'}`);

    if (groupError || !group) {
      return NextResponse.json({ error: 'Group not found', detail: groupError?.message, logs }, { status: 404 });
    }

    const { data: existingSession } = await supabase
      .from('sessions')
      .select('*')
      .eq('group_id', groupId)
      .is('ended_at', null)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    logs.push(`6: existingSession=${existingSession?.id ?? 'null'}`);

    let sessionId: string;

    if (existingSession) {
      sessionId = existingSession.id;
      logs.push(`7a: joining existing session ${sessionId}`);

      const { data: existingParticipant } = await supabase
        .from('session_participants')
        .select('*')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!existingParticipant) {
        const { error: participantError } = await supabase
          .from('session_participants')
          .insert({ session_id: sessionId, user_id: user.id });

        logs.push(`8a: insert participant, error=${participantError?.message ?? 'none'}`);

        if (participantError) {
          return NextResponse.json({ error: 'Failed to join session', detail: participantError.message, logs }, { status: 500 });
        }
      } else {
        logs.push('8a: already a participant');
      }
    } else {
      logs.push('7b: creating new session');
      const { data: newSession, error: sessionError } = await supabase
        .from('sessions')
        .insert({ group_id: groupId })
        .select()
        .single();

      logs.push(`8b: session insert done, error=${sessionError?.message ?? 'none'}, id=${newSession?.id ?? 'none'}`);

      if (sessionError || !newSession) {
        return NextResponse.json({ error: 'Failed to create session', detail: sessionError?.message, code: sessionError?.code, logs }, { status: 500 });
      }

      sessionId = newSession.id;

      const { error: participantError } = await supabase
        .from('session_participants')
        .insert({ session_id: sessionId, user_id: user.id });

      logs.push(`9b: insert participant, error=${participantError?.message ?? 'none'}`);

      if (participantError) {
        return NextResponse.json({ error: 'Failed to add participant', detail: participantError.message, logs }, { status: 500 });
      }

      const roomName = `session-${sessionId}`;
      logs.push(`10b: creating LiveKit room ${roomName}`);
      await createLiveKitRoom(roomName);
      logs.push('11b: LiveKit room created');
    }

    const roomName = `session-${sessionId}`;
    logs.push(`12: generating token for room ${roomName}`);
    const token = await generateParticipantToken(
      user.id,
      user.display_name,
      roomName,
      true,
      true
    );
    logs.push(`13: token generated, length=${token.length}`);

    return NextResponse.json({
      sessionId,
      livekit: { token, roomName, url: process.env.LIVEKIT_URL },
      group: { id: group.id, topic: group.topic, sessionType: group.session_type },
      logs,
    });
  } catch (error) {
    console.error('Session start error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    logs.push(`CATCH: ${msg}`);

    if (msg.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized', detail: msg, logs }, { status: 401 });
    }

    if (msg.includes('LiveKit credentials')) {
      return NextResponse.json({ error: 'LiveKit not configured', detail: msg, logs }, { status: 503 });
    }

    return NextResponse.json({ error: 'Internal server error', detail: msg, logs }, { status: 500 });
  }
}
