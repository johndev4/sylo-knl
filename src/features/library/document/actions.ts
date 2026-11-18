'use server';

import { createClient } from '@/lib/supabase/server';
import { chunkText } from '@/lib/ai/chunking';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { processDocumentChunksInBackground } from './utils/background-embedding';
import {
  CreateDocumentInput,
  CreateDocumentInputSchema,
  UpdateDocumentInput,
  UpdateDocumentInputSchema,
} from '@/features/library/document/document-schema';
import { getUser } from '@/lib/auth/get-user';
import { serverConvertBlocksToMarkdown } from '@/lib/blocknote/transformer';

// ---------------------------------------------------------------------------
// createDocument — mirrors POST /api/documents
// ---------------------------------------------------------------------------
/**
 * Creates a new document in a library with automatic chunking and embedding generation.
 * Ensures the user has appropriate permissions and creates a personal space if needed.
 * @param input - The document creation input
 * @param input.title - The title of the document (minimum 1 character)
 * @param input.content - The content of the document (minimum 10 characters)
 * @param input.libraryId - The UUID of the library where the document will be created
 * @param input.tags - Optional array of tags to associate with the document
 */
export async function createDocument(
  input: CreateDocumentInput
): Promise<{ success: true; documentId: string; indexing: boolean }> {
  const supabase = await createClient();
  const user = await getUser();

  const { title, contentJson, libraryId, tags } =
    CreateDocumentInputSchema.parse(input);

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

  const markdown = await serverConvertBlocksToMarkdown(contentJson);
  if (markdown.trim().length < 10) {
    throw new Error('Content is too short');
  }

  // Markdown is transient; only plain text is chunked.
  const chunks = chunkText(markdown);

  // Store Document
  const { data: document, error: docError } = await supabase
    .from('documents')
    .insert({
      title,
      content_json: contentJson,
      library_id: libraryId,
      tags: tags || [],
      author_ids: [user.id],
    })
    .select('id')
    .single();

  if (docError || !document) {
    throw new Error(docError?.message || 'Failed to create document');
  }

  // Store Document and Chunks Atomically (embeddings generated asynchronously)
  const { error: saveError } = await supabase.rpc(
    'update_document_with_chunks',
    {
      p_doc_id: document.id,
      p_title: title,
      p_content_json: contentJson,
      p_tags: tags || [],
      p_author_ids: [user.id],
      p_chunks: chunks.map((chunkContent) => ({
        content: chunkContent,
      })),
    }
  );

  if (saveError) {
    console.error('[INGESTION ERROR] Atomic save failed:', saveError);
    throw new Error('Failed to save document and chunks');
  }

  // Schedule background embedding without blocking the user response (server-after-nonblocking)
  if (chunks.length > 0) {
    after(async () => {
      await processDocumentChunksInBackground(document.id);
    });
  }

  revalidatePath(`/hub/libraries/${libraryId}/documents`);

  return {
    success: true,
    documentId: document.id,
    indexing: chunks.length > 0,
  };
}

// ---------------------------------------------------------------------------
// updateDocument — mirrors PUT /api/documents/[docId]
// ---------------------------------------------------------------------------
/**
 * Updates an existing document with new content, title, or tags.
 * Performs optimistic concurrency control and regenerates embeddings if content changes.
 * @param docId - The UUID of the document to update
 * @param input - The document update input
 * @param input.title - The new title of the document (minimum 1 character)
 * @param input.content - The new content of the document (minimum 10 characters)
 * @param input.tags - Optional array of tags to associate with the document
 * @param input.lastUpdatedAt - Optional timestamp for optimistic concurrency control
 */
export async function updateDocument(
  docId: string,
  input: UpdateDocumentInput
): Promise<{
  success: true;
  document: { updated_at: string };
  indexing: boolean;
}> {
  const supabase = await createClient();
  const user = await getUser();

  const { title, contentJson, tags, lastUpdatedAt } =
    UpdateDocumentInputSchema.parse(input);

  const { data: currentDoc, error: docError } = await supabase
    .from('documents')
    .select('library_id, updated_at, author_ids, content_json')
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

  const contentChanged =
    JSON.stringify(currentDoc.content_json) !== JSON.stringify(contentJson);
  const markdown = contentChanged
    ? await serverConvertBlocksToMarkdown(contentJson)
    : '';

  if (contentChanged && markdown.trim().length < 10) {
    throw new Error('Content is too short');
  }

  let chunks: string[] = [];
  if (contentChanged) {
    chunks = chunkText(markdown);
  }

  // Save document and chunks atomically if content changed (embeddings generated asynchronously)
  if (contentChanged) {
    const { error: saveError } = await supabase.rpc(
      'update_document_with_chunks',
      {
        p_doc_id: docId,
        p_title: title,
        p_content_json: contentJson,
        p_tags: tags || [],
        p_author_ids: updatedAuthorIds,
        p_chunks: chunks.map((chunkContent) => ({
          content: chunkContent,
        })),
      }
    );

    if (saveError) {
      console.error('[INGESTION ERROR] Atomic update failed:', saveError);
      throw new Error('Failed to update document and chunks');
    }
  } else {
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        title,
        content_json: contentJson,
        tags: tags || [],
        author_ids: updatedAuthorIds,
        updated_at: new Date().toISOString(),
      })
      .eq('id', docId);

    if (updateError) {
      throw new Error(
        updateError.message || 'Failed to update document metadata'
      );
    }
  }

  // Schedule background embedding without blocking the user response (server-after-nonblocking)
  if (contentChanged && chunks.length > 0) {
    after(async () => {
      await processDocumentChunksInBackground(docId);
    });
  }

  revalidatePath(`/hub/libraries/${currentDoc.library_id}/documents/${docId}`);

  return {
    success: true,
    document: { updated_at: new Date().toISOString() },
    indexing: contentChanged && chunks.length > 0,
  };
}

// ---------------------------------------------------------------------------
// deleteDocument — mirrors DELETE /api/documents/[docId]
// ---------------------------------------------------------------------------
/**
 * Soft deletes a document by setting its deleted_at timestamp.
 * Ensures the user has appropriate permissions before deletion.
 * @param docId - The UUID of the document to delete
 */
export async function deleteDocument(
  docId: string
): Promise<{ success: true }> {
  const supabase = await createClient();
  const user = await getUser();

  const { data: currentDoc, error: docError } = await supabase
    .from('documents')
    .select('library_id, author_ids')
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

  // EDITORS cannot delete documents they did not author
  if (membership.role === 'EDITOR') {
    const isAuthor = (currentDoc.author_ids || []).includes(user.id);
    if (!isAuthor) {
      throw new Error('Editors can only delete documents they created');
    }
  }

  const { error: deleteError } = await supabase
    .from('documents')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', docId);

  if (deleteError) throw deleteError;

  revalidatePath(`/hub/libraries/${currentDoc.library_id}/documents`);

  return { success: true };
}
