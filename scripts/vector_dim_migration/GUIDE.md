# Re-Embed Documents Guide

This guide explains how to use `re_embed_documents.py` to re-embed existing Sylo document chunks with a different embedding provider or model.

The script:

- Processes documents in batches.
- Reads existing chunk content from `document_chunks.content`.
- Generates new embeddings using Google or Ollama.
- Updates `document_chunks.embedding`.
- Supports dry-run mode.
- Validates the target library and existing chunks before processing.
- Reports failed batches and returns an appropriate exit code.

> **Important:** This script does **not** change the PostgreSQL/pgvector column definition. If the new embedding dimension differs from the current `document_chunks.embedding` column dimension, you must update the database schema before running the actual re-embedding.

## Exit Codes

| Code | Meaning                              |
| ---- | ------------------------------------ |
| `0`  | All batches completed successfully   |
| `1`  | One or more batches failed           |
| `2`  | Pre-flight validation or fatal error |

---

## Prerequisites

### 1. Python

Python 3.10 or later is recommended.

```bash
python --version
```

### 2. Install Dependencies

From the **project root**:

```bash
python -m venv .venv
```

Activate the virtual environment.

**Windows:**

```bash
.venv\Scripts\activate
```

**macOS/Linux/WSL:**

```bash
source .venv/bin/activate
```

Install the dependencies:

```bash
pip install --upgrade pip
pip install -r scripts/vector_dim_migration/requirements.txt
```

The required packages are:

- `supabase`
- `requests`
- `python-dotenv`
- `google-generativeai`

---

## Environment Configuration

### 1. Create `.env`

The script calls:

```python
load_dotenv()
```

This means the `.env` file is loaded from the **current working directory**, not explicitly from the script's directory.

Therefore, run the script from the **project root** and place `.env` in the project root:

```text
project-root/
├── .env
├── scripts/
│   └── vector_dim_migration/
│       ├── GUIDE.md
│       ├── requirements.txt
│       ├── re_embed_documents.py
│       └── .env.example
└── ...
```

You can use the provided example as a starting point:

```bash
cp scripts/vector_dim_migration/.env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item scripts/vector_dim_migration/.env.example .env
```

### 2. Configure Supabase

At minimum:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key
```

The script also accepts these fallback variable names:

```env
NEXT_PUBLIC_SUPABASE_URL=...
SUPABASE_KEY=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

However, **`SUPABASE_SECRET_KEY` is recommended** for this migration script because it needs direct database access that may be restricted by RLS.

### 3. Configure the Embedding Provider

Google is the default:

```env
LLM_PROVIDER=google
GOOGLE_API_KEY=your-google-api-key
```

For Ollama:

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text:v1.5
```

`OLLAMA_EMBEDDING_MODEL` is optional. If omitted, the script uses:

```text
nomic-embed-text:v1.5
```

### Environment Variables

| Variable                 | Required | Description                                                 |
| ------------------------ | -------- | ----------------------------------------------------------- |
| `SUPABASE_URL`           | Yes*     | Supabase project URL                                        |
| `SUPABASE_SECRET_KEY`    | Yes*     | Supabase secret/service-role key                            |
| `LLM_PROVIDER`           | No       | `google` or `ollama`; defaults to `google`                  |
| `GOOGLE_API_KEY`         | Google   | Google embedding API key                                    |
| `OLLAMA_BASE_URL`        | No       | Ollama URL; defaults to `http://localhost:11434`            |
| `OLLAMA_EMBEDDING_MODEL` | No       | Ollama embedding model; defaults to `nomic-embed-text:v1.5` |

- The script also supports fallback Supabase environment variable names.

---

## Verify the Environment

From the **project root**:

```bash
python -c "
import os
from dotenv import load_dotenv
load_dotenv()

print('SUPABASE_URL:', 'OK' if os.getenv('SUPABASE_URL') or os.getenv('NEXT_PUBLIC_SUPABASE_URL') else 'MISSING')
print('SUPABASE_SECRET_KEY:', 'OK' if os.getenv('SUPABASE_SECRET_KEY') else 'MISSING')
print('LLM_PROVIDER:', os.getenv('LLM_PROVIDER', 'google'))
print('GOOGLE_API_KEY:', 'OK' if os.getenv('GOOGLE_API_KEY') or os.getenv('GOOGLE_GENERATIVE_AI_API_KEY') else 'MISSING')
print('OLLAMA_BASE_URL:', os.getenv('OLLAMA_BASE_URL', 'http://localhost:11434'))
print('OLLAMA_EMBEDDING_MODEL:', os.getenv('OLLAMA_EMBEDDING_MODEL', 'nomic-embed-text:v1.5'))
"
```

---

# Vector Dimension Migration

Changing embedding models can change the vector dimension.

For example:

```text
Current column: vector(3072)
New model:      vector(1536)
```

The script detects and logs a dimension mismatch:

```text
Vector dimension mismatch: current=3072, new=1536
```

However, **the script does not alter the vector column**.

If the PostgreSQL column is still defined as `vector(3072)`, attempting to store a 1536-dimensional embedding will fail.

Therefore, the migration should be performed in this order:

```text
1. Determine the new embedding dimension
2. Back up the database
3. Change the pgvector column dimension
4. Run the re-embedding script
5. Verify the resulting embeddings
```

### Important

Do not assume the dimension from the provider name alone.

The script tests the configured provider and determines the actual vector dimension returned by the provider:

```text
Google provider test successful: vector_dim=...
```

or:

```text
Ollama provider test successful via /api/embed: vector_dim=...
```

Use this value when preparing the database migration.

---

# Running the Script

Always run the commands from the **project root**.

## Dry Run

Start with a dry run:

```bash
python scripts/vector_dim_migration/re_embed_documents.py \
  --library-id <LIBRARY_UUID> \
  --dry-run
```

Dry-run mode:

- Connects to Supabase.
- Tests the embedding provider.
- Checks that the library exists.
- Counts active documents.
- Counts chunks.
- Generates embeddings.
- Does **not** update the database.

> **Note:** Dry-run still calls the embedding provider. It is not a completely offline simulation.

---

## Actual Re-Embedding

After the dry run succeeds:

```bash
python scripts/vector_dim_migration/re_embed_documents.py \
  --library-id <LIBRARY_UUID>
```

This writes the generated embeddings to `document_chunks.embedding`.

---

# Command-Line Arguments

| Argument       | Required | Default        | Description                                       |
| -------------- | -------- | -------------- | ------------------------------------------------- |
| `--library-id` | Yes      | —              | UUID of the library                               |
| `--new-model`  | No       | `LLM_PROVIDER` | Embedding provider: `google` or `ollama`          |
| `--batch-size` | No       | `100`          | Number of documents processed per batch           |
| `--dry-run`    | No       | `False`        | Generate embeddings without updating the database |

### `--new-model`

Despite its name, this argument selects the **provider**, not a specific embedding model.

Examples:

```bash
--new-model google
```

```bash
--new-model ollama
```

For Ollama, the actual model is controlled by:

```env
OLLAMA_EMBEDDING_MODEL=nomic-embed-text:v1.5
```

Google currently uses:

```text
models/gemini-embedding-001
```

as defined in the script.

---

# Examples

## Example 1: Google Dry Run

```bash
python scripts/vector_dim_migration/re_embed_documents.py \
  --library-id 550e8400-e29b-41d4-a716-446655440000 \
  --dry-run
```

## Example 2: Ollama Dry Run

```bash
python scripts/vector_dim_migration/re_embed_documents.py \
  --library-id 550e8400-e29b-41d4-a716-446655440000 \
  --new-model ollama \
  --batch-size 50 \
  --dry-run
```

## Example 3: Apply Google Embeddings

```bash
python scripts/vector_dim_migration/re_embed_documents.py \
  --library-id 550e8400-e29b-41d4-a716-446655440000 \
  --new-model google \
  --batch-size 100
```

---

# Recommended Migration Workflow

## Step 1: Determine the Target Dimension

Run a dry run:

```bash
python scripts/vector_dim_migration/re_embed_documents.py \
  --library-id <LIBRARY_UUID> \
  --dry-run
```

Look for:

```text
Google provider test successful: vector_dim=...
```

or:

```text
Ollama provider test successful via /api/embed: vector_dim=...
```

Record the dimension.

---

## Step 2: Back Up the Database

Before changing the vector column or replacing embeddings, create a database backup.

Use your normal Supabase/PostgreSQL backup process.

---

## Step 3: Change the Vector Column

If the new dimension differs from the current column definition, update the `document_chunks.embedding` column using a database migration.

For example, if changing from `vector(3072)` to `vector(1536)`, the migration must change the column accordingly.

> The exact SQL depends on how the existing column is defined and whether indexes or functions depend on it. Update any vector indexes or RPC functions that explicitly depend on the old dimension.

---

## Step 4: Run a Small Dry Run

```bash
python scripts/vector_dim_migration/re_embed_documents.py \
  --library-id <LIBRARY_UUID> \
  --batch-size 10 \
  --dry-run
```

Confirm that:

- The provider test succeeds.
- The library is found.
- Documents and chunks are detected.
- The new vector dimension is correct.
- No database updates are committed.

---

## Step 5: Run the Migration

```bash
python scripts/vector_dim_migration/re_embed_documents.py \
  --library-id <LIBRARY_UUID> \
  --batch-size 10
```

For a larger library, increase the batch size after confirming the migration works.

For example:

```bash
python scripts/vector_dim_migration/re_embed_documents.py \
  --library-id <LIBRARY_UUID> \
  --batch-size 100
```

---

## Step 6: Verify the Embeddings

Check the database after the migration.

For example:

```sql
SELECT
  dc.id,
  d.title,
  vector_dims(dc.embedding) AS vector_dim,
  dc.created_at
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE d.library_id = '<LIBRARY_UUID>'
LIMIT 10;
```

The returned `vector_dim` should match the new embedding dimension.

You can also check how many chunks have embeddings:

```sql
SELECT
  COUNT(*) AS total_chunks,
  COUNT(dc.embedding) AS chunks_with_embeddings
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE d.library_id = '<LIBRARY_UUID>'
  AND d.deleted_at IS NULL;
```

---

# How Batching Works

The `--batch-size` value represents the number of **documents**, not chunks.

For example:

```bash
--batch-size 100
```

means the script attempts to process up to 100 documents per batch.

Each document can contain multiple chunks, so one batch may generate embeddings for considerably more than 100 chunks.

The script:

```text
Fetch documents
      ↓
Fetch their chunks
      ↓
Send chunk content to embedding provider
      ↓
Generate embeddings
      ↓
Update document_chunks.embedding
```

---

# Deleted Documents

The script excludes documents where:

```text
deleted_at IS NOT NULL
```

Only active documents are re-embedded.

Existing chunks belonging to deleted documents are therefore not processed.

---

# Troubleshooting

## `SUPABASE_URL and SUPABASE_SECRET_KEY environment variables are required`

Make sure `.env` exists in the **current working directory**.

Recommended project structure:

```text
project-root/
├── .env
└── scripts/
    └── vector_dim_migration/
        └── re_embed_documents.py
```

Then run:

```bash
cd <project-root>
python scripts/vector_dim_migration/re_embed_documents.py ...
```

Also verify:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SECRET_KEY=your-secret-key
```

---

## `GOOGLE_API_KEY environment variable is required`

If using Google:

```env
LLM_PROVIDER=google
GOOGLE_API_KEY=your-google-api-key
```

The script also accepts:

```env
GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key
```

---

## Ollama Connection Error

Make sure Ollama is running:

```bash
curl http://localhost:11434/api/tags
```

Check the configured URL:

```env
OLLAMA_BASE_URL=http://localhost:11434
```

Check the configured embedding model:

```env
OLLAMA_EMBEDDING_MODEL=nomic-embed-text:v1.5
```

The script first tries:

```text
/api/embed
```

and falls back to:

```text
/api/embeddings
```

if `/api/embed` returns HTTP 404.

---

## `Vector dimension mismatch`

Example:

```text
Vector dimension mismatch: current=3072, new=1536
```

This means the provider returned a dimension different from the dimension detected in existing embeddings.

This message is a **warning**, not an automatic schema migration.

Before performing an actual migration:

1. Confirm the target embedding dimension.
2. Back up the database.
3. Update the `document_chunks.embedding` column.
4. Update any dependent vector indexes/functions if necessary.
5. Run the re-embedding script.

---

## Database Update Fails After a Dimension Change

If you see a PostgreSQL/pgvector error about vector dimensions, verify that:

```text
document_chunks.embedding
```

has been changed to the new dimension.

The script itself does not perform this schema change.

---

## No Chunks Found

The script exits with code `2` if the selected library contains no chunks.

Check:

```sql
SELECT COUNT(*)
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE d.library_id = '<LIBRARY_UUID>'
  AND d.deleted_at IS NULL;
```

---

## Batch Failed

A failed batch is logged and the script continues with the next batch.

At the end, check:

```text
Failed batches: N
```

If `N` is greater than zero, the process exits with code `1`.

Review the log output to identify the failure.

> The current script does **not** implement true resumability or checkpointing. Re-running the script processes the library again; it does not automatically resume from the last successful batch.

---

# Performance

The main factors affecting performance are:

- Number of chunks per document.
- Embedding provider.
- Network latency.
- Provider rate limits.
- Batch size.
- Supabase database performance.

Start conservatively:

```bash
--batch-size 10
```

Then increase to:

```bash
--batch-size 50
```

or:

```bash
--batch-size 100
```

if the migration is stable.

A larger batch does not necessarily mean faster processing because provider rate limits and API behavior can become the bottleneck.

---

# Security

The migration script can use a Supabase secret/service-role key.

Never commit `.env` to Git.

Make sure `.gitignore` contains:

```text
.env
```

Do not paste real credentials into source code, documentation, or committed files.

The `.env.example` file should contain only placeholder values.

---

# Cleanup

After completing the migration:

```bash
deactivate
```

The virtual environment can optionally be removed:

```bash
rm -rf .venv
```

On Windows PowerShell:

```powershell
Remove-Item -Recurse -Force .venv
```

Keep `.env` only if it is needed for future migrations, and make sure it remains excluded from Git.

---

# Useful Supabase Resources

- [Supabase Documentation](https://supabase.com/docs?utm_source=chatgpt.com)
- [Google AI Documentation](https://ai.google.dev/?utm_source=chatgpt.com)
- [Ollama Documentation](https://docs.ollama.com/?utm_source=chatgpt.com)
