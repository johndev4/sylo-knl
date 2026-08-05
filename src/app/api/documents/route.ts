import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chunkText } from '@/lib/ai/chunking';
import { generateEmbeddings } from '@/lib/ai/embeddings';
import { z } from 'zod';

const ingestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(10, 'Content is too short'),
  libraryId: z.string().uuid('Invalid Library ID'),
  tags: z.array(z.string()).optional(),
});

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const libraryId = searchParams.get('libraryId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const tagsParam = searchParams.get('tags');

    if (!libraryId) {
      return NextResponse.json(
        { error: 'Library ID is required' },
        { status: 400 }
      );
    }

    // Check RBAC
    const { data: membership } = await supabase
      .from('library_members')
      .select('library_id')
      .eq('library_id', libraryId)
      .eq('user_id', user.id)
      .single();

    if (!membership) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let query = supabase
      .from('documents')
      .select(
        'id, title, tags, author_ids, created_at, updated_at, deleted_at',
        { count: 'exact' }
      )
      .eq('library_id', libraryId)
      .is('deleted_at', null)
      .order('updated_at', { ascending: false });

    if (search) {
      query = query.ilike('title', `%${search}%`);
    }

    if (tagsParam) {
      const tags = tagsParam
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      if (tags.length > 0) {
        query = query.contains('tags', tags);
      }
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json({
      data,
      metadata: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[DOCUMENTS GET ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { title, content, libraryId, tags } = ingestSchema.parse(body);

    // Check library exists and user has access
    if (libraryId === user.id) {
      const { data: existingSpace } = await supabase
        .from('libraries')
        .select('id')
        .eq('id', user.id)
        .single();
      if (!existingSpace) {
        await supabase
          .from('libraries')
          .insert({ id: user.id, name: 'Personal Knowledge Base' });
        await supabase
          .from('library_members')
          .insert({ library_id: user.id, user_id: user.id, role: 'OWNER' });
      }
    }

    const { data: membership } = await supabase
      .from('library_members')
      .select('library_id, role')
      .eq('library_id', libraryId)
      .eq('user_id', user.id)
      .single();

    if (!membership || membership.role === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 1. Chunk the document content
    const chunks = chunkText(content);

    // 2. Generate embeddings for each chunk
    let embeddings: number[][];
    try {
      console.log(
        '[INGESTION] Generating embeddings for',
        chunks.length,
        'chunks'
      );
      embeddings = await generateEmbeddings(chunks);
      console.log('[INGESTION] Successfully generated embeddings');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (embedError: any) {
      console.error('[INGESTION] Embedding generation failed:', embedError);
      throw embedError;
    }

    // 3. Store Document
    const { data: document, error: docError } = await supabase
      .from('documents')
      .insert({
        title,
        content,
        library_id: libraryId,
        tags: tags || [],
        author_ids: [user.id],
      })
      .select('id')
      .single();

    if (docError || !document) {
      throw new Error(docError?.message || 'Failed to create document');
    }

    // Audit Log
    await supabase.from('document_edits').insert({
      document_id: document.id,
      user_id: user.id,
      action: 'CREATED',
    });

    // 4. Store Chunks
    const chunkInserts = chunks.map((chunkContent, i) => ({
      document_id: document.id,
      content: chunkContent,
      embedding: `[${embeddings[i].join(',')}]`,
    }));

    const { error: chunksError } = await supabase
      .from('document_chunks')
      .insert(chunkInserts);

    if (chunksError) {
      console.error('[INGESTION ERROR] Chunks:', chunksError);
      throw new Error('Failed to create document chunks');
    }

    return NextResponse.json({ success: true, documentId: document.id });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[INGESTION ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
