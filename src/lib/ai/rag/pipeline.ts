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
import type { ScopedRetrievalFilters } from './retrieve';
import { logger } from '@/lib/logging/logger';

/**
 * Execute full enhanced RAG chat flow with chat memory, tag search, scope guardrails,
 * and document editor guidance.
 */
export async function* executeRAGChat(
  userQuery: string,
  libraryIds: string[],
  userMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  selectedLibraryNames: string[],
  mentionScope?: ScopedRetrievalFilters
): AsyncIterable<StreamChunk> {
  try {
    // Step 1: Analyze query with conversational memory and intent detection
    const analysis = await analyzeChatQuery(userMessages);

    // Step 2a: If document creation / update requested, guide to editor and draft content
    if (analysis.isDocumentActionRequest) {
      const docActionPrompt =
        buildDocumentActionSystemPrompt(selectedLibraryNames);
      for await (const chunk of streamAnswer(docActionPrompt, userMessages)) {
        yield chunk;
      }
      return;
    }

    // Step 2b: If out-of-scope, decline politely and explain capabilities
    if (analysis.isOutOfScope) {
      const outOfScopePrompt =
        buildOutOfScopeSystemPrompt(selectedLibraryNames);
      for await (const chunk of streamAnswer(outOfScopePrompt, userMessages)) {
        yield chunk;
      }
      return;
    }

    // Step 2c: If purely conversational, stream directly from conversation memory
    if (analysis.isConversationalOnly) {
      const conversationalPrompt =
        buildConversationalSystemPrompt(selectedLibraryNames);
      for await (const chunk of streamAnswer(
        conversationalPrompt,
        userMessages
      )) {
        yield chunk;
      }
      return;
    }

    const effectiveQuery = analysis.standaloneQuery || userQuery;
    const hasMentionScope =
      !!mentionScope &&
      (mentionScope.documentIds.length > 0 || mentionScope.tags.length > 0);
    const retrievalTags = hasMentionScope
      ? mentionScope.tags
      : analysis.tagKeywords;

    // Step 3: Run parallel hybrid retrieval (vector search + tag keyword search)
    const [vectorChunks, tagChunks] = await Promise.all([
      (async () => {
        try {
          const queryEmbedding = await generateEmbedding(effectiveQuery);
          return await retrieveRelevantChunks(
            queryEmbedding,
            libraryIds,
            5,
            mentionScope
          );
        } catch (error: unknown) {
          logger.warn(
            'Vector retrieval failed; continuing without vector results',
            {
              error,
            }
          );
          return [];
        }
      })(),
      (async () => {
        if (!retrievalTags || retrievalTags.length === 0) {
          return [];
        }
        try {
          return await retrieveChunksByTags(libraryIds, retrievalTags, 4);
        } catch (error: unknown) {
          logger.warn('Tag retrieval failed; continuing without tag results', {
            error,
          });
          return [];
        }
      })(),
    ]);

    // Step 4: Merge, deduplicate, and rank chunks
    const mergedChunks = mergeAndRankChunks(vectorChunks, tagChunks, 7);

    // Step 5: Build context from hybrid chunks with balanced grounding
    const contextContent = buildPromptContext(mergedChunks);
    const systemPrompt = buildSystemPrompt(
      contextContent,
      selectedLibraryNames
    );

    // Step 6: Stream LLM response
    for await (const chunk of streamAnswer(systemPrompt, userMessages)) {
      yield chunk;
    }
  } catch (error: unknown) {
    logger.error('RAG pipeline failed', { error });
    yield {
      type: 'error',
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}
