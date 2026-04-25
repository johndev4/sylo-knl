/**
 * RAG pipeline orchestration.
 * Coordinates the full flow: query embedding → retrieval → context building → LLM streaming.
 */

import { generateEmbedding } from '@/lib/ai/embeddings';
import { streamAnswer } from '@/lib/ai/core/llm';
import type { StreamChunk } from '@/lib/ai/types/provider.types';
import { retrieveRelevantChunks } from './retrieve';
import { buildPromptContext, buildSystemPrompt } from './context-builder';

/**
 * Execute full RAG chat flow
 * Returns a stream of chunks ready for HTTP response
 */
export async function* executeRAGChat(
  userQuery: string,
  libraryId: string,
  userMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
): AsyncIterable<StreamChunk> {
  try {
    // Step 1: Generate embedding for query
    const queryEmbedding = await generateEmbedding(userQuery);
    console.log('[RAG] Query embedding generated, dimension:', queryEmbedding.length);

    // Step 2: Retrieve relevant chunks
    const chunks = await retrieveRelevantChunks(queryEmbedding, libraryId, 5);
    console.log('[RAG] Retrieved chunks:', chunks.length);

    // Step 3: Build context from chunks
    const contextContent = buildPromptContext(chunks);
    const systemPrompt = buildSystemPrompt(contextContent);

    // Step 4: Stream LLM response
    for await (const chunk of streamAnswer(systemPrompt, userMessages)) {
      yield chunk;
    }
  } catch (error: any) {
    yield {
      type: 'error',
      error: `RAG pipeline error: ${error.message}`,
    };
  }
}
