#!/usr/bin/env node

/**
 * CLI script for regenerating all embeddings when switching providers
 * Usage: npm run regenerate:embeddings [--dry-run]
 */

import { regenerateAllEmbeddings } from '../src/lib/ai/rag/migrate-embeddings';

async function main() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run');
  const spaceId = args.find((arg) => arg.startsWith('--space-id='))?.split('=')[1];

  console.log('🔄 Starting embedding regeneration...');
  console.log(`📋 Dry run: ${isDryRun}`);
  if (spaceId) console.log(`📍 Space ID: ${spaceId}`);

  try {
    const result = await regenerateAllEmbeddings({
      spaceId,
      dryRun: isDryRun,
      batchSize: 10,
    });

    console.log('\n' + '='.repeat(60));
    if (result.success) {
      console.log('✅ All embeddings regenerated successfully!');
      console.log(`📊 Total processed: ${result.totalProcessed}`);
    } else {
      console.log(`⚠️ Completed with ${result.totalFailed} errors`);
      console.log(`📊 Total processed: ${result.totalProcessed}`);
      console.log(`📊 Total failed: ${result.totalFailed}`);

      if (result.errors.length > 0) {
        console.log('\n❌ Errors:');
        result.errors.slice(0, 10).forEach((err, idx) => {
          console.log(`  ${idx + 1}. Chunk ${err.chunkId}: ${err.error}`);
        });
        if (result.errors.length > 10) {
          console.log(`  ... and ${result.errors.length - 10} more errors`);
        }
      }
    }

    process.exit(result.success ? 0 : 1);
  } catch (error: any) {
    console.error('\n💥 Fatal error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
