# Run Sylo with Docker

This guide describes how to build and run the Sylo web application with Docker
Compose. The included setup starts the Sylo application only. Supabase and the
AI provider must be provided by either a cloud service or separate local
services.

## Prerequisites

Before you begin, install and configure:

- Docker Engine with the Docker Compose plugin
- A Supabase project or a separate local Supabase instance
- Access to an AI provider for text generation and embeddings
- Node.js and the Supabase CLI, if you need to apply database migrations from
  your host

You can use a local or cloud provider for AI operations. Docker Compose does not
install or start an AI provider.

## 1. Create the environment file

Docker Compose reads `.env`, not `.env.local`.

### macOS or Linux

```bash
cp .env.example .env
```

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

Keep `.env` private. It is ignored by Git and contains server-side credentials
that must not be exposed to browser code.

## 2. Configure the application

Set the application URL and Docker host port in `.env`:

```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
APP_PORT=3000
```

- `NEXT_PUBLIC_APP_URL` is the address used by clients to reach Sylo.
- `APP_PORT` is the port exposed on the Docker host. The container itself
  continues to listen on port `3000`.

If you change `APP_PORT`, use
`http://localhost:<APP_PORT>` when opening Sylo.

## 3. Configure Supabase

Add the Supabase project URL and API credentials to `.env`:

```env
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
SUPABASE_SECRET_KEY="your-secret-key"
```

`NEXT_PUBLIC_SUPABASE_URL` and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are browser-visible configuration values.
`SUPABASE_SECRET_KEY` is server-side only and must never be added to a
client-exposed environment variable.

### Cloud Supabase

Use the normal project URL from your Supabase project settings. Both the browser
and the Docker container can reach this URL directly.

### Local Supabase

Start the local Supabase instance on the host before starting Sylo:

```bash
supabase start
```

Set `NEXT_PUBLIC_SUPABASE_URL` to a URL that is reachable from both the browser
and the Sylo container. Do not use `127.0.0.1` or `localhost`: inside the
container, those addresses refer to the container itself.

For example, use your host machine's LAN address:

```env
NEXT_PUBLIC_SUPABASE_URL="http://192.168.1.10:54321"
```

The host address must be:

- Reachable from the browser
- Reachable from the Docker network
- Listening on port `54321` or the port reported by Supabase
- Allowed through the host firewall

Restrict access to trusted devices and networks.

### Browser build values

Docker bakes `NEXT_PUBLIC_APP_URL`,
`NEXT_PUBLIC_SUPABASE_URL`, and
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` into the browser bundle. Rebuild the
container after changing any of these variables:

```bash
docker compose up --build -d
```

## 4. Configure the AI provider

Sylo requires an AI provider for text generation and a compatible provider for
embeddings.

### Provider selection

Set both provider variables in `.env`:

```env
LLM_PROVIDER="google"
EMBEDDING_PROVIDER="google"
```

Supported values are `google` and `ollama`. You can use the same provider for
both operations or configure text generation and embeddings independently.

### Cloud provider

Set the provider variables and add the credentials required by that provider:

```env
LLM_PROVIDER="google"
EMBEDDING_PROVIDER="google"
GOOGLE_GENERATIVE_AI_API_KEY="your-api-key"
```

Use placeholder model values only if you need to override project defaults.
Otherwise, leave model override variables unset.

### Docker host AI provider

If the AI provider runs on the Docker host, set both providers to `ollama` and
use `host.docker.internal` for the server URL:

```env
LLM_PROVIDER="ollama"
EMBEDDING_PROVIDER="ollama"
OLLAMA_BASE_URL="http://host.docker.internal:11434/api"
```

Docker Compose maps `host.docker.internal` to the Docker host. Configure the
provider to listen on host interfaces that Docker can reach, and set the text
generation and embedding model values required by your provider installation.

> [!IMPORTANT]
> The Ollama instance is server-side from the Docker container. It does not need
> to be reachable from a browser.

Firewall the provider service so it is accessible only to trusted machines and
Docker networks.

## 5. Apply database migrations

Apply the Sylo database migrations before starting the application.

### Local Supabase CLI

```bash
supabase db push
```

### Linked cloud project

```bash
supabase db push --remote
```

### Self-hosted Supabase or PostgreSQL

```bash
supabase db push --db-url "<database-url>"
```

The migrations create the database schema, Row-Level Security policies, and
vector search functions required by Sylo.

### Optional embedding fallback

Document saves trigger background embedding directly. A separate
`pg_cron` fallback can be enabled when you need to retry pending embeddings
automatically.

To enable it:

1. Generate a secret.
2. Set `CRON_SECRET` to the same value in `.env`.
3. Store the value in the database's Supabase Vault as `cron_secret`.
4. Store the application base URL, reachable from Postgres, in the Vault as
   `embed_worker_base_url`.

For local Supabase with Sylo running on the Docker host, the worker base URL is
often:

```env
EMBED_WORKER_BASE_URL="http://host.docker.internal:3000"
```

Then configure the Vault values as described in the
[Embedding Worker Setup](EMBEDDING_API_GUIDE.md). Do not enable this fallback
unless the database can reach the application.

## 6. Build and start Sylo

Run:

```bash
docker compose up --build -d
```

This command:

- Builds the application image
- Loads `.env` into Docker Compose
- Starts the application container
- Restarts it automatically if it exits unless it is explicitly stopped

Check the container status:

```bash
docker compose ps
```

Wait until the `app` service reports `healthy`. Docker uses a health check that
requests the application's root route.

Open the application:

- Default port: [http://localhost:3000](http://localhost:3000)
- Custom port: `http://localhost:<APP_PORT>`

## 7. Verify the deployment

Confirm the following:

1. The application loads in the browser.
2. The sign-in or sign-up page is reachable.
3. Authentication redirects return to Sylo.
4. A signed-in user can create or open a library.
5. A document can be saved and embeddings can be generated.

In Supabase **Authentication > URL Configuration**, add the Sylo origin to both
the Site URL and Redirect URLs. For a default local deployment, use:

```text
Site URL: http://localhost:3000
Redirect URLs: http://localhost:3000/**
```

For a custom host, protocol, or port, use the public application origin instead.

## 8. Manage the deployment

### View application logs

```bash
docker compose logs -f app
```

### Rebuild after source or environment changes

```bash
docker compose up --build -d
```

Rebuild after changes to Git-tracked source files or to public
`NEXT_PUBLIC_*` variables.

### Stop the application

```bash
docker compose down
```

This stops and removes the Sylo container.

### Remove the image as well

```bash
docker compose down --rmi local
```

This removes the local images created by the Compose project in addition to the
container.

## Troubleshooting

### The container is unhealthy or not running

Inspect status and logs:

```bash
docker compose ps
docker compose logs app
```

Check that required build variables are present in `.env`:

```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
```

### The browser cannot reach Supabase

For local Supabase:

- Replace `localhost` and `127.0.0.1` with a host LAN address or resolvable
  hostname.
- Verify that Supabase is listening on the configured address.
- Confirm that browser and firewall rules permit the Supabase port.
- Rebuild Sylo after changing `NEXT_PUBLIC_SUPABASE_URL`.

Do not use `host.docker.internal` as a browser-visible Supabase URL.

### The browser uses stale public configuration

Public `NEXT_PUBLIC_*` variables are compiled into the Docker image. Run:

```bash
docker compose up --build -d
```

after changing one of those values, then reload the browser.

### AI requests fail

Verify that:

- `LLM_PROVIDER` and `EMBEDDING_PROVIDER` contain supported values.
- The selected provider credentials are valid.
- The provider URL is reachable from inside the container.
- Required text-generation and embedding models are installed or available.
- The provider service is listening on an interface Docker can reach.

For a provider on the Docker host, use
`http://host.docker.internal:11434/api` unless a provider-specific configuration
uses a different endpoint.

### Authentication redirects fail

Check both Supabase and Sylo configuration:

- `NEXT_PUBLIC_APP_URL` matches the origin used to open Sylo.
- The Supabase Site URL matches the application origin.
- The Redirect URLs include the application's callback pattern.
- Public Supabase settings match the selected project.
- The Sylo container was rebuilt after public URL changes.

## Security recommendations

- Never commit `.env` or real credentials.
- Use separate credentials for development and production.
- Keep `SUPABASE_SECRET_KEY` server-side only.
- Restrict local AI and Supabase ports to trusted networks.
- For an internet-facing deployment, put Sylo behind a reverse proxy with TLS.
- Rotate credentials if they are exposed outside the deployment environment.
