/**
 * Provider-agnostic embeddings core interface.
 * All embedding calls delegate to the active provider.
 *
 * These functions maintain backward compatibility with existing code
 * while now supporting multiple providers (Google, Ollama, etc.).
 */

import { getEmbeddingProvider } from './core/provider-factory';

/**
 * Generate a single embedding for a piece of text (e.g., a search query)
 */
export async function generateEmbedding(value: string): Promise<number[]> {
  const provider = getEmbeddingProvider();
  return provider.embed(value);
}

/**
 * Generate embeddings for multiple text chunks efficiently
 */
export async function generateEmbeddings(values: string[]): Promise<number[][]> {
  const provider = getEmbeddingProvider();
  return provider.embedMany(values);
}
