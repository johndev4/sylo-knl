import { createClient } from "@supabase/supabase-js";
import { embedMany } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOllama } from "ollama-ai-provider-v2";
import { config as loadEnv } from "dotenv";

// Load environment variables from project root.
// Stage is resolved from --env flag (e.g. --env production → .env.production).
// Falls back to .env.local when --env is not provided.
const envStage = (() => {
  const idx = process.argv.indexOf("--env");
  return idx !== -1 ? process.argv[idx + 1] : null;
})();
loadEnv({ path: envStage ? `.env.${envStage}` : ".env.local" });
loadEnv({ path: ".env" });

function getTimestamp() {
  return new Date().toISOString().replace("T", " ").substring(0, 19);
}

function log(msg) {
  console.log(`[${getTimestamp()}] [INFO] ${msg}`);
}

function logWarn(msg) {
  console.warn(`[${getTimestamp()}] [WARNING] ${msg}`);
}

function logError(msg) {
  console.error(`[${getTimestamp()}] [ERROR] ${msg}`);
}

function parseArguments(args) {
  const options = {
    env: envStage ?? "local",
    libraryId: "",
    newModel: "",
    batchSize: 100,
    apply: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--help" || argument === "-h") {
      options.help = true;
    } else if (argument === "--env") {
      index += 1; // already consumed at module load time; skip value
    } else if (argument === "--library-id") {
      options.libraryId = args[++index] ?? "";
    } else if (argument === "--new-model") {
      options.newModel = args[++index] ?? "";
    } else if (argument === "--batch-size") {
      options.batchSize = Number(args[++index]);
    } else if (argument === "--apply") {
      options.apply = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  if (options.help) {
    return options;
  }

  if (!options.libraryId) {
    throw new Error("--library-id is required");
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(options.libraryId)) {
    throw new Error(`Invalid UUID: ${options.libraryId}`);
  }

  if (!Number.isInteger(options.batchSize) || options.batchSize < 1) {
    throw new Error("--batch-size must be a positive integer");
  }

  return options;
}

function showHelp() {
  console.log(
    [
      "Re-embed existing documents using a new embedding model.",
      "",
      "Supports Google and Ollama providers with batch processing,",
      "pre-flight validation, dry-run mode, and comprehensive error recovery.",
      "",
      "Usage:",
      "  node scripts/re-embed-documents.mjs --library-id <uuid> [options]",
      "  node scripts/re-embed-documents.mjs --library-id <uuid> --apply [options]",
      "",
      "Options:",
      "  --env <stage>        Environment stage to load: .env.<stage> (default: .env.local)",
      "                       (Note: If the .env.<stage> file does not exists, it defaults to .env)",
      "  --library-id <uuid>  UUID of the library to re-embed (required)",
      '  --new-model <name>   Embedding provider ("google" or "ollama")',
      "  --batch-size <num>   Documents per batch (default: 100)",
      "  --apply              Execute database changes (default is dry run)",
      "  -h, --help           Show this help message",
      "",
      "Examples:",
      "  node scripts/re-embed-documents.mjs --env local --library-id <uuid>",
      "  node scripts/re-embed-documents.mjs --env production --library-id <uuid> --apply",
    ].join("\n")
  );
}

class Config {
  constructor() {
    this.supabaseUrl =
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    this.supabaseKey = process.env.SUPABASE_SECRET_KEY;
    this.llmProvider = (
      process.env.EMBEDDING_PROVIDER ??
      process.env.LLM_PROVIDER ??
      "google"
    ).toLowerCase();
    this.googleApiKey =
      process.env.GOOGLE_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    this.googleEmbeddingModel = process.env.GOOGLE_EMBEDDING_MODEL;
    this.ollamaBaseUrl =
      process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
    this.ollamaEmbeddingModel = process.env.OLLAMA_EMBEDDING_MODEL;

    if (!this.supabaseUrl || !this.supabaseKey) {
      throw new Error(
        "SUPABASE_URL and SUPABASE_SECRET_KEY environment variables are required"
      );
    }

    if (this.llmProvider === "google") {
      if (!this.googleApiKey) {
        throw new Error(
          "GOOGLE_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY environment variable is required for Google provider"
        );
      }
      if (!this.googleEmbeddingModel) {
        throw new Error(
          "GOOGLE_EMBEDDING_MODEL environment variable is required for Google provider"
        );
      }
    }

    if (this.llmProvider === "ollama" && !this.ollamaEmbeddingModel) {
      throw new Error(
        "OLLAMA_EMBEDDING_MODEL environment variable is required for Ollama provider"
      );
    }
  }

  validate() {
    log(
      `Config: provider=${this.llmProvider}, supabase_url=${this.supabaseUrl.substring(0, 30)}...`
    );
  }
}

function getDbClient() {
  const config = new Config();
  config.validate();
  const client = createClient(config.supabaseUrl, config.supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return { client, config };
}

async function generateBatchEmbeddings(
  texts,
  provider,
  googleApiKey,
  ollamaBaseUrl
) {
  try {
    if (provider === "google") {
      if (!googleApiKey) {
        throw new Error("Google embedding API key is missing");
      }
      const providerInstance = createGoogleGenerativeAI({
        apiKey: googleApiKey,
      });
      const model = process.env.GOOGLE_EMBEDDING_MODEL;
      const result = await embedMany({
        model: providerInstance.textEmbeddingModel(model),
        values: texts,
      });
      return result.embeddings;
    }

    if (provider === "ollama") {
      const providerInstance = createOllama({ baseURL: ollamaBaseUrl });
      const model = process.env.OLLAMA_EMBEDDING_MODEL;
      const result = await embedMany({
        model: providerInstance.textEmbeddingModel(model),
        values: texts,
      });
      // Log actual embedding dimension from model response
      if (result.embeddings.length > 0) {
        const actualDim = result.embeddings[0].length;
        log(`Ollama embedding dimension (actual): ${actualDim}`);
      }
      return result.embeddings;
    }

    throw new Error(`Unknown provider: ${provider}`);
  } catch (e) {
    logError(
      `Failed to generate embeddings: ${e instanceof Error ? e.message : e}`
    );
    return null;
  }
}

async function testEmbeddingProvider(provider, googleApiKey, ollamaBaseUrl) {
  try {
    const embeddings = await generateBatchEmbeddings(
      ["test"],
      provider,
      googleApiKey,
      ollamaBaseUrl
    );
    if (!embeddings || embeddings.length === 0 || !embeddings[0]) {
      throw new Error("Provider returned no embeddings");
    }
    const vectorDim = embeddings[0].length;
    log(`${provider} provider test successful: vector_dim=${vectorDim}`);
    return vectorDim;
  } catch (e) {
    logError(`Provider test failed: ${e instanceof Error ? e.message : e}`);
    throw e;
  }
}

async function verifyDatabaseSchema(client, libraryId) {
  try {
    const { data: libraries, error: libError } = await client
      .from("libraries")
      .select("id, name")
      .eq("id", libraryId);

    if (libError) throw libError;
    const library = libraries && libraries[0];
    if (!library) {
      throw new Error(`Library not found: ${libraryId}`);
    }
    log(`Library found: ${library.name} (id=${libraryId})`);

    const { data: documents, error: docsError } = await client
      .from("documents")
      .select("id, deleted_at")
      .eq("library_id", libraryId);

    if (docsError) throw docsError;
    const activeDocuments = (documents || []).filter((doc) => !doc.deleted_at);
    const docIds = activeDocuments.map((doc) => doc.id);
    const docCount = docIds.length;
    log(`Documents in library: ${docCount}`);

    let chunkCount = 0;
    let currentDim = null;

    if (docIds.length > 0) {
      const { data: chunks, error: chunksError } = await client
        .from("document_chunks")
        .select("id, embedding")
        .in("document_id", docIds);

      if (chunksError) throw chunksError;
      chunkCount = (chunks || []).length;

      for (const chunk of chunks || []) {
        if (chunk.embedding) {
          currentDim = Array.isArray(chunk.embedding)
            ? chunk.embedding.length
            : typeof chunk.embedding === "string"
              ? JSON.parse(chunk.embedding).length
              : null;
          if (currentDim) break;
        }
      }
    }
    log(`Chunks in library: ${chunkCount}`);

    if (currentDim !== null) {
      log(`Current vector dimension: ${currentDim}`);
    } else {
      logWarn("No existing embeddings found in library");
    }

    return {
      libraryId,
      libraryName: library.name,
      docCount,
      chunkCount,
      currentVectorDim: currentDim,
    };
  } catch (e) {
    logError(
      `Database schema verification failed: ${e instanceof Error ? e.message : e}`
    );
    throw e;
  }
}

async function fetchDocumentsBatch(client, libraryId, offset, limit) {
  try {
    const { data, error } = await client
      .from("documents")
      .select("id, title, deleted_at")
      .eq("library_id", libraryId)
      .is("deleted_at", null)
      .order("created_at")
      .range(offset, offset + limit - 1);

    if (error) throw error;
    return data || [];
  } catch (e) {
    logError(
      `Failed to fetch documents batch at offset ${offset}: ${e instanceof Error ? e.message : e}`
    );
    return [];
  }
}

async function fetchChunksForDocuments(client, docIds) {
  try {
    const { data, error } = await client
      .from("document_chunks")
      .select("id, document_id, content")
      .in("document_id", docIds);

    if (error) throw error;

    const chunksByDoc = {};
    for (const chunk of data || []) {
      const docId = chunk.document_id;
      if (!chunksByDoc[docId]) {
        chunksByDoc[docId] = [];
      }
      chunksByDoc[docId].push(chunk);
    }
    return chunksByDoc;
  } catch (e) {
    logError(
      `Failed to fetch chunks for documents: ${e instanceof Error ? e.message : e}`
    );
    return {};
  }
}

async function updateChunksEmbeddings(client, updates, dryRun) {
  if (dryRun) {
    log(`DRY RUN: Would update ${updates.length} chunks`);
    return true;
  }

  try {
    for (const update of updates) {
      const embeddingValue =
        typeof update.embedding === "string"
          ? update.embedding
          : JSON.stringify(update.embedding);

      const { error } = await client
        .from("document_chunks")
        .update({ embedding: embeddingValue })
        .eq("id", update.chunk_id);

      if (error) throw error;
    }
    log(`Updated ${updates.length} chunks in database`);
    return true;
  } catch (e) {
    logError(`Failed to update chunks: ${e instanceof Error ? e.message : e}`);
    return false;
  }
}

async function main() {
  let options;
  try {
    options = parseArguments(process.argv.slice(2));
  } catch (e) {
    logError(e instanceof Error ? e.message : String(e));
    console.log("");
    showHelp();
    process.exitCode = 2;
    return;
  }

  if (options.help) {
    showHelp();
    return;
  }

  const libraryId = options.libraryId;
  const batchSize = options.batchSize;
  const dryRun = !options.apply;

  log("=".repeat(80));
  log("Starting re-embed process");
  log(`Environment: ${options.env} (.env.${options.env})`);
  log(`Library ID: ${libraryId}`);
  log(`Batch size: ${batchSize}`);
  log(`Dry run: ${dryRun}`);
  log("=".repeat(80));

  try {
    const { client, config } = getDbClient();
    const provider = (options.newModel || config.llmProvider).toLowerCase();
    const embeddingModel =
      provider === "google"
        ? config.googleEmbeddingModel
        : config.ollamaEmbeddingModel;

    log(`Embedding provider: ${provider}`);
    log(`Embedding model: ${embeddingModel}`);
    log(`Testing embedding provider: ${provider}`);
    const newVectorDim = await testEmbeddingProvider(
      provider,
      config.googleApiKey,
      config.ollamaBaseUrl
    );

    log("Verifying database schema...");
    const libInfo = await verifyDatabaseSchema(client, libraryId);

    if (libInfo.chunkCount === 0) {
      logWarn("No chunks found in library. Aborting.");
      process.exitCode = 2;
      return;
    }

    log(`New vector dimension: ${newVectorDim}`);
    if (libInfo.currentVectorDim && libInfo.currentVectorDim !== newVectorDim) {
      logWarn(
        `Vector dimension mismatch: current=${libInfo.currentVectorDim}, new=${newVectorDim}`
      );
    }

    if (dryRun) {
      log("DRY RUN MODE - No changes will be committed");
    }

    const startTime = Date.now();
    let totalChunksReEmbedded = 0;
    let failedBatches = 0;
    const totalDocs = libInfo.docCount;
    const totalBatches = Math.ceil(totalDocs / batchSize);

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx += 1) {
      const offset = batchIdx * batchSize;
      const docs = await fetchDocumentsBatch(
        client,
        libraryId,
        offset,
        batchSize
      );

      if (!docs || docs.length === 0) {
        logWarn(`Batch ${batchIdx + 1}/${totalBatches}: No documents fetched`);
        failedBatches += 1;
        continue;
      }

      const docIds = docs.map((doc) => doc.id);
      const chunksByDoc = await fetchChunksForDocuments(client, docIds);

      const allChunks = [];
      const chunkIds = [];
      for (const docId of docIds) {
        if (chunksByDoc[docId]) {
          for (const chunk of chunksByDoc[docId]) {
            allChunks.push(chunk.content);
            chunkIds.push(chunk.id);
          }
        }
      }

      if (allChunks.length === 0) {
        logWarn(
          `Batch ${batchIdx + 1}/${totalBatches}: No chunks found for ${docs.length} documents`
        );
        failedBatches += 1;
        continue;
      }

      const embeddings = await generateBatchEmbeddings(
        allChunks,
        provider,
        config.googleApiKey,
        config.ollamaBaseUrl
      );

      if (!embeddings || embeddings.length !== allChunks.length) {
        logError(
          `Batch ${batchIdx + 1}/${totalBatches}: Embedding mismatch. Expected ${allChunks.length}, got ${embeddings ? embeddings.length : 0}`
        );
        failedBatches += 1;
        continue;
      }

      const updates = chunkIds.map((chunkId, idx) => ({
        chunk_id: chunkId,
        embedding: embeddings[idx],
      }));

      const success = await updateChunksEmbeddings(client, updates, dryRun);
      if (success) {
        totalChunksReEmbedded += updates.length;
        log(
          `Batch ${batchIdx + 1}/${totalBatches}: re-embedded ${updates.length} chunks (${docs.length} docs), vector_dim=${newVectorDim}`
        );
      } else {
        failedBatches += 1;
      }
    }

    const elapsedTime = (Date.now() - startTime) / 1000;

    log("=".repeat(80));
    log("Re-embed process completed");
    log(`Total documents processed: ${totalDocs}`);
    log(`Total chunks re-embedded: ${totalChunksReEmbedded}`);
    log(`Failed batches: ${failedBatches}`);
    log(`Execution time: ${elapsedTime.toFixed(2)} seconds`);
    if (dryRun) {
      log("No changes committed (dry run)");
    } else {
      log("All changes committed to database");
    }
    log("=".repeat(80));

    process.exitCode = failedBatches === 0 ? 0 : 1;
  } catch (e) {
    logError(`Fatal error: ${e instanceof Error ? e.message : e}`);
    log("=".repeat(80));
    process.exitCode = 2;
  }
}

main();
