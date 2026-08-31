import { createServiceRoleClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/helpers';
import { transcribeAudio } from '@/lib/ai/stt';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    await requireUser();
    const { recordingId } = await request.json();

    if (!recordingId) {
      return NextResponse.json({ error: 'recordingId is required' }, { status: 400 });
    }

    const supabase = createServiceRoleClient();

    const { data: recording, error: fetchError } = await supabase
      .from('recordings')
      .select('id, file_url, file_name')
      .eq('id', recordingId)
      .single();

    if (fetchError || !recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }

    const audioResponse = await fetch(recording.file_url);
    if (!audioResponse.ok) {
      return NextResponse.json({ error: 'Failed to download audio file' }, { status: 500 });
    }

    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    const fileName = recording.file_name || 'recording.webm';
    const mimeType = audioResponse.headers.get('content-type') || 'audio/webm';

    const result = await transcribeAudio(audioBuffer, fileName, mimeType);

    const { error: updateError } = await supabase
      .from('recordings')
      .update({ transcript: result.text })
      .eq('id', recordingId);

    if (updateError) {
      console.error('Error saving transcript:', updateError);
      return NextResponse.json({ error: 'Failed to save transcript' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      transcript: result.text,
    });
  } catch (error) {
    console.error('Transcription error:', error);

    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : 'Transcription failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
