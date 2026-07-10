# Re-Embed Documents Guide

This guide explains how to use the `re_embed_documents.py` script to re-embed existing documents in Sylo using a new embedding model.

## Overview

The script safely re-embeds all documents in a specified library:

- Fetches documents in batches (default: 100 per batch)
- Generates new embeddings using a specified model (Google or Ollama)
- Updates the database with new embedding vectors
- Supports dry-run mode for safe previewing
- Includes pre-flight validation and comprehensive error recovery

**Exit codes:**

- `0`: All batches succeeded
- `1`: Partial success (some batches failed)
- `2`: Pre-flight checks failed / fatal error

## Prerequisites

### 1. Python Environment

Ensure you have Python 3.10 or later:

```bash
python --version
```

### 2. Install Dependencies

Create a virtual environment and install required packages:

```bash
# Create virtual environment
python -m venv .venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install supabase requests python-dotenv google-generativeai
```

**Dependency versions:**

- `supabase>=2.0.0` — Database client with async support
- `requests>=2.31.0` — HTTP client for Ollama provider
- `python-dotenv>=1.0.0` — Environment variable loader
- `google-generativeai>=0.3.0` — Google Gemini API client (required if using Google provider)

### 3. Environment Setup

Create a `.env` file in the **workspace root** (not in the scripts folder):

```bash
# Project root: .env
# Required
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional (defaults to 'google')
LLM_PROVIDER=google

# If using Google provider
GOOGLE_API_KEY=your-google-api-key

# If using Ollama provider
OLLAMA_BASE_URL=http://localhost:11434
```

The script automatically loads from the root `.env` file, so no additional configuration is needed.

**Where to find credentials:**

- **SUPABASE_URL & SUPABASE_KEY**: Supabase dashboard → Settings → API → "Project URL" and "Service Role key" (under anon key, there's a dropdown)
- **GOOGLE_API_KEY**: [Google AI Studio](https://makersuite.google.com/app/apikey)
- **OLLAMA_BASE_URL**: Local Ollama server (default http://localhost:11434)

### 4. Verify Credentials

Test your environment setup:

```bash
python -c "
import os
from dotenv import load_dotenv
load_dotenv()

print('SUPABASE_URL:', 'OK' if os.getenv('SUPABASE_URL') else 'MISSING')
print('SUPABASE_SERVICE_ROLE_KEY:', 'OK' if os.getenv('SUPABASE_SERVICE_ROLE_KEY') else 'MISSING')
print('LLM_PROVIDER:', os.getenv('LLM_PROVIDER', 'google (default)'))
print('GOOGLE_API_KEY:', 'OK' if os.getenv('GOOGLE_API_KEY') else 'MISSING (required if LLM_PROVIDER=google)')
print('OLLAMA_BASE_URL:', os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434 (default)'))
"
```

## Running the Script

### Basic Usage

**Dry-run mode (preview, no changes):**

```bash
python scripts/re_embed_documents.py \
  --library-id <LIBRARY_UUID> \
  --dry-run
```

**Actual re-embedding (applies changes to database):**

```bash
python scripts/re_embed_documents.py \
  --library-id <LIBRARY_UUID>
```

### Command-Line Arguments

| Argument       | Required | Default              | Description                              |
| -------------- | -------- | -------------------- | ---------------------------------------- |
| `--library-id` | Yes      | —                    | UUID of the library to re-embed          |
| `--new-model`  | No       | LLM_PROVIDER env var | Embedding model: `google` or `ollama`    |
| `--batch-size` | No       | 100                  | Number of documents to process per batch |
| `--dry-run`    | No       | False                | Preview mode; no database changes        |

### Examples

#### Example 1: Re-embed with Google (default)

```bash
python scripts/re_embed_documents.py \
  --library-id 550e8400-e29b-41d4-a716-446655440000 \
  --dry-run
```

Expected output:

```
[2026-07-01 14:32:15] [INFO] ================================================================================
[2026-07-01 14:32:15] [INFO] Starting re-embed process
[2026-07-01 14:32:15] [INFO] Library ID: 550e8400-e29b-41d4-a716-446655440000
[2026-07-01 14:32:15] [INFO] Batch size: 100
[2026-07-01 14:32:15] [INFO] Dry run: True
[2026-07-01 14:32:15] [INFO] ================================================================================
[2026-07-01 14:32:15] [INFO] Testing embedding provider: google
[2026-07-01 14:32:16] [INFO] Google provider test successful: vector_dim=1536
[2026-07-01 14:32:16] [INFO] Verifying database schema...
[2026-07-01 14:32:16] [INFO] Library found: My Knowledge Base (id=550e8400-e29b-41d4-a716-446655440000)
[2026-07-01 14:32:16] [INFO] Documents in library: 50
[2026-07-01 14:32:16] [INFO] Chunks in library: 250
[2026-07-01 14:32:16] [INFO] Current vector dimension: 3072
[2026-07-01 14:32:16] [INFO] New vector dimension: 1536
[2026-07-01 14:32:16] [INFO] Vector dimension mismatch: current=3072, new=1536
[2026-07-01 14:32:16] [INFO] DRY RUN MODE - No changes will be committed
[2026-07-01 14:32:17] [INFO] Batch 1/1: re-embedded 250 chunks (50 docs), vector_dim=1536
[2026-07-01 14:32:17] [INFO] ================================================================================
[2026-07-01 14:32:17] [INFO] Re-embed process completed
[2026-07-01 14:32:17] [INFO] Total documents processed: 50
[2026-07-01 14:32:17] [INFO] Total chunks re-embedded: 250
[2026-07-01 14:32:17] [INFO] Failed batches: 0
[2026-07-01 14:32:17] [INFO] Execution time: 2.34 seconds
[2026-07-01 14:32:17] [INFO] No changes committed (dry run)
[2026-07-01 14:32:17] [INFO] ================================================================================
```

#### Example 2: Switch to Ollama provider with smaller batch size

```bash
python scripts/re_embed_documents.py \
  --library-id 550e8400-e29b-41d4-a716-446655440000 \
  --new-model ollama \
  --batch-size 50 \
  --dry-run
```

#### Example 3: Actually apply changes (no dry-run)

```bash
python scripts/re_embed_documents.py \
  --library-id 550e8400-e29b-41d4-a716-446655440000 \
  --new-model google \
  --batch-size 100
```

#### Example 4: Find a library UUID first

```bash
# Query your Supabase instance to find library UUIDs
psql postgresql://user:password@your-project.supabase.co:5432/postgres <<EOF
SELECT id, name, created_at FROM libraries LIMIT 5;
EOF
```

Or via Supabase dashboard:

1. Navigate to SQL Editor
2. Run: `SELECT id, name FROM libraries;`
3. Copy the UUID of the library you want to re-embed

## Workflow: Step-by-Step

### Step 1: Dry-Run (Recommended First)

Always test with `--dry-run` first to verify:

- Connection to Supabase works
- Embedding provider is responsive
- Database schema is valid
- Batch processing logic is sound

```bash
python scripts/re_embed_documents.py \
  --library-id <LIBRARY_UUID> \
  --dry-run
```

**Expected result:** Summary printed, no database changes, exit code 0.

### Step 2: Small Batch Test

Reduce batch size to test with a smaller subset:

```bash
python scripts/re_embed_documents.py \
  --library-id <LIBRARY_UUID> \
  --batch-size 10 \
  --dry-run
```

### Step 3: Production Run

Once confident, run without `--dry-run` to apply changes:

```bash
python scripts/re_embed_documents.py \
  --library-id <LIBRARY_UUID> \
  --batch-size 100
```

**Expected result:** Embeddings updated in database, summary printed, exit code 0.

### Step 4: Verify Changes

Query the database to confirm embeddings were updated:

```bash
psql postgresql://user:password@your-project.supabase.co:5432/postgres <<EOF
SELECT
  dc.id,
  d.title,
  array_length(dc.embedding, 1) as vector_dim,
  dc.updated_at
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE d.library_id = '<LIBRARY_UUID>'
LIMIT 5;
EOF
```

Expected: `vector_dim` matches the new model's dimension (e.g., 1536 for Google, 768 for Ollama).

## Troubleshooting

### Issue: "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required"

**Solution:** Create a `.env` file in the **project root** (not in the scripts folder):

```bash
# Create in workspace root:
cat > .env <<EOF
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
LLM_PROVIDER=google
GOOGLE_API_KEY=your-google-api-key
EOF
```

The script automatically loads from `../../../.env` (project root).

### Issue: "GOOGLE_API_KEY environment variable is required for Google provider"

**Solution:** Add `GOOGLE_API_KEY` to `.env` or set it as an environment variable:

```bash
export GOOGLE_API_KEY=your-google-api-key
```

### Issue: "Provider test failed: Connection error to Ollama"

**Solution:** Ensure Ollama is running on the configured base URL:

```bash
# Check if Ollama is running locally
curl http://localhost:11434/api/tags

# If not running, start Ollama:
# macOS: brew install ollama && ollama serve
# Linux/Windows: Download from https://ollama.ai
```

### Issue: "Database schema verification failed"

**Solution:** Verify:

1. The library UUID is correct: `SELECT id FROM libraries WHERE id = '<LIBRARY_UUID>';`
2. The library has documents: `SELECT COUNT(*) FROM documents WHERE library_id = '<LIBRARY_UUID>' AND deleted_at IS NULL;`
3. Database credentials are correct in `.env`

### Issue: "Vector dimension mismatch" warning

**Solution:** This is a warning, not an error. The script will continue and update embeddings to the new dimension. If the old dimension is incompatible:

1. Back up your database
2. Run a migration to alter the pgvector column definition
3. Then run the re-embed script

### Issue: Script hangs or times out

**Solution:**

1. Reduce `--batch-size` (e.g., 10 instead of 100)
2. Check network connectivity to Supabase and embedding provider
3. Verify the embedding provider is responding: `curl <OLLAMA_BASE_URL>/api/tags` (for Ollama)

## Performance Notes

- **Batch size:** Larger batches (100+) are faster but use more memory. Smaller batches (10-50) are safer for large libraries.
- **Network latency:** Ollama local = fast; Google API = depends on network + API throttling
- **Database:** Supabase free tier may have rate limits; monitor with `--dry-run` first
- **Expected speed:** ~100 chunks per second (varies by model and network)

## Advanced: Resumability

If the script crashes mid-run:

1. Check the log output to identify the failed batch
2. Re-run the script from the beginning (it will continue from where it left off by checking `updated_at` timestamps in the log)
3. Or manually verify via database query which documents need re-embedding

For a production-grade resumability feature, future enhancements could include:

- `--resume-from-batch <N>` flag
- Checkpoint table to track progress
- Idempotent updates (same chunk ID = same embedding)

## Cleanup

When finished:

1. Deactivate virtual environment: `deactivate`
2. Remove `.env` file if it contains sensitive credentials (it should be in `.gitignore`)
3. Optional: Remove `venv` directory

## Getting Help

- **Supabase errors:** Check [Supabase docs](https://supabase.com/docs)
- **Google API errors:** Check [Google Generative AI docs](https://ai.google.dev/docs)
- **Ollama errors:** Check [Ollama GitHub](https://github.com/ollama/ollama)
- **Script bugs:** Review logs and check `scripts/re_embed_documents.py` for details
