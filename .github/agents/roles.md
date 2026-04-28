# Specialized Agent Roles

This document contains detailed role guidance for agents working in this repository.

## 1. RAG & LLM Engineer

**Triggers**: Questions about embeddings, vector search, LLM providers, streaming responses, context building

**Responsibilities**:

- Implement embeddings pipeline (`src/lib/ai/embeddings.ts`)
- Add new LLM providers (`src/lib/ai/providers/`)
- Optimize retrieval strategy (`src/lib/ai/rag/retrieve.ts`)
- Debug streaming responses and chunk handling
- Monitor embedding quality and relevance

**Skills to Activate**: `supabase`, `supabase-postgres-best-practices`, `next-best-practices` (route handlers, async patterns, data patterns)

**Key Files**:

- `src/lib/ai/core/llm.ts` — Provider interface
- `src/lib/ai/rag/pipeline.ts` — RAG orchestration
- `src/lib/ai/types/provider.types.ts` — Type definitions

## 2. Backend & API Engineer

**Triggers**: API routes, database queries, RBAC, validation, error handling, middleware

**Responsibilities**:

- Build/maintain REST API endpoints (`src/app/api/`)
- Implement role-based access control checks
- Write Zod validation schemas
- Handle Supabase auth and session management
- Enforce business constraints (max libraries, document limits)

**Skills to Activate**: `supabase`, `next-best-practices` (route handlers, error handling, async patterns, runtime selection)

**Key Files**:

- `src/app/api/` — All route handlers
- `src/lib/rbac.ts` — Permission checking
- `src/lib/validation/` — Zod schemas
- Search `.github/instructions/security-and-owasp.instructions.md` for API anti-patterns

## 3. Frontend & React Engineer

**Triggers**: UI components, state management, client pages, user interactions, styling

**Responsibilities**:

- Build React components and pages (`src/components/`, `src/app/hub/`)
- Integrate Supabase Auth UI
- Manage form state and validation
- Implement search/filter/pagination UI
- Ensure accessibility (WCAG 2.2 AA)

**Skills to Activate**: `shadcn` (component discovery, installation, composition rules), `vercel-composition-patterns` (compound components, boolean prop avoidance, state patterns), `next-best-practices` (RSC boundaries, hydration errors, suspense, directives, image/font), `web-design-guidelines` (UI/UX audit and accessibility review)

**Key Files**:

- `src/components/` — Reusable UI components
- `src/app/(auth)/` — Auth flow pages
- `src/app/hub/` — Library chat pages

## 4. Database & Security Engineer

**Triggers**: Schema design, migrations, RLS policies, performance, vector indexing, security

**Responsibilities**:

- Design database schema and relationships
- Write PostgreSQL migrations via Supabase CLI
- Implement and audit RLS policies
- Create indexes for performance
- Validate against OWASP Top 10 (A04 Cryptographic Failures, A05 Injection)

**Skills to Activate**: `supabase`, `supabase-postgres-best-practices` (indexes, RLS performance, connection pooling, locking, schema constraints)

**Key Files**:

- `supabase/config.toml` — Supabase configuration
- `supabase/migrations/` — Migration SQL files
- `prisma/schema.prisma` — ORM schema (reference only)

## 5. DevOps & Deployment Engineer

**Triggers**: Build process, deployment, environment variables, CI/CD, production readiness

**Responsibilities**:

- Manage environment configuration
- Ensure secrets are not committed
- Verify build and start scripts work
- Monitor for `NEXT_PUBLIC` leaks
- Test production builds

**Skills to Activate**: `next-best-practices` (self-hosting, bundling, runtime selection, scripts)

**Key Files**:

- `.env.example` — Example environment variables
- `next.config.ts` — Next.js build configuration
- `package.json` — Build/start commands
