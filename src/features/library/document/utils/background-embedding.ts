import { createServiceClient } from '@/lib/supabase/service';
import { generateEmbeddings } from '@/lib/ai/embeddings';

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 1000;

/**
 * Background worker function to embed document chunks after a document is saved.
 * Designed to be called inside Next.js `after()` so it runs asynchronously
 * after the HTTP response / Server Action has returned to the user.
 *
 * Batches chunks into groups of 5 with a 1-second delay between batches to stay
 * safely within Google Free Tier rate limits (30,000 tokens/minute).
 */
export async function processDocumentChunksInBackground(
  documentId: string
): Promise<void> {
  try {
    const supabase = createServiceClient();

    // Fetch pending chunks for this specific document
    const { data: pending, error: fetchError } = await supabase
      .from('document_chunks')
      .select('id, content')
      .eq('document_id', documentId)
      .eq('embedding_status', 'pending')
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error(
        `[ASYNC-EMBEDDING] Failed to fetch pending chunks for doc ${documentId}:`,
        fetchError
      );
      return;
    }

    if (!pending || pending.length === 0) {
      return;
    }

    console.log(
      `[ASYNC-EMBEDDING] Processing ${pending.length} chunk(s) for document ${documentId}`
    );

    // Process in batches
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);

      try {
        const embeddings = await generateEmbeddings(
          batch.map((c) => c.content)
        );

        // Parallelized updates (Vercel React Best Practices: async-parallel)
        await Promise.all(
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

        console.log(
          `[ASYNC-EMBEDDING] Embedded ${batch.length} chunk(s) for doc ${documentId} (${Math.min(i + BATCH_SIZE, pending.length)}/${pending.length})`
        );
      } catch (batchError) {
        console.error(
          `[ASYNC-EMBEDDING] Batch error for doc ${documentId}:`,
          batchError
        );

        // Mark as failed so they don't block subsequent operations
        await supabase
          .from('document_chunks')
          .update({ embedding_status: 'failed' })
          .in(
            'id',
            batch.map((c) => c.id)
          );
      }

      // Add a rate-limiting delay between batches if more remain
      if (i + BATCH_SIZE < pending.length) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      }
    }

    console.log(
      `[ASYNC-EMBEDDING] Completed indexing for document ${documentId}`
    );
  } catch (err) {
    console.error(
      `[ASYNC-EMBEDDING] Unexpected error processing doc ${documentId}:`,
      err
    );
  }
}
