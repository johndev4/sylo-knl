/**
 * Context building for RAG prompts.
 * Formats retrieved chunks into a system prompt context string.
 */

import type { RetrievedChunk } from './retrieve';

/**
 * Build system prompt with retrieved document context
 */
export function buildPromptContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) {
    return 'No relevant documents found.';
  }

  return chunks
    .map((chunk) => `[Source: ${chunk.title}]\n${chunk.content}`)
    .join('\n\n');
}

/**
 * Build complete system prompt for RAG
 */
export function buildSystemPrompt(contextContent: string): string {
  return `You are a helpful knowledge assistant. Answer the user's question based strictly on the provided context below. If the context does not contain the answer, say "I don't have enough information to answer that based on the provided documents."

Context Documents:
${contextContent}
`;
}
