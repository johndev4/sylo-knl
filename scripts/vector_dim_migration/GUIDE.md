# Re-Embed Documents Guide

Re-embeds existing document chunks with a new embedding provider and updates `document_chunks.embedding`.

The script supports:

- Google and Ollama embedding providers
- Batch processing
- Dry-run mode
- Library-level re-embedding

## Prerequisites

Python 3.10+ is recommended.

From the project root:

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

Install dependencies:

```bash
pip install -r scripts/vector_dim_migration/requirements.txt
```

## Environment

Create `.env` in the project root:

```bash
cp scripts/vector_dim_migration/.env.example .env
```

Configure:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key

LLM_PROVIDER=google
GOOGLE_API_KEY=your-google-api-key
```

For Ollama:

```env
LLM_PROVIDER=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text:v1.5
```

`LLM_PROVIDER` defaults to `google`.

The script requires `SUPABASE_SECRET_KEY`.

## Vector Dimension Migration

Before re-embedding, make sure `document_chunks.embedding` supports the new embedding dimension.

The script detects the current and new dimensions and logs a warning if they differ:

```text
Vector dimension mismatch: current=3072, new=1536
```

The script does **not** change the pgvector column definition.

If the dimension changes:

1. Update the database schema.
2. Update any dependent vector indexes/functions if needed.
3. Run the re-embedding script.

## Usage

Run commands from the project root.

### Dry Run

Recommended before making changes:

```bash
python scripts/vector_dim_migration/re_embed_documents.py \
  --library-id <LIBRARY_UUID> \
  --dry-run
```

Dry-run generates embeddings but does not update the database.

### Re-Embed

```bash
python scripts/vector_dim_migration/re_embed_documents.py \
  --library-id <LIBRARY_UUID>
```

### Select Provider

Google:

```bash
python scripts/vector_dim_migration/re_embed_documents.py \
  --library-id <LIBRARY_UUID> \
  --new-model google
```

Ollama:

```bash
python scripts/vector_dim_migration/re_embed_documents.py \
  --library-id <LIBRARY_UUID> \
  --new-model ollama
```

### Change Batch Size

The default batch size is `100` documents:

```bash
python scripts/vector_dim_migration/re_embed_documents.py \
  --library-id <LIBRARY_UUID> \
  --batch-size 50
```

## Arguments

| Argument       | Required | Default        | Description                                       |
| -------------- | -------- | -------------- | ------------------------------------------------- |
| `--library-id` | Yes      | —              | Library UUID                                      |
| `--new-model`  | No       | `LLM_PROVIDER` | `google` or `ollama`                              |
| `--batch-size` | No       | `100`          | Documents per batch                               |
| `--dry-run`    | No       | `false`        | Generate embeddings without updating the database |

> `--new-model` selects the embedding provider. The Ollama model is configured through `OLLAMA_EMBEDDING_MODEL`.

## Verify

After the migration, verify the vector dimension:

```sql
SELECT
  dc.id,
  d.title,
  vector_dims(dc.embedding) AS vector_dim
FROM document_chunks dc
JOIN documents d ON dc.document_id = d.id
WHERE d.library_id = '<LIBRARY_UUID>'
LIMIT 10;
```

## Troubleshooting

### Supabase credentials error

Make sure `.env` exists in the project root and contains:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SECRET_KEY=your-service-role-key
```

### Google API key error

Make sure:

```env
LLM_PROVIDER=google
GOOGLE_API_KEY=your-google-api-key
```

### Ollama connection error

Make sure Ollama is running:

```bash
curl http://localhost:11434/api/tags
```

Then verify:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text:v1.5
```

### Vector dimension mismatch

If the new embedding dimension differs from the database column dimension, update the pgvector schema before running the actual migration.

## Exit Codes

| Code | Meaning                    |
| ---- | -------------------------- |
| `0`  | Success                    |
| `1`  | One or more batches failed |
| `2`  | Fatal/pre-flight error     |

## Security

Do not commit `.env` or secret keys.

Make sure `.env` is included in `.gitignore`.
