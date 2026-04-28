import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: library, error } = await supabase
      .from('libraries')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !library) {
      return NextResponse.json({ error: 'Library not found' }, { status: 404 });
    }

    // Check membership
    const { data: membership } = await supabase
      .from('library_members')
      .select('role')
      .eq('library_id', id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ library, role: membership.role });
  } catch (error: any) {
    console.error('[LIBRARY GET ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
