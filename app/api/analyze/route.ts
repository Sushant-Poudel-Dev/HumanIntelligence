import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/helpers';
import { analyzeTranscript, getUserTranscriptHistory } from '@/lib/ai/analysis';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    // Fetch the transcript for this session
    const { data: participant, error: fetchError } = await supabase
      .from('session_participants')
      .select('transcript')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .single();

    if (fetchError || !participant) {
      return NextResponse.json({ error: 'Session participant not found' }, { status: 404 });
    }

    if (!participant.transcript) {
      return NextResponse.json({ error: 'No transcript available for this session' }, { status: 400 });
    }

    // Get user's previous transcript history for context
    const history = await getUserTranscriptHistory(supabase, user.id);

    // Analyze the transcript
    const analysis = await analyzeTranscript(participant.transcript, history || undefined);

    // Store the analysis
    const { error: insertError } = await supabase
      .from('ai_analyses')
      .insert({
        user_id: user.id,
        session_id: sessionId,
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
