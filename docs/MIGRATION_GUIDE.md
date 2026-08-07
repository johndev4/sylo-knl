# Migration Guide

This guide covers the current Sylo repository structure, how to migrate schema changes, and how to keep the project clean as the codebase evolves.

## Project Overview

Sylo is a Next.js App Router application powered by Supabase and a RAG pipeline. The repository includes:

- `src/` — application source code
- `supabase/` — database configuration and migration SQL
- `tests/e2e/` — Playwright browser tests
- `playwright.config.ts` — Playwright configuration

## Local Setup

1. Copy `.env.example` to `.env`.
2. Populate Supabase variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Install dependencies:

```bash
npm install
```

4. Start the app:

```bash
npm run dev
```

## Schema Migrations

Use the Supabase CLI for database migrations:

```bash
supabase migration new <name>
```

Then edit the generated SQL file in `supabase/migrations/`.

To refresh your local schema from Supabase, run:

```bash
supabase db pull
```

## E2E Test Migration

End-to-end coverage is implemented with Playwright.

- Add tests under `tests/e2e/`.
- Run them with:

```bash
npm run test:e2e
```

- Use `npm run test:e2e:headed` for visible browser debugging.
- Use `npm run test:e2e:debug` for Playwright inspector mode.

## Cleanup Rules

Keep the repository tidy by removing generated build/test artifacts and ensuring `.gitignore` covers them.

Ignore:

- `/.next/`
- `*.tsbuildinfo`
- `/coverage`
- `/test-results`
- `/playwright-report`

## Updating Documentation

When changing core workflows or infrastructure, update these files:

- `README.md`
- `AGENTS.md`
- `MIGRATION_GUIDE.md`

If new tools are added, describe them clearly and add any relevant scripts to `package.json`.

---

## Route Guard & RBAC Migration (2026)

- Added `src/proxy.ts` as the Next.js proxy middleware entry point for global authentication redirects.
- Added `src/lib/actions/requireLibraryRole.ts` for RBAC checks.
- All `/hub/libraries/[id]` and document routes now require membership and minimum role.
- Unauthorized access redirects to `/unauthorized`.
- Update Playwright E2E tests to cover these scenarios.
