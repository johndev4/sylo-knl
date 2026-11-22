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
import { AppError } from '@/lib/errors/app-error';
import { ERROR_CODES } from '@/lib/errors/error-codes';
import { createApiErrorResponse } from '@/lib/errors/error-handler';

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
  } catch (error: unknown) {
    return createApiErrorResponse(error, {
      requestId: requestContext.requestId,
      context: {
        ...requestContext,
        statusCode: 500,
      },
    });
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
    return createApiErrorResponse(new AppError(ERROR_CODES.INTERNAL_ERROR), {
      requestId: requestContext.requestId,
      context: { ...requestContext, statusCode: 500 },
    });
  }

  const expectedAuth = Buffer.from(`Bearer ${secret}`);
  const providedAuth = Buffer.from(authHeader);

  if (
    providedAuth.length !== expectedAuth.length ||
    !timingSafeEqual(providedAuth, expectedAuth)
  ) {
    return createApiErrorResponse(
      new AppError(ERROR_CODES.AUTHENTICATION_REQUIRED),
      {
        requestId: requestContext.requestId,
        context: { ...requestContext, statusCode: 401 },
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
    return createApiErrorResponse(
      new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        cause: fetchError,
      }),
      {
        requestId: requestContext.requestId,
        context: { ...requestContext, statusCode: 500 },
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
      return createApiErrorResponse(
        new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
          cause: failedError,
        }),
        {
          requestId: requestContext.requestId,
          context: { ...requestContext, statusCode: 500 },
        }
      );
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
      const { error: resetError } = await supabase
        .from('document_chunks')
        .update({ embedding_status: 'pending' })
        .in('id', ids);

      if (resetError) {
        return createApiErrorResponse(
          new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
            cause: new AggregateError([err, resetError]),
          }),
          {
            requestId: requestContext.requestId,
            context: { ...requestContext, statusCode: 500 },
          }
        );
      }

      return createApiErrorResponse(new AppError(ERROR_CODES.RATE_LIMITED), {
        requestId: requestContext.requestId,
        context: {
          ...requestContext,
          statusCode: 429,
          chunkCount: chunks.length,
        },
      });
    }

    // Mark batch as 'failed' for non-rate-limit errors so they don't loop endlessly.
    const { error: markFailedError } = await supabase
      .from('document_chunks')
      .update({ embedding_status: 'failed' })
      .in('id', ids);

    if (markFailedError) {
      return createApiErrorResponse(
        new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
          cause: new AggregateError([err, markFailedError]),
        }),
        {
          requestId: requestContext.requestId,
          context: { ...requestContext, statusCode: 500 },
        }
      );
    }

    return createApiErrorResponse(
      new AppError(ERROR_CODES.INTERNAL_ERROR, undefined, { cause: err }),
      {
        requestId: requestContext.requestId,
        context: {
          ...requestContext,
          statusCode: 500,
          chunkCount: chunks.length,
        },
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
  const failedUpdates = results.flatMap((result, index) =>
    result.error ? [{ index, error: result.error }] : []
  );
  const successCount = results.length - failedUpdates.length;

  if (failedUpdates.length > 0) {
    return createApiErrorResponse(
      new AppError(ERROR_CODES.DATABASE_ERROR, undefined, {
        cause: new AggregateError(
          failedUpdates.map(({ error }) => error),
          'Some embedding updates failed'
        ),
      }),
      {
        requestId: requestContext.requestId,
        context: {
          ...requestContext,
          statusCode: 500,
          failedChunkCount: failedUpdates.length,
        },
      }
    );
  }

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
