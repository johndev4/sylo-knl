# Embedding & Background Indexing Guide

This guide explains how document embedding works in Sylo, how background workers index chunks, and how to manually test and trigger the embedding worker API.

---

## 1. Overview

Sylo uses vector embeddings (Google Generative AI `gemini-embedding-001` or Ollama `nomic-embed-text`) for vector similarity search in the RAG retrieval pipeline.

### Why Background Indexing?
Large documents contain dozens or hundreds of chunks. Generating embeddings synchronously in the save request caused:
1. Long blocking wait times for the user.
2. Third-party API rate limit failures (e.g., Google Free Tier token quota exceeded: `30,000 tokens/minute`).

### Architecture
- **Save Trigger**: Chunks are initially saved with `embedding_status = 'pending'`.
- **Primary Processing**: Next.js Server Actions trigger an asynchronous background worker via `after()` ([`server-after-nonblocking`](file:///c:/Users/pahrs/DEV_PROJECTS/sylo-knl/.agents/skills/vercel-react-best-practices/rules/server-after-nonblocking.md)), processing chunks in batches of 5 with 1-second delays.
- **Secondary Processing / Cron**: The `/api/embed-pending` endpoint can be called on a schedule (`pg_cron`, external cron, or manual curl) to catch any orphaned or retryable chunks.

---

## 2. Testing the Embedding Worker API (`/api/embed-pending`)

The route handler `POST /api/embed-pending` is protected by a bearer secret token (`CRON_SECRET`).

### Prerequisites
1. Ensure your Next.js application server is running:
   ```bash
   pnpm dev
   ```
   *(Verify it is listening on `http://localhost:3000`)*

2. Retrieve your `CRON_SECRET` from `.env.local`:
   ```bash
   # Example from .env.local:
   CRON_SECRET="131b85a88ebeecef316b268b6eb439039b52415ca9b7fc2d832a073e7c1f795c"
   ```

---

### Running the API Test

#### Using `curl` (Terminal / Git Bash / macOS / Linux)

```bash
curl -X POST http://localhost:3000/api/embed-pending \
  -H "Authorization: Bearer 131b85a88ebeecef316b268b6eb439039b52415ca9b7fc2d832a073e7c1f795c"
```

#### Using PowerShell (Windows)

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/embed-pending" `
  -Headers @{ Authorization = "Bearer 131b85a88ebeecef316b268b6eb439039b52415ca9b7fc2d832a073e7c1f795c" }
```

---

### Expected Responses

#### 1. Chunks Processed Successfully
When pending chunks are present in `document_chunks`:
```json
{
  "processed": 5
}
```
*(The endpoint processes up to 5 chunks per invocation to protect against rate limits).*

#### 2. No Pending Chunks
When all chunks already have embeddings and status is `'done'`:
```json
{
  "processed": 0
}
```

#### 3. Unauthorized (Missing or Invalid Secret)
```json
{
  "error": "Unauthorized"
}
```
Status code: `401 Unauthorized`.

---

## 3. Database Verification Queries

You can verify the embedding status of your chunks in Supabase Studio SQL Editor (`http://localhost:54323` locally or your hosted Supabase dashboard):

### Check Status Counts
```sql
SELECT embedding_status, COUNT(*) 
FROM public.document_chunks 
GROUP BY embedding_status;
```

### Inspect Recent Chunks
```sql
SELECT id, document_id, embedding_status, embedding IS NOT NULL AS has_vector, created_at
FROM public.document_chunks
ORDER BY created_at DESC
LIMIT 10;
```

### Reset Failed or Pending Chunks for Retesting
If you want to simulate re-embedding existing chunks:
```sql
UPDATE public.document_chunks
SET embedding_status = 'pending', embedding = NULL
WHERE id IN (
  SELECT id FROM public.document_chunks LIMIT 5
);
```
Then run the `curl` or `Invoke-RestMethod` command again to observe them processing into `'done'`.

---

## 4. Optional: Automated `pg_cron` Setup

If you wish to configure Supabase's built-in `pg_cron` to continuously run the worker:

### Local Development (via Docker host bridge):
```sql
SELECT cron.schedule(
  'embed-pending-chunks',
  '* * * * *',
  $$
    SELECT net.http_post(
      url     := 'http://host.docker.internal:3000/api/embed-pending',
      headers := '{"Authorization": "Bearer 131b85a88ebeecef316b268b6eb439039b52415ca9b7fc2d832a073e7c1f795c", "Content-Type": "application/json"}'::jsonb,
      body    := '{}'::jsonb
    );
  $$
);
```

### Production:
Replace `http://host.docker.internal:3000` with your deployed URL (e.g. `https://your-domain.com`) and supply your production `CRON_SECRET`.
