import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/helpers';
import { deleteRoom } from '@/lib/livekit/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Verify user is a participant in this session
    const { data: participant, error: participantError } = await supabase
      .from('session_participants')
      .select('*')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (participantError || !participant) {
      return NextResponse.json({ error: 'Not a participant in this session' }, { status: 403 });
    }

    // Check if session exists and is not ended
    const { data: session, error: sessionError } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .is('ended_at', null)
      .single();

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found or already ended' }, { status: 404 });
    }

    // End the session
    const { error: updateError } = await supabase
      .from('sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error ending session:', updateError);
      return NextResponse.json({ error: 'Failed to end session' }, { status: 500 });
    }

    // Delete LiveKit room
    try {
      const roomName = `session-${sessionId}`;
      await deleteRoom(roomName);
    } catch (livekitError) {
      console.error('Error deleting LiveKit room:', livekitError);
      // Don't fail the request if room deletion fails
    }

    // TODO: Trigger transcription job here
    // This would typically be done via a background job queue
    // For now, we'll just return success

    return NextResponse.json({ 
      success: true, 
      message: 'Session ended',
      sessionId 
    });
  } catch (error) {
    console.error('Session end error:', error);
    
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (error instanceof Error && error.message.includes('LiveKit credentials')) {
      return NextResponse.json({ 
        error: 'LiveKit not configured' 
      }, { status: 503 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}