import { createServerClientInstance } from '@/lib/supabase/server';
import { requireUser } from '@/lib/auth/helpers';
import { NextResponse } from 'next/server';
import type { SessionType } from '@/types/db';

const VALID_TYPES: SessionType[] = ['peer', 'peer_counselor', 'one_on_one'];

export async function POST(request: Request) {
  try {
    await requireUser();
    const body = await request.json();
    const { topic, description, sessionType } = body as {
      topic: string;
      description: string;
      sessionType: string;
    };

    if (!topic || !sessionType) {
      return NextResponse.json(
        { error: 'topic and sessionType are required' },
        { status: 400 },
      );
    }

    if (!VALID_TYPES.includes(sessionType as SessionType)) {
      return NextResponse.json(
        { error: `sessionType must be one of: ${VALID_TYPES.join(', ')}` },
        { status: 400 },
      );
    }

    const supabase = await createServerClientInstance();

    const { data: group, error } = await supabase
      .from('groups')
      .insert({ topic, description: description || null, session_type: sessionType })
      .select()
      .single();

    if (error) {
      console.error('Error creating group:', error);
      return NextResponse.json({ error: 'Failed to create group' }, { status: 500 });
    }

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    console.error('Create group error:', error);
    if (error instanceof Error && error.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
