import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth/helpers';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { content, includeInAnalysis } = body as { content: string; includeInAnalysis?: boolean };

  if (!content || typeof content !== 'string' || content.trim().length === 0) {
    return NextResponse.json({ error: 'Content is required' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  const { data, error } = await supabase
    .from('journal_entries')
    .insert({
      user_id: user.id,
      content: content.trim(),
      include_in_analysis: includeInAnalysis ?? false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: 'Failed to save entry' }, { status: 500 });
  }

  return NextResponse.json({ entry: data });
}

export async function PATCH(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { entryId, includeInAnalysis } = body as { entryId: string; includeInAnalysis: boolean };

  if (!entryId) {
    return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  const { error } = await supabase
    .from('journal_entries')
    .update({ include_in_analysis: includeInAnalysis })
    .eq('id', entryId)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const entryId = searchParams.get('id');

  if (!entryId) {
    return NextResponse.json({ error: 'Entry ID required' }, { status: 400 });
  }

  const supabase = await createServiceRoleClient();

  const { error } = await supabase
    .from('journal_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
