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
  attachDocumentLinks,
  retrieveRelevantChunks,
  retrieveChunksByTags,
  retrieveChunksByKeywords,
  mergeAndRankChunks,
} from './retrieve';
import {
  buildPromptContext,
  buildSystemPrompt,
  buildConversationalSystemPrompt,
  buildOutOfScopeSystemPrompt,
  buildDocumentActionSystemPrompt,
  buildClarificationSystemPrompt,
  buildCorrectionVerificationSystemPrompt,
} from './context-builder';
import { analyzeChatQuery } from './query-analyzer';
import type { ScopedRetrievalFilters } from './retrieve';
import { logger } from '@/lib/logging/logger';
import { logDurationMs } from '@/lib/logging/request';

/**
 * Execute full enhanced RAG chat flow with chat memory, tag search, scope guardrails,
 * and document editor guidance.
 */
export async function* executeRAGChat(
  userQuery: string,
  libraryIds: string[],
  userMessages: Array<{ role: 'user' | 'assistant'; content: string }>,
  selectedLibraryNames: string[],
  mentionScope?: ScopedRetrievalFilters,
  requestId?: string
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

    const hasMentionScope =
      !!mentionScope &&
      (mentionScope.documentIds.length > 0 || mentionScope.tags.length > 0);

    // Step 2b: User correction — verify claim against documents before agreeing or disagreeing
    if (analysis.isUserCorrection) {
      logger.info('User correction detected — running verification retrieval', {
        requestId,
      });
      const correctionQuery =
        analysis.correctionSearchQuery || analysis.standaloneQuery || userQuery;
      const retrievalTags = hasMentionScope
        ? mentionScope.tags
        : analysis.tagKeywords;

      const [vectorChunks, tagChunks, keywordChunks] = await Promise.all([
        (async () => {
          try {
            const queryEmbedding = await generateEmbedding(correctionQuery);
            return await retrieveRelevantChunks(
              queryEmbedding,
              libraryIds,
              8,
              mentionScope
            );
          } catch (error: unknown) {
            logger.warn(
              'Correction vector retrieval failed; continuing with fallback results',
              { error }
            );
            return [];
          }
        })(),
        (async () => {
          if (!retrievalTags || retrievalTags.length === 0) {
            return [];
          }
          try {
            return await retrieveChunksByTags(libraryIds, retrievalTags, 8);
          } catch (error: unknown) {
            logger.warn(
              'Correction tag retrieval failed; continuing with fallback results',
              { error }
            );
            return [];
          }
        })(),
        (async () => {
          try {
            return await retrieveChunksByKeywords(
              correctionQuery,
              libraryIds,
              12,
              mentionScope
            );
          } catch (error: unknown) {
            logger.warn(
              'Correction keyword retrieval failed; continuing with fallback results',
              { error }
            );
            return [];
          }
        })(),
      ]);

      const mergedChunks = mergeAndRankChunks(
        vectorChunks,
        tagChunks,
        keywordChunks,
        12
      );
      const citedChunks = await attachDocumentLinks(mergedChunks, libraryIds);
      const contextContent = buildPromptContext(citedChunks);
      const correctionPrompt = buildCorrectionVerificationSystemPrompt(
        contextContent,
        selectedLibraryNames
      );

      for await (const chunk of streamAnswer(correctionPrompt, userMessages, {
        temperature: 0.1,
      })) {
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

    // Step 2d: If query lacks essential context and no @mention scope is provided, ask for clarification
    if (analysis.needsClarification && !hasMentionScope) {
      logger.info('Query clarification requested', { requestId });
      const clarificationPrompt = buildClarificationSystemPrompt(
        selectedLibraryNames,
        analysis.clarificationQuestion
      );
      for await (const chunk of streamAnswer(
        clarificationPrompt,
        userMessages
      )) {
        yield chunk;
      }
      return;
    }

    const retrievalLimit =
      /\b(?:all|every|list|which|between|before|after|during|year|total|count|compare|sort|filter)\b/i.test(
        effectiveQuery
      )
        ? 30
        : 12;
    const retrievalTags = hasMentionScope
      ? mentionScope.tags
      : analysis.tagKeywords;

    // Step 3: Run parallel hybrid retrieval (vector, tag, and lexical search)
    let vectorSearchDurationMs = 0;
    const [vectorChunks, tagChunks, keywordChunks] = await Promise.all([
      (async () => {
        const startedAt = performance.now();
        try {
          const queryEmbedding = await generateEmbedding(effectiveQuery);
          return await retrieveRelevantChunks(
            queryEmbedding,
            libraryIds,
            Math.min(8, retrievalLimit),
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
        } finally {
          vectorSearchDurationMs = logDurationMs(startedAt);
        }
      })(),
      (async () => {
        if (!retrievalTags || retrievalTags.length === 0) {
          return [];
        }
        try {
          return await retrieveChunksByTags(
            libraryIds,
            retrievalTags,
            Math.min(16, retrievalLimit)
          );
        } catch (error: unknown) {
          logger.warn('Tag retrieval failed; continuing without tag results', {
            error,
          });
          return [];
        }
      })(),
      (async () => {
        try {
          return await retrieveChunksByKeywords(
            effectiveQuery,
            libraryIds,
            retrievalLimit,
            mentionScope
          );
        } catch (error: unknown) {
          logger.warn(
            'Keyword retrieval failed; continuing without keyword results',
            { error }
          );
          return [];
        }
      })(),
    ]);

    logger.info('Hybrid search completed', {
      requestId,
      vectorResultCount: vectorChunks.length,
      tagResultCount: tagChunks.length,
      keywordResultCount: keywordChunks.length,
      durationMs: vectorSearchDurationMs,
      similarityScores: vectorChunks.map((chunk) => chunk.similarity),
    });

    // Step 4: Merge, deduplicate, and rank chunks
    const mergedChunks = mergeAndRankChunks(
      vectorChunks,
      tagChunks,
      keywordChunks,
      retrievalLimit
    );
    const citedChunks = await attachDocumentLinks(mergedChunks, libraryIds);

    // Only decline after searching the selected libraries. A scoped mention is
    // an explicit signal to search its documents even if query analysis was unsure.
    if (analysis.isOutOfScope && citedChunks.length === 0 && !hasMentionScope) {
      const outOfScopePrompt =
        buildOutOfScopeSystemPrompt(selectedLibraryNames);
      for await (const chunk of streamAnswer(outOfScopePrompt, userMessages)) {
        yield chunk;
      }
      return;
    }

    // Step 5: Build context from hybrid chunks with balanced grounding
    const contextContent = buildPromptContext(citedChunks);
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
