# Embedding Worker Setup

Sylo processes embeddings after a document is saved. The optional `pg_cron`
worker calls `/api/embed-pending` once per minute as a fallback for pending
chunks. Its URL and bearer token are read from that database's Supabase Vault.

## Configure the Worker

1. Set `CRON_SECRET` in the Next.js app environment (`.env.local` locally, `.env` for [Docker Compose](DOCKER_SETUP.md), or your hosting provider's environment settings). Generate a random value, for example with `openssl rand -hex 32`.
2. Open Supabase Studio for the database where the worker should run. For local
   Supabase, Studio is at `http://localhost:54323`; for a hosted project, use
   that project's dashboard. In **Database > Vault**, create these secrets:

   | Name | Value |
   | --- | --- |
   | `embed_worker_base_url` | The app's base URL, reachable from Postgres; do not include `/api/embed-pending` |
   | `cron_secret` | The exact `CRON_SECRET` value set in the app environment |

   For local Supabase with the app running on your machine, use
   `http://host.docker.internal:3000` as the base URL. For hosted or self-hosted
   deployments, use the public app URL or an address reachable on the shared
   network. Avoid `localhost` unless Postgres and the app share that network
   namespace.

3. Apply migrations normally. For local development, run `supabase migration up`;
   for a linked hosted project, run `supabase db push --remote`. The `[db.vault]`
   block in `supabase/config.toml` is optional and remains commented out by
   default, so migrations do not need local secret values. If you opt into that
   block, it can sync environment values during database initialization/reset;
   do not use it to manage hosted production secrets.

Vault values are per database. Set them separately in local Studio and in each
hosted or self-hosted Supabase project where you enable this fallback worker.
When rotating `CRON_SECRET`, update both the app environment and the matching
Vault secret.

## Test and Verify

With the app running, send a manual request. Make sure `CRON_SECRET` is set in
the current terminal session before you send it (replace `.env.local` with `.env`
in the commands below if running via Docker Compose).

### Windows (PowerShell)

```powershell
$env:CRON_SECRET = (Get-Content .env.local | Select-String '^CRON_SECRET=' | ForEach-Object { $_.Line.Split('=', 2)[1].Trim('"') })

Invoke-RestMethod -Method Post `
  -Uri "http://localhost:3000/api/embed-pending" `
  -Headers @{ Authorization = "Bearer $env:CRON_SECRET" }
```

### Linux and macOS (bash or zsh)

Run this from the project folder that contains `.env.local`:

```bash
export CRON_SECRET=$(grep '^CRON_SECRET=' .env.local | cut -d= -f2- | tr -d '"')

curl -X POST "http://localhost:3000/api/embed-pending" \
  -H "Authorization: Bearer $CRON_SECRET"
```

If you get a 401, run `echo $CRON_SECRET` to confirm the variable is set. If it
prints nothing, check that `.env.local` is in the current directory and contains
a `CRON_SECRET=` line. The response reports the number of chunks processed; `401 Unauthorized` means
the app environment secret is missing or does not match the request.

In Studio's SQL Editor, check that the cron job is registered and inspect recent
HTTP responses:

```sql
SELECT jobname, schedule, active
FROM cron.job
WHERE jobname = 'embedding-worker';

SELECT status_code, error_msg, content, created
FROM net._http_response
ORDER BY created DESC
LIMIT 5;
```

For self-hosting, the same setup applies: make sure the database can reach the
application URL and configure the Vault secrets in the Studio instance attached
to that database.