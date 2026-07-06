# Sylo

Sylo is an AI-powered knowledge library for building searchable knowledge bases and retrieving information through an intelligent chat interface. It is built with Next.js App Router, Supabase auth/database, and a RAG retrieval pipeline using vector search.

## Requirements

- Node.js 22+
- npm
- A Supabase project with auth and Postgres enabled
- Environment variables configured from `.env.example`

## Getting Started

1. Copy `.env.example` to `.env`.
2. Set your Supabase URL and anon/public key.
3. Install dependencies:

```bash
npm install
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

- `npm run dev` — Start the development server
- `npm run build` — Build the production app
- `npm run start` — Run the production build
- `npm run lint` — Run ESLint
- `npm run test:e2e` — Run Playwright end-to-end tests
- `npm run test:e2e:headed` — Run Playwright tests in headed mode
- `npm run test:e2e:debug` — Run Playwright in debug mode

## End-to-End Testing

E2E tests live in `tests/e2e` and are configured by `playwright.config.ts`. Playwright starts a local dev server automatically and runs tests against the application in Chromium.

## Supabase Migrations

This project stores migrations in `supabase/migrations` and uses the Supabase CLI for schema changes.

```bash
supabase migration new <name>
supabase db pull
```

See `MIGRATION_GUIDE.md` for workflow rules, cleanup guidance, and migration best practices.

## Deployment

Deploy the app to any platform that supports Next.js 16 and Node.js 22+. Ensure your environment variables are set in the deployment environment.

For GitHub-based deployments to Vercel, add these repository secrets: `VERCEL_TOKEN`. The workflow in [.github/workflows/deploy-vercel.yml](.github/workflows/deploy-vercel.yml) deploys pull requests as preview deployments and pushes to `main` as production deployments.
