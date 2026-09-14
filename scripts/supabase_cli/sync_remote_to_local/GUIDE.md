# Sync Remote Supabase Database to Local

**Run all commands from `./scripts/supabase_cli`.**

## Setup

1. Install Node.js/npm and Docker Desktop.
2. Copy the environment file:

```bash
cp .env.example .env
```

3. Edit `.env` and set:

```ini
SUPABASE_API_TOKEN="your-supabase-api-token"
SUPABASE_PROJECT_REF_ID="your-project-ref"
```

Do not commit `.env` or `SUPABASE_API_TOKEN`.

## Run

From `./scripts/supabase_cli`:

```bash
chmod +x sync_remote_to_local/sync_remote_to_local.sh
bash sync_remote_to_local/sync_remote_to_local.sh
```

To remove the generated seed file automatically:

```bash
bash sync_remote_to_local/sync_remote_to_local.sh --clean
```

The generated seed file is saved to:

```text
../../supabase/seed.sql
```

## Troubleshooting

- `SUPABASE_* is not set`: check `./scripts/supabase_cli/.env`.
- `npx: command not found`: install Node.js.
- Docker errors: make sure Docker Desktop is running.
