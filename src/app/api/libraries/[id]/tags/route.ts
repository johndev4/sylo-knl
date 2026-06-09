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

    const { searchParams } = new URL(req.url);
    const query = searchParams.get('q')?.trim() ?? '';

    const { data: membership } = await supabase
      .from('library_members')
      .select('role')
      .eq('library_id', id)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (query.length < 3) {
      return NextResponse.json({ tags: [] });
    }

    const { data: documents, error } = await supabase
      .from('documents')
      .select('tags')
      .eq('library_id', id)
      .is('deleted_at', null);

    if (error) {
      throw error;
    }

    const seenTags = new Set<string>();
    const suggestions: string[] = [];
    const normalizedQuery = query.toLowerCase();

    documents?.forEach((doc) => {
      const tags = Array.isArray(doc.tags) ? doc.tags : [];
      tags.forEach((tag: string | null | undefined) => {
        const trimmedTag = tag?.trim();
        if (!trimmedTag) return;

        const normalizedTag = trimmedTag.toLowerCase();
        if (
          normalizedTag.includes(normalizedQuery) &&
          !seenTags.has(normalizedTag)
        ) {
          seenTags.add(normalizedTag);
          suggestions.push(trimmedTag);
        }
      });
    });

    suggestions.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );

    return NextResponse.json({ tags: suggestions.slice(0, 20) });
  } catch (error: unknown) {
    console.error('[LIBRARY TAGS GET ERROR]', error);
    const message =
      error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
