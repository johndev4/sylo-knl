import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { generateEmbeddings } from '@/lib/ai/embeddings';
import { isRateLimitError } from '@/lib/ai/utils/rate-limiter';
import { logger } from '@/lib/logging/logger';
import {
  getRequestContext,
  isSlowDuration,
  logDurationMs,
  REQUEST_ID_HEADER,
} from '@/lib/logging/request';

/**
 * Number of pending chunks to embed per cron invocation.
 * Kept small (5) to stay safely within Google's free-tier rate limit
 * of 30,000 tokens/minute. Each 1,000-char chunk ≈ ~250 tokens,
 * so 5 chunks ≈ 1,250 tokens — well within the per-minute limit.
 */
const BATCH_SIZE = 5;

/**
 * POST /api/embed-pending
 *
 * Internal worker endpoint called by pg_cron every minute.
 * Picks up the oldest BATCH_SIZE chunks with embedding_status = 'pending'
 * (or recoverable 'failed' chunks if no pending chunks exist),
 * generates embeddings via the configured provider, and writes them back.
 *
 * Authentication: Bearer token via CRON_SECRET env var.
 * Never expose this endpoint publicly without the secret.
 */
export async function POST(req: NextRequest) {
  const requestContext = getRequestContext(req);
  try {
    return await handlePost(req, requestContext);
  } catch (error) {
    logger.error('Embedding worker unexpected failure', {
      ...requestContext,
      error,
    });
    return NextResponse.json(
      { error: 'Internal server error' },
      {
        status: 500,
        headers: { [REQUEST_ID_HEADER]: requestContext.requestId },
      }
    );
  }
}

async function handlePost(
  req: NextRequest,
  requestContext: ReturnType<typeof getRequestContext>
) {
  const startedAt = performance.now();
  logger.info('Embedding worker request received', requestContext);

  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    logger.fatal('Embedding worker secret is not configured', {
      ...requestContext,
      statusCode: 500,
    });
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      {
        status: 500,
        headers: { [REQUEST_ID_HEADER]: requestContext.requestId },
      }
    );
  }

  const expectedAuth = Buffer.from(`Bearer ${secret}`);
  const providedAuth = Buffer.from(authHeader);

  if (
    providedAuth.length !== expectedAuth.length ||
    !timingSafeEqual(providedAuth, expectedAuth)
  ) {
    logger.warn('Embedding worker authentication failed', {
      ...requestContext,
      statusCode: 401,
    });
    return NextResponse.json(
      { error: 'Unauthorized' },
      {
        status: 401,
        headers: { [REQUEST_ID_HEADER]: requestContext.requestId },
      }
    );
  }

  // ── Fetch oldest pending chunks (or self-heal failed chunks) ─────────────
  const supabase = createServiceClient();

  // Try pending chunks first
  const { data: pendingChunks, error: fetchError } = await supabase
    .from('document_chunks')
    .select('id, content')
    .eq('embedding_status', 'pending')
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE);

  if (fetchError) {
    logger.error('Embedding worker pending chunk query failed', {
      ...requestContext,
      error: fetchError,
    });
    return NextResponse.json(
      { error: 'Failed to load embedding work' },
      {
        status: 500,
        headers: { [REQUEST_ID_HEADER]: requestContext.requestId },
      }
    );
  }

  let chunks = pendingChunks;

  // If no pending chunks, attempt to recover older failed chunks
  if (!chunks || chunks.length === 0) {
    const { data: failedChunks, error: failedError } = await supabase
      .from('document_chunks')
      .select('id, content')
      .eq('embedding_status', 'failed')
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE);

    if (failedError) {
      logger.error('Embedding worker recovery chunk query failed', {
        ...requestContext,
        error: failedError,
      });
    } else if (failedChunks && failedChunks.length > 0) {
      chunks = failedChunks;
      logger.info('Embedding worker recovering failed chunks', {
        ...requestContext,
        chunkCount: chunks.length,
      });
    }
  }

  if (!chunks || chunks.length === 0) {
    logger.info('Embedding worker completed', {
      ...requestContext,
      statusCode: 200,
      duration: logDurationMs(startedAt),
      processed: 0,
    });
    return NextResponse.json(
      { processed: 0 },
      { headers: { [REQUEST_ID_HEADER]: requestContext.requestId } }
    );
  }

  logger.info('Embedding worker processing batch', {
    ...requestContext,
    chunkCount: chunks.length,
  });

  // ── Generate embeddings ───────────────────────────────────────────────────
  let embeddings: number[][];
  try {
    embeddings = await generateEmbeddings(chunks.map((c) => c.content));
  } catch (err: unknown) {
    const ids = chunks.map((c) => c.id);

    if (isRateLimitError(err)) {
      logger.warn('Embedding worker rate limited', {
        ...requestContext,
        chunkCount: chunks.length,
      });
      // Ensure they stay as pending so next cron execution picks them up
      await supabase
        .from('document_chunks')
        .update({ embedding_status: 'pending' })
        .in('id', ids);

      return NextResponse.json(
        {
          message: 'Rate limit encountered, deferred to next run',
          processed: 0,
        },
        {
          status: 429,
          headers: { [REQUEST_ID_HEADER]: requestContext.requestId },
        }
      );
    }

    // Mark batch as 'failed' for non-rate-limit errors so they don't loop endlessly
    await supabase
      .from('document_chunks')
      .update({ embedding_status: 'failed' })
      .in('id', ids);

    logger.error('Embedding worker provider request failed', {
      ...requestContext,
      chunkCount: chunks.length,
      error: err,
    });
    return NextResponse.json(
      { error: 'Embedding generation failed' },
      {
        status: 500,
        headers: { [REQUEST_ID_HEADER]: requestContext.requestId },
      }
    );
  }

  // ── Write embeddings back (parallelized updates) ──────────────────────────
  const updatePromises = chunks.map((chunk, i) =>
    supabase
      .from('document_chunks')
      .update({
        embedding: JSON.stringify(embeddings[i]),
        embedding_status: 'done',
      })
      .eq('id', chunk.id)
  );

  const results = await Promise.all(updatePromises);

  let successCount = 0;
  results.forEach((res, i) => {
    if (res.error) {
      logger.error('Embedding worker chunk update failed', {
        ...requestContext,
        chunkIndex: i,
        error: res.error,
      });
    } else {
      successCount++;
    }
  });

  logger.info('Embedding worker batch completed', {
    ...requestContext,
    statusCode: 200,
    duration: logDurationMs(startedAt),
    successCount,
    chunkCount: chunks.length,
  });
  const duration = logDurationMs(startedAt);
  if (isSlowDuration(duration, 'operation')) {
    logger.warn('Slow embedding worker batch detected', {
      ...requestContext,
      duration,
      chunkCount: chunks.length,
    });
  }

  return NextResponse.json(
    { processed: successCount },
    { headers: { [REQUEST_ID_HEADER]: requestContext.requestId } }
  );
}
