# Sync Remote Supabase Database to Local

**Run all commands from project root.**

## Setup

1. Install Node.js/npm and Docker Desktop.
2. Copy the environment file:

```bash
cp .env.example .env
```

3. Edit `.env` (or `.env.local`) and set:

```ini
SUPABASE_ACCESS_TOKEN="your-supabase-access-token"
SUPABASE_PROJECT_REF_ID="your-project-ref"
```

Do not commit `.env`, `.env.local`, or `SUPABASE_ACCESS_TOKEN`.

## Run

From `./scripts/supabase_cli/sync_remote_to_local`:

```bash
chmod +x sync_remote_to_local.sh
bash sync_remote_to_local.sh
```

Or from project root:

```bash
bash scripts/supabase_cli/sync_remote_to_local/sync_remote_to_local.sh
```

To remove the generated seed file automatically:

```bash
bash scripts/supabase_cli/sync_remote_to_local/sync_remote_to_local.sh --clean
```

The generated seed file is saved to:

```text
../../supabase/seed.sql
```

## Troubleshooting

- `SUPABASE_ACCESS_TOKEN is not set` or `SUPABASE_PROJECT_REF_ID is not set`: check `.env` or `.env.local`.
- `npx: command not found`: install Node.js.
- Docker errors: make sure Docker Desktop is running.
- Script exits with error: ensure `.env` or `.env.local` exists in project root.
