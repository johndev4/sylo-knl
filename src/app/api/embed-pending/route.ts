import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { generateEmbeddings } from '@/lib/ai/embeddings';
import { isRateLimitError } from '@/lib/ai/utils/rate-limiter';

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
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authHeader = req.headers.get('authorization') ?? '';
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error('[EMBED-WORKER] CRON_SECRET env var is not set');
    return NextResponse.json(
      { error: 'Server misconfiguration' },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
    console.error('[EMBED-WORKER] Failed to fetch pending chunks:', fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
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
      console.error(
        '[EMBED-WORKER] Failed to fetch failed chunks for recovery:',
        failedError
      );
    } else if (failedChunks && failedChunks.length > 0) {
      chunks = failedChunks;
      console.log(
        `[EMBED-WORKER] Found ${chunks.length} previously failed chunk(s) to retry`
      );
    }
  }

  if (!chunks || chunks.length === 0) {
    return NextResponse.json({ processed: 0 });
  }

  console.log(`[EMBED-WORKER] Processing ${chunks.length} chunk(s)`);

  // ── Generate embeddings ───────────────────────────────────────────────────
  let embeddings: number[][];
  try {
    embeddings = await generateEmbeddings(chunks.map((c) => c.content));
  } catch (err: unknown) {
    const ids = chunks.map((c) => c.id);

    if (isRateLimitError(err)) {
      console.warn(
        '[EMBED-WORKER] Rate limit encountered. Leaving chunks as pending for next cron run.'
      );
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
        { status: 429 }
      );
    }

    // Mark batch as 'failed' for non-rate-limit errors so they don't loop endlessly
    await supabase
      .from('document_chunks')
      .update({ embedding_status: 'failed' })
      .in('id', ids);

    console.error(
      '[EMBED-WORKER] Non-recoverable embedding API error — marked batch as failed:',
      err
    );
    return NextResponse.json(
      { error: String(err), failedIds: ids },
      { status: 500 }
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
      console.error(
        `[EMBED-WORKER] Failed to update chunk ${chunks[i].id}:`,
        res.error
      );
    } else {
      successCount++;
    }
  });

  console.log(
    `[EMBED-WORKER] Done — ${successCount}/${chunks.length} chunk(s) embedded`
  );

  return NextResponse.json({ processed: successCount });
}
