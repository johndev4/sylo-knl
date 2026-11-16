/**
 * RAG pipeline orchestration.
 * Coordinates the full flow:
 * 1. Query analysis (conversation memory + query reformulation + tag keyword extraction + intent classification)
 * 2. Document action fast-path (guides user to Library Document Editor and drafts content)
 * 3. Scope guardrail fast-path (politely declines off-topic requests and explains capabilities)
 * 4. Conversational-only fast-path (bypasses retrieval if message is purely conversational)
 * 5. Parallel hybrid retrieval (vector similarity search + tag-based keyword search)
 * 6. Deduplication and hybrid ranking
 * 7. Context building with balanced grounding
 * 8. LLM streaming response
 */

import { generateEmbedding } from '@/lib/ai/embeddings';
import { streamAnswer } from '@/lib/ai/core/llm';
import type { StreamChunk } from '@/lib/ai/types/provider-types';
import {
  retrieveRelevantChunks,
  retrieveChunksByTags,
  mergeAndRankChunks,
} from './retrieve';
import {
  buildPromptContext,
  buildSystemPrompt,
  buildConversationalSystemPrompt,
  buildOutOfScopeSystemPrompt,
  buildDocumentActionSystemPrompt,
} from './context-builder';
import { analyzeChatQuery } from './query-analyzer';

/**
 * Execute full enhanced RAG chat flow with chat memory, tag search, scope guardrails,
 * and document editor guidance.
 */
export async function* executeRAGChat(
  userQuery: string,
  libraryIds: string[],
  userMessages: Array<{ role: 'user' | 'assistant'; content: string }>
): AsyncIterable<StreamChunk> {
  try {
    // Step 1: Analyze query with conversational memory and intent detection
    const analysis = await analyzeChatQuery(userMessages);
    console.log('[RAG] Query analysis result:', {
      isDocumentActionRequest: analysis.isDocumentActionRequest,
      isOutOfScope: analysis.isOutOfScope,
      isConversationalOnly: analysis.isConversationalOnly,
      standaloneQuery: analysis.standaloneQuery,
      tagKeywords: analysis.tagKeywords,
    });

    // Step 2a: If document creation / update requested, guide to editor and draft content
    if (analysis.isDocumentActionRequest) {
      console.log(
        '[RAG] Handling document creation/addition request with editor guidance'
      );
      const docActionPrompt = buildDocumentActionSystemPrompt();
      for await (const chunk of streamAnswer(docActionPrompt, userMessages)) {
        yield chunk;
      }
      return;
    }

    // Step 2b: If out-of-scope, decline politely and explain capabilities
    if (analysis.isOutOfScope) {
      console.log('[RAG] Handling as out-of-scope request');
      const outOfScopePrompt = buildOutOfScopeSystemPrompt();
      for await (const chunk of streamAnswer(outOfScopePrompt, userMessages)) {
        yield chunk;
      }
      return;
    }

    // Step 2c: If purely conversational, stream directly from conversation memory
    if (analysis.isConversationalOnly) {
      console.log('[RAG] Handling as conversational-only from chat memory');
      const conversationalPrompt = buildConversationalSystemPrompt();
      for await (const chunk of streamAnswer(
        conversationalPrompt,
        userMessages
      )) {
        yield chunk;
      }
      return;
    }

    const effectiveQuery = analysis.standaloneQuery || userQuery;

    // Step 3: Run parallel hybrid retrieval (vector search + tag keyword search)
    const [vectorChunks, tagChunks] = await Promise.all([
      (async () => {
        try {
          const queryEmbedding = await generateEmbedding(effectiveQuery);
          return await retrieveRelevantChunks(queryEmbedding, libraryIds, 5);
        } catch (error) {
          console.error('[RAG] Vector retrieval failed:', error);
          return [];
        }
      })(),
      (async () => {
        if (!analysis.tagKeywords || analysis.tagKeywords.length === 0) {
          return [];
        }
        try {
          return await retrieveChunksByTags(
            libraryIds,
            analysis.tagKeywords,
            4
          );
        } catch (error) {
          console.error('[RAG] Tag keyword retrieval failed:', error);
          return [];
        }
      })(),
    ]);

    console.log(
      `[RAG] Retrieved chunks - Vector: ${vectorChunks.length}, Tags: ${tagChunks.length}`
    );

    // Step 4: Merge, deduplicate, and rank chunks
    const mergedChunks = mergeAndRankChunks(vectorChunks, tagChunks, 7);
    console.log(`[RAG] Merged chunks for context: ${mergedChunks.length}`);

    // Step 5: Build context from hybrid chunks with balanced grounding
    const contextContent = buildPromptContext(mergedChunks);
    const systemPrompt = buildSystemPrompt(contextContent);

    // Step 6: Stream LLM response
    for await (const chunk of streamAnswer(systemPrompt, userMessages)) {
      yield chunk;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('[RAG] Pipeline exception:', error);
    yield {
      type: 'error',
      error: `RAG pipeline error: ${error.message}`,
    };
  }
}
