'use server';

import { createClient } from '@/lib/supabase/server';
import { chunkText } from '@/lib/ai/chunking';
import { generateEmbeddings } from '@/lib/ai/embeddings';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const createSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(10, 'Content is too short'),
  libraryId: z.string().uuid('Invalid Library ID'),
  tags: z.array(z.string()).optional(),
});

const updateSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().min(10, 'Content is too short'),
  tags: z.array(z.string()).optional(),
  lastUpdatedAt: z.string().optional(),
});

// ---------------------------------------------------------------------------
// createDocument — mirrors POST /api/documents
// ---------------------------------------------------------------------------

export async function createDocument(input: {
  title: string;
  content: string;
  libraryId: string;
  tags?: string[];
}): Promise<{ success: true; documentId: string }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error('Unauthorized');

  const { title, content, libraryId, tags } = createSchema.parse(input);

  // Ensure personal space exists when targeting it
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
    throw new Error('Forbidden');
  }

  // 1. Chunk the document content
  const chunks = chunkText(content);

  // 2. Generate embeddings for each chunk
  let embeddings: number[][];
  try {
    console.log('[INGESTION] Generating embeddings for', chunks.length, 'chunks');
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

  // Audit log
  await supabase.from('document_edits').insert({
    document_id: document.id,
    user_id: user.id,
    action: 'CREATED',
  });

  // 4. Store chunks
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

  revalidatePath(`/hub/libraries/${libraryId}/documents`);

  return { success: true, documentId: document.id };
}

// ---------------------------------------------------------------------------
// updateDocument — mirrors PUT /api/documents/[docId]
// ---------------------------------------------------------------------------

export async function updateDocument(
  docId: string,
  input: {
    title: string;
    content: string;
    tags?: string[];
    lastUpdatedAt?: string;
  }
): Promise<{ success: true; document: { updated_at: string } }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error('Unauthorized');

  const { title, content, tags, lastUpdatedAt } = updateSchema.parse(input);

  const { data: currentDoc, error: docError } = await supabase
    .from('documents')
    .select('library_id, updated_at, author_ids, content')
    .eq('id', docId)
    .is('deleted_at', null)
    .single();

  if (docError || !currentDoc) throw new Error('Document not found');

  // Check RBAC
  const { data: membership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', currentDoc.library_id)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role === 'VIEWER') {
    throw new Error('Forbidden');
  }

  // OCC check
  if (lastUpdatedAt) {
    const currentUpdated = new Date(currentDoc.updated_at).getTime();
    const clientUpdated = new Date(lastUpdatedAt).getTime();
    if (currentUpdated > clientUpdated) {
      const conflictError = new Error(
        'Conflict: Document was edited by another user. Please refresh to get the latest version.'
      );
      (conflictError as Error & { conflict: boolean }).conflict = true;
      throw conflictError;
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

  // Re-embed if content changed
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  revalidatePath(`/hub/libraries/${currentDoc.library_id}/documents/${docId}`);

  return { success: true, document: { updated_at: document.updated_at } };
}

// ---------------------------------------------------------------------------
// deleteDocument — mirrors DELETE /api/documents/[docId]
// ---------------------------------------------------------------------------

export async function deleteDocument(docId: string): Promise<{ success: true }> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error('Unauthorized');

  const { data: currentDoc, error: docError } = await supabase
    .from('documents')
    .select('library_id')
    .eq('id', docId)
    .is('deleted_at', null)
    .single();

  if (docError || !currentDoc) throw new Error('Document not found');

  // Check RBAC
  const { data: membership } = await supabase
    .from('library_members')
    .select('role')
    .eq('library_id', currentDoc.library_id)
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.role === 'VIEWER') {
    throw new Error('Forbidden');
  }

  const { error: deleteError } = await supabase
    .from('documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', docId);

  if (deleteError) throw deleteError;

  await supabase.from('document_edits').insert({
    document_id: docId,
    user_id: user.id,
    action: 'DELETED',
  });

  revalidatePath(`/hub/libraries/${currentDoc.library_id}/documents`);

  return { success: true };
}