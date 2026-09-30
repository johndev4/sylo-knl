import { createClient } from '@supabase/supabase-js';
import { embedMany } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOllama } from 'ollama-ai-provider-v2';
import { config as loadEnv } from 'dotenv';
import {
  blockNoteJsonToMarkdownAndPlainText,
  markdownToBlockNoteJson,
  parseBlockNoteJson,
} from '../src/lib/document-converters.ts';
import { chunkText } from '../src/lib/ai/chunking.ts';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

function parseArguments(args) {
  const options = {
    apply: false,
    force: false,
    libraryId: '',
    batchSize: 25,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--apply') options.apply = true;
    else if (argument === '--force') options.force = true;
    else if (argument === '--help' || argument === '-h') options.help = true;
    else if (argument === '--library-id') options.libraryId = args[++index] ?? '';
    else if (argument === '--batch-size') {
      options.batchSize = Number(args[++index]);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (!options.help && !options.libraryId) {
    throw new Error('--library-id is required');
  }
  if (!Number.isInteger(options.batchSize) || options.batchSize < 1) {
    throw new Error('--batch-size must be a positive integer');
  }
  if (options.force && !options.apply) {
    throw new Error('--force requires --apply');
  }

  return options;
}

function showHelp() {
  console.log(
    [
      'Rebuild legacy document JSON and plain-text chunks.',
      '',
      'Usage:',
      '  node --experimental-strip-types scripts/rebuild-document-content.mjs --library-id <uuid> [--batch-size 25]',
      '  node --experimental-strip-types scripts/rebuild-document-content.mjs --library-id <uuid> --apply [--force]',
      '',
      'Without --apply, the script performs a read-only dry run. --force rebuilds documents that already have content_json.',
    ].join('\n')
  );
}

function countBlocks(blocks) {
  return blocks.reduce(
    (count, block) => count + 1 + countBlocks(block.children ?? []),
    0
  );
}

async function generateBatchEmbeddings(texts) {
  const providerName =
    process.env.EMBEDDING_PROVIDER ?? process.env.LLM_PROVIDER ?? 'google';

  if (providerName === 'google') {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) throw new Error('Google embedding credentials are missing');
    const provider = createGoogleGenerativeAI({ apiKey });
    const result = await embedMany({
      model: provider.textEmbeddingModel('gemini-embedding-001'),
      values: texts,
    });
    return result.embeddings;
  }

  if (providerName === 'ollama') {
    const provider = createOllama({
      baseURL: (process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434').replace(
        /\/$/,
        ''
      ),
    });
    const model = process.env.OLLAMA_EMBEDDING_MODEL ?? 'nomic-embed-text';
    const result = await embedMany({
      model: provider.textEmbeddingModel(model),
      values: texts,
    });
    return result.embeddings;
  }

  throw new Error(`Unsupported embedding provider: ${providerName}`);
}

async function deleteInsertedChunks(client, chunkIds) {
  if (chunkIds.length === 0) return;
  const { error } = await client
    .from('document_chunks')
    .delete()
    .in('id', chunkIds);
  if (error) {
    throw new Error('Failed to roll back newly inserted document chunks');
  }
}

async function processDocument(client, document, options) {
  const blocks = document.content_json
    ? parseBlockNoteJson(document.content_json)
    : await markdownToBlockNoteJson(document.content ?? '');
  const { plainText } = await blockNoteJsonToMarkdownAndPlainText(blocks);
  const chunks = chunkText(plainText);

  if (chunks.length === 0) {
    throw new Error('Document has no searchable plain text');
  }

  if (!options.apply) {
    return { chunkCount: chunks.length, blockCount: countBlocks(blocks) };
  }

  const embeddings = await generateBatchEmbeddings(chunks);
  if (embeddings.length !== chunks.length) {
    throw new Error('Embedding count does not match chunk count');
  }

  const { data: oldChunks, error: oldChunksError } = await client
    .from('document_chunks')
    .select('id')
    .eq('document_id', document.id);
  if (oldChunksError) throw oldChunksError;

  const { data: newChunks, error: insertError } = await client
    .from('document_chunks')
    .insert(
      chunks.map((content, index) => ({
        document_id: document.id,
        content,
        embedding: `[${embeddings[index].join(',')}]`,
      }))
    )
    .select('id');

  if (insertError || !newChunks) {
    throw insertError ?? new Error('Failed to insert replacement chunks');
  }

  if (!document.content_json) {
    const { data: updatedDocument, error: updateError } = await client
      .from('documents')
      .update({ content_json: blocks })
      .eq('id', document.id)
      .is('content_json', null)
      .select('id')
      .maybeSingle();

    if (updateError || !updatedDocument) {
      await deleteInsertedChunks(
        client,
        newChunks.map((chunk) => chunk.id)
      );
      throw updateError ?? new Error('Document changed during migration');
    }
  }

  const oldChunkIds = (oldChunks ?? []).map((chunk) => chunk.id);
  if (oldChunkIds.length > 0) {
    const { error: deleteError } = await client
      .from('document_chunks')
      .delete()
      .in('id', oldChunkIds);

    if (deleteError) {
      throw new Error(
        'Replacement chunks and JSON were saved, but old chunks remain; rerun with --force after fixing the database error'
      );
    }
  }

  return { chunkCount: chunks.length, blockCount: countBlocks(blocks) };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    showHelp();
    return;
  }

  const supabaseUrl =
    process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SECRET_KEY;
  if (!supabaseUrl || !serviceKey) {
    throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY are required');
  }

  const client = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const mode = options.apply ? 'APPLY' : 'DRY RUN';
  console.log(`${mode}: library=${options.libraryId}, batchSize=${options.batchSize}`);

  let cursor = '';
  let processed = 0;
  let failed = 0;

  while (true) {
    let query = client
      .from('documents')
      .select('id, content, content_json')
      .eq('library_id', options.libraryId)
      .is('deleted_at', null)
      .order('id')
      .limit(options.batchSize);

    if (cursor) query = query.gt('id', cursor);
    if (!options.force) query = query.is('content_json', null);

    const { data: documents, error } = await query;
    if (error) throw error;
    if (!documents || documents.length === 0) break;

    for (const document of documents) {
      cursor = document.id;
      try {
        const result = await processDocument(client, document, options);
        processed += 1;
        console.log(
          `${mode}: document=${document.id}, blocks=${result.blockCount}, chunks=${result.chunkCount}`
        );
      } catch (error) {
        failed += 1;
        console.error(
          `FAILED: document=${document.id}: ${error instanceof Error ? error.name : 'Unknown error'}`
        );
      }
    }
  }

  console.log(`${mode} complete: processed=${processed}, failed=${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Migration failed');
  process.exitCode = 1;
});