# Server Action and API logging

Logging is intentionally limited to Next.js App Router API routes and Server
Actions. It does not run for middleware, proxy/auth guards, React components,
client hooks, database query helpers, RAG providers, or background-only utilities.

The implementation is runtime-neutral and centered on
`src/lib/logging/logger.ts`.

## Log levels

- `debug`: development-only diagnostics
- `info`: request and operation lifecycle events
- `warn`: recoverable failures, authorization failures, and slow work
- `error`: failed operations and unexpected exceptions
- `fatal`: unavailable configuration or other process-level failures

Set `LOG_LEVEL` in the environment (default: `info`). Lower levels are suppressed
above the configured threshold.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `LOG_LEVEL` | `info` | Minimum level: debug, info, warn, error, fatal |
| `LOG_FORMAT` | `pretty` in development, `json` in production | Output format |
| `LOG_SLOW_REQUEST_MS` | `2000` | HTTP request slow-warning threshold |
| `LOG_SLOW_OPERATION_MS` | `2000` | Background operation slow-warning threshold |

Production uses JSON by default. Development uses a readable timestamped format
and may include development-only error stacks.

## Usage

```ts
import { logger } from '@/lib/logging/logger';
import { getRequestId } from '@/lib/logging/request';

const correlationId = await getRequestId();

logger.info('Document action completed', {
  correlationId,
  userId,
  documentId,
  duration: 42,
  libraryId,
});

logger.error('Document action failed', {
  correlationId,
  userId,
  documentId,
  error,
});
```

Use identifiers and bounded counts for context.

## Scope

API routes include:

- `src/app/api/**/route.ts`
- `src/app/auth/callback/route.ts`

Server actions are modules beginning with `'use server'`, including library,
document, invite, auth, and user mutations.

Do not add logs to components, hooks, query helpers, RAG internals, providers,
the proxy, or background-only utilities.

## Request correlation

API handlers should use `getRequestContext(request)` and propagate `x-request-id`
in response headers. Server Actions should use `getRequestId()` and log a
`correlationId`.

```ts
import { getRequestContext } from '@/lib/logging/request';

const context = getRequestContext(request);
logger.info('Request received', context);
```

## Security and redaction

The logger recursively:

- redacts password, passcode, secret, token, cookie, authorization, session,
  credential, API-key, and private-key fields;
- redacts `Bearer` credentials and key/value secret patterns;
- removes control characters and caps strings and collection sizes;
- includes error stack traces only outside production.

Never add secrets or cookies to `LogContext`. Do not log request bodies, raw
database rows, document or chat content, embedding vectors, invite codes, SQL
parameters, authentication headers, or secrets.

## Interpreting production logs

Each JSON record includes `timestamp`, `level`, `message`, `environment`,
`service`, and any applicable `requestId`, `correlationId`, `userId`, `method`,
`path`, `duration`, `statusCode`, and safe metadata.

Correlate the lifecycle events for a request using `requestId`. Correlate
background work using `correlationId`. Use `duration` to locate slow operations
and `error.name`/`error.code` to classify failures without exposing stack traces
or database implementation details to clients.
