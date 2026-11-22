import { createServiceClient } from '@/lib/supabase/service';
import { generateEmbeddings } from '@/lib/ai/embeddings';
import { isRateLimitError } from '@/lib/ai/utils/rate-limiter';
import { logger } from '@/lib/logging/logger';

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 1000;
const MAX_EXECUTION_TIME_MS = 50_000; // 50 seconds safety timeout for Next.js after()

/**
 * Background worker function to embed document chunks after a document is saved.
 * Designed to be called inside Next.js `after()` so it runs asynchronously
 * after the HTTP response / Server Action has returned to the user.
 *
 * Batches chunks into groups of 5 with proactive token pacing and reactive 429
 * backoff to stay safely within Google Free Tier rate limits (30,000 tokens/minute).
 *
 * If processing reaches the 50-second limit or hits a rate-limit cooldown,
 * remaining chunks are safely preserved as 'pending' for the scheduled cron worker
 * (`/api/embed-pending`) to finish over time.
 */
export async function processDocumentChunksInBackground(
  documentId: string
): Promise<void> {
  const startTime = Date.now();

  try {
    const supabase = createServiceClient();

    // Fetch pending or previously failed chunks for this specific document (self-healing)
    const { data: chunks, error: fetchError } = await supabase
      .from('document_chunks')
      .select('id, content')
      .eq('document_id', documentId)
      .in('embedding_status', ['pending', 'failed'])
      .order('created_at', { ascending: true });

    if (fetchError) {
      logger.error('Background embedding chunk query failed', {
        documentId,
        error: fetchError,
      });
      return;
    }

    if (!chunks || chunks.length === 0) {
      return;
    }

    // Process in batches
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      // Check execution timeout to stay safely within serverless / runtime bounds
      if (Date.now() - startTime > MAX_EXECUTION_TIME_MS) {
        // Ensure remaining chunks are marked as 'pending' so cron can pick them up
        const { error: deferError } = await supabase
          .from('document_chunks')
          .update({ embedding_status: 'pending' })
          .in(
            'id',
            chunks.slice(i).map((c) => c.id)
          );
        if (deferError) {
          logger.error('Background embedding deferral failed', {
            documentId,
            error: deferError,
          });
        }
        return;
      }

      const batch = chunks.slice(i, i + BATCH_SIZE);

      try {
        const embeddings = await generateEmbeddings(
          batch.map((c) => c.content)
        );

        // Parallelized updates (Vercel React Best Practices: async-parallel)
        const updateResults = await Promise.all(
          batch.map((chunk, idx) =>
            supabase
              .from('document_chunks')
              .update({
                embedding: JSON.stringify(embeddings[idx]),
                embedding_status: 'done',
              })
              .eq('id', chunk.id)
          )
        );
        const updateErrors = updateResults.flatMap((result) =>
          result.error ? [result.error] : []
        );
        if (updateErrors.length > 0) {
          logger.error('Background embedding chunk updates failed', {
            documentId,
            failedCount: updateErrors.length,
            errors: updateErrors,
          });
        }
      } catch (batchError) {
        if (isRateLimitError(batchError)) {
          // Preserve current and remaining batches as 'pending' so the cron worker finishes them
          const { error: deferError } = await supabase
            .from('document_chunks')
            .update({ embedding_status: 'pending' })
            .in(
              'id',
              chunks.slice(i).map((c) => c.id)
            );
          if (deferError) {
            logger.error('Background embedding rate-limit deferral failed', {
              documentId,
              error: deferError,
            });
          } else {
            logger.warn('Background embedding paused due to rate limiting', {
              documentId,
              deferredChunkCount: chunks.length - i,
            });
          }
          return;
        }

        // Mark only this specific unrecoverable batch as failed
        const { error: markFailedError } = await supabase
          .from('document_chunks')
          .update({ embedding_status: 'failed' })
          .in(
            'id',
            batch.map((c) => c.id)
          );
        logger.error('Background embedding batch failed', {
          documentId,
          batchSize: batch.length,
          error: batchError,
          ...(markFailedError ? { markFailedError } : {}),
        });
      }

      // Add a rate-limiting delay between batches if more remain
      if (i + BATCH_SIZE < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }
  } catch (error: unknown) {
    logger.error('Background embedding task failed unexpectedly', {
      documentId,
      error,
    });
  }
}
