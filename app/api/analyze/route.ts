import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/helpers';
import { analyzeTranscript, getUserTranscriptHistory } from '@/lib/ai/analysis';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { sessionId, recordingId } = await request.json();

    if (!sessionId && !recordingId) {
      return NextResponse.json({ error: 'sessionId or recordingId is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    let transcript: string | null = null;

    if (sessionId) {
      const { data: participant, error: fetchError } = await supabase
        .from('session_participants')
        .select('transcript')
        .eq('session_id', sessionId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !participant) {
        return NextResponse.json({ error: 'Session participant not found' }, { status: 404 });
      }

      transcript = participant.transcript;
    } else if (recordingId) {
      const { data: recording, error: fetchError } = await supabase
        .from('recordings')
        .select('transcript')
        .eq('id', recordingId)
        .single();

      if (fetchError || !recording) {
        return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
      }

      transcript = recording.transcript;
    }

    if (!transcript) {
      return NextResponse.json({ error: 'No transcript available' }, { status: 400 });
    }

    const history = await getUserTranscriptHistory(supabase, user.id);

    const analysis = await analyzeTranscript(transcript, history || undefined);

    const { error: insertError } = await supabase
      .from('ai_analyses')
      .insert({
        user_id: user.id,
        session_id: sessionId || null,
        summary: analysis.summary,
        trend: analysis.trend,
      });

    if (insertError) {
      console.error('Error storing analysis:', insertError);
      return NextResponse.json({ error: 'Failed to store analysis' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      analysis: {
        summary: analysis.summary,
        trend: analysis.trend,
        themes: analysis.themes,
      },
    });
  } catch (error) {
    console.error('Analysis error:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
