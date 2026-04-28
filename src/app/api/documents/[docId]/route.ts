import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chunkText } from '@/lib/ai/chunking';
import { generateEmbeddings } from '@/lib/ai/embeddings';
import { z } from 'zod';

const updateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(10, 'Content is too short'),
  tags: z.array(z.string()).optional(),
  lastUpdatedAt: z.string().optional(), // For OCC
});

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ docId: string }> }
) {
  const params = await props.params;
  const docId = params.docId;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('*, author_ids, library_id, created_at, updated_at, deleted_at')
      .eq('id', docId)
      .single();

    if (docError || !document || document.deleted_at) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check RBAC
    let hasAccess = false;
    if (document.library_id === user.id) {
      hasAccess = true;
    } else {
      const { data: membership } = await supabase
        .from('library_members')
        .select('library_id')
        .eq('library_id', document.library_id)
        .eq('user_id', user.id)
        .single();
      hasAccess = !!membership;
    }

    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let authors = [];
    if (document.author_ids && document.author_ids.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, name, avatar_url')
        .in('id', document.author_ids);
      authors = usersData || [];
    }

    return NextResponse.json({ document: { ...document, authors } });
  } catch (error: any) {
    console.error('[DOCUMENT GET ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ docId: string }> }
) {
  const params = await props.params;
  const docId = params.docId;

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
    const { title, content, tags, lastUpdatedAt } = updateSchema.parse(body);

    const { data: currentDoc, error: docError } = await supabase
      .from('documents')
      .select('library_id, updated_at, author_ids, content')
      .eq('id', docId)
      .is('deleted_at', null)
      .single();

    if (docError || !currentDoc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check RBAC
    let role = 'VIEWER';
    if (currentDoc.library_id === user.id) {
      role = 'OWNER';
    } else {
      const { data: membership } = await supabase
        .from('library_members')
        .select('role')
        .eq('library_id', currentDoc.library_id)
        .eq('user_id', user.id)
        .single();
      if (membership) {
        role = membership.role;
      }
    }

    if (role === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // OCC Check
    if (lastUpdatedAt) {
      const currentUpdated = new Date(currentDoc.updated_at).getTime();
      const clientUpdated = new Date(lastUpdatedAt).getTime();
      if (currentUpdated > clientUpdated) {
        return NextResponse.json(
          {
            error:
              'Conflict: Document was edited by another user. Please refresh to get the latest version.',
            conflict: true,
          },
          { status: 409 }
        );
      }
    }

    let updatedAuthorIds = currentDoc.author_ids || [];
    if (!updatedAuthorIds.includes(user.id)) {
      updatedAuthorIds = [...updatedAuthorIds, user.id];
    }

    const { data: document, error: updateError } = await supabase
      .from('documents')
      .update({
        title,
        content,
        tags: tags || [],
        author_ids: updatedAuthorIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', docId)
      .select('id, updated_at')
      .single();

    if (updateError || !document) {
      throw new Error(updateError?.message || 'Failed to update document');
    }

    // Audit log
    await supabase.from('document_edits').insert({
      document_id: document.id,
      user_id: user.id,
      action: 'UPDATED',
    });

    if (currentDoc.content !== content) {
      await supabase.from('document_chunks').delete().eq('document_id', docId);

      const chunks = chunkText(content);
      let embeddings: number[][];
      try {
        console.log(
          '[INGESTION UPDATE] Generating embeddings for',
          chunks.length,
          'chunks'
        );
        embeddings = await generateEmbeddings(chunks);
      } catch (embedError: any) {
        console.error(
          '[INGESTION UPDATE] Embedding generation failed:',
          embedError
        );
        throw embedError;
      }

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
      }
    }

    return NextResponse.json({
      success: true,
      document: { updated_at: document.updated_at },
    });
  } catch (error: any) {
    console.error('[DOCUMENT UPDATE ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ docId: string }> }
) {
  const params = await props.params;
  const docId = params.docId;

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: currentDoc, error: docError } = await supabase
      .from('documents')
      .select('library_id')
      .eq('id', docId)
      .is('deleted_at', null)
      .single();

    if (docError || !currentDoc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Check RBAC
    let role = 'VIEWER';
    if (currentDoc.library_id === user.id) {
      role = 'OWNER';
    } else {
      const { data: membership } = await supabase
        .from('library_members')
        .select('role')
        .eq('library_id', currentDoc.library_id)
        .eq('user_id', user.id)
        .single();
      if (membership) {
        role = membership.role;
      }
    }

    if (role === 'VIEWER') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { error: deleteError } = await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', docId);

    if (deleteError) {
      throw deleteError;
    }

    await supabase.from('document_edits').insert({
      document_id: docId,
      user_id: user.id,
      action: 'DELETED',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[DOCUMENT DELETE ERROR]', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
