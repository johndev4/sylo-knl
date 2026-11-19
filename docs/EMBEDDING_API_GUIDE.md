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
1. Set `CRON_SECRET` in the application's environment. Use the same value in
  the corresponding Supabase Vault secret named `cron_secret`.
2. Ensure your Next.js application server is running:
   ```bash
   pnpm dev
   ```
   *(Verify it is listening on `http://localhost:3000`)*

For local development, store `CRON_SECRET` and
`EMBED_WORKER_BASE_URL=http://host.docker.internal:3000` in the ignored
`.env.local` file. The base URL must be reachable from the Supabase database
container. In production, set `CRON_SECRET` in Vercel and set the matching
`cron_secret` plus the deployed app URL in the production Supabase Vault.
Before running a manual API test, make `CRON_SECRET` available in your terminal
session; Next.js loading `.env.local` does not export it to the shell.

---

### Running the API Test

#### Using `curl` (Terminal / Git Bash / macOS / Linux)

```bash
curl -X POST http://localhost:3000/api/embed-pending \
  -H "Authorization: Bearer ${CRON_SECRET}"
```

#### Using PowerShell (Windows)

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/embed-pending" `
  -Headers @{ Authorization = "Bearer $env:CRON_SECRET" }
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

## 4. Automated `pg_cron` Setup

Migration `20261118222156_schedule_embedding_worker_cron.sql` registers the
`sylo-embedding-worker` job to call `/api/embed-pending` every minute. It reads
the URL and bearer token from that database's Vault; no secret is stored in the
migration.

### Local Development

The `[db.vault]` section in `supabase/config.toml` maps local environment values
to the Vault names the job expects. Add these to `.env.local` before initializing
or resetting the local database:

```env
EMBED_WORKER_BASE_URL="http://host.docker.internal:3000"
CRON_SECRET="<generate-a-random-secret>"
```

The resolved `[db.vault]` values are loaded into local Vault when the database
is initialized or reset. A normal `supabase stop` followed by `supabase start`
does not resync them. If you change these environment values later, run
`supabase db reset` to reload them; this recreates the local database and
reapplies migrations and seed data. To preserve local database contents, update
the Vault secrets directly through Supabase Studio instead.

### Production

Set `CRON_SECRET` in Vercel and manage these two secrets separately in the
production Supabase Vault (for example, through Supabase Studio):

- `embed_worker_base_url`: the deployed app's base URL, such as
  `https://your-domain.com`
- `cron_secret`: the exact value configured as Vercel's `CRON_SECRET`

Deploy migrations with `supabase db push --remote --skip-vault`. The
`--skip-vault` flag is important: it prevents local `[db.vault]` values from
overwriting the production secrets. The database must be able to reach the app's
URL.

If the earlier prefixed-key schedule was already installed, create the new
`embed_worker_base_url` and `cron_secret` Vault entries, then run the updated
`SELECT cron.schedule(...)` statement from the migration once against production.
It uses the same job name and replaces that job's command; editing an already
applied migration file alone does not update the production job.

### Verify the Schedule and Requests

Confirm that the job is registered:

```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'sylo-embedding-worker';
```

After the next scheduled run, inspect the most recent HTTP responses:

```sql
SELECT status_code, error_msg, content, created
FROM net._http_response
ORDER BY created DESC
LIMIT 5;
```
