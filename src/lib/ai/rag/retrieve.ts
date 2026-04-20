/**
 * Document retrieval logic using pgvector similarity search.
 * Extracts relevant chunks based on query embedding and filters by embedding model.
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
  similarity: number;
}

/**
 * Retrieve relevant document chunks based on query embedding
 * Uses cosine similarity distance for ranking via Supabase RPC
 */
export async function retrieveRelevantChunks(
  queryEmbedding: number[],
  spaceId: string,
  limit: number = 5,
): Promise<RetrievedChunk[]> {
  const supabase = await createClient();
  
  // Format embedding as string representation for pgvector
  const embeddingString = `[${queryEmbedding.join(',')}]`;
  
  const { data: chunks, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: embeddingString,
    match_count: limit,
    filter_workspace_id: spaceId
  });

  if (error) {
    console.error('[RETRIEVE ERROR]', error);
    throw error;
  }

  return chunks || [];
}
