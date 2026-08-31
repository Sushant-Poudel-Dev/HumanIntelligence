import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/helpers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { sessionId, recordingUrl, transcript } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const update: { audio_recording_url?: string; transcript?: string } = {};
    if (recordingUrl) update.audio_recording_url = recordingUrl;
    if (transcript) update.transcript = transcript;

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No data to save' }, { status: 400 });
    }

    const { error } = await supabase
      .from('session_participants')
      .update(update)
      .eq('session_id', sessionId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error saving recording data:', error);
      return NextResponse.json({ error: 'Failed to save recording data' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Recording save error:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
