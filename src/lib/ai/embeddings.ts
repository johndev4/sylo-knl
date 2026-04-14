import { embed, embedMany } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'

// Use a custom instance pointing to the stable v1 API.
// Note: text-embedding-004 is retired in 2026 context, so we use gemini-embedding-001.
export const googleAI = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
  baseURL: 'https://generativelanguage.googleapis.com/v1beta',
})

const EMBEDDING_MODEL = googleAI.textEmbeddingModel('gemini-embedding-001')

/**
 * Generate a single embedding for a piece of text (e.g., a search query)
 */
export async function generateEmbedding(value: string): Promise<number[]> {
  const result = await embed({
    model: EMBEDDING_MODEL,
    value,
  })

  return result.embedding
}

/**
 * Generate embeddings for multiple text chunks efficiently
 */
export async function generateEmbeddings(values: string[]): Promise<number[][]> {
  const result = await embedMany({
    model: EMBEDDING_MODEL,
    values,
  })

  return result.embeddings
}
