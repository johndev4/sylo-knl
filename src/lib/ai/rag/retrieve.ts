/**
 * Document retrieval logic using pgvector similarity search and tag-based keyword search.
 * Extracts relevant chunks based on query embedding, document tags, and filters by library IDs.
 */

import { createClient } from '@/lib/supabase/server';

/**
 * Retrieved document chunk with metadata
 */
export interface RetrievedChunk {
  id: string;
  document_id: string;
  content: string;
  title: string;
  library_name: string;
  similarity: number;
}

/**
 * Retrieve relevant document chunks based on query embedding
 * Uses cosine similarity distance for ranking via Supabase RPC
 */
export async function retrieveRelevantChunks(
  queryEmbedding: number[],
  libraryIds: string[],
  limit: number = 5
): Promise<RetrievedChunk[]> {
  const supabase = await createClient();

  const { data: chunks, error } = await supabase.rpc(
    'match_document_chunks_multi',
    {
      query_embedding: queryEmbedding,
      match_count: limit,
      filter_library_ids: libraryIds.length > 0 ? libraryIds : null,
    }
  );

  if (error) {
    console.error('[RETRIEVE VECTOR ERROR]', error);
    throw error;
  }

  return chunks || [];
}

/**
 * Retrieve document chunks by keyword matching against document tags.
 * First tries the dedicated Supabase RPC, falling back to PostgREST if the RPC is pending migration.
 */
export async function retrieveChunksByTags(
  libraryIds: string[],
  tags: string[],
  limit: number = 5
): Promise<RetrievedChunk[]> {
  if (!tags || tags.length === 0 || !libraryIds || libraryIds.length === 0) {
    return [];
  }

  const supabase = await createClient();

  // Try database RPC first
  const { data: rpcChunks, error: rpcError } = await supabase.rpc(
    'match_document_chunks_by_tags',
    {
      filter_library_ids: libraryIds.length > 0 ? libraryIds : null,
      filter_tags: tags,
      match_count: limit,
    }
  );

  if (!rpcError && rpcChunks) {
    return rpcChunks;
  }

  // Graceful fallback to PostgREST query if RPC is not deployed yet
  console.warn(
    '[RETRIEVE BY TAGS] RPC unavailable, falling back to PostgREST query:',
    rpcError?.message
  );

  try {
    const { data: docs, error: docError } = await supabase
      .from('documents')
      .select(
        `
        id,
        title,
        library_id,
        libraries (name),
        document_chunks (id, content)
      `
      )
      .in('library_id', libraryIds)
      .is('deleted_at', null)
      .overlaps('tags', tags)
      .limit(limit);

    if (docError || !docs) {
      console.warn('[RETRIEVE BY TAGS FALLBACK ERROR]', docError);
      return [];
    }

    const fallbackChunks: RetrievedChunk[] = [];
    for (const doc of docs) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const libData: any = doc.libraries;
      const libraryName = Array.isArray(libData)
        ? libData[0]?.name || 'Library'
        : libData?.name || 'Library';

      const chunks =
        (doc.document_chunks as Array<{ id: string; content: string }>) || [];

      for (const chunk of chunks) {
        fallbackChunks.push({
          id: chunk.id,
          document_id: doc.id,
          content: chunk.content,
          title: doc.title,
          library_name: libraryName,
          similarity: 0.95,
        });

        if (fallbackChunks.length >= limit) break;
      }

      if (fallbackChunks.length >= limit) break;
    }

    return fallbackChunks;
  } catch (fallbackError) {
    console.error('[RETRIEVE BY TAGS EXCEPTION]', fallbackError);
    return [];
  }
}

/**
 * Merge and deduplicate chunks from vector search and tag keyword search.
 * Prioritizes high similarity chunks, boosts items discovered via both channels,
 * and maintains diverse context.
 */
export function mergeAndRankChunks(
  vectorChunks: RetrievedChunk[],
  tagChunks: RetrievedChunk[],
  limit: number = 7
): RetrievedChunk[] {
  const chunkMap = new Map<string, RetrievedChunk>();

  // Add vector chunks
  for (const chunk of vectorChunks) {
    chunkMap.set(chunk.id, { ...chunk });
  }

  // Merge tag chunks
  for (const chunk of tagChunks) {
    if (chunkMap.has(chunk.id)) {
      // Present in both vector and tag match -> boost relevance
      const existing = chunkMap.get(chunk.id)!;
      existing.similarity = Math.min(
        1.0,
        Math.max(existing.similarity, 0.9) + 0.08
      );
    } else {
      chunkMap.set(chunk.id, { ...chunk });
    }
  }

  // Sort descending by similarity
  const ranked = Array.from(chunkMap.values()).sort(
    (a, b) => b.similarity - a.similarity
  );

  return ranked.slice(0, limit);
}
