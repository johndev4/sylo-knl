/**
 * Document retrieval logic using pgvector similarity search.
 * Extracts relevant chunks based on query embedding and filters by embedding model.
 */

import prisma from '@/lib/db';
import { getEmbeddingProvider } from '@/lib/ai/core/provider-factory';

/**
 * Retrieved document chunk with metadata
 */
export interface RetrievedChunk {
  id: string;
  content: string;
  title: string;
  embeddingModel: string;
  embeddingDimension: number;
  distance?: number;
}

/**
 * Map provider name to EmbeddingModel enum value
 */
function getEmbeddingModelEnum(providerName: string): string {
  const env = process.env.EMBEDDING_PROVIDER || process.env.LLM_PROVIDER || 'google';
  
  if (env === 'ollama') {
    const model = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
    if (model === 'nomic-embed-text') {
      return 'OLLAMA_NOMIC_1536';
    }
    return 'OLLAMA_CUSTOM';
  }
  
  return 'GOOGLE_GEMINI_3072';
}

/**
 * Retrieve relevant document chunks based on query embedding
 * Uses cosine similarity distance for ranking
 * Filters by embedding model to prevent cross-model semantic mismatches
 */
export async function retrieveRelevantChunks(
  queryEmbedding: number[],
  spaceId: string,
  limit: number = 5,
): Promise<RetrievedChunk[]> {
  // Format embedding as PostgreSQL array for vector comparison
  const embeddingString = `[${queryEmbedding.join(',')}]`;
  
  // Get current embedding model to filter chunks
  const provider = getEmbeddingProvider();
  const embeddingModelEnum = getEmbeddingModelEnum(provider.name);

  const chunks = await prisma.$queryRaw<
    Array<{ 
      id: string
      content: string
      title: string
      embeddingModel: string
      embeddingDimension: number
      distance: number
    }>
  >`
    SELECT 
      dc.id, 
      dc.content, 
      d.title,
      dc."embeddingModel",
      dc."embeddingDimension",
      (dc.embedding <=> ${embeddingString}::vector) as distance
    FROM "DocumentChunk" dc
    JOIN "Document" d ON dc."documentId" = d.id
    WHERE d."spaceId" = ${spaceId}::uuid
      AND dc."embeddingModel" = ${embeddingModelEnum}::"EmbeddingModel"
    ORDER BY distance ASC
    LIMIT ${limit};
  `;

  return chunks;
}
