/**
 * Bulk embedding regeneration utility.
 * Used when switching embedding providers to update all existing document chunks.
 *
 * Usage:
 *   npx ts-node -P tsconfig.json scripts/regenerate-embeddings.ts
 *   Or call regenerateAllEmbeddings() programmatically
 */

import prisma from '@/lib/db';
import { getEmbeddingProvider } from '@/lib/ai/core/provider-factory';
import { generateEmbeddings } from '@/lib/ai/embeddings';

/**
 * Regenerate embeddings for all chunks using the current embedding provider
 * This is useful when switching embedding models/providers
 */
export async function regenerateAllEmbeddings(options?: {
  spaceId?: string; // Optional: regenerate only chunks in a specific space
  batchSize?: number; // Optional: batch size for processing
  dryRun?: boolean; // Optional: log what would be done without making changes
}): Promise<{
  success: boolean;
  totalProcessed: number;
  totalFailed: number;
  errors: Array<{ chunkId: string; error: string }>;
}> {
  const batchSize = options?.batchSize ?? 10;
  const isDryRun = options?.dryRun ?? false;
  const errors: Array<{ chunkId: string; error: string }> = [];
  let totalProcessed = 0;
  let totalFailed = 0;

  try {
    // Get current provider info
    const embeddingProvider = getEmbeddingProvider();
    const embeddingModelEnum = getEmbeddingModelEnumFromProvider(embeddingProvider.name);
    const embeddingDimension = embeddingProvider.dimension;

    console.log('[REGENERATE] Starting embedding regeneration');
    console.log(`[REGENERATE] Provider: ${embeddingProvider.name}`);
    console.log(`[REGENERATE] Model: ${embeddingModelEnum}`);
    console.log(`[REGENERATE] Dimension: ${embeddingDimension}`);
    console.log(`[REGENERATE] Batch size: ${batchSize}`);
    console.log(`[REGENERATE] Dry run: ${isDryRun}`);

    // Fetch all chunks (with optional space filter)
    const allChunks = await prisma.documentChunk.findMany({
      select: {
        id: true,
        content: true,
        document: {
          select: {
            spaceId: true,
          },
        },
      },
      ...(options?.spaceId && {
        where: {
          document: {
            spaceId: options.spaceId,
          },
        },
      }),
    });

    console.log(`[REGENERATE] Found ${allChunks.length} chunks to process`);

    // Process in batches
    for (let i = 0; i < allChunks.length; i += batchSize) {
      const batch = allChunks.slice(i, i + batchSize);
      console.log(`[REGENERATE] Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(allChunks.length / batchSize)}`);

      // Extract chunk contents
      const chunkContents = batch.map((chunk) => chunk.content);

      try {
        // Generate new embeddings
        const newEmbeddings = await generateEmbeddings(chunkContents);

        // Update chunks if not dry run
        if (!isDryRun) {
          for (let j = 0; j < batch.length; j++) {
            const chunk = batch[j];
            const embedding = newEmbeddings[j];
            const embeddingString = `[${embedding.join(',')}]`;

            try {
              // Use raw SQL for vector updates since Prisma doesn't support vector column updates directly
              await prisma.$executeRaw`
                UPDATE "DocumentChunk"
                SET 
                  "embedding" = ${embeddingString}::vector,
                  "embeddingModel" = ${embeddingModelEnum}::"EmbeddingModel",
                  "embeddingDimension" = ${embeddingDimension}
                WHERE "id" = ${chunk.id}::uuid
              `;

              totalProcessed++;
            } catch (error: any) {
              totalFailed++;
              errors.push({
                chunkId: chunk.id,
                error: `Failed to update: ${error.message}`,
              });
            }
          }
        } else {
          totalProcessed += batch.length;
        }
      } catch (error: any) {
        console.error(`[REGENERATE] Batch processing failed:`, error);
        totalFailed += batch.length;
        batch.forEach((chunk) => {
          errors.push({
            chunkId: chunk.id,
            error: `Batch error: ${error.message}`,
          });
        });
      }
    }

    console.log('[REGENERATE] Regeneration completed');
    console.log(`[REGENERATE] Total processed: ${totalProcessed}`);
    console.log(`[REGENERATE] Total failed: ${totalFailed}`);

    return {
      success: totalFailed === 0,
      totalProcessed,
      totalFailed,
      errors,
    };
  } catch (error: any) {
    console.error('[REGENERATE] Fatal error:', error);
    throw error;
  }
}

/**
 * Map provider name to EmbeddingModel enum value
 */
function getEmbeddingModelEnumFromProvider(providerName: string): string {
  const env = process.env.EMBEDDING_PROVIDER || process.env.LLM_PROVIDER || 'google';

  if (env === 'ollama') {
    const model = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';
    if (model === 'nomic-embed-text') {
      return 'OLLAMA_NOMIC_1536';
    }
    return 'OLLAMA_CUSTOM';
  }

  return 'GOOGLE_GEMINI_3072';
}

/**
 * Standalone CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');

  try {
    const result = await regenerateAllEmbeddings({
      dryRun: isDryRun,
    });

    if (result.success) {
      console.log('[CLI] ✅ All embeddings regenerated successfully');
    } else {
      console.log(`[CLI] ⚠️ Completed with ${result.totalFailed} errors`);
      if (result.errors.length > 0) {
        console.log('[CLI] Errors:');
        result.errors.slice(0, 10).forEach((err) => {
          console.log(`  - ${err.chunkId}: ${err.error}`);
        });
        if (result.errors.length > 10) {
          console.log(`  ... and ${result.errors.length - 10} more errors`);
        }
      }
    }

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('[CLI] Fatal error:', error);
    process.exit(1);
  }
}

// Run CLI if this file is executed directly
if (require.main === module) {
  main();
}
