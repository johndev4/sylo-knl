# Docker Setup Guide

Run the **Sylo** web application in Docker using `docker-compose.yml`.

> [!NOTE]
> The included Docker Compose setup runs the **Sylo web application only**. It does not start Supabase or Ollama—you will connect it to a cloud Supabase project or a separate local instance.

---

## Prerequisites

- **Docker Engine** with the **Compose plugin** (`docker compose`)
- **Supabase**: a [cloud project](https://supabase.com) or a local instance (`supabase start`)
- **AI Provider**: a Google AI Studio API key or a local [Ollama](../README.md#local-ai-with-ollama) instance

---

## 1. Create `.env`

Docker Compose reads `.env` (not `.env.local`) for both build arguments and container runtime variables. Copy the template:

```bash
# macOS / Linux
cp .env.example .env
```

```powershell
# PowerShell
Copy-Item .env.example .env
```

---

## 2. Configure `.env`

Fill in `.env` with your app port, Supabase credentials, and AI provider settings. A minimal configuration looks like:

```env
# App URL & Docker host port (APP_PORT defaults to 3000 if omitted)
NEXT_PUBLIC_APP_URL="http://localhost:3000"
APP_PORT=3000

# Supabase (Project Settings -> API)
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-anon-key"
SUPABASE_SECRET_KEY="your-service-role-key"

# AI Provider ('google' or 'ollama')
LLM_PROVIDER="google"
EMBEDDING_PROVIDER="google"
GOOGLE_GENERATIVE_AI_API_KEY="your-google-api-key"
```

If you are using **Ollama on the Docker host** instead of Google AI, replace the AI Provider block above with:

```env
LLM_PROVIDER="ollama"
EMBEDDING_PROVIDER="ollama"
OLLAMA_BASE_URL="http://host.docker.internal:11434/api"
OLLAMA_LLM_MODEL="gemma4:e4b"
OLLAMA_EMBEDDING_MODEL="nomic-embed-text:v1.5"
```

### Networking & Build-Time Notes

- **Cloud Supabase (`supabase.com`)**: Use your normal project URL (e.g., `https://your-project.supabase.co`). Both your browser and the container can reach it directly.
- **Local Supabase (`supabase start`)**: `NEXT_PUBLIC_SUPABASE_URL` is used by **both** your browser and the Next.js server inside the Docker container:
  - Do **not** use `127.0.0.1` or `localhost` (inside the container, `127.0.0.1` points to the container itself).
  - Do **not** use `host.docker.internal` (browsers cannot resolve it reliably across platforms or devices).
  - Instead, set `NEXT_PUBLIC_SUPABASE_URL` to your **host machine's LAN IP** or a hostname reachable by both (e.g., `http://192.168.1.10:54321`), ensure Supabase is listening on that address, and firewall the port to trusted devices.
- **Rebuilding after `NEXT_PUBLIC_*` changes**: `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are baked into the browser bundle during the Docker build. If you change any of them, rebuild with `docker compose up --build -d`.
- **Optional `CRON_SECRET`**: Document saves trigger background embedding directly. Only set `CRON_SECRET` (and a matching `cron_secret` in Supabase Vault) if you enable the `pg_cron` fallback worker. See [Embedding & Background Indexing Guide](EMBEDDING_API_GUIDE.md).

---

## 3. Apply Database Migrations

Before starting the app, push the schema migrations to your Supabase database using the command that matches your setup (see [Database Setup & Migrations](../README.md#database-setup--migrations)):

| Supabase Setup | Command (run on host) |
| --- | --- |
| **Local Supabase CLI** (`supabase start`) | `supabase db push` |
| **Linked Cloud Project** | `supabase db push --remote` |
| **Self-Hosted Postgres** | `supabase db push --db-url "<database-url>"` |

---

## 4. Build, Start, and Verify

```bash
docker compose up --build -d
```

Check that the container is running and passes its healthcheck:

```bash
docker compose ps
```

Once the status shows `healthy`, open [http://localhost:3000](http://localhost:3000) (or `http://localhost:<APP_PORT>` if you changed `APP_PORT`).

Useful management commands:

```bash
docker compose logs -f app   # Stream application logs
docker compose down          # Stop and remove the container
docker compose up --build -d # Rebuild and restart after git pull or .env changes
```

---

## Additional Configuration

- **Using Ollama on the Docker host**: `docker-compose.yml` maps `host.docker.internal` to the host (`host-gateway`). Because Ollama is only called server-side from inside the container, set `LLM_PROVIDER="ollama"` and/or `EMBEDDING_PROVIDER="ollama"` in `.env`, set `OLLAMA_BASE_URL="http://host.docker.internal:11434/api"`, configure Ollama with `OLLAMA_HOST=0.0.0.0` so it listens on interfaces Docker can reach (and firewall it to trusted machines), and pull your models on the host first.
- **Supabase Auth Redirects**: In Supabase **Authentication > URL Configuration**, add your app origin (e.g., `http://localhost:3000`) to **Site URL** and **Redirect URLs**.
- **Security**: Keep `.env` private (it is ignored by Git). For internet-facing deployments, place the container behind a reverse proxy with TLS rather than exposing it directly.
