/**
 * Document retrieval logic using vector similarity, full-text search, and document tags.
 * Extracts relevant chunks while enforcing library and mention-scope filters.
 */

import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logging/logger';

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
  tags?: string[];
}

export interface CitedRetrievedChunk extends RetrievedChunk {
  document_url: string;
}

export interface ScopedRetrievalFilters {
  documentIds: string[];
  tags: string[];
}

/**
 * Attach authorized Sylo document routes to retrieved chunks for answer citations.
 */
export async function attachDocumentLinks(
  chunks: RetrievedChunk[],
  libraryIds: string[]
): Promise<CitedRetrievedChunk[]> {
  const documentIds = [...new Set(chunks.map((chunk) => chunk.document_id))];
  if (documentIds.length === 0 || libraryIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data: documents, error } = await supabase
    .from('documents')
    .select('id, library_id')
    .in('id', documentIds)
    .in('library_id', libraryIds)
    .is('deleted_at', null);

  if (error) {
    throw error;
  }

  const libraryIdsByDocumentId = new Map(
    (documents ?? []).map((document) => [document.id, document.library_id])
  );
  const citedChunks: CitedRetrievedChunk[] = [];

  for (const chunk of chunks) {
    const libraryId = libraryIdsByDocumentId.get(chunk.document_id);
    if (!libraryId) {
      continue;
    }

    citedChunks.push({
      ...chunk,
      document_url: `/hub/libraries/${encodeURIComponent(libraryId)}/documents/${encodeURIComponent(chunk.document_id)}`,
    });
  }

  if (citedChunks.length < chunks.length) {
    logger.warn('Some retrieved documents could not be linked for citations', {
      missingDocumentCount:
        documentIds.length -
        new Set(citedChunks.map((chunk) => chunk.document_id)).size,
    });
  }

  return citedChunks;
}

/**
 * Retrieve relevant document chunks based on query embedding
 * Uses cosine similarity distance for ranking via Supabase RPC
 */
export async function retrieveRelevantChunks(
  queryEmbedding: number[],
  libraryIds: string[],
  limit: number = 5,
  scope?: ScopedRetrievalFilters
): Promise<RetrievedChunk[]> {
  const supabase = await createClient();
  const isScoped =
    !!scope && (scope.documentIds.length > 0 || scope.tags.length > 0);

  const { data: chunks, error } = await supabase.rpc(
    isScoped ? 'match_document_chunks_scoped' : 'match_document_chunks_multi',
    isScoped
      ? {
          query_embedding: queryEmbedding,
          match_count: limit,
          filter_library_ids: libraryIds.length > 0 ? libraryIds : null,
          filter_document_ids: scope.documentIds,
          filter_tags: scope.tags,
        }
      : {
          query_embedding: queryEmbedding,
          match_count: limit,
          filter_library_ids: libraryIds.length > 0 ? libraryIds : null,
        }
  );

  if (error) {
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
      if (docError) {
        logger.error('Tag retrieval fallback query failed', {
          error: docError,
        });
      }
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
  } catch (error: unknown) {
    logger.error('Tag retrieval fallback failed unexpectedly', { error });
    return [];
  }
}

/**
 * Retrieve chunks with lexical matches in their content or document title.
 * The database function ranks matches while applying the same library and
 * optional mention scope used by vector retrieval.
 */
export async function retrieveChunksByKeywords(
  query: string,
  libraryIds: string[],
  limit: number = 12,
  scope?: ScopedRetrievalFilters
): Promise<RetrievedChunk[]> {
  if (!query.trim() || libraryIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data: chunks, error } = await supabase.rpc(
    'search_document_chunks_keywords',
    {
      search_query: query,
      filter_library_ids: libraryIds,
      filter_document_ids: scope?.documentIds ?? null,
      filter_tags: scope?.tags ?? null,
      match_count: limit,
    }
  );

  if (error) {
    throw error;
  }

  return chunks ?? [];
}

/**
 * Merge and deduplicate chunks from vector, full-text, and tag search.
 * Prioritizes high similarity chunks, boosts items discovered via both channels,
 * and maintains diverse context.
 */
export function mergeAndRankChunks(
  vectorChunks: RetrievedChunk[],
  tagChunks: RetrievedChunk[],
  keywordChunks: RetrievedChunk[] = [],
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

  for (const chunk of keywordChunks) {
    if (chunkMap.has(chunk.id)) {
      const existing = chunkMap.get(chunk.id)!;
      existing.similarity = Math.min(
        1.0,
        Math.max(existing.similarity, chunk.similarity) + 0.04
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
